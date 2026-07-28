package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/AntVith/FinSight/backend/db/repository"
	finsightAuth "github.com/AntVith/FinSight/backend/internal/auth"
)

// registrationEnabledFromEnv defaults to true when unset so local/dev keep working.
// Set REGISTRATION_ENABLED=false on production to close public signup.
func registrationEnabledFromEnv() bool {
	rawValue := strings.TrimSpace(strings.ToLower(os.Getenv("REGISTRATION_ENABLED")))
	if rawValue == "" {
		return true
	}
	return rawValue == "1" || rawValue == "true" || rawValue == "yes"
}

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
		if !registrationEnabledFromEnv() {
			writeError(responseWriter, http.StatusForbidden, "registration is disabled")
			return
		}

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
		if errors.Is(err, finsightAuth.ErrPasswordTooShort) {
			writeError(responseWriter, http.StatusBadRequest, err.Error())
			return
		}
		if err != nil {
			log.Printf("auth register: %v", err)
			writeError(responseWriter, http.StatusInternalServerError, "registration failed")
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
			log.Printf("auth login: %v", err)
			writeError(responseWriter, http.StatusInternalServerError, "login failed")
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
			log.Printf("auth refresh: %v", err)
			writeError(responseWriter, http.StatusInternalServerError, "token refresh failed")
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
			log.Printf("auth logout: %v", logoutErr)
			writeError(responseWriter, http.StatusInternalServerError, "logout failed")
			return
		}

		responseWriter.WriteHeader(http.StatusNoContent)
	}
}
