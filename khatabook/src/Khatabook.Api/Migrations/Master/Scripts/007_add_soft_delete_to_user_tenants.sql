-- 007_add_soft_delete_to_user_tenants.sql
-- Ensure user_tenants supports soft delete and audit updates

ALTER TABLE user_tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_user_tenants_is_active ON user_tenants(is_active);
