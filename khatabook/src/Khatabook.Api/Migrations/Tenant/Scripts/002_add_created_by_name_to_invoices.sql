-- Migration 002: Add created_by_name to invoices for user-wise billing history & indexes
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(150);

CREATE INDEX IF NOT EXISTS idx_invoices_party ON invoices(party_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
