-- Migration: 008_create_audit_logs_table.sql
-- Database: khatabook_master
-- Description: Centralized audit logging table for full-context API requests, device fingerprints, and performance metrics

CREATE TABLE IF NOT EXISTS audit_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id      VARCHAR(64) NOT NULL,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Tenant & User Context
    tenant_id           UUID NULL,
    tenant_code         VARCHAR(50) NULL,
    user_id             UUID NULL,
    user_name           VARCHAR(100) NULL,
    user_role           VARCHAR(50) NULL,
    
    -- Request Details
    http_method         VARCHAR(10) NOT NULL,
    endpoint            VARCHAR(255) NOT NULL,
    query_string        TEXT NULL,
    status_code         INT NOT NULL,
    duration_ms         NUMERIC(10, 2) NOT NULL,
    
    -- Client & Device Fingerprint
    client_ip           VARCHAR(45) NOT NULL,
    device_type         VARCHAR(30) NOT NULL,
    platform_os         VARCHAR(100) NULL,
    browser             VARCHAR(100) NULL,
    user_agent          TEXT NULL,
    
    -- Payloads (Masked JSON)
    request_payload     TEXT NULL,
    response_payload    TEXT NULL,
    error_message       TEXT NULL
);

-- Indices for fast searching and admin analytics
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_code ON audit_logs(tenant_code, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status_code ON audit_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_device_type ON audit_logs(device_type);
