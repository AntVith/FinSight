package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/AntVith/FinSight/backend/db/repository"
	"github.com/AntVith/FinSight/backend/internal/insights"
	"github.com/AntVith/FinSight/backend/internal/plaid"
	"github.com/AntVith/FinSight/backend/internal/transactions"
)

// TO DO: Add authentication middleware
const userID = 1

func NewRouter() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	r.Route("/api", func(r chi.Router) {
		r.Get("/link/token", createLinkTokenHandler)
		r.Post("/link/exchange", exchangeTokenHandler)
		r.Post("/transactions/sync", syncTransactionsHandler)
		r.Get("/insights", getInsightsHandler)
		r.Get("/transactions", getTransactionsHandler)
	})

	return r
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowedOrigins := map[string]bool{
			"http://localhost:3000": true,
			"http://localhost:5173": true,
		}

		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

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

func createLinkTokenHandler(w http.ResponseWriter, r *http.Request) {
	token, err := plaid.CreateLinkToken(r.Context(), fmt.Sprintf("%d", userID))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"link_token": token})
}

func exchangeTokenHandler(w http.ResponseWriter, r *http.Request) {
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

	if err := repository.SaveItem(r.Context(), userID, accessToken, itemID, body.InstitutionName); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "success"})
}

func syncTransactionsHandler(w http.ResponseWriter, r *http.Request) {
	items, err := repository.GetItemsByUserID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if len(items) == 0 {
		writeError(w, http.StatusBadRequest, "no linked accounts found")
		return
	}

	for _, item := range items {
		if err := transactions.SyncTransactions(r.Context(), item); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	allTransactions, err := repository.GetTransactionsByUserID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if err := insights.GenerateInsight(r.Context(), userID, allTransactions); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "sync complete"})
}

func getInsightsHandler(w http.ResponseWriter, r *http.Request) {
	insight, err := repository.GetInsightByUserID(r.Context(), userID)
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
	txns, err := repository.GetTransactionsByUserID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, txns)
}
