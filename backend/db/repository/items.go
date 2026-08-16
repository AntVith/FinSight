package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/lib/pq"

	"github.com/AntVith/FinSight/backend/db"
	"github.com/AntVith/FinSight/backend/internal/crypto"
)

// MaxLinkedItemsPerUser caps how many Plaid items one account may attach.
const MaxLinkedItemsPerUser = 3

var ErrDuplicatePlaidItem = errors.New("institution already linked")
var ErrLinkedItemLimitReached = errors.New("linked account limit reached")

type Item struct {
	ID               int
	UserID           int
	PlaidItemID      string
	PlaidAccessToken string
	Cursor           string
	InstitutionName  string
	CreatedAt        time.Time
}

// SaveItem persists the linked Plaid item and returns the new row ID.
func SaveItem(ctx context.Context, userID int, accessToken string, itemID string, institutionName string) (int, error) {
	encryptedToken, err := crypto.Encrypt(accessToken)
	if err != nil {
		return 0, fmt.Errorf("error encrypting access token: %w", err)
	}

	var newID int
	err = db.DB.QueryRowContext(ctx, `
		INSERT INTO finsight.items (user_id, plaid_item_id, plaid_access_token, institution_name)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, userID, itemID, encryptedToken, institutionName).Scan(&newID)

	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return 0, ErrDuplicatePlaidItem
		}
		return 0, fmt.Errorf("error saving item: %w", err)
	}

	return newID, nil
}

// CountItemsByUserID returns linked item count without decrypting access tokens.
func CountItemsByUserID(ctx context.Context, userID int) (int, error) {
	var count int
	err := db.DB.QueryRowContext(ctx, `
		SELECT COUNT(*)::int
		FROM finsight.items
		WHERE user_id = $1
	`, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("error counting items for user: %w", err)
	}
	return count, nil
}

// PlaidItemExists reports whether a Plaid item id is already stored.
func PlaidItemExists(ctx context.Context, plaidItemID string) (bool, error) {
	var exists bool
	err := db.DB.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM finsight.items WHERE plaid_item_id = $1
		)
	`, plaidItemID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("error checking plaid item: %w", err)
	}
	return exists, nil
}

func GetItemsByUserID(ctx context.Context, userID int) ([]Item, error) {
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, user_id, plaid_item_id, plaid_access_token, COALESCE(cursor, ''), COALESCE(institution_name, ''), created_at
		FROM finsight.items
		WHERE user_id = $1
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("error querying items: %w", err)
	}
	defer rows.Close()

	var items []Item
	for rows.Next() {
		var item Item
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.PlaidItemID,
			&item.PlaidAccessToken,
			&item.Cursor,
			&item.InstitutionName,
			&item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("error scanning item: %w", err)
		}

		item.PlaidAccessToken, err = crypto.Decrypt(item.PlaidAccessToken)
		if err != nil {
			return nil, fmt.Errorf("error decrypting access token: %w", err)
		}

		items = append(items, item)
	}

	return items, nil
}

func UpdateCursor(ctx context.Context, itemID int, cursor string) error {
	_, err := db.DB.ExecContext(ctx, `
		UPDATE finsight.items
		SET cursor = $1, updated_at = NOW()
		WHERE id = $2
	`, cursor, itemID)
	if err != nil {
		return fmt.Errorf("error updating cursor: %w", err)
	}

	return nil
}

// DeleteItemsByUserID removes every linked Plaid item for a user.
// Transactions cascade via the items FK; use this for demo re-seed / force-relink.
func DeleteItemsByUserID(ctx context.Context, userID int) (int64, error) {
	result, err := db.DB.ExecContext(ctx, `
		DELETE FROM finsight.items
		WHERE user_id = $1
	`, userID)
	if err != nil {
		return 0, fmt.Errorf("error deleting items for user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("error reading delete rows affected: %w", err)
	}

	return rowsAffected, nil
}
