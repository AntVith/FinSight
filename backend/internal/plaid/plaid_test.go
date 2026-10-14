package plaid

import (
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/plaid/plaid-go/v20/plaid"
)

const itemLoginRequiredBody = `{
	"error_type": "ITEM_ERROR",
	"error_code": "ITEM_LOGIN_REQUIRED",
	"error_message": "the login details of this item have changed",
	"display_message": null,
	"request_id": "req-123"
}`

func TestParseErrorReadsPlaidEnvelope(t *testing.T) {
	apiErr := plaid.MakeGenericOpenAPIError([]byte(itemLoginRequiredBody), "400 Bad Request", nil)

	details, ok := ParseError(apiErr)
	if !ok {
		t.Fatal("expected a Plaid API error to be recognized")
	}
	if details.Code != "ITEM_LOGIN_REQUIRED" || details.Type != "ITEM_ERROR" || details.RequestID != "req-123" {
		t.Fatalf("unexpected details: %+v", details)
	}
}

func TestParseErrorUnwrapsWrappedErrors(t *testing.T) {
	apiErr := plaid.MakeGenericOpenAPIError([]byte(itemLoginRequiredBody), "400 Bad Request", nil)
	wrapped := fmt.Errorf("sync accounts: fetch from plaid: %w", apiErr)

	details, ok := ParseError(wrapped)
	if !ok || details.Code != "ITEM_LOGIN_REQUIRED" {
		t.Fatalf("expected wrapped Plaid error to parse, got ok=%v details=%+v", ok, details)
	}
}

func TestDescribeErrorFallsBackForNonPlaidErrors(t *testing.T) {
	if _, ok := ParseError(errors.New("dial tcp: i/o timeout")); ok {
		t.Fatal("a network error must not be reported as a Plaid API error")
	}
	if got := DescribeError(errors.New("dial tcp: i/o timeout")); got != "dial tcp: i/o timeout" {
		t.Fatalf("unexpected fallback description: %q", got)
	}
}

func TestRequiresReconnectOnlyForItemLevelCodes(t *testing.T) {
	cases := map[string]bool{
		"ITEM_LOGIN_REQUIRED":   true,
		"INVALID_ACCESS_TOKEN":  true,
		"ITEM_NOT_FOUND":        true,
		"INTERNAL_SERVER_ERROR": false,
		"RATE_LIMIT_EXCEEDED":   false,
		"PRODUCT_NOT_READY":     false,
	}
	for code, want := range cases {
		if got := (ErrorDetails{Code: code}).RequiresReconnect(); got != want {
			t.Errorf("RequiresReconnect(%s) = %v, want %v", code, got, want)
		}
	}
}

func TestDescribeErrorIncludesErrorCode(t *testing.T) {
	apiErr := plaid.MakeGenericOpenAPIError([]byte(itemLoginRequiredBody), "400 Bad Request", nil)
	if got := DescribeError(apiErr); !strings.Contains(got, "error_code=ITEM_LOGIN_REQUIRED") {
		t.Fatalf("description is missing the error code: %q", got)
	}
}
