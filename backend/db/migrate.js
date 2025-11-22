import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run migration to add new fields and columns
 */
export async function runMigration() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('Running migrations...');

    // Migration 1: Add role and is_verified columns to users table
    console.log('  Migration 1: Adding columns to users table...');
    const checkUsersColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('role', 'is_verified')
    `);

    if (checkUsersColumns.rows.length < 2) {
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
        ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE
      `);
      console.log('  ✅ Added role and is_verified columns to users table');
    } else {
      console.log('  ⚠️  Users columns already exist');
    }

    // Migration 2: Add delivery fields
    console.log('  Migration 2: Adding columns to deliveries table...');
    // Check if columns already exist
    const checkColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'deliveries' AND column_name = 'reference'
    `);

    if (checkColumns.rows.length > 0) {
      console.log('  ⚠️  Delivery columns already applied. Skipping...');
    } else {
      // Add new columns to deliveries table
      console.log('  Adding columns to deliveries table...');
      await client.query(`
      ALTER TABLE deliveries
      ADD COLUMN IF NOT EXISTS reference VARCHAR(50),
      ADD COLUMN IF NOT EXISTS from_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS to_customer VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact VARCHAR(255),
      ADD COLUMN IF NOT EXISTS schedule_date DATE,
      ADD COLUMN IF NOT EXISTS responsible VARCHAR(255),
      ADD COLUMN IF NOT EXISTS operation_type VARCHAR(100) DEFAULT 'Delivery Order',
      ADD COLUMN IF NOT EXISTS delivery_address TEXT
    `);

      // Add new columns to delivery_items table
      console.log('  Adding columns to delivery_items table...');
      await client.query(`
        ALTER TABLE delivery_items
        ADD COLUMN IF NOT EXISTS reserved_stock DECIMAL(15, 3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS picked BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS packed BOOLEAN DEFAULT FALSE
      `);

      // Create indexes
      console.log('  Creating indexes...');
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_deliveries_reference ON deliveries(reference);
        CREATE INDEX IF NOT EXISTS idx_deliveries_schedule_date ON deliveries(schedule_date);
        CREATE INDEX IF NOT EXISTS idx_deliveries_contact ON deliveries(contact);
      `);

      // Create stock_moves table if it doesn't exist
      console.log('  Creating stock_moves table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS stock_moves (
          id SERIAL PRIMARY KEY,
          reference VARCHAR(50),
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
          from_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
          to_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
          quantity DECIMAL(15, 3) NOT NULL,
          operation_type VARCHAR(50) NOT NULL DEFAULT 'delivery',
          related_document_id INTEGER,
          related_document_type VARCHAR(50),
          status VARCHAR(50) DEFAULT 'pending',
          date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for stock_moves
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_stock_moves_reference ON stock_moves(reference);
        CREATE INDEX IF NOT EXISTS idx_stock_moves_product_id ON stock_moves(product_id);
        CREATE INDEX IF NOT EXISTS idx_stock_moves_related_document ON stock_moves(related_document_type, related_document_id);
        CREATE INDEX IF NOT EXISTS idx_stock_moves_status ON stock_moves(status);
      `);

      // Add trigger for stock_moves updated_at
      await client.query(`
        DROP TRIGGER IF EXISTS update_stock_moves_updated_at ON stock_moves;
        CREATE TRIGGER update_stock_moves_updated_at BEFORE UPDATE ON stock_moves
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);

      // Update existing deliveries to populate new fields
      console.log('  Updating existing deliveries...');
      await client.query(`
        UPDATE deliveries
        SET
          to_customer = customer,
          schedule_date = date,
          reference = 'WH/OUT/' || LPAD(delivery_id::text, 4, '0')
        WHERE to_customer IS NULL OR reference IS NULL
      `);
    }
    
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  runMigration()
    .then(() => {
      console.log('Migration process completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration error:', error.message);
      console.error(error);
      process.exit(1);
    });
}

