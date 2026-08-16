package transactions

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/AntVith/FinSight/backend/db/repository"
	"github.com/AntVith/FinSight/backend/internal/plaid"
	plaidSDK "github.com/plaid/plaid-go/v20/plaid"
)

// SyncTransactions pulls the latest transaction delta from Plaid for the given
// Item and upserts/deletes rows in finsight.transactions. accountIDMap maps
// each plaid_account_id to its finsight.accounts.id so each transaction row
// can be linked to its account.
func SyncTransactions(ctx context.Context, item repository.Item, accountIDMap map[string]int) error {
	var added, modified []plaidSDK.Transaction
	var removed []plaidSDK.RemovedTransaction
	cursor := item.Cursor
	hasMore := true

	for hasMore {
		request := plaidSDK.NewTransactionsSyncRequest(item.PlaidAccessToken)
		if cursor != "" {
			request.SetCursor(cursor)
		}

		resp, _, err := plaid.GetClient().PlaidApi.TransactionsSync(ctx).TransactionsSyncRequest(*request).Execute()
		if err != nil {
			var openAPIErr *plaidSDK.GenericOpenAPIError
			if errors.As(err, &openAPIErr) {
				body := string(openAPIErr.Body())
				log.Printf("plaid /transactions/sync error: item_id=%d body=%s", item.ID, body)
				return fmt.Errorf("error syncing transactions: plaid rejected request: %s", body)
			}
			log.Printf("plaid /transactions/sync error (no body): item_id=%d err=%v", item.ID, err)
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
			date, err := time.Parse("2006-01-02", t.GetDate())
			if err != nil {
				return fmt.Errorf("error parsing date: %w", err)
			}

			category := t.GetPersonalFinanceCategory()

			var accountID *int
			if id, ok := accountIDMap[t.GetAccountId()]; ok {
				accountID = &id
			}

			toUpsert = append(toUpsert, repository.Transaction{
				ItemID:             item.ID,
				UserID:             item.UserID,
				PlaidTransactionID: t.GetTransactionId(),
				Amount:             float64(t.GetAmount()),
				Date:               date,
				Name:               t.GetName(),
				MerchantName:       t.GetMerchantName(),
				CategoryPrimary:    category.GetPrimary(),
				CategoryDetailed:   category.GetDetailed(),
				Pending:            t.GetPending(),
				AccountID:          accountID,
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
