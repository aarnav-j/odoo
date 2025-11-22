-- StockMaster Database Schema
-- PostgreSQL Database Schema for Warehouse/Inventory Management System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- WAREHOUSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LOCATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    uom VARCHAR(50) NOT NULL, -- Unit of Measure (kg, pcs, liters, meters)
    stock DECIMAL(15, 3) DEFAULT 0,
    reorder_level DECIMAL(15, 3) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'in_stock', -- in_stock, low_stock, out_of_stock
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STOCK LEVELS TABLE (Multi-warehouse support)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_levels (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    quantity DECIMAL(15, 3) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, warehouse_id, location_id)
);

-- ============================================
-- RECEIPTS TABLE (Incoming Stock)
-- ============================================
CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    receipt_id VARCHAR(50) UNIQUE NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, waiting, ready, done, canceled
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RECEIPT ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER REFERENCES receipts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(15, 3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DELIVERIES TABLE (Outgoing Stock)
-- ============================================
CREATE TABLE IF NOT EXISTS deliveries (
    id SERIAL PRIMARY KEY,
    delivery_id VARCHAR(50) UNIQUE NOT NULL,
    customer VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, waiting, ready, done, canceled
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DELIVERY ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_items (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER REFERENCES deliveries(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(15, 3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRANSFERS TABLE (Internal Transfers)
-- ============================================
CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    transfer_id VARCHAR(50) UNIQUE NOT NULL,
    from_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
    to_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
    from_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    to_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, in_transit, completed, canceled
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRANSFER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transfer_items (
    id SERIAL PRIMARY KEY,
    transfer_id INTEGER REFERENCES transfers(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(15, 3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ADJUSTMENTS TABLE (Stock Adjustments)
-- ============================================
CREATE TABLE IF NOT EXISTS adjustments (
    id SERIAL PRIMARY KEY,
    adjustment_id VARCHAR(50) UNIQUE NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    counted_quantity DECIMAL(15, 3) NOT NULL,
    system_quantity DECIMAL(15, 3) NOT NULL,
    difference DECIMAL(15, 3) NOT NULL, -- counted - system
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, posted, canceled
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STOCK LEDGER TABLE (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_ledger (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL, -- receipt, delivery, transfer_in, transfer_out, adjustment
    reference_id INTEGER, -- ID of receipt, delivery, transfer, or adjustment
    reference_type VARCHAR(50), -- 'receipt', 'delivery', 'transfer', 'adjustment'
    quantity DECIMAL(15, 3) NOT NULL, -- positive for increases, negative for decreases
    balance_before DECIMAL(15, 3) NOT NULL,
    balance_after DECIMAL(15, 3) NOT NULL,
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES for Performance
-- ============================================

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Receipts indexes
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_id ON receipts(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_product_id ON receipt_items(product_id);

-- Deliveries indexes
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_id ON deliveries(delivery_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(date);
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery_id ON delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_product_id ON delivery_items(product_id);

-- Transfers indexes
CREATE INDEX IF NOT EXISTS idx_transfers_transfer_id ON transfers(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer_id ON transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_product_id ON transfer_items(product_id);

-- Stock ledger indexes
CREATE INDEX IF NOT EXISTS idx_stock_ledger_product_id ON stock_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_transaction_type ON stock_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_created_at ON stock_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_reference ON stock_ledger(reference_type, reference_id);

-- Stock levels indexes
CREATE INDEX IF NOT EXISTS idx_stock_levels_product_id ON stock_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_warehouse_id ON stock_levels(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_location_id ON stock_levels(location_id);

-- Adjustments indexes
CREATE INDEX IF NOT EXISTS idx_adjustments_adjustment_id ON adjustments(adjustment_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_product_id ON adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_status ON adjustments(status);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_levels_updated_at BEFORE UPDATE ON stock_levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfers_updated_at BEFORE UPDATE ON transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adjustments_updated_at BEFORE UPDATE ON adjustments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update product status based on stock and reorder level
CREATE OR REPLACE FUNCTION update_product_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock = 0 THEN
        NEW.status = 'out_of_stock';
    ELSIF NEW.stock <= NEW.reorder_level THEN
        NEW.status = 'low_stock';
    ELSE
        NEW.status = 'in_stock';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update product status
CREATE TRIGGER update_product_status_trigger BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_product_status();

-- ============================================
-- INITIAL DATA (Optional - for testing)
-- ============================================

-- Insert default warehouse
INSERT INTO warehouses (name, address) 
VALUES ('Main Warehouse', '123 Main St, City, Country')
ON CONFLICT DO NOTHING;

-- Insert default location
INSERT INTO locations (warehouse_id, name, description)
SELECT id, 'Main Storage', 'Primary storage location'
FROM warehouses WHERE name = 'Main Warehouse'
ON CONFLICT DO NOTHING;

