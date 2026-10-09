-- 001_master_schema.sql
-- Master database to track independent retailer tenants and their dedicated databases

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'agro1', 'agro2', 'kirana1', 'garage1'
    name VARCHAR(200) NOT NULL,
    business_type VARCHAR(50) NOT NULL DEFAULT 'Kirana', -- 'Kirana', 'Agro', 'Pharmacy', 'Garage', 'Electronics', 'General'
    database_name VARCHAR(100) NOT NULL, -- e.g. 'khatabook_tenant_agro1'
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    gstin VARCHAR(50),
    currency_symbol VARCHAR(10) DEFAULT '₹',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS database_name VARCHAR(100);

CREATE TABLE IF NOT EXISTS master_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    pin_code VARCHAR(10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES master_users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'Owner', -- 'Owner', 'Manager', 'Cashier'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_tenant UNIQUE(user_id, tenant_id)
);
