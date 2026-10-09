-- Migration 006: Add Single Active Device / Session Enforcement fields to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enforce_single_session BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS current_session_token VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_login_device VARCHAR(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
