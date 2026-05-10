package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/AntVith/FinSight/backend/db/repository"
)

const minimumPasswordCharacters = 10

var ErrInvalidCredentials = errors.New("invalid credentials")
var ErrInvalidRefreshToken = errors.New("invalid refresh token")

type Service struct {
	jwtSecret  []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
	bcryptCost int
}

func NewFromEnv() (*Service, error) {
	rawSecret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if len(rawSecret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET must be set with at least 32 characters")
	}

	accessSeconds, err := intFromEnvironment("ACCESS_TOKEN_TTL_SECONDS", 900)
	if err != nil {
		return nil, err
	}
	refreshSeconds, err := intFromEnvironment("REFRESH_TOKEN_TTL_SECONDS", 604800)
	if err != nil {
		return nil, err
	}
	rawCostValue, err := intFromEnvironment("AUTH_BCRYPT_COST", 10)
	if err != nil {
		return nil, err
	}
	bcryptCost := int(rawCostValue)
	if bcryptCost < bcrypt.MinCost || bcryptCost > bcrypt.MaxCost {
		return nil, fmt.Errorf(
			"AUTH_BCRYPT_COST must be between golang.org/x/crypto/bcrypt.MinCost (%d) and MaxCost (%d) inclusive",
			bcrypt.MinCost,
			bcrypt.MaxCost,
		)
	}

	return &Service{
		jwtSecret:  []byte(rawSecret),
		accessTTL:  time.Duration(accessSeconds) * time.Second,
		refreshTTL: time.Duration(refreshSeconds) * time.Second,
		bcryptCost: bcryptCost,
	}, nil
}

func intFromEnvironment(key string, defaultValue int64) (int64, error) {
	rawValue := strings.TrimSpace(os.Getenv(key))
	if rawValue == "" {
		return defaultValue, nil
	}
	value, err := strconv.ParseInt(rawValue, 10, 64)
	if err != nil || value <= 0 {
		return 0, fmt.Errorf("invalid integer for environment variable %s", key)
	}
	return value, nil
}

func (service *Service) AccessTTLSeconds() int64 {
	return int64(service.accessTTL / time.Second)
}

func validateNewPassword(candidate string) error {
	if len(candidate) < minimumPasswordCharacters {
		return fmt.Errorf("password must be at least %d characters", minimumPasswordCharacters)
	}
	return nil
}

// Register persists a user with a bcrypt password and returns bearer plus refresh payloads.
func (service *Service) Register(ctx context.Context, email string, password string, firstName string, lastName string) (
	accessToken string,
	refreshToken string,
	expiresIn int64,
	userIdentifier int,
	err error,
) {
	if err := validateNewPassword(password); err != nil {
		return "", "", 0, 0, err
	}

	passwordHashBytes, err := hashPassword(password, service.bcryptCost)
	if err != nil {
		return "", "", 0, 0, err
	}

	userIdentifier, err = repository.CreateUser(ctx, email, string(passwordHashBytes), firstName, lastName)
	if err != nil {
		return "", "", 0, 0, err
	}

	accessToken, refreshToken, expiresIn, err = service.issueStoredRefreshPair(ctx, userIdentifier)
	if err != nil {
		return "", "", 0, 0, err
	}

	return accessToken, refreshToken, expiresIn, userIdentifier, nil
}

// Login verifies credentials and issues tokens for an existing password-backed user.
func (service *Service) Login(ctx context.Context, email string, password string) (
	accessToken string,
	refreshToken string,
	expiresIn int64,
	userIdentifier int,
	err error,
) {
	record, err := repository.GetUserByEmail(ctx, email)
	if err != nil {
		return "", "", 0, 0, err
	}
	if record == nil || record.PasswordHash == "" || !passwordMatchesHash(record.PasswordHash, password) {
		return "", "", 0, 0, ErrInvalidCredentials
	}

	userIdentifier = record.ID
	accessToken, refreshToken, expiresIn, err = service.issueStoredRefreshPair(ctx, userIdentifier)
	if err != nil {
		return "", "", 0, 0, err
	}

	return accessToken, refreshToken, expiresIn, userIdentifier, nil
}

func (service *Service) issueStoredRefreshPair(ctx context.Context, userIdentifier int) (
	accessToken string,
	refreshPlain string,
	expiresIn int64,
	err error,
) {
	accessToken, err = mintAccessJWT(service.jwtSecret, userIdentifier, service.accessTTL)
	if err != nil {
		return "", "", 0, err
	}

	refreshPlain, err = newRefreshNonce()
	if err != nil {
		return "", "", 0, err
	}

	digestBytes := refreshNonceHashHex(refreshPlain)
	expiresRefresh := time.Now().Add(service.refreshTTL)
	if err := repository.InsertRefreshToken(ctx, userIdentifier, digestBytes, expiresRefresh); err != nil {
		return "", "", 0, err
	}

	expiresIn = service.AccessTTLSeconds()
	return accessToken, refreshPlain, expiresIn, nil
}

// BearerMiddleware requires a syntactically valid Authorization: Bearer <JWT> containing a usable access token.
func (service *Service) BearerMiddleware(next http.Handler) http.Handler {
	const bearerPrefix = "Bearer "

	writeUnauthorizedJSON := func(responseWriter http.ResponseWriter, message string) {
		responseWriter.Header().Set("Content-Type", "application/json")
		responseWriter.WriteHeader(http.StatusUnauthorized)
		encoderError := json.NewEncoder(responseWriter).Encode(map[string]string{"error": message})
		if encoderError != nil {
			return
		}
	}

	return http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
		headerAuthorization := strings.TrimSpace(request.Header.Get("Authorization"))
		if headerAuthorization == "" || !strings.HasPrefix(headerAuthorization, bearerPrefix) {
			writeUnauthorizedJSON(responseWriter, "missing or invalid authorization header")
			return
		}

		tokenCandidate := strings.TrimSpace(strings.TrimPrefix(headerAuthorization, bearerPrefix))
		if tokenCandidate == "" {
			writeUnauthorizedJSON(responseWriter, "missing access token")
			return
		}

		userIdentifier, parseErr := parseAccessJWT(service.jwtSecret, tokenCandidate)
		if parseErr != nil {
			writeUnauthorizedJSON(responseWriter, "invalid or expired access token")
			return
		}

		nextCtx := WithAuthenticatedUser(request.Context(), userIdentifier)
		next.ServeHTTP(responseWriter, request.WithContext(nextCtx))
	})
}

// Refresh rotates the opaque refresh nonce and mints a new access JWT.
func (service *Service) Refresh(ctx context.Context, refreshPlain string) (
	accessToken string,
	nextRefreshPlain string,
	expiresIn int64,
	err error,
) {
	if strings.TrimSpace(refreshPlain) == "" {
		return "", "", 0, ErrInvalidRefreshToken
	}

	tokenHashDigest := refreshNonceHashHex(refreshPlain)
	previousIdentifier, storedUserIdentifier, lookupErr := repository.GetActiveRefreshTokenByHash(ctx, tokenHashDigest)
	if lookupErr != nil {
		return "", "", 0, lookupErr
	}
	if previousIdentifier == 0 {
		return "", "", 0, ErrInvalidRefreshToken
	}

	newRefreshPlain, err := newRefreshNonce()
	if err != nil {
		return "", "", 0, err
	}
	newDigestBytes := refreshNonceHashHex(newRefreshPlain)
	expiresRefresh := time.Now().Add(service.refreshTTL)

	rotateErr := repository.ReplaceRefreshToken(ctx, previousIdentifier, storedUserIdentifier, newDigestBytes, expiresRefresh)
	if rotateErr != nil {
		return "", "", 0, rotateErr
	}

	accessToken, err = mintAccessJWT(service.jwtSecret, storedUserIdentifier, service.accessTTL)
	if err != nil {
		return "", "", 0, err
	}

	return accessToken, newRefreshPlain, service.AccessTTLSeconds(), nil
}

// LogoutRevoke revokes stored refresh nonce if active (successful no-op if unknown).
func (service *Service) LogoutRevoke(ctx context.Context, refreshPlain string) error {
	if strings.TrimSpace(refreshPlain) == "" {
		return ErrInvalidRefreshToken
	}
	tokenDigest := refreshNonceHashHex(refreshPlain)
	activeIdentifier, _, lookupErr := repository.GetActiveRefreshTokenByHash(ctx, tokenDigest)
	if lookupErr != nil {
		return lookupErr
	}
	if activeIdentifier == 0 {
		return nil
	}
	return repository.RevokeRefreshToken(ctx, activeIdentifier)
}
