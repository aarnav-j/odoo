import { pool } from './index.js';
import bcrypt from 'bcryptjs';

/**
 * Seed the database with initial test data
 */
export async function seedDatabase() {
  try {
    console.log('Seeding database with initial data...');
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Create a test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, name) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        ['admin@stockmaster.com', hashedPassword, 'Admin User']
      );
      const userId = userResult.rows[0].id;
      console.log('  ✅ Created test user');
      
      // 2. Get default warehouse
      const warehouseResult = await client.query(
        'SELECT id FROM warehouses WHERE name = $1',
        ['Main Warehouse']
      );
      const warehouseId = warehouseResult.rows[0]?.id;
      
      // 3. Insert products
      const products = [
        { name: 'Steel Rods', sku: 'STL-001', category: 'Raw Materials', uom: 'kg', stock: 1250, reorderLevel: 200 },
        { name: 'Office Chairs', sku: 'FUR-001', category: 'Furniture', uom: 'pcs', stock: 45, reorderLevel: 20 },
        { name: 'Laptop Computers', sku: 'ELC-001', category: 'Electronics', uom: 'pcs', stock: 12, reorderLevel: 15 },
        { name: 'Wooden Planks', sku: 'RAW-001', category: 'Raw Materials', uom: 'meters', stock: 320, reorderLevel: 100 },
        { name: 'Paint (Blue)', sku: 'CHM-001', category: 'Chemicals', uom: 'liters', stock: 8, reorderLevel: 20 },
        { name: 'Screws (M6)', sku: 'HRD-001', category: 'Hardware', uom: 'pcs', stock: 0, reorderLevel: 500 },
        { name: 'LED Bulbs', sku: 'ELC-002', category: 'Electronics', uom: 'pcs', stock: 150, reorderLevel: 50 },
        { name: 'Desk Tables', sku: 'FUR-002', category: 'Furniture', uom: 'pcs', stock: 25, reorderLevel: 10 },
        { name: 'Motor Oil', sku: 'CHM-002', category: 'Chemicals', uom: 'liters', stock: 5, reorderLevel: 30 },
        { name: 'Nails (3 inch)', sku: 'HRD-002', category: 'Hardware', uom: 'pcs', stock: 850, reorderLevel: 200 },
      ];
      
      const productIds = [];
      for (const product of products) {
        const result = await client.query(
          `INSERT INTO products (name, sku, category, uom, stock, reorder_level) 
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (sku) DO UPDATE SET 
             name = EXCLUDED.name,
             category = EXCLUDED.category,
             uom = EXCLUDED.uom,
             stock = EXCLUDED.stock,
             reorder_level = EXCLUDED.reorder_level
           RETURNING id`,
          [product.name, product.sku, product.category, product.uom, product.stock, product.reorderLevel]
        );
        productIds.push(result.rows[0].id);
        
        // Create stock level entry if warehouse exists
        if (warehouseId) {
          await client.query(
            `INSERT INTO stock_levels (product_id, warehouse_id, location_id, quantity)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (product_id, warehouse_id, location_id) DO UPDATE SET
               quantity = EXCLUDED.quantity`,
            [result.rows[0].id, warehouseId, null, product.stock]
          );
        }
      }
      console.log(`  ✅ Created ${products.length} products`);
      
      // 4. Insert receipts
      const receipts = [
        { receiptId: 'RCP-001', supplier: 'Steel Corp Ltd', date: '2025-01-15', status: 'done', items: [{ productId: 0, quantity: 50 }] },
        { receiptId: 'RCP-002', supplier: 'Furniture World', date: '2025-01-16', status: 'ready', items: [{ productId: 1, quantity: 20 }] },
        { receiptId: 'RCP-003', supplier: 'Tech Supplies Inc', date: '2025-01-17', status: 'waiting', items: [{ productId: 2, quantity: 10 }] },
        { receiptId: 'RCP-004', supplier: 'Raw Materials Co', date: '2025-01-18', status: 'draft', items: [{ productId: 3, quantity: 100 }] },
        { receiptId: 'RCP-005', supplier: 'Chemical Solutions', date: '2025-01-19', status: 'canceled', items: [{ productId: 4, quantity: 15 }] },
      ];
      
      for (const receipt of receipts) {
        const receiptResult = await client.query(
          `INSERT INTO receipts (receipt_id, supplier, date, status, warehouse_id, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (receipt_id) DO UPDATE SET
             supplier = EXCLUDED.supplier,
             date = EXCLUDED.date,
             status = EXCLUDED.status
           RETURNING id`,
          [receipt.receiptId, receipt.supplier, receipt.date, receipt.status, warehouseId, userId]
        );
        const receiptDbId = receiptResult.rows[0].id;
        
        // Insert receipt items
        for (const item of receipt.items) {
          const productIndex = item.productId;
          if (productIds[productIndex]) {
            await client.query(
              `INSERT INTO receipt_items (receipt_id, product_id, quantity)
               VALUES ($1, $2, $3)
               ON CONFLICT DO NOTHING`,
              [receiptDbId, productIds[productIndex], item.quantity]
            );
          }
        }
      }
      console.log(`  ✅ Created ${receipts.length} receipts`);
      
      // 5. Insert deliveries
      const deliveries = [
        { deliveryId: 'DEL-001', customer: 'ABC Manufacturing', date: '2025-01-15', status: 'done', items: [{ productId: 0, quantity: 20 }] },
        { deliveryId: 'DEL-002', customer: 'XYZ Retail', date: '2025-01-16', status: 'ready', items: [{ productId: 1, quantity: 10 }] },
        { deliveryId: 'DEL-003', customer: 'Tech Store', date: '2025-01-17', status: 'waiting', items: [{ productId: 2, quantity: 5 }] },
        { deliveryId: 'DEL-004', customer: 'Construction Co', date: '2025-01-18', status: 'draft', items: [{ productId: 3, quantity: 50 }] },
        { deliveryId: 'DEL-005', customer: 'Home Depot', date: '2025-01-19', status: 'done', items: [{ productId: 6, quantity: 30 }] },
      ];
      
      for (const delivery of deliveries) {
        const deliveryResult = await client.query(
          `INSERT INTO deliveries (delivery_id, customer, date, status, warehouse_id, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (delivery_id) DO UPDATE SET
             customer = EXCLUDED.customer,
             date = EXCLUDED.date,
             status = EXCLUDED.status
           RETURNING id`,
          [delivery.deliveryId, delivery.customer, delivery.date, delivery.status, warehouseId, userId]
        );
        const deliveryDbId = deliveryResult.rows[0].id;
        
        // Insert delivery items
        for (const item of delivery.items) {
          const productIndex = item.productId;
          if (productIds[productIndex]) {
            await client.query(
              `INSERT INTO delivery_items (delivery_id, product_id, quantity)
               VALUES ($1, $2, $3)
               ON CONFLICT DO NOTHING`,
              [deliveryDbId, productIds[productIndex], item.quantity]
            );
          }
        }
      }
      console.log(`  ✅ Created ${deliveries.length} deliveries`);
      
      await client.query('COMMIT');
      console.log('✅ Database seeded successfully!');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

