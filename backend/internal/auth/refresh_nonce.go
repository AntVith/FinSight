package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"
)

func newRefreshNonce() (plain string, err error) {
	buffer := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, buffer); err != nil {
		return "", fmt.Errorf("error generating refresh token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buffer), nil
}

func refreshNonceHashHex(plain string) []byte {
	sum := sha256.Sum256([]byte(plain))
	return sum[:]
}
