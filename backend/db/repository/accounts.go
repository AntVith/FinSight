package repository

import (
	"context"
	"fmt"

	"github.com/AntVith/FinSight/backend/db"
)

// Account mirrors one row in finsight.accounts.
type Account struct {
	ID               int
	ItemID           int
	UserID           int
	PlaidAccountID   string
	InstitutionName  string
	Name             string
	OfficialName     string
	Type             string
	Subtype          string
	Mask             string
	BalanceCurrent   *float64
	BalanceAvailable *float64
	ISOCurrencyCode  string
}

// UpsertAccounts inserts or updates account rows keyed on plaid_account_id.
// Balances are refreshed on every upsert so the caller always has current values.
func UpsertAccounts(ctx context.Context, accounts []Account) error {
	if len(accounts) == 0 {
		return nil
	}

	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("upsert accounts: begin tx: %w", err)
	}
	defer tx.Rollback()

	for _, a := range accounts {
		_, err := tx.ExecContext(ctx, `
			INSERT INTO finsight.accounts (
				item_id, user_id, plaid_account_id,
				name, official_name, type, subtype, mask,
				balance_current, balance_available, iso_currency_code
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			ON CONFLICT (plaid_account_id) DO UPDATE SET
				name              = EXCLUDED.name,
				official_name     = EXCLUDED.official_name,
				type              = EXCLUDED.type,
				subtype           = EXCLUDED.subtype,
				mask              = EXCLUDED.mask,
				balance_current   = EXCLUDED.balance_current,
				balance_available = EXCLUDED.balance_available,
				iso_currency_code = EXCLUDED.iso_currency_code,
				updated_at        = NOW()
		`, a.ItemID, a.UserID, a.PlaidAccountID,
			a.Name, a.OfficialName, a.Type, a.Subtype, a.Mask,
			a.BalanceCurrent, a.BalanceAvailable, a.ISOCurrencyCode)
		if err != nil {
			return fmt.Errorf("upsert accounts: exec for %s: %w", a.PlaidAccountID, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("upsert accounts: commit: %w", err)
	}
	return nil
}

// GetAccountsByUserID returns all accounts for the given user, joining
// institution_name from finsight.items so callers need only one query.
// Ordered by institution name then account name.
func GetAccountsByUserID(ctx context.Context, userID int) ([]Account, error) {
	rows, err := db.DB.QueryContext(ctx, `
		SELECT
			a.id, a.item_id, a.user_id, a.plaid_account_id,
			COALESCE(i.institution_name, ''),
			a.name, COALESCE(a.official_name, ''),
			a.type, COALESCE(a.subtype, ''), COALESCE(a.mask, ''),
			a.balance_current, a.balance_available,
			COALESCE(a.iso_currency_code, '')
		FROM finsight.accounts a
		JOIN finsight.items i ON i.id = a.item_id
		WHERE a.user_id = $1
		ORDER BY i.institution_name, a.name
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("get accounts by user: query: %w", err)
	}
	defer rows.Close()

	var accounts []Account
	for rows.Next() {
		var a Account
		if err := rows.Scan(
			&a.ID, &a.ItemID, &a.UserID, &a.PlaidAccountID,
			&a.InstitutionName,
			&a.Name, &a.OfficialName,
			&a.Type, &a.Subtype, &a.Mask,
			&a.BalanceCurrent, &a.BalanceAvailable,
			&a.ISOCurrencyCode,
		); err != nil {
			return nil, fmt.Errorf("get accounts by user: scan: %w", err)
		}
		accounts = append(accounts, a)
	}
	return accounts, rows.Err()
}

// GetAccountIDMapByItemID returns a map of plaid_account_id -> accounts.id
// for all accounts belonging to the given item. Used during transaction sync
// to resolve the FK without an extra per-transaction lookup.
func GetAccountIDMapByItemID(ctx context.Context, itemID int) (map[string]int, error) {
	rows, err := db.DB.QueryContext(ctx, `
		SELECT plaid_account_id, id
		FROM finsight.accounts
		WHERE item_id = $1
	`, itemID)
	if err != nil {
		return nil, fmt.Errorf("get account id map: query: %w", err)
	}
	defer rows.Close()

	idMap := make(map[string]int)
	for rows.Next() {
		var plaidID string
		var dbID int
		if err := rows.Scan(&plaidID, &dbID); err != nil {
			return nil, fmt.Errorf("get account id map: scan: %w", err)
		}
		idMap[plaidID] = dbID
	}
	return idMap, rows.Err()
}
