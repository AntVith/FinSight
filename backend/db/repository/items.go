package repository

import (
	"context"
	"fmt"

	"github.com/AntVith/FinSight/backend/db"
	"github.com/AntVith/FinSight/backend/internal/crypto"
)

type Item struct {
	ID                 int
	UserID             int
	PlaidItemID        string
	PlaidAccessToken   string
	Cursor             string
	InstitutionName    string
}

func SaveItem(ctx context.Context, userID int, accessToken string, itemID string, institutionName string) error {
	encryptedToken, err := crypto.Encrypt(accessToken)
	if err != nil {
		return fmt.Errorf("error encrypting access token: %w", err)
	}

	_, err = db.DB.ExecContext(ctx, `
		INSERT INTO finsight.items (user_id, plaid_item_id, plaid_access_token, institution_name)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (plaid_access_token) DO NOTHING
	`, userID, itemID, encryptedToken, institutionName)

	if err != nil {
		return fmt.Errorf("error saving item: %w", err)
	}

	return nil
}

func GetItemsByUserID(ctx context.Context, userID int) ([]Item, error) {
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, user_id, plaid_item_id, plaid_access_token, COALESCE(cursor, ''), COALESCE(institution_name, '')
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