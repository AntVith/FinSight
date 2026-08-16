package accounts

import (
	"context"
	"fmt"

	"github.com/AntVith/FinSight/backend/db/repository"
	"github.com/AntVith/FinSight/backend/internal/plaid"
)

// SyncAccounts fetches all accounts for the given Item from Plaid, upserts
// them into finsight.accounts, and returns a map of plaid_account_id to the
// corresponding finsight.accounts.id. The caller passes this map to
// SyncTransactions so each transaction row can be linked to its account.
func SyncAccounts(ctx context.Context, item repository.Item) (map[string]int, error) {
	plaidAccounts, err := plaid.FetchAccounts(ctx, item.PlaidAccessToken)
	if err != nil {
		return nil, fmt.Errorf("sync accounts: fetch from plaid: %w", err)
	}

	if len(plaidAccounts) == 0 {
		return map[string]int{}, nil
	}

	toUpsert := make([]repository.Account, 0, len(plaidAccounts))
	for _, a := range plaidAccounts {
		balances := a.GetBalances()

		var current, available *float64
		if v, ok := balances.GetCurrentOk(); ok && v != nil {
			f := float64(*v)
			current = &f
		}
		if v, ok := balances.GetAvailableOk(); ok && v != nil {
			f := float64(*v)
			available = &f
		}

		toUpsert = append(toUpsert, repository.Account{
			ItemID:           item.ID,
			UserID:           item.UserID,
			PlaidAccountID:   a.GetAccountId(),
			Name:             a.GetName(),
			OfficialName:     a.GetOfficialName(),
			Type:             string(a.GetType()),
			Subtype:          string(a.GetSubtype()),
			Mask:             a.GetMask(),
			BalanceCurrent:   current,
			BalanceAvailable: available,
			ISOCurrencyCode:  balances.GetIsoCurrencyCode(),
		})
	}

	if err := repository.UpsertAccounts(ctx, toUpsert); err != nil {
		return nil, fmt.Errorf("sync accounts: upsert: %w", err)
	}

	idMap, err := repository.GetAccountIDMapByItemID(ctx, item.ID)
	if err != nil {
		return nil, fmt.Errorf("sync accounts: build id map: %w", err)
	}

	return idMap, nil
}
