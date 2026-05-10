package main

import (
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
	if err := godotenv.Load(); err != nil {
		log.Fatal("error loading .env file")
	}

	db.Connect()
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
