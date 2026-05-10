package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/AntVith/FinSight/backend/db"
)

func InsertRefreshToken(ctx context.Context, userID int, tokenHash []byte, expiresAt time.Time) error {
	_, err := db.DB.ExecContext(ctx, `
		INSERT INTO finsight.refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, tokenHash, expiresAt)
	if err != nil {
		return fmt.Errorf("error inserting refresh token: %w", err)
	}
	return nil
}

// GetActiveRefreshTokenByHash returns token row id and user id if found, unexpired, and not revoked.
func GetActiveRefreshTokenByHash(ctx context.Context, tokenHash []byte) (int, int, error) {
	var tokenID, userIdentifier int
	err := db.DB.QueryRowContext(ctx, `
		SELECT id, user_id
		FROM finsight.refresh_tokens
		WHERE token_hash = $1
		  AND revoked_at IS NULL
		  AND expires_at > NOW()
	`, tokenHash).Scan(&tokenID, &userIdentifier)

	if err == sql.ErrNoRows {
		return 0, 0, nil
	}
	if err != nil {
		return 0, 0, fmt.Errorf("error querying refresh token: %w", err)
	}

	return tokenID, userIdentifier, nil
}

func RevokeRefreshToken(ctx context.Context, tokenID int) error {
	result, err := db.DB.ExecContext(ctx, `
		UPDATE finsight.refresh_tokens
		SET revoked_at = NOW()
		WHERE id = $1 AND revoked_at IS NULL
	`, tokenID)
	if err != nil {
		return fmt.Errorf("error revoking refresh token: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error reading revoke result: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("refresh token not found or already revoked")
	}

	return nil
}

func RevokeAllRefreshTokensForUser(ctx context.Context, userID int) error {
	_, err := db.DB.ExecContext(ctx, `
		UPDATE finsight.refresh_tokens
		SET revoked_at = NOW()
		WHERE user_id = $1 AND revoked_at IS NULL
	`, userID)
	if err != nil {
		return fmt.Errorf("error revoking refresh tokens for user: %w", err)
	}
	return nil
}

// ReplaceRefreshToken revokes oldTokenID inside a transaction and inserts a replacement row for userID.
func ReplaceRefreshToken(ctx context.Context, oldTokenID int, userID int, newTokenHash []byte, expiresAt time.Time) error {
	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("error beginning refresh token transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	updateResult, err := tx.ExecContext(ctx, `
		UPDATE finsight.refresh_tokens
		SET revoked_at = NOW()
		WHERE id = $1 AND revoked_at IS NULL
	`, oldTokenID)
	if err != nil {
		return fmt.Errorf("error revoking rotated refresh token: %w", err)
	}

	updatedRows, err := updateResult.RowsAffected()
	if err != nil {
		return fmt.Errorf("error reading revoke rows: %w", err)
	}
	if updatedRows == 0 {
		return fmt.Errorf("prior refresh token was already revoked")
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO finsight.refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, newTokenHash, expiresAt)
	if err != nil {
		return fmt.Errorf("error inserting replacement refresh token: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error committing refresh token rotation: %w", err)
	}

	return nil
}
