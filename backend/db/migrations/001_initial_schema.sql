CREATE SCHEMA IF NOT EXISTS finsight;
SET search_path TO finsight;


CREATE TABLE IF NOT EXISTS users (
    "id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "email" text NOT NULL,
    "password_hash" text,
    "first_name" text,
    "last_name" text,
    "created_at" timestamp NOT NULL DEFAULT NOW(),
    "updated_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
    "id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "plaid_item_id" text NOT NULL UNIQUE,
    "plaid_access_token" text NOT NULL UNIQUE,
    "cursor" text,
    "institution_name" text,
    "created_at" timestamp NOT NULL DEFAULT NOW(),
    "updated_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    "id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "item_id" INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    "user_id" INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "plaid_transaction_id" text NOT NULL UNIQUE,
    "amount" numeric NOT NULL,
    "date" date NOT NULL,
    "name" text NOT NULL,
    "merchant_name" text,
    "category_primary" text,
    "category_detailed" text,
    "pending" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" timestamp NOT NULL DEFAULT NOW(),
    "updated_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insights (
    "id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "user_id" INT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    "summary" text,
    "top_categories" jsonb,
    "recommendations" jsonb,
    "anomalies" jsonb,
    "created_at" timestamp NOT NULL DEFAULT NOW(),
    "updated_at" timestamp NOT NULL DEFAULT NOW()
);


INSERT INTO users (email, first_name, last_name)
VALUES ('dev@finsight.com', 'Dev', 'User')
ON CONFLICT (email) DO NOTHING;