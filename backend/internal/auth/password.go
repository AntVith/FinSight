package auth

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func hashPassword(password string, cost int) ([]byte, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), cost)
	if err != nil {
		return nil, fmt.Errorf("error hashing password: %w", err)
	}
	return hashedPassword, nil
}

func passwordMatchesHash(passwordHash, candidatePassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(candidatePassword))
	return err == nil
}
