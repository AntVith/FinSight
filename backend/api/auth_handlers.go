package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/AntVith/FinSight/backend/db/repository"
	finsightAuth "github.com/AntVith/FinSight/backend/internal/auth"
)

type tokenResponseEnvelope struct {
	AccessToken  string               `json:"access_token"`
	RefreshToken string               `json:"refresh_token"`
	TokenType    string               `json:"token_type"`
	ExpiresIn    int64                `json:"expires_in"`
	User         tokenUserSummaryLeaf `json:"user"`
}

type tokenUserSummaryLeaf struct {
	ID    int    `json:"id"`
	Email string `json:"email"`
}

type refreshRequestEnvelope struct {
	RefreshToken string `json:"refresh_token"`
}

type logoutRequestEnvelope struct {
	RefreshToken string `json:"refresh_token"`
}

type refreshTokenPairEnvelope struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
}

func authRegisterPOST(authService *finsightAuth.Service) http.HandlerFunc {
	type registerRequestEnvelope struct {
		Email     string `json:"email"`
		Password  string `json:"password"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
	}

	return func(responseWriter http.ResponseWriter, request *http.Request) {
		var decoded registerRequestEnvelope
		if err := json.NewDecoder(request.Body).Decode(&decoded); err != nil {
			writeError(responseWriter, http.StatusBadRequest, "invalid request body")
			return
		}

		normalizedEmail := strings.TrimSpace(decoded.Email)
		if normalizedEmail == "" || strings.TrimSpace(decoded.Password) == "" {
			writeError(responseWriter, http.StatusBadRequest, "email and password are required")
			return
		}

		accessTokenPlain, refreshTokenPlain, expiresInSeconds, userIdentifier, err := authService.Register(
			request.Context(),
			normalizedEmail,
			decoded.Password,
			decoded.FirstName,
			decoded.LastName,
		)
		if errors.Is(err, repository.ErrEmailTaken) {
			writeError(responseWriter, http.StatusConflict, "email already registered")
			return
		}
		if err != nil {
			writeError(responseWriter, http.StatusBadRequest, err.Error())
			return
		}

		writeJSON(responseWriter, http.StatusCreated, tokenResponseEnvelope{
			AccessToken:  accessTokenPlain,
			RefreshToken: refreshTokenPlain,
			TokenType:    "Bearer",
			ExpiresIn:    expiresInSeconds,
			User: tokenUserSummaryLeaf{
				ID:    userIdentifier,
				Email: normalizedEmail,
			},
		})
	}
}

func authLoginPOST(authService *finsightAuth.Service) http.HandlerFunc {
	type loginRequestEnvelope struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	return func(responseWriter http.ResponseWriter, request *http.Request) {
		var decoded loginRequestEnvelope
		if err := json.NewDecoder(request.Body).Decode(&decoded); err != nil {
			writeError(responseWriter, http.StatusBadRequest, "invalid request body")
			return
		}

		normalizedEmail := strings.TrimSpace(decoded.Email)
		if normalizedEmail == "" || strings.TrimSpace(decoded.Password) == "" {
			writeError(responseWriter, http.StatusBadRequest, "email and password are required")
			return
		}

		accessTokenPlain, refreshTokenPlain, expiresInSeconds, userIdentifier, err := authService.Login(
			request.Context(),
			normalizedEmail,
			decoded.Password,
		)
		if errors.Is(err, finsightAuth.ErrInvalidCredentials) {
			writeError(responseWriter, http.StatusUnauthorized, "invalid email or password")
			return
		}
		if err != nil {
			writeError(responseWriter, http.StatusInternalServerError, err.Error())
			return
		}

		record, fetchErr := repository.GetUserByEmail(request.Context(), normalizedEmail)
		if fetchErr != nil || record == nil {
			writeError(responseWriter, http.StatusInternalServerError, "could not load user profile")
			return
		}
		if record.ID != userIdentifier {
			writeError(responseWriter, http.StatusInternalServerError, "user profile mismatch")
			return
		}

		writeJSON(responseWriter, http.StatusOK, tokenResponseEnvelope{
			AccessToken:  accessTokenPlain,
			RefreshToken: refreshTokenPlain,
			TokenType:    "Bearer",
			ExpiresIn:    expiresInSeconds,
			User: tokenUserSummaryLeaf{
				ID:    userIdentifier,
				Email: record.Email,
			},
		})
	}
}

func authRefreshPOST(authService *finsightAuth.Service) http.HandlerFunc {
	return func(responseWriter http.ResponseWriter, request *http.Request) {
		var decoded refreshRequestEnvelope
		if err := json.NewDecoder(request.Body).Decode(&decoded); err != nil {
			writeError(responseWriter, http.StatusBadRequest, "invalid request body")
			return
		}

		accessPlain, rotatedRefreshPlain, expiresInSeconds, err := authService.Refresh(request.Context(), decoded.RefreshToken)
		if errors.Is(err, finsightAuth.ErrInvalidRefreshToken) {
			writeError(responseWriter, http.StatusUnauthorized, "invalid refresh token")
			return
		}
		if err != nil {
			writeError(responseWriter, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(responseWriter, http.StatusOK, refreshTokenPairEnvelope{
			AccessToken:  accessPlain,
			RefreshToken: rotatedRefreshPlain,
			TokenType:    "Bearer",
			ExpiresIn:    expiresInSeconds,
		})
	}
}

func authLogoutPOST(authService *finsightAuth.Service) http.HandlerFunc {
	return func(responseWriter http.ResponseWriter, request *http.Request) {
		var decoded logoutRequestEnvelope
		if err := json.NewDecoder(request.Body).Decode(&decoded); err != nil {
			writeError(responseWriter, http.StatusBadRequest, "invalid request body")
			return
		}

		logoutErr := authService.LogoutRevoke(request.Context(), decoded.RefreshToken)
		if errors.Is(logoutErr, finsightAuth.ErrInvalidRefreshToken) {
			writeError(responseWriter, http.StatusBadRequest, "refresh_token is required")
			return
		}
		if logoutErr != nil {
			writeError(responseWriter, http.StatusInternalServerError, logoutErr.Error())
			return
		}

		responseWriter.WriteHeader(http.StatusNoContent)
	}
}
