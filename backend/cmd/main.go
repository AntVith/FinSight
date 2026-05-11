package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"

	"github.com/AntVith/FinSight/backend/api"
	"github.com/AntVith/FinSight/backend/db"
	finsightAuth "github.com/AntVith/FinSight/backend/internal/auth"
	"github.com/AntVith/FinSight/backend/internal/plaid"
)

func main() {
	// godotenv.Load is best-effort: production hosts inject env vars directly,
	// so a missing .env file is fine and we keep booting.
	_ = godotenv.Load()

	db.Connect()

	if err := db.RunMigrations(context.Background()); err != nil {
		log.Fatalf("error running database migrations: %v", err)
	}

	plaid.Init()

	authService, err := finsightAuth.NewFromEnv()
	if err != nil {
		log.Fatalf("error initializing auth service: %v", err)
	}

	router := api.NewRouter(authService)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("server starting on port %s\n", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("error starting server: %v", err)
	}
}
