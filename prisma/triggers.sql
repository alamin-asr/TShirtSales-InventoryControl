-- Immutability triggers for append-only tables
-- These triggers prevent UPDATE and DELETE on critical tables

-- Function to block modifications
CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Modifications to % are not allowed. This table is append-only.', TG_TABLE_NAME;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply to sales table
CREATE TRIGGER sales_immutable
  BEFORE UPDATE OR DELETE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION prevent_modification();

-- Apply to sale_items table  
CREATE TRIGGER sale_items_immutable
  BEFORE UPDATE OR DELETE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_modification();

-- Apply to stock_ledger table
CREATE TRIGGER stock_ledger_immutable
  BEFORE UPDATE OR DELETE ON stock_ledger
  FOR EACH ROW
  EXECUTE FUNCTION prevent_modification();

-- Apply to audit_logs table
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_modification();

-- CHECK constraint on buyer_limits (enforced at DB level)
ALTER TABLE buyer_limits ADD CONSTRAINT buyer_limits_max_check CHECK (total_bought >= 0 AND total_bought <= 5);

-- buyer_limits: only allow incrementing total_bought, never decrementing
CREATE OR REPLACE FUNCTION buyer_limits_increment_only()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_bought < OLD.total_bought THEN
    RAISE EXCEPTION 'buyer_limits.total_bought can only be incremented, not decremented';
  END IF;
  -- Allow phone to stay the same (it's the natural key)
  IF NEW.phone != OLD.phone THEN
    RAISE EXCEPTION 'buyer_limits.phone cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER buyer_limits_increment_check
  BEFORE UPDATE ON buyer_limits
  FOR EACH ROW
  EXECUTE FUNCTION buyer_limits_increment_only();

-- Prevent deletion of buyer_limits
CREATE TRIGGER buyer_limits_no_delete
  BEFORE DELETE ON buyer_limits
  FOR EACH ROW
  EXECUTE FUNCTION prevent_modification();

-- Global serial number sequence for sale items
CREATE SEQUENCE IF NOT EXISTS sale_item_serial_seq;

ALTER TABLE sale_items ALTER COLUMN serial_no SET DEFAULT nextval('sale_item_serial_seq');
