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
		var openAPIErr *plaid.GenericOpenAPIError
		if errors.As(err, &openAPIErr) {
			log.Printf("plaid /link/token/create error: user=%s body=%s", userID, string(openAPIErr.Body()))
		} else {
			log.Printf("plaid /link/token/create error (no body): user=%s err=%v", userID, err)
		}
		return "", fmt.Errorf("error creating link token: %w", err)
	}

	return resp.GetLinkToken(), nil
}

func ExchangePublicToken(ctx context.Context, publicToken string) (string, string, error) {
	request := plaid.NewItemPublicTokenExchangeRequest(publicToken)

	resp, _, err := plaidClient.PlaidApi.ItemPublicTokenExchange(ctx).ItemPublicTokenExchangeRequest(*request).Execute()
	if err != nil {
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
		var openAPIErr *plaid.GenericOpenAPIError
		if errors.As(err, &openAPIErr) {
			log.Printf("plaid /accounts/get error: body=%s", string(openAPIErr.Body()))
		} else {
			log.Printf("plaid /accounts/get error (no body): %v", err)
		}
		return nil, fmt.Errorf("error fetching accounts: %w", err)
	}

	return resp.GetAccounts(), nil
}

func GetClient() *plaid.APIClient {
	return plaidClient
}
