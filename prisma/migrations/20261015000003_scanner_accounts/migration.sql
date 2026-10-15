CREATE TYPE "Role_new" AS ENUM ('SELLER', 'ADMIN', 'SCANNER');

ALTER TABLE "users"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new"),
  ALTER COLUMN "role" SET DEFAULT 'SELLER';

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

ALTER TABLE "users"
  ADD COLUMN "scanner_approved" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "scan_records" (
  "id" UUID NOT NULL,
  "sale_id" UUID NOT NULL,
  "scanner_id" UUID NOT NULL,
  "scanned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scan_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scan_records_sale_id_key" ON "scan_records"("sale_id");
CREATE INDEX "scan_records_scanner_id_idx" ON "scan_records"("scanner_id");
ALTER TABLE "scan_records"
  ADD CONSTRAINT "scan_records_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scan_records"
  ADD CONSTRAINT "scan_records_scanner_id_fkey"
  FOREIGN KEY ("scanner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
