-- Migration 004: Add wholesale pricing and unit of measurement (UOM) conversion support
ALTER TABLE items ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(14, 2) DEFAULT 0.00;
ALTER TABLE items ADD COLUMN IF NOT EXISTS secondary_unit VARCHAR(50);
ALTER TABLE items ADD COLUMN IF NOT EXISTS unit_conversion_ratio NUMERIC(12, 4) DEFAULT 1.0000;

ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS price_tier VARCHAR(20) DEFAULT 'RETAIL';
