package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"

	"github.com/AntVith/FinSight/backend/db"
)

var ErrEmailTaken = errors.New("email already registered")

type User struct {
	ID            int
	Email         string
	PasswordHash  string
	FirstName     string
	LastName      string
	EmailVerified bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func CreateUser(ctx context.Context, email, passwordHash, firstName, lastName string) (int, error) {
	normalized := normalizeEmail(email)

	var identifier int
	err := db.DB.QueryRowContext(ctx, `
		INSERT INTO finsight.users (email, password_hash, first_name, last_name, email_verified)
		VALUES ($1, $2, NULLIF(trim($3), ''), NULLIF(trim($4), ''), FALSE)
		RETURNING id
	`, normalized, passwordHash, firstName, lastName).Scan(&identifier)

	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return 0, ErrEmailTaken
		}
		return 0, fmt.Errorf("error creating user: %w", err)
	}

	return identifier, nil
}

func GetUserByEmail(ctx context.Context, email string) (*User, error) {
	normalized := normalizeEmail(email)

	var user User
	err := db.DB.QueryRowContext(ctx, `
		SELECT id, email, COALESCE(password_hash, ''), COALESCE(first_name, ''), COALESCE(last_name, ''),
		       email_verified, created_at, updated_at
		FROM finsight.users
		WHERE email = $1
	`, normalized).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.EmailVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error querying user: %w", err)
	}

	return &user, nil
}
