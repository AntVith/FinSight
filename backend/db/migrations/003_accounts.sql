CREATE TABLE IF NOT EXISTS finsight.accounts (
    "id"                INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "item_id"           INT NOT NULL REFERENCES finsight.items(id) ON DELETE CASCADE,
    "user_id"           INT NOT NULL REFERENCES finsight.users(id) ON DELETE CASCADE,
    "plaid_account_id"  text NOT NULL UNIQUE,
    "name"              text NOT NULL,
    "official_name"     text,
    "type"              text NOT NULL,
    "subtype"           text,
    "mask"              text,
    "balance_current"   numeric,
    "balance_available" numeric,
    "iso_currency_code" text,
    "created_at"        timestamp NOT NULL DEFAULT NOW(),
    "updated_at"        timestamp NOT NULL DEFAULT NOW()
);

ALTER TABLE finsight.transactions
    ADD COLUMN IF NOT EXISTS "account_id" INT
        REFERENCES finsight.accounts(id) ON DELETE SET NULL;
