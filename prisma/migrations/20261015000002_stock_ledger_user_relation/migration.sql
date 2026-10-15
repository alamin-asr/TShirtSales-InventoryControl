ALTER TABLE "stock_ledger"
ADD CONSTRAINT "stock_ledger_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
