package db

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"sort"
	"strings"
)

//go:embed migrations/*.sql
var embeddedMigrationsFs embed.FS

// RunMigrations applies any pending SQL migrations bundled into the binary.
// It tracks applied versions in a schema_migrations table so reruns are safe.
// Designed to be called once at process boot, before any handlers attach.
func RunMigrations(ctx context.Context) error {
	if DB == nil {
		return fmt.Errorf("db.RunMigrations: db.Connect() must be called first")
	}

	if _, err := DB.ExecContext(ctx, `
        CREATE SCHEMA IF NOT EXISTS finsight;
        CREATE TABLE IF NOT EXISTS finsight.schema_migrations (
            version     text PRIMARY KEY,
            applied_at  timestamp NOT NULL DEFAULT NOW()
        );
    `); err != nil {
		return fmt.Errorf("db.RunMigrations: ensure ledger table: %w", err)
	}

	migrationFileEntries, err := fs.ReadDir(embeddedMigrationsFs, "migrations")
	if err != nil {
		return fmt.Errorf("db.RunMigrations: read embedded migrations: %w", err)
	}

	migrationVersionLadder := make([]string, 0, len(migrationFileEntries))
	for _, entryHandle := range migrationFileEntries {
		fileName := entryHandle.Name()
		if entryHandle.IsDir() || !strings.HasSuffix(fileName, ".sql") {
			continue
		}
		migrationVersionLadder = append(migrationVersionLadder, fileName)
	}
	sort.Strings(migrationVersionLadder)

	alreadyAppliedVersionSet, err := loadAppliedMigrationVersionSet(ctx)
	if err != nil {
		return fmt.Errorf("db.RunMigrations: load applied set: %w", err)
	}

	for _, migrationFileName := range migrationVersionLadder {
		if alreadyAppliedVersionSet[migrationFileName] {
			continue
		}
		if err := applyEmbeddedMigrationFile(ctx, migrationFileName); err != nil {
			return fmt.Errorf("db.RunMigrations: apply %s: %w", migrationFileName, err)
		}
		log.Printf("db.RunMigrations: applied %s", migrationFileName)
	}

	return nil
}

func loadAppliedMigrationVersionSet(ctx context.Context) (map[string]bool, error) {
	resolvedSet := make(map[string]bool)
	rows, err := DB.QueryContext(ctx, `SELECT version FROM finsight.schema_migrations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var versionLabel string
		if scanErr := rows.Scan(&versionLabel); scanErr != nil {
			return nil, scanErr
		}
		resolvedSet[versionLabel] = true
	}
	return resolvedSet, rows.Err()
}

func applyEmbeddedMigrationFile(ctx context.Context, migrationFileName string) error {
	rawSqlBytes, err := embeddedMigrationsFs.ReadFile("migrations/" + migrationFileName)
	if err != nil {
		return err
	}
	transactionalHandle, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if _, execErr := transactionalHandle.ExecContext(ctx, string(rawSqlBytes)); execErr != nil {
		_ = transactionalHandle.Rollback()
		return execErr
	}
	if _, recordErr := transactionalHandle.ExecContext(
		ctx,
		`INSERT INTO finsight.schema_migrations (version) VALUES ($1)`,
		migrationFileName,
	); recordErr != nil {
		_ = transactionalHandle.Rollback()
		return recordErr
	}
	return transactionalHandle.Commit()
}
