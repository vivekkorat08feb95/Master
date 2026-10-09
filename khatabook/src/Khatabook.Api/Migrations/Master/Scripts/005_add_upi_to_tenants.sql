-- Migration 005: Add UPI VPA and Payee Name to tenants for dynamic QR generation
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS upi_payee_name VARCHAR(150);
