-- Migration 004: Add logo, tagline, gstin, and invoice notes to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tagline VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gstin VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS print_header_note TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS print_footer_note TEXT;
