// Command seeddemo provisions the demo user and links First Platypus Bank via Plaid sandbox.
//
// Idempotent: safe to re-run. Creates the FinSight account if missing, mints a sandbox
// public_token for First Platypus Bank (ins_109508) if the user has no items yet, exchanges
// it, encrypts + stores the access token, and (unless --skip-sync is passed) pulls the
// initial transaction set and regenerates AI insights.
//
// Required env (read from backend/.env):
//   DEMO_USER_EMAIL, DEMO_USER_PASSWORD, plus standard DATABASE_URL / PLAID_* / ENCRYPTION_KEY / JWT_SECRET.
//   Insights require CLAUDE_API_KEY; omit it (or pass --skip-sync) to skip insight generation.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	plaidSDK "github.com/plaid/plaid-go/v20/plaid"

	"github.com/AntVith/FinSight/backend/db"
	"github.com/AntVith/FinSight/backend/db/repository"
	finsightAuth "github.com/AntVith/FinSight/backend/internal/auth"
	"github.com/AntVith/FinSight/backend/internal/insights"
	finsightPlaid "github.com/AntVith/FinSight/backend/internal/plaid"
	"github.com/AntVith/FinSight/backend/internal/transactions"
)

const (
	firstPlatypusBankInstitutionID = "ins_109508"
	firstPlatypusBankDisplayName   = "First Platypus Bank"
)

func main() {
	skipPlaidLink := flag.Bool("skip-plaid", false, "Skip Plaid sandbox public_token creation + exchange (just seed the user account)")
	skipSync := flag.Bool("skip-sync", false, "Skip initial transaction sync + insight generation after linking")
	forceRelink := flag.Bool("force-relink", false, "Delete existing Plaid items for the demo user and create a fresh First Platypus Bank link (use after ENCRYPTION_KEY rotation or stale sandbox tokens)")
	flag.Parse()

	if err := godotenv.Load(); err != nil {
		log.Printf("seeddemo: no .env file found at %s, relying on process env", mustWorkingDir())
	}

	demoMailbox := strings.TrimSpace(os.Getenv("DEMO_USER_EMAIL"))
	demoPasswordPlain := os.Getenv("DEMO_USER_PASSWORD")
	if demoMailbox == "" || demoPasswordPlain == "" {
		log.Fatal("DEMO_USER_EMAIL and DEMO_USER_PASSWORD must be set in backend/.env")
	}

	db.Connect()
	finsightPlaid.Init()

	authService, err := finsightAuth.NewFromEnv()
	if err != nil {
		log.Fatalf("seeddemo: auth service init failed: %v", err)
	}

	ctx := context.Background()

	demoUserIdentifier, userWasJustCreated, err := ensureDemoUserExists(
		ctx,
		authService,
		demoMailbox,
		demoPasswordPlain,
	)
	if err != nil {
		log.Fatalf("seeddemo: ensure user: %v", err)
	}
	if userWasJustCreated {
		fmt.Printf("seeddemo: created user id=%d email=%s\n", demoUserIdentifier, demoMailbox)
	} else {
		fmt.Printf("seeddemo: user already present id=%d email=%s\n", demoUserIdentifier, demoMailbox)
	}

	if *skipPlaidLink {
		fmt.Println("seeddemo: --skip-plaid set, skipping institution link")
		return
	}

	priorItemCollection, err := repository.GetItemsByUserID(ctx, demoUserIdentifier)
	if err != nil {
		// Stale ciphertext from an ENCRYPTION_KEY rotation cannot be decrypted; treat as
		// "items exist but are unusable" and require --force-relink to recover.
		if *forceRelink {
			fmt.Printf("seeddemo: existing items unreadable (%v); --force-relink will replace them\n", err)
			priorItemCollection = nil
		} else {
			log.Fatalf("seeddemo: query existing items: %v\nHint: if ENCRYPTION_KEY changed, re-run with --force-relink", err)
		}
	}

	if *forceRelink {
		deletedCount, deleteErr := repository.DeleteItemsByUserID(ctx, demoUserIdentifier)
		if deleteErr != nil {
			log.Fatalf("seeddemo: force-relink delete items: %v", deleteErr)
		}
		fmt.Printf("seeddemo: --force-relink removed %d existing item(s)\n", deletedCount)
		priorItemCollection = nil
	}

	if len(priorItemCollection) == 0 {
		if err := provisionFirstPlatypusSandboxLinkage(ctx, demoUserIdentifier); err != nil {
			log.Fatalf("seeddemo: link First Platypus Bank: %v", err)
		}
		fmt.Printf("seeddemo: linked %s sandbox item for demo user\n", firstPlatypusBankDisplayName)
	} else {
		fmt.Printf("seeddemo: demo user already has %d linked item(s); skipping Plaid link (pass --force-relink to replace)\n", len(priorItemCollection))
	}

	if *skipSync {
		fmt.Println("seeddemo: --skip-sync set, skipping transaction sync + insight generation")
		return
	}

	if err := executeInitialSyncAndInsight(ctx, demoUserIdentifier); err != nil {
		log.Printf("seeddemo: warning, sync/insight step reported an error: %v", err)
		fmt.Println("seeddemo: continuing, login + Plaid linkage already persisted")
		return
	}
	fmt.Println("seeddemo: completed transaction sync + insight regeneration")
}

func mustWorkingDir() string {
	cwd, err := os.Getwd()
	if err != nil {
		return "<unknown>"
	}
	return cwd
}

func ensureDemoUserExists(
	ctx context.Context,
	authService *finsightAuth.Service,
	mailbox string,
	plaintextPassword string,
) (int, bool, error) {
	existingUser, err := repository.GetUserByEmail(ctx, mailbox)
	if err != nil {
		return 0, false, fmt.Errorf("lookup existing demo user: %w", err)
	}
	if existingUser != nil {
		return existingUser.ID, false, nil
	}

	_, _, _, demoUserIdentifier, registerErr := authService.Register(
		ctx,
		mailbox,
		plaintextPassword,
		"Demo",
		"User",
	)
	if registerErr != nil {
		if errors.Is(registerErr, repository.ErrEmailTaken) {
			refreshedLookup, lookupErr := repository.GetUserByEmail(ctx, mailbox)
			if lookupErr != nil || refreshedLookup == nil {
				return 0, false, fmt.Errorf("race condition: email reported taken but lookup failed: %w", lookupErr)
			}
			return refreshedLookup.ID, false, nil
		}
		return 0, false, fmt.Errorf("register demo user: %w", registerErr)
	}

	return demoUserIdentifier, true, nil
}

func provisionFirstPlatypusSandboxLinkage(ctx context.Context, demoUserIdentifier int) error {
	sandboxRequest := plaidSDK.NewSandboxPublicTokenCreateRequest(
		firstPlatypusBankInstitutionID,
		[]plaidSDK.Products{plaidSDK.PRODUCTS_TRANSACTIONS},
	)

	sandboxResponse, _, err := finsightPlaid.GetClient().PlaidApi.
		SandboxPublicTokenCreate(ctx).
		SandboxPublicTokenCreateRequest(*sandboxRequest).
		Execute()
	if err != nil {
		return fmt.Errorf("plaid sandbox public_token: %w", err)
	}

	publicTokenPlain := sandboxResponse.GetPublicToken()
	if publicTokenPlain == "" {
		return fmt.Errorf("plaid sandbox returned an empty public_token")
	}

	accessTokenPlain, plaidItemID, err := finsightPlaid.ExchangePublicToken(ctx, publicTokenPlain)
	if err != nil {
		return fmt.Errorf("exchange public_token: %w", err)
	}

	if err := repository.SaveItem(
		ctx,
		demoUserIdentifier,
		accessTokenPlain,
		plaidItemID,
		firstPlatypusBankDisplayName,
	); err != nil {
		return fmt.Errorf("save item: %w", err)
	}

	return nil
}

func executeInitialSyncAndInsight(ctx context.Context, demoUserIdentifier int) error {
	refreshedItems, err := repository.GetItemsByUserID(ctx, demoUserIdentifier)
	if err != nil {
		return fmt.Errorf("re-query items: %w", err)
	}
	if len(refreshedItems) == 0 {
		return fmt.Errorf("no linked items found after provisioning")
	}

	// Sandbox items often return an empty /transactions/sync page for a few
	// seconds after public_token create. Retry briefly before giving up.
	var allDemoTransactions []repository.Transaction
	const maxSyncAttempts = 5
	for attempt := 1; attempt <= maxSyncAttempts; attempt++ {
		for _, linkedItem := range refreshedItems {
			if err := transactions.SyncTransactions(ctx, linkedItem); err != nil {
				return fmt.Errorf("sync transactions: %w", err)
			}
		}

		// Reload items so subsequent attempts use the updated cursor.
		refreshedItems, err = repository.GetItemsByUserID(ctx, demoUserIdentifier)
		if err != nil {
			return fmt.Errorf("re-query items after sync: %w", err)
		}

		allDemoTransactions, err = repository.GetTransactionsByUserID(ctx, demoUserIdentifier)
		if err != nil {
			return fmt.Errorf("read synced transactions: %w", err)
		}

		if len(allDemoTransactions) > 0 {
			break
		}
		if attempt < maxSyncAttempts {
			fmt.Printf("seeddemo: sync attempt %d returned 0 transactions; waiting for sandbox readiness…\n", attempt)
			time.Sleep(2 * time.Second)
		}
	}

	fmt.Printf("seeddemo: synced %d transactions for demo user\n", len(allDemoTransactions))

	if len(allDemoTransactions) == 0 {
		return fmt.Errorf("plaid sandbox returned no transactions after %d attempts; re-run seeddemo or POST /api/transactions/sync after a short wait", maxSyncAttempts)
	}

	if strings.TrimSpace(os.Getenv("CLAUDE_API_KEY")) == "" {
		fmt.Println("seeddemo: CLAUDE_API_KEY not set, skipping AI insight generation")
		return nil
	}

	if err := insights.GenerateInsight(ctx, demoUserIdentifier, allDemoTransactions); err != nil {
		return fmt.Errorf("generate insight: %w", err)
	}

	return nil
}
