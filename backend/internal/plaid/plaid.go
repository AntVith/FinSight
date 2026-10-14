package plaid

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/plaid/plaid-go/v20/plaid"
)

var plaidClient *plaid.APIClient

func Init() {
	configuration := plaid.NewConfiguration()
	configuration.AddDefaultHeader("PLAID-CLIENT-ID", os.Getenv("PLAID_CLIENT_ID"))
	configuration.AddDefaultHeader("PLAID-SECRET", os.Getenv("PLAID_SECRET"))

	env := os.Getenv("PLAID_ENV")
	switch env {
	case "sandbox":
		configuration.UseEnvironment(plaid.Sandbox)
	case "production":
		configuration.UseEnvironment(plaid.Production)
	default:
		configuration.UseEnvironment(plaid.Sandbox)
	}

	plaidClient = plaid.NewAPIClient(configuration)
	fmt.Println("plaid client initialized")
}

// ErrorDetails is the log-safe subset of a Plaid API error response. It
// deliberately omits the request body so access tokens can never leak.
type ErrorDetails struct {
	Type      string
	Code      string
	Message   string
	RequestID string
}

// RequiresReconnect reports whether the Item can only be repaired by the user
// linking the bank again, as opposed to a transient or server-side failure.
func (details ErrorDetails) RequiresReconnect() bool {
	switch details.Code {
	case "ITEM_LOGIN_REQUIRED", "INVALID_ACCESS_TOKEN", "ITEM_NOT_FOUND":
		return true
	default:
		return false
	}
}

// ParseError extracts Plaid's error envelope from err. The SDK returns
// GenericOpenAPIError by value, so the target must be a value, not a pointer;
// a pointer target never matches and silently hides every Plaid error code.
func ParseError(err error) (ErrorDetails, bool) {
	var apiErr plaid.GenericOpenAPIError
	if !errors.As(err, &apiErr) {
		return ErrorDetails{}, false
	}
	plaidErr, parseErr := plaid.ToPlaidError(apiErr)
	if parseErr != nil {
		return ErrorDetails{}, false
	}
	return ErrorDetails{
		Type:      string(plaidErr.GetErrorType()),
		Code:      plaidErr.GetErrorCode(),
		Message:   plaidErr.GetErrorMessage(),
		RequestID: plaidErr.GetRequestId(),
	}, true
}

// DescribeError renders err for logs, including Plaid's error_code when the
// failure was an API rejection, and falling back to err.Error() otherwise
// (network failures, timeouts, non-JSON bodies).
func DescribeError(err error) string {
	details, ok := ParseError(err)
	if !ok {
		return err.Error()
	}
	return fmt.Sprintf("error_type=%s error_code=%s request_id=%s message=%q",
		details.Type, details.Code, details.RequestID, details.Message)
}

func CreateLinkToken(ctx context.Context, userID string) (string, error) {
	user := plaid.LinkTokenCreateRequestUser{
		ClientUserId: userID,
	}

	request := plaid.NewLinkTokenCreateRequest(
		"FinSight",
		"en",
		[]plaid.CountryCode{plaid.COUNTRYCODE_US},
		user,
	)

	request.SetProducts([]plaid.Products{plaid.PRODUCTS_TRANSACTIONS})

	resp, _, err := plaidClient.PlaidApi.LinkTokenCreate(ctx).LinkTokenCreateRequest(*request).Execute()
	if err != nil {
		log.Printf("plaid /link/token/create error: user=%s %s", userID, DescribeError(err))
		return "", fmt.Errorf("error creating link token: %w", err)
	}

	return resp.GetLinkToken(), nil
}

func ExchangePublicToken(ctx context.Context, publicToken string) (string, string, error) {
	request := plaid.NewItemPublicTokenExchangeRequest(publicToken)

	resp, _, err := plaidClient.PlaidApi.ItemPublicTokenExchange(ctx).ItemPublicTokenExchangeRequest(*request).Execute()
	if err != nil {
		log.Printf("plaid /item/public_token/exchange error: %s", DescribeError(err))
		return "", "", fmt.Errorf("error exchanging public token: %w", err)
	}

	return resp.GetAccessToken(), resp.GetItemId(), nil
}

// FetchAccounts retrieves all accounts for the given Plaid Item. The access
// token must already be decrypted before calling. Storage is the caller's
// responsibility.
func FetchAccounts(ctx context.Context, accessToken string) ([]plaid.AccountBase, error) {
	request := plaid.NewAccountsGetRequest(accessToken)

	resp, _, err := plaidClient.PlaidApi.AccountsGet(ctx).AccountsGetRequest(*request).Execute()
	if err != nil {
		log.Printf("plaid /accounts/get error: %s", DescribeError(err))
		return nil, fmt.Errorf("error fetching accounts: %w", err)
	}

	return resp.GetAccounts(), nil
}

func GetClient() *plaid.APIClient {
	return plaidClient
}
