import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize the database by running the schema.sql file
 */
export async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('✅ Database initialized successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

/**
 * Drop all tables (use with caution!)
 */
export async function dropAllTables() {
  try {
    console.log('Dropping all tables...');
    
    const tables = [
      'stock_ledger',
      'adjustments',
      'transfer_items',
      'transfers',
      'delivery_items',
      'deliveries',
      'receipt_items',
      'receipts',
      'stock_levels',
      'products',
      'locations',
      'warehouses',
      'users'
    ];
    
    // Drop tables in reverse order of dependencies
    for (const table of tables) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
        console.log(`  Dropped table: ${table}`);
      } catch (error) {
        console.error(`  Error dropping ${table}:`, error.message);
      }
    }
    
    console.log('✅ All tables dropped successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    throw error;
  }
}

/**
 * Reset database (drop all and recreate)
 */
export async function resetDatabase() {
  try {
    await dropAllTables();
    await initDatabase();
    console.log('✅ Database reset successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || 'init';
  
  if (command === 'init') {
    initDatabase()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else if (command === 'drop') {
    dropAllTables()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else if (command === 'reset') {
    resetDatabase()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else {
    console.log('Usage: node db/init.js [init|drop|reset]');
    process.exit(1);
  }
}

