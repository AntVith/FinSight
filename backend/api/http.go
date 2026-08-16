package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/AntVith/FinSight/backend/db/repository"
	"github.com/AntVith/FinSight/backend/internal/accounts"
	finsightAuth "github.com/AntVith/FinSight/backend/internal/auth"
	"github.com/AntVith/FinSight/backend/internal/insights"
	"github.com/AntVith/FinSight/backend/internal/plaid"
	"github.com/AntVith/FinSight/backend/internal/ratelimit"
	"github.com/AntVith/FinSight/backend/internal/transactions"
)

// configuredCorsOriginAllowlist is computed once at process boot from the
// ALLOWED_ORIGINS environment variable (comma-separated). When unset, we fall
// back to a localhost-only allowlist suitable for development.
var configuredCorsOriginAllowlist = buildCorsOriginAllowlistFromEnv()

// Process-local abuse controls. Adequate for a single Railway replica.
var (
	authLoginLimiter      = ratelimit.NewLimiter(10, time.Minute)
	authRegisterLimiter   = ratelimit.NewLimiter(5, time.Minute)
	authRefreshLimiter    = ratelimit.NewLimiter(30, time.Minute)
	linkTokenLimiter      = ratelimit.NewLimiter(10, time.Hour)
	linkExchangeLimiter   = ratelimit.NewLimiter(5, time.Hour)
	transactionSyncGate   = ratelimit.NewCooldownGate(time.Hour)
	configuredDemoMailbox = strings.ToLower(strings.TrimSpace(os.Getenv("DEMO_USER_EMAIL")))
)

func buildCorsOriginAllowlistFromEnv() map[string]bool {
	rawAllowlist := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	if rawAllowlist == "" {
		return map[string]bool{
			"http://localhost:3000": true,
			"http://localhost:5173": true,
			"http://127.0.0.1:3000": true,
			"http://127.0.0.1:5173": true,
		}
	}
	resolvedAllowlist := make(map[string]bool)
	for _, rawCandidate := range strings.Split(rawAllowlist, ",") {
		trimmedCandidate := strings.TrimSpace(rawCandidate)
		if trimmedCandidate != "" {
			resolvedAllowlist[trimmedCandidate] = true
		}
	}
	return resolvedAllowlist
}

func NewRouter(authService *finsightAuth.Service) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)
	r.Use(maxJSONBodyBytesMiddleware(64 << 10)) // 64 KiB

	r.Route("/api", func(r chi.Router) {
		r.Get("/health", healthHandler)

		r.With(ratelimit.Middleware(authRegisterLimiter, ipRateLimitKey)).Post(
			"/auth/register",
			authRegisterPOST(authService),
		)
		r.With(ratelimit.Middleware(authLoginLimiter, ipRateLimitKey)).Post(
			"/auth/login",
			authLoginPOST(authService),
		)
		r.With(ratelimit.Middleware(authRefreshLimiter, ipRateLimitKey)).Post(
			"/auth/refresh",
			authRefreshPOST(authService),
		)
		r.Post("/auth/logout", authLogoutPOST(authService))

		r.Group(func(r chi.Router) {
			r.Use(authService.BearerMiddleware)
			r.With(ratelimit.Middleware(linkTokenLimiter, authenticatedUserRateLimitKey)).Get(
				"/link/token",
				createLinkTokenHandler,
			)
			r.With(ratelimit.Middleware(linkExchangeLimiter, authenticatedUserRateLimitKey)).Post(
				"/link/exchange",
				exchangeTokenHandler,
			)
			r.Post("/transactions/sync", syncTransactionsHandler)
			r.Get("/insights", getInsightsHandler)
			r.Get("/transactions", getTransactionsHandler)
			r.Get("/items", getItemsHandler)
			r.Get("/accounts", getAccountsHandler)
		})
	})

	return r
}

func ipRateLimitKey(request *http.Request) string {
	return "ip:" + ratelimit.ClientIP(request)
}

func authenticatedUserRateLimitKey(request *http.Request) string {
	userIdentifier, authenticated := finsightAuth.AuthenticatedUserID(request.Context())
	if !authenticated {
		return "user:anonymous"
	}
	return "user:" + strconv.Itoa(userIdentifier)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if configuredCorsOriginAllowlist[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// maxJSONBodyBytesMiddleware rejects oversized JSON bodies used by auth and link handlers.
func maxJSONBodyBytesMiddleware(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
			if request.Body != nil &&
				(request.Method == http.MethodPost ||
					request.Method == http.MethodPut ||
					request.Method == http.MethodPatch) {
				request.Body = http.MaxBytesReader(responseWriter, request.Body, maxBytes)
			}
			next.ServeHTTP(responseWriter, request)
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// writeLoggedInternalError logs the real failure and returns a stable client message.
func writeLoggedInternalError(w http.ResponseWriter, operation string, err error, clientMessage string) {
	log.Printf("%s: %v", operation, err)
	writeError(w, http.StatusInternalServerError, clientMessage)
}

func writeTooManyRequests(w http.ResponseWriter, message string, retryAfter time.Duration) {
	seconds := int(retryAfter.Seconds())
	if seconds < 1 {
		seconds = 1
	}
	w.Header().Set("Retry-After", strconv.Itoa(seconds))
	writeError(w, http.StatusTooManyRequests, message)
}

// isConfiguredDemoUser reports whether the authenticated user is the shared demo mailbox.
func isConfiguredDemoUser(ctx context.Context, userIdentifier int) (bool, error) {
	if configuredDemoMailbox == "" {
		return false, nil
	}
	userRecord, err := repository.GetUserByID(ctx, userIdentifier)
	if err != nil {
		return false, err
	}
	if userRecord == nil {
		return false, nil
	}
	return strings.EqualFold(userRecord.Email, configuredDemoMailbox), nil
}

func createLinkTokenHandler(w http.ResponseWriter, r *http.Request) {
	userIdentifier, authenticated := finsightAuth.AuthenticatedUserID(r.Context())
	if !authenticated {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}

	isDemoUser, demoLookupErr := isConfiguredDemoUser(r.Context(), userIdentifier)
	if demoLookupErr != nil {
		writeLoggedInternalError(w, "demo policy lookup", demoLookupErr, "could not verify account policy")
		return
	}
	if isDemoUser {
		writeError(w, http.StatusForbidden, "demo account cannot link additional banks")
		return
	}

	token, err := plaid.CreateLinkToken(r.Context(), fmt.Sprintf("%d", userIdentifier))
	if err != nil {
		writeLoggedInternalError(w, "create link token", err, "could not create link token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"link_token": token})
}

func exchangeTokenHandler(w http.ResponseWriter, r *http.Request) {
	userIdentifier, authenticated := finsightAuth.AuthenticatedUserID(r.Context())
	if !authenticated {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}

	isDemoUser, demoLookupErr := isConfiguredDemoUser(r.Context(), userIdentifier)
	if demoLookupErr != nil {
		writeLoggedInternalError(w, "demo policy lookup", demoLookupErr, "could not verify account policy")
		return
	}
	if isDemoUser {
		writeError(w, http.StatusForbidden, "demo account cannot link additional banks")
		return
	}

	linkedCount, countErr := repository.CountItemsByUserID(r.Context(), userIdentifier)
	if countErr != nil {
		writeLoggedInternalError(w, "count linked items", countErr, "could not link bank")
		return
	}
	if linkedCount >= repository.MaxLinkedItemsPerUser {
		writeError(w, http.StatusConflict, repository.ErrLinkedItemLimitReached.Error())
		return
	}

	var body struct {
		PublicToken     string `json:"public_token"`
		InstitutionName string `json:"institution_name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if body.PublicToken == "" {
		writeError(w, http.StatusBadRequest, "public_token is required")
		return
	}

	accessToken, itemID, err := plaid.ExchangePublicToken(r.Context(), body.PublicToken)
	if err != nil {
		writeLoggedInternalError(w, "exchange public token", err, "could not link bank")
		return
	}

	alreadyLinked, existsErr := repository.PlaidItemExists(r.Context(), itemID)
	if existsErr != nil {
		writeLoggedInternalError(w, "check plaid item", existsErr, "could not link bank")
		return
	}
	if alreadyLinked {
		writeError(w, http.StatusConflict, "institution already linked")
		return
	}

	newItemID, err := repository.SaveItem(r.Context(), userIdentifier, accessToken, itemID, body.InstitutionName)
	if err != nil {
		if errors.Is(err, repository.ErrDuplicatePlaidItem) {
			writeError(w, http.StatusConflict, "institution already linked")
			return
		}
		writeLoggedInternalError(w, "save linked item", err, "could not link bank")
		return
	}

	// AccountsGet is a single fast call — run synchronously so accounts are
	// available immediately after linking without waiting for a full sync.
	newItem := repository.Item{
		ID:               newItemID,
		UserID:           userIdentifier,
		PlaidAccessToken: accessToken,
		InstitutionName:  body.InstitutionName,
	}
	if _, err := accounts.SyncAccounts(r.Context(), newItem); err != nil {
		writeLoggedInternalError(w, "sync accounts on link", err, "linked bank but could not sync accounts")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "success"})
}

func syncTransactionsHandler(w http.ResponseWriter, r *http.Request) {
	userIdentifier, authenticated := finsightAuth.AuthenticatedUserID(r.Context())
	if !authenticated {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}

	syncKey := "sync:" + strconv.Itoa(userIdentifier)
	if blocked, retryAfter := transactionSyncGate.Remaining(syncKey); blocked {
		writeTooManyRequests(
			w,
			"sync cooldown active; try again later",
			retryAfter,
		)
		return
	}

	items, err := repository.GetItemsByUserID(r.Context(), userIdentifier)
	if err != nil {
		if strings.Contains(err.Error(), "decrypting") {
			writeLoggedInternalError(w, "load linked items", err,
				"linked bank tokens could not be decrypted; re-link the bank or re-run seeddemo --force-relink")
			return
		}
		writeLoggedInternalError(w, "load linked items", err, "could not sync transactions")
		return
	}

	if len(items) == 0 {
		writeError(w, http.StatusBadRequest, "no linked accounts found")
		return
	}

	// Start cooldown only once we know a Plaid call will be made.
	transactionSyncGate.Mark(syncKey)

	for _, item := range items {
		accountIDMap, err := accounts.SyncAccounts(r.Context(), item)
		if err != nil {
			writeLoggedInternalError(w, "sync accounts", err, "could not sync accounts")
			return
		}
		if err := transactions.SyncTransactions(r.Context(), item, accountIDMap); err != nil {
			writeLoggedInternalError(w, "sync transactions", err, "could not sync transactions")
			return
		}
	}

	allTransactions, err := repository.GetTransactionsByUserID(r.Context(), userIdentifier)
	if err != nil {
		writeLoggedInternalError(w, "load transactions after sync", err, "could not sync transactions")
		return
	}

	// Fire-and-forget Claude insight regeneration so the HTTP response returns
	// the moment Plaid is reconciled. Frontend polls /api/insights to surface
	// the fresh narrative once the model finishes drafting.
	go func(uid int, ledger []repository.Transaction) {
		bgCtx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
		defer cancel()
		if err := insights.GenerateInsight(bgCtx, uid, ledger); err != nil {
			log.Printf("background insight generation failed for user %d: %v", uid, err)
		}
	}(userIdentifier, allTransactions)

	writeJSON(w, http.StatusAccepted, map[string]string{"status": "sync accepted, insights regenerating"})
}

func getInsightsHandler(w http.ResponseWriter, r *http.Request) {
	userIdentifier, authenticated := finsightAuth.AuthenticatedUserID(r.Context())
	if !authenticated {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}

	insight, err := repository.GetInsightByUserID(r.Context(), userIdentifier)
	if err != nil {
		writeLoggedInternalError(w, "load insights", err, "could not load insights")
		return
	}

	if insight == nil {
		writeJSON(w, http.StatusOK, map[string]string{"status": "no insights yet"})
		return
	}

	writeJSON(w, http.StatusOK, insight)
}

func getTransactionsHandler(w http.ResponseWriter, r *http.Request) {
	userIdentifier, authenticated := finsightAuth.AuthenticatedUserID(r.Context())
	if !authenticated {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}

	txns, err := repository.GetTransactionsByUserID(r.Context(), userIdentifier)
	if err != nil {
		writeLoggedInternalError(w, "load transactions", err, "could not load transactions")
		return
	}

	writeJSON(w, http.StatusOK, txns)
}

func getItemsHandler(w http.ResponseWriter, r *http.Request) {
	userIdentifier, authenticated := finsightAuth.AuthenticatedUserID(r.Context())
	if !authenticated {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}

	items, err := repository.GetItemsByUserID(r.Context(), userIdentifier)
	if err != nil {
		writeLoggedInternalError(w, "load items", err, "could not load linked institutions")
		return
	}

	type itemResponse struct {
		ID              int    `json:"id"`
		InstitutionName string `json:"institution_name"`
		LinkedAt        string `json:"linked_at"`
	}

	// GetItemsByUserID decrypts access tokens; we never expose them in the response.
	response := make([]itemResponse, 0, len(items))
	for _, item := range items {
		response = append(response, itemResponse{
			ID:              item.ID,
			InstitutionName: item.InstitutionName,
			LinkedAt:        item.CreatedAt.UTC().Format(time.RFC3339),
		})
	}

	writeJSON(w, http.StatusOK, response)
}

func getAccountsHandler(w http.ResponseWriter, r *http.Request) {
	userIdentifier, authenticated := finsightAuth.AuthenticatedUserID(r.Context())
	if !authenticated {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}

	accts, err := repository.GetAccountsByUserID(r.Context(), userIdentifier)
	if err != nil {
		writeLoggedInternalError(w, "load accounts", err, "could not load accounts")
		return
	}

	type accountResponse struct {
		ID               int      `json:"id"`
		ItemID           int      `json:"item_id"`
		InstitutionName  string   `json:"institution_name"`
		Name             string   `json:"name"`
		OfficialName     string   `json:"official_name,omitempty"`
		Type             string   `json:"type"`
		Subtype          string   `json:"subtype,omitempty"`
		Mask             string   `json:"mask,omitempty"`
		BalanceCurrent   *float64 `json:"balance_current"`
		BalanceAvailable *float64 `json:"balance_available"`
		ISOCurrencyCode  string   `json:"iso_currency_code,omitempty"`
	}

	response := make([]accountResponse, 0, len(accts))
	for _, a := range accts {
		response = append(response, accountResponse{
			ID:               a.ID,
			ItemID:           a.ItemID,
			InstitutionName:  a.InstitutionName,
			Name:             a.Name,
			OfficialName:     a.OfficialName,
			Type:             a.Type,
			Subtype:          a.Subtype,
			Mask:             a.Mask,
			BalanceCurrent:   a.BalanceCurrent,
			BalanceAvailable: a.BalanceAvailable,
			ISOCurrencyCode:  a.ISOCurrencyCode,
		})
	}

	writeJSON(w, http.StatusOK, response)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"version": "1.0.0",
	})
}
