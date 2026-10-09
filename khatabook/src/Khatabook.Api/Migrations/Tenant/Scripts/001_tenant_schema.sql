-- 001_tenant_schema.sql
-- Dedicated tenant database schema for retail businesses (Kirana, Agro, Pharmacy, Garage, Electronics)

CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    party_type VARCHAR(20) NOT NULL, -- 'CUSTOMER' or 'SUPPLIER'
    vehicle_number VARCHAR(50),      -- Specialized for Garage / Auto
    dl_number VARCHAR(50),           -- Specialized for Pharmacy Drug License
    opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- Positive: They owe you (Debit), Negative: You owe them (Credit)
    credit_limit NUMERIC(14, 2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parties_phone ON parties(phone);

CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    barcode VARCHAR(100),
    sku VARCHAR(100),
    category VARCHAR(100) DEFAULT 'General',
    unit VARCHAR(20) NOT NULL DEFAULT 'Pcs', -- 'Pcs', 'Kg', 'Bag', 'Strip', 'Box', 'Ltr', 'Service'
    purchase_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    mrp NUMERIC(14, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    hsn_code VARCHAR(50),

    -- Generic Industry Extensions
    batch_number VARCHAR(100),       -- For Agro pesticides/seeds & Pharmacy medicines
    expiry_date DATE,                -- For Agro & Pharmacy expiry alert
    mfg_date DATE,
    serial_imei VARCHAR(100),        -- For Electronics & Mobiles
    part_number VARCHAR(100),        -- For Vehicle Garage & Spares

    current_stock NUMERIC(14, 3) NOT NULL DEFAULT 0.000,
    min_stock_alert NUMERIC(14, 3) DEFAULT 5.000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_items_batch ON items(batch_number);

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL, -- 'INITIAL', 'SALE', 'PURCHASE', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SUB'
    quantity NUMERIC(14, 3) NOT NULL,
    unit_price NUMERIC(14, 2) DEFAULT 0.00,
    stock_after NUMERIC(14, 3) NOT NULL,
    reference_id UUID,
    reason VARCHAR(255), -- 'Damage', 'Expired', 'Lost', 'Recount', 'Sample', 'Return'
    batch_number VARCHAR(100),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) NOT NULL,
    invoice_type VARCHAR(20) NOT NULL DEFAULT 'SALE', -- 'SALE' or 'PURCHASE'
    party_id UUID REFERENCES parties(id) ON DELETE SET NULL,
    party_name VARCHAR(200),
    party_phone VARCHAR(20),
    vehicle_number VARCHAR(50),     -- For Garage Service Bills
    doctor_name VARCHAR(150),       -- For Pharmacy Prescriptions
    patient_name VARCHAR(150),      -- For Pharmacy Prescriptions
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID', -- 'PAID', 'PARTIAL', 'UNPAID'
    payment_mode VARCHAR(50) DEFAULT 'CASH', -- 'CASH', 'UPI', 'CREDIT'
    notes TEXT,
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    item_name VARCHAR(200) NOT NULL,
    unit VARCHAR(20) DEFAULT 'Pcs',
    batch_number VARCHAR(100),
    expiry_date DATE,
    quantity NUMERIC(14, 3) NOT NULL,
    unit_price NUMERIC(14, 2) NOT NULL,
    discount_amount NUMERIC(14, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    tax_amount NUMERIC(14, 2) DEFAULT 0.00,
    total NUMERIC(14, 2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    txn_type VARCHAR(20) NOT NULL, -- 'DEBIT' (You Gave / Udhaar), 'CREDIT' (You Got / Jama)
    amount NUMERIC(14, 2) NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'CASH', -- 'CASH', 'UPI', 'BANK', 'CHEQUE'
    description TEXT,
    txn_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_party ON transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(txn_date);
