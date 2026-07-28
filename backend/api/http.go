package api

import (
	"context"
	"encoding/json"
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

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
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
		writeError(w, http.StatusInternalServerError, "could not verify account policy")
		return
	}
	if isDemoUser {
		writeError(w, http.StatusForbidden, "demo account cannot link additional banks")
		return
	}

	token, err := plaid.CreateLinkToken(r.Context(), fmt.Sprintf("%d", userIdentifier))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
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
		writeError(w, http.StatusInternalServerError, "could not verify account policy")
		return
	}
	if isDemoUser {
		writeError(w, http.StatusForbidden, "demo account cannot link additional banks")
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
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if err := repository.SaveItem(r.Context(), userIdentifier, accessToken, itemID, body.InstitutionName); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
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
			writeError(w, http.StatusInternalServerError,
				"linked bank tokens could not be decrypted; ENCRYPTION_KEY may have changed. Re-link the bank or re-run: go run ./cmd/seeddemo --force-relink")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if len(items) == 0 {
		writeError(w, http.StatusBadRequest, "no linked accounts found")
		return
	}

	// Start cooldown only once we know a Plaid call will be made.
	transactionSyncGate.Mark(syncKey)

	for _, item := range items {
		if err := transactions.SyncTransactions(r.Context(), item); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	allTransactions, err := repository.GetTransactionsByUserID(r.Context(), userIdentifier)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
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
		writeError(w, http.StatusInternalServerError, err.Error())
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
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, txns)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"version": "1.0.0",
	})
}
