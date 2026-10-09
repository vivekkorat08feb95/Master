-- Migration 003: Add native_name support for Items, Parties, and Invoice Items
ALTER TABLE items ADD COLUMN IF NOT EXISTS native_name VARCHAR(200);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS native_name VARCHAR(200);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS native_name VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_items_native_name ON items(native_name);
CREATE INDEX IF NOT EXISTS idx_parties_native_name ON parties(native_name);
