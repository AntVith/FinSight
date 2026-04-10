package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/AntVith/FinSight/backend/db"
)

type Transaction struct {
	ID                 int
	ItemID             int
	UserID             int
	PlaidTransactionID string
	Amount             float64
	Date               time.Time
	Name               string
	MerchantName       string
	CategoryPrimary    string
	CategoryDetailed   string
	Pending            bool
}

func UpsertTransactions(ctx context.Context, transactions []Transaction) error {
	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	// if we run into an error, we rollback the transaction
	defer tx.Rollback()

	for _, t := range transactions {
		_, err := tx.ExecContext(ctx, `
			INSERT INTO finsight.transactions (
				item_id, user_id, plaid_transaction_id, amount, date,
				name, merchant_name, category_primary, category_detailed, pending
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT (plaid_transaction_id) DO UPDATE SET
				amount       = EXCLUDED.amount,
				date         = EXCLUDED.date,
				name         = EXCLUDED.name,
				pending      = EXCLUDED.pending,
				merchant_name    = EXCLUDED.merchant_name,
				category_primary  = EXCLUDED.category_primary,
				category_detailed = EXCLUDED.category_detailed,
				updated_at   = NOW()
		`, t.ItemID, t.UserID, t.PlaidTransactionID, t.Amount, t.Date,
			t.Name, t.MerchantName, t.CategoryPrimary, t.CategoryDetailed, t.Pending)

		if err != nil {
			return fmt.Errorf("error upserting transaction %s: %w", t.PlaidTransactionID, err)
		}
	}
	// commit the transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error committing transaction: %w", err)
	}

	return nil
}

func DeleteTransactions(ctx context.Context, plaidTransactionIDs []string) error {
	if len(plaidTransactionIDs) == 0 {
		return nil
	}

	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback()

	for _, id := range plaidTransactionIDs {
		_, err := tx.ExecContext(ctx, `
			DELETE FROM finsight.transactions
			WHERE plaid_transaction_id = $1
		`, id)
		if err != nil {
			return fmt.Errorf("error deleting transaction %s: %w", id, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error committing transaction: %w", err)
	}

	return nil
}

func GetTransactionsByUserID(ctx context.Context, userID int) ([]Transaction, error) {
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, item_id, user_id, plaid_transaction_id, amount, date,
			name, COALESCE(merchant_name, ''), COALESCE(category_primary, ''),
			COALESCE(category_detailed, ''), pending
		FROM finsight.transactions
		WHERE user_id = $1
		ORDER BY date DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("error querying transactions: %w", err)
	}
	defer rows.Close()

	var transactions []Transaction
	for rows.Next() {
		var t Transaction
		if err := rows.Scan(
			&t.ID, &t.ItemID, &t.UserID, &t.PlaidTransactionID,
			&t.Amount, &t.Date, &t.Name, &t.MerchantName,
			&t.CategoryPrimary, &t.CategoryDetailed, &t.Pending,
		); err != nil {
			return nil, fmt.Errorf("error scanning transaction: %w", err)
		}
		transactions = append(transactions, t)
	}

	return transactions, nil
}