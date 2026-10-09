-- 003_add_is_active_to_tenants.sql
-- Ensure is_active column exists on tenants table

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
