package plaid

import (
	"context"
	"fmt"
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

func GetClient() *plaid.APIClient {
	return plaidClient
}
