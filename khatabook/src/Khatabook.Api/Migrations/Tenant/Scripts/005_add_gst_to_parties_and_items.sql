-- Migration 005: Add GSTIN and State to parties, and HSN code to invoice items
ALTER TABLE parties ADD COLUMN IF NOT EXISTS gstin VARCHAR(50);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Gujarat';
ALTER TABLE parties ADD COLUMN IF NOT EXISTS state_code VARCHAR(10) DEFAULT '24';

ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50);
