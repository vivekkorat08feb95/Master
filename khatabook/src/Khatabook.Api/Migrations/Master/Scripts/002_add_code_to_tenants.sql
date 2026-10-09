-- 002_add_code_to_tenants.sql
-- Ensure code and database_name columns exist on tenants table even if table existed before

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS database_name VARCHAR(100);

-- Populate default code for any existing rows without a code
UPDATE tenants SET code = 'kirana1' WHERE code IS NULL OR code = '';
UPDATE tenants SET database_name = 'khatabook_tenant_' || code WHERE database_name IS NULL OR database_name = '';

-- Add unique constraint/index on code
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_code ON tenants(code);
