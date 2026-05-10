package auth

import (
	"fmt"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func mintAccessJWT(secret []byte, userIdentifier int, accessTTL time.Duration) (token string, err error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Subject:   strconv.Itoa(userIdentifier),
		IssuedAt:  jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(accessTTL)),
	}

	signedToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
	if err != nil {
		return "", fmt.Errorf("error signing access token: %w", err)
	}

	return signedToken, nil
}

func parseAccessJWT(secret []byte, tokenString string) (int, error) {
	parser := jwt.NewParser(jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	token, err := parser.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, valid := token.Method.(*jwt.SigningMethodHMAC); !valid {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected JWT algorithm")
		}
		return secret, nil
	})
	if err != nil {
		return 0, err
	}

	claims, valid := token.Claims.(*jwt.RegisteredClaims)
	if !(valid && token.Valid) || claims.Subject == "" {
		return 0, fmt.Errorf("invalid access token claims")
	}

	userIdentifier, err := strconv.Atoi(claims.Subject)
	if err != nil {
		return 0, fmt.Errorf("invalid subject in token: %w", err)
	}

	return userIdentifier, nil
}
