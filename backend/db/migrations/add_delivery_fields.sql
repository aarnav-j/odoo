-- Migration: Add new fields to deliveries table
-- Run this to update existing database schema

-- Add new columns to deliveries table
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS reference VARCHAR(50),
ADD COLUMN IF NOT EXISTS from_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS to_customer VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact VARCHAR(255),
ADD COLUMN IF NOT EXISTS schedule_date DATE,
ADD COLUMN IF NOT EXISTS responsible VARCHAR(255),
ADD COLUMN IF NOT EXISTS operation_type VARCHAR(100) DEFAULT 'Delivery Order',
ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- Update delivery_id to use reference format if reference is null
-- This will be handled by the application code

-- Add reserved_stock and other fields to delivery_items
ALTER TABLE delivery_items
ADD COLUMN IF NOT EXISTS reserved_stock DECIMAL(15, 3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS picked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS packed BOOLEAN DEFAULT FALSE;

-- Add index for reference
CREATE INDEX IF NOT EXISTS idx_deliveries_reference ON deliveries(reference);
CREATE INDEX IF NOT EXISTS idx_deliveries_schedule_date ON deliveries(schedule_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_contact ON deliveries(contact);

-- Create stock_moves table for tracking stock movements
CREATE TABLE IF NOT EXISTS stock_moves (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(50),
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    from_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    to_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    quantity DECIMAL(15, 3) NOT NULL,
    operation_type VARCHAR(50) NOT NULL DEFAULT 'delivery',
    related_document_id INTEGER, -- Reference to delivery, receipt, etc.
    related_document_type VARCHAR(50), -- 'delivery', 'receipt', 'transfer'
    status VARCHAR(50) DEFAULT 'pending', -- pending, done, canceled
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_moves_reference ON stock_moves(reference);
CREATE INDEX IF NOT EXISTS idx_stock_moves_product_id ON stock_moves(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_related_document ON stock_moves(related_document_type, related_document_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_status ON stock_moves(status);

-- Add trigger for stock_moves updated_at
CREATE TRIGGER update_stock_moves_updated_at BEFORE UPDATE ON stock_moves
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


