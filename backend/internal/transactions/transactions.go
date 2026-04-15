package transactions

import (
	"context"
	"fmt"

	"github.com/AntVith/FinSight/backend/db/repository"
	"github.com/AntVith/FinSight/backend/internal/plaid"
	plaidSDK "github.com/plaid/plaid-go/v20/plaid"
)

func SyncTransactions(ctx context.Context, item repository.Item) error {
	var added, modified, removed []plaidSDK.Transaction
	cursor := item.Cursor
	hasMore := true

	for hasMore {
		request := plaidSDK.NewTransactionsSyncRequest(item.PlaidAccessToken)
		if cursor != "" {
			request.SetCursor(cursor)
		}

		resp, _, err := plaid.GetClient().PlaidApi.TransactionsSync(ctx).TransactionsSyncRequest(*request).Execute()
		if err != nil {
			return fmt.Errorf("error syncing transactions: %w", err)
		}

		added = append(added, resp.GetAdded()...)
		modified = append(modified, resp.GetModified()...)
		removed = append(removed, resp.GetRemoved()...)

		hasMore = resp.GetHasMore()
		cursor = resp.GetNextCursor()
	}

	if len(added) > 0 || len(modified) > 0 {
		var toUpsert []repository.Transaction
		for _, t := range append(added, modified...) {
			toUpsert = append(toUpsert, repository.Transaction{
				ItemID:             item.ID,
				UserID:             item.UserID,
				PlaidTransactionID: t.GetTransactionId(),
				Amount:             float64(t.GetAmount()),
				Date:               t.GetDate().Time,
				Name:               t.GetName(),
				MerchantName:       t.GetMerchantName(),
				CategoryPrimary:    t.GetPersonalFinanceCategory().GetPrimary(),
				CategoryDetailed:   t.GetPersonalFinanceCategory().GetDetailed(),
				Pending:            t.GetPending(),
			})
		}

		if err := repository.UpsertTransactions(ctx, toUpsert); err != nil {
			return fmt.Errorf("error upserting transactions: %w", err)
		}
	}

	if len(removed) > 0 {
		var toDelete []string
		for _, t := range removed {
			toDelete = append(toDelete, t.GetTransactionId())
		}

		if err := repository.DeleteTransactions(ctx, toDelete); err != nil {
			return fmt.Errorf("error deleting transactions: %w", err)
		}
	}

	if err := repository.UpdateCursor(ctx, item.ID, cursor); err != nil {
		return fmt.Errorf("error updating cursor: %w", err)
	}

	return nil
}
