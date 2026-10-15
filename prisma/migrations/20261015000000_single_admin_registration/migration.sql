CREATE TABLE "admin_registration_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "registration_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "admin_registration_state_pkey" PRIMARY KEY ("id")
);

-- Only one administrator can ever exist, regardless of concurrent requests.
CREATE UNIQUE INDEX "users_single_admin_idx"
ON "users" ("role")
WHERE "role" = 'ADMIN';

-- Existing seeded administrators mean the one-time registration has already happened.
INSERT INTO "admin_registration_state" ("id", "registration_closed", "updated_at")
SELECT 1, EXISTS (SELECT 1 FROM "users" WHERE "role" = 'ADMIN'), CURRENT_TIMESTAMP
ON CONFLICT ("id") DO NOTHING;
