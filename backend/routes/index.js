import express from 'express';
import { pool } from '../db/index.js';
import authRoutes from './auth.js';
import dbCheckRoutes from './db-check.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test database connection
router.get('/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({ 
      message: 'Database connected successfully',
      currentTime: result.rows[0].current_time
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Database connection failed',
      message: error.message 
    });
  }
});

// Auth routes
router.use('/auth', authRoutes);

// Database check routes
router.use('/', dbCheckRoutes);

// ============================================
// PRODUCTS API
// ============================================
router.get('/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, sku, category, uom, stock, reorder_level as "reorderLevel", status
      FROM products
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products', message: error.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { name, sku, category, uom, initialStock, reorderLevel } = req.body;
    const result = await pool.query(
      `INSERT INTO products (name, sku, category, uom, stock, reorder_level)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, sku, category, uom, stock, reorder_level as "reorderLevel", status`,
      [name, sku, category, uom, initialStock || 0, reorderLevel || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product', message: error.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, category, uom, stock, reorderLevel } = req.body;
    const result = await pool.query(
      `UPDATE products 
       SET name = $1, sku = $2, category = $3, uom = $4, stock = $5, reorder_level = $6
       WHERE id = $7
       RETURNING id, name, sku, category, uom, stock, reorder_level as "reorderLevel", status`,
      [name, sku, category, uom, stock, reorderLevel, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product', message: error.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product', message: error.message });
  }
});

// ============================================
// RECEIPTS API
// ============================================
router.get('/receipts', async (req, res) => {
  try {
    const receiptsResult = await pool.query(`
      SELECT r.id, r.receipt_id as "receiptId", r.supplier, r.date::text as date, r.status,
             COALESCE((SELECT SUM(ri.quantity) FROM receipt_items ri WHERE ri.receipt_id = r.id), 0) as "totalItems"
      FROM receipts r
      ORDER BY r.date DESC, r.created_at DESC
    `);
    
    // Get items for each receipt
    const receipts = await Promise.all(receiptsResult.rows.map(async (receipt) => {
      const itemsResult = await pool.query(
        'SELECT product_id as "productId", quantity FROM receipt_items WHERE receipt_id = $1',
        [receipt.id]
      );
      return {
        ...receipt,
        items: itemsResult.rows,
        totalItems: parseFloat(receipt.totalItems) || 0,
        date: receipt.date.split('T')[0] // Format date as YYYY-MM-DD
      };
    }));
    
    res.json(receipts);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts', message: error.message });
  }
});

router.post('/receipts', async (req, res) => {
  try {
    const { supplier, date, status, items, warehouse_id, location_id } = req.body;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get next receipt number
      const countResult = await client.query('SELECT COUNT(*) as count FROM receipts');
      const receiptNumber = parseInt(countResult.rows[0].count) + 1;
      const receiptId = `RCP-${String(receiptNumber).padStart(3, '0')}`;
      
      // Insert receipt
      const receiptResult = await client.query(
        `INSERT INTO receipts (receipt_id, supplier, date, status, warehouse_id, location_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, receipt_id as "receiptId", supplier, date::text as date, status`,
        [receiptId, supplier, date, status || 'draft', warehouse_id, location_id]
      );
      
      const receipt = receiptResult.rows[0];
      
      // Insert receipt items
      let totalItems = 0;
      for (const item of items || []) {
        await client.query(
          'INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, $3)',
          [receipt.id, item.productId, item.quantity]
        );
        totalItems += item.quantity;
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({
        ...receipt,
        date: receipt.date.split('T')[0], // Format date as YYYY-MM-DD
        items: items || [],
        totalItems
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(500).json({ error: 'Failed to create receipt', message: error.message });
  }
});

router.put('/receipts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier, date, status, items } = req.body;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update receipt
      const receiptResult = await client.query(
        `UPDATE receipts 
         SET supplier = $1, date = $2, status = $3
         WHERE id = $4
         RETURNING id, receipt_id as "receiptId", supplier, date::text as date, status`,
        [supplier, date, status, id]
      );
      
      if (receiptResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Receipt not found' });
      }
      
      const receipt = receiptResult.rows[0];
      
      // Delete old items and insert new ones
      await client.query('DELETE FROM receipt_items WHERE receipt_id = $1', [id]);
      
      let totalItems = 0;
      for (const item of items || []) {
        await client.query(
          'INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, $3)',
          [id, item.productId, item.quantity]
        );
        totalItems += item.quantity;
      }
      
      await client.query('COMMIT');
      
      res.json({
        ...receipt,
        date: receipt.date.split('T')[0], // Format date as YYYY-MM-DD
        items: items || [],
        totalItems
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({ error: 'Failed to update receipt', message: error.message });
  }
});

router.post('/receipts/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get receipt and items
      const receiptResult = await client.query(
        'SELECT * FROM receipts WHERE id = $1',
        [id]
      );
      
      if (receiptResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Receipt not found' });
      }
      
      const receipt = receiptResult.rows[0];
      
      if (receipt.status === 'done') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Receipt already validated' });
      }
      
      // Get items
      const itemsResult = await client.query(
        'SELECT product_id, quantity FROM receipt_items WHERE receipt_id = $1',
        [id]
      );
      
      // Update product stock
      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
      
      // Update receipt status
      await client.query(
        'UPDATE receipts SET status = $1 WHERE id = $2',
        ['done', id]
      );
      
      await client.query('COMMIT');
      res.json({ message: 'Receipt validated successfully', status: 'done' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error validating receipt:', error);
    res.status(500).json({ error: 'Failed to validate receipt', message: error.message });
  }
});

router.delete('/receipts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM receipts WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    res.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ error: 'Failed to delete receipt', message: error.message });
  }
});

// ============================================
// DELIVERIES API
// ============================================

// Helper function to generate reference number
function generateDeliveryReference(count) {
  return `WH/OUT/${String(count).padStart(4, '0')}`;
}

// Helper function to get available stock for a product at a location
async function getAvailableStock(client, productId, locationId) {
  // Get stock from stock_levels or products table
  let stockResult;
  if (locationId) {
    stockResult = await client.query(
      `SELECT COALESCE(sl.quantity, p.stock, 0) as quantity
       FROM products p
       LEFT JOIN stock_levels sl ON sl.product_id = p.id AND sl.location_id = $2
       WHERE p.id = $1`,
      [productId, locationId]
    );
  } else {
    stockResult = await client.query(
      'SELECT COALESCE(stock, 0) as quantity FROM products WHERE id = $1',
      [productId]
    );
  }
  
  const stock = parseFloat(stockResult.rows[0]?.quantity || 0);
  
  // Get reserved stock from pending deliveries
  const reservedResult = await client.query(
    `SELECT COALESCE(SUM(di.reserved_stock), 0) as reserved
     FROM delivery_items di
     JOIN deliveries d ON d.id = di.delivery_id
     WHERE di.product_id = $1 
       AND d.status IN ('draft', 'waiting', 'ready')
       AND ($2 IS NULL OR d.from_location_id = $2)`,
    [productId, locationId]
  );
  
  const reserved = parseFloat(reservedResult.rows[0]?.reserved || 0);
  return stock - reserved;
}

// GET /api/deliveries - Fetch all deliveries with pagination and filters
router.get('/deliveries', async (req, res) => {
  try {
    const { status, from_date, to_date, search, page = 1, limit = 20, sort_by = 'date', sort_order = 'desc' } = req.query;
    const offset = (page - 1) * limit;
    
    // Validate sort_by to prevent SQL injection
    const validSortFields = {
      'date': 'd.date',
      'schedule_date': 'd.schedule_date',
      'reference': 'd.reference',
      'customer': 'd.to_customer',
      'contact': 'd.contact',
      'status': 'd.status',
      'created_at': 'd.created_at'
    };
    
    const sortField = validSortFields[sort_by] || 'd.date';
    const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    let query = `
      SELECT d.id, d.delivery_id as "deliveryId", d.reference, d.customer, d.to_customer, 
             d.contact, d.date::text as date, d.schedule_date::text as "scheduleDate",
             d.status, d.responsible, d.operation_type as "operationType",
             d.delivery_address as "deliveryAddress",
             l.name as "fromLocation",
             COALESCE((SELECT COUNT(*) FROM delivery_items di WHERE di.delivery_id = d.id), 0) as "totalItems"
      FROM deliveries d
      LEFT JOIN locations l ON l.id = d.from_location_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      query += ` AND d.status = $${paramCount}`;
      params.push(status);
    }
    
    if (from_date) {
      paramCount++;
      query += ` AND d.schedule_date >= $${paramCount}`;
      params.push(from_date);
    }
    
    if (to_date) {
      paramCount++;
      query += ` AND d.schedule_date <= $${paramCount}`;
      params.push(to_date);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (d.reference ILIKE $${paramCount} OR d.customer ILIKE $${paramCount} OR d.to_customer ILIKE $${paramCount} OR d.contact ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY ${sortField} ${sortDirection}, d.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const deliveriesResult = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM deliveries d WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;
    
    if (status) {
      countParamCount++;
      countQuery += ` AND d.status = $${countParamCount}`;
      countParams.push(status);
    }
    if (from_date) {
      countParamCount++;
      countQuery += ` AND d.schedule_date >= $${countParamCount}`;
      countParams.push(from_date);
    }
    if (to_date) {
      countParamCount++;
      countQuery += ` AND d.schedule_date <= $${countParamCount}`;
      countParams.push(to_date);
    }
    if (search) {
      countParamCount++;
      countQuery += ` AND (d.reference ILIKE $${countParamCount} OR d.customer ILIKE $${countParamCount} OR d.to_customer ILIKE $${countParamCount} OR d.contact ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get items for each delivery
    const deliveries = await Promise.all(deliveriesResult.rows.map(async (delivery) => {
      const itemsResult = await pool.query(
        `SELECT di.id, di.product_id as "productId", di.quantity, di.reserved_stock as "reservedStock",
                p.name as "productName", p.sku, p.uom
         FROM delivery_items di
         JOIN products p ON p.id = di.product_id
         WHERE di.delivery_id = $1`,
        [delivery.id]
      );
      return {
        ...delivery,
        items: itemsResult.rows,
        totalItems: parseInt(delivery.totalItems) || 0,
        date: delivery.date?.split('T')[0] || delivery.date,
        scheduleDate: delivery.scheduleDate?.split('T')[0] || delivery.scheduleDate
      };
    }));
    
    res.json({
      deliveries,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries', message: error.message });
  }
});

// GET /api/deliveries/:id - Fetch single delivery with line items
router.get('/deliveries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deliveryResult = await pool.query(
      `SELECT d.*, l.name as "fromLocation"
       FROM deliveries d
       LEFT JOIN locations l ON l.id = d.from_location_id
       WHERE d.id = $1`,
      [id]
    );
    
    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    const delivery = deliveryResult.rows[0];
    
    // Get items with product details
    const itemsResult = await pool.query(
      `SELECT di.id, di.product_id as "productId", di.quantity, di.reserved_stock as "reservedStock",
              di.picked, di.packed,
              p.name as "productName", p.sku, p.uom, p.stock
       FROM delivery_items di
       JOIN products p ON p.id = di.product_id
       WHERE di.delivery_id = $1`,
      [id]
    );
    
    res.json({
      ...delivery,
      items: itemsResult.rows,
      date: delivery.date?.split('T')[0] || delivery.date,
      scheduleDate: delivery.schedule_date?.split('T')[0] || delivery.schedule_date
    });
  } catch (error) {
    console.error('Error fetching delivery:', error);
    res.status(500).json({ error: 'Failed to fetch delivery', message: error.message });
  }
});

// POST /api/deliveries - Create new delivery
router.post('/deliveries', async (req, res) => {
  try {
    const {
      to_customer, contact, schedule_date, delivery_address, responsible,
      operation_type, from_location_id, warehouse_id, items, notes
    } = req.body;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get next delivery number and generate reference
      const countResult = await client.query('SELECT COUNT(*) as count FROM deliveries');
      const deliveryNumber = parseInt(countResult.rows[0].count) + 1;
      const deliveryId = `DEL-${String(deliveryNumber).padStart(3, '0')}`;
      const reference = generateDeliveryReference(deliveryNumber);
      
      // Insert delivery
      const deliveryResult = await client.query(
        `INSERT INTO deliveries (
          delivery_id, reference, customer, to_customer, contact, date, schedule_date,
          delivery_address, responsible, operation_type, from_location_id, warehouse_id,
          status, notes
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id, delivery_id as "deliveryId", reference, to_customer, contact,
                   date::text as date, schedule_date::text as "scheduleDate", status`,
        [
          deliveryId, reference, to_customer || '', to_customer, contact,
          schedule_date || new Date().toISOString().split('T')[0],
          schedule_date, delivery_address, responsible, operation_type || 'Delivery Order',
          from_location_id, warehouse_id, 'draft', notes
        ]
      );
      
      const delivery = deliveryResult.rows[0];
      
      // Insert delivery items
      for (const item of items || []) {
        await client.query(
          `INSERT INTO delivery_items (delivery_id, product_id, quantity, reserved_stock)
           VALUES ($1, $2, $3, 0)`,
          [delivery.id, item.productId, item.quantity]
        );
      }
      
      await client.query('COMMIT');
      
      // Fetch complete delivery with items
      const itemsResult = await client.query(
        `SELECT di.id, di.product_id as "productId", di.quantity,
                p.name as "productName", p.sku, p.uom
         FROM delivery_items di
         JOIN products p ON p.id = di.product_id
         WHERE di.delivery_id = $1`,
        [delivery.id]
      );
      
      res.status(201).json({
        success: true,
        delivery: {
          ...delivery,
          items: itemsResult.rows,
          date: delivery.date?.split('T')[0] || delivery.date,
          scheduleDate: delivery.scheduleDate?.split('T')[0] || delivery.scheduleDate
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({ error: 'Failed to create delivery', message: error.message });
  }
});

// PUT /api/deliveries/:id - Update delivery
router.put('/deliveries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      to_customer, contact, schedule_date, delivery_address, responsible,
      operation_type, from_location_id, status, items, notes
    } = req.body;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if delivery exists and get current status
      const currentResult = await client.query('SELECT status FROM deliveries WHERE id = $1', [id]);
      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Delivery not found' });
      }
      
      const currentStatus = currentResult.rows[0].status;
      
      // Only allow updates if status is draft
      if (currentStatus !== 'draft' && status !== currentStatus) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Can only update deliveries in draft status' });
      }
      
      // Update delivery
      const deliveryResult = await client.query(
        `UPDATE deliveries 
         SET to_customer = COALESCE($1, to_customer),
             contact = COALESCE($2, contact),
             schedule_date = COALESCE($3, schedule_date),
             delivery_address = COALESCE($4, delivery_address),
             responsible = COALESCE($5, responsible),
             operation_type = COALESCE($6, operation_type),
             from_location_id = COALESCE($7, from_location_id),
             status = COALESCE($8, status),
             notes = COALESCE($9, notes)
         WHERE id = $10
         RETURNING id, delivery_id as "deliveryId", reference, to_customer, contact,
                   date::text as date, schedule_date::text as "scheduleDate", status`,
        [to_customer, contact, schedule_date, delivery_address, responsible,
         operation_type, from_location_id, status, notes, id]
      );
      
      const delivery = deliveryResult.rows[0];
      
      // Update items if provided
      if (items !== undefined) {
        // Release reserved stock from old items
        const oldItemsResult = await client.query(
          'SELECT product_id, reserved_stock FROM delivery_items WHERE delivery_id = $1',
          [id]
        );
        
        // Delete old items
        await client.query('DELETE FROM delivery_items WHERE delivery_id = $1', [id]);
        
        // Insert new items
        for (const item of items) {
          await client.query(
            `INSERT INTO delivery_items (delivery_id, product_id, quantity, reserved_stock)
             VALUES ($1, $2, $3, 0)`,
            [id, item.productId, item.quantity]
          );
        }
      }
      
      await client.query('COMMIT');
      
      // Fetch complete delivery
      const itemsResult = await client.query(
        `SELECT di.id, di.product_id as "productId", di.quantity, di.reserved_stock as "reservedStock",
                p.name as "productName", p.sku, p.uom
         FROM delivery_items di
         JOIN products p ON p.id = di.product_id
         WHERE di.delivery_id = $1`,
        [id]
      );
      
      res.json({
        success: true,
        delivery: {
          ...delivery,
          items: itemsResult.rows,
          date: delivery.date?.split('T')[0] || delivery.date,
          scheduleDate: delivery.scheduleDate?.split('T')[0] || delivery.scheduleDate
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating delivery:', error);
    res.status(500).json({ error: 'Failed to update delivery', message: error.message });
  }
});

// POST /api/deliveries/:id/add-item - Add product to delivery
router.post('/deliveries/:id/add-item', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, quantity } = req.body;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check delivery exists and is in draft
      const deliveryResult = await client.query(
        'SELECT status, from_location_id FROM deliveries WHERE id = $1',
        [id]
      );
      
      if (deliveryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Delivery not found' });
      }
      
      const delivery = deliveryResult.rows[0];
      if (delivery.status !== 'draft') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Can only add items to draft deliveries' });
      }
      
      // Check stock availability
      const availableStock = await getAvailableStock(client, product_id, delivery.from_location_id);
      
      if (quantity > availableStock) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Insufficient stock',
          message: `Available stock: ${availableStock}`,
          available: availableStock
        });
      }
      
      // Insert item
      await client.query(
        `INSERT INTO delivery_items (delivery_id, product_id, quantity, reserved_stock)
         VALUES ($1, $2, $3, 0)`,
        [id, product_id, quantity]
      );
      
      await client.query('COMMIT');
      
      // Fetch updated items
      const itemsResult = await client.query(
        `SELECT di.id, di.product_id as "productId", di.quantity, di.reserved_stock as "reservedStock",
                p.name as "productName", p.sku, p.uom
         FROM delivery_items di
         JOIN products p ON p.id = di.product_id
         WHERE di.delivery_id = $1`,
        [id]
      );
      
      res.json({ success: true, line_items: itemsResult.rows });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item', message: error.message });
  }
});

// DELETE /api/deliveries/:id/items/:item_id - Remove line item
router.delete('/deliveries/:id/items/:item_id', async (req, res) => {
  try {
    const { id, item_id } = req.params;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check delivery exists and is in draft
      const deliveryResult = await client.query('SELECT status FROM deliveries WHERE id = $1', [id]);
      if (deliveryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Delivery not found' });
      }
      
      if (deliveryResult.rows[0].status !== 'draft') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Can only remove items from draft deliveries' });
      }
      
      // Get item to release reserved stock
      const itemResult = await client.query(
        'SELECT product_id, reserved_stock FROM delivery_items WHERE id = $1 AND delivery_id = $2',
        [item_id, id]
      );
      
      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Item not found' });
      }
      
      // Delete item
      await client.query('DELETE FROM delivery_items WHERE id = $1', [item_id]);
      
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({ error: 'Failed to remove item', message: error.message });
  }
});

// POST /api/deliveries/:id/validate - Validate delivery (draft → ready)
router.post('/deliveries/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get delivery
      const deliveryResult = await client.query(
        'SELECT status, from_location_id FROM deliveries WHERE id = $1',
        [id]
      );
      
      if (deliveryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Delivery not found' });
      }
      
      const delivery = deliveryResult.rows[0];
      if (delivery.status !== 'draft') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Can only validate draft deliveries' });
      }
      
      // Get items and check stock
      const itemsResult = await client.query(
        'SELECT product_id, quantity FROM delivery_items WHERE delivery_id = $1',
        [id]
      );
      
      if (itemsResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Delivery must have at least one item' });
      }
      
      // Validate stock for each item
      const stockErrors = [];
      for (const item of itemsResult.rows) {
        const available = await getAvailableStock(client, item.product_id, delivery.from_location_id);
        if (item.quantity > available) {
          const productResult = await client.query('SELECT name, sku FROM products WHERE id = $1', [item.product_id]);
          stockErrors.push({
            product: productResult.rows[0]?.name || 'Unknown',
            sku: productResult.rows[0]?.sku || '',
            requested: item.quantity,
            available: available
          });
        }
      }
      
      if (stockErrors.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Insufficient stock for one or more items',
          stockErrors
        });
      }
      
      // Reserve stock and update items
      for (const item of itemsResult.rows) {
        await client.query(
          `UPDATE delivery_items 
           SET reserved_stock = $1 
           WHERE delivery_id = $2 AND product_id = $3`,
          [item.quantity, id, item.product_id]
        );
      }
      
      // Update status to ready
      await client.query('UPDATE deliveries SET status = $1 WHERE id = $2', ['ready', id]);
      
      // Create stock move records (pending)
      for (const item of itemsResult.rows) {
        await client.query(
          `INSERT INTO stock_moves (
            reference, product_id, from_location_id, quantity, operation_type,
            related_document_id, related_document_type, status, date
          )
          VALUES (
            (SELECT reference FROM deliveries WHERE id = $1), $2, $3, $4, 'delivery',
            $1, 'delivery', 'pending', (SELECT schedule_date FROM deliveries WHERE id = $1)
          )`,
          [id, item.product_id, delivery.from_location_id, item.quantity]
        );
      }
      
      await client.query('COMMIT');
      
      // Fetch updated delivery
      const updatedResult = await client.query(
        `SELECT d.*, l.name as "fromLocation"
         FROM deliveries d
         LEFT JOIN locations l ON l.id = d.from_location_id
         WHERE d.id = $1`,
        [id]
      );
      
      res.json({
        success: true,
        delivery: updatedResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error validating delivery:', error);
    res.status(500).json({ error: 'Failed to validate delivery', message: error.message });
  }
});

// POST /api/deliveries/:id/process - Process delivery (ready → done)
router.post('/deliveries/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get delivery
      const deliveryResult = await client.query(
        'SELECT status, from_location_id, warehouse_id FROM deliveries WHERE id = $1',
        [id]
      );
      
      if (deliveryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Delivery not found' });
      }
      
      const delivery = deliveryResult.rows[0];
      if (delivery.status !== 'ready') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Can only process ready deliveries' });
      }
      
      // Get items
      const itemsResult = await client.query(
        'SELECT product_id, quantity, reserved_stock FROM delivery_items WHERE delivery_id = $1',
        [id]
      );
      
      // Decrease stock
      for (const item of itemsResult.rows) {
        // Update product stock
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
        
        // Update stock_levels if location exists
        if (delivery.from_location_id) {
          await client.query(
            `INSERT INTO stock_levels (product_id, warehouse_id, location_id, quantity)
             VALUES ($1, $2, $3, -$4)
             ON CONFLICT (product_id, warehouse_id, location_id)
             DO UPDATE SET quantity = stock_levels.quantity - $4`,
            [item.product_id, delivery.warehouse_id, delivery.from_location_id, item.quantity]
          );
        }
        
        // Create stock ledger entry
        const productResult = await client.query('SELECT stock FROM products WHERE id = $1', [item.product_id]);
        const balanceBefore = parseFloat(productResult.rows[0].stock) + parseFloat(item.quantity);
        const balanceAfter = parseFloat(productResult.rows[0].stock);
        
        await client.query(
          `INSERT INTO stock_ledger (
            product_id, warehouse_id, location_id, transaction_type,
            reference_id, reference_type, quantity, balance_before, balance_after
          )
          VALUES ($1, $2, $3, 'delivery', $4, 'delivery', -$5, $6, $7)`,
          [item.product_id, delivery.warehouse_id, delivery.from_location_id,
           id, item.quantity, balanceBefore, balanceAfter]
        );
      }
      
      // Update stock moves to done
      await client.query(
        'UPDATE stock_moves SET status = $1 WHERE related_document_id = $2 AND related_document_type = $3',
        ['done', id, 'delivery']
      );
      
      // Update delivery status
      await client.query('UPDATE deliveries SET status = $1 WHERE id = $2', ['done', id]);
      
      await client.query('COMMIT');
      
      // Fetch updated delivery
      const updatedResult = await client.query(
        `SELECT d.*, l.name as "fromLocation"
         FROM deliveries d
         LEFT JOIN locations l ON l.id = d.from_location_id
         WHERE d.id = $1`,
        [id]
      );
      
      res.json({
        success: true,
        delivery: updatedResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing delivery:', error);
    res.status(500).json({ error: 'Failed to process delivery', message: error.message });
  }
});

// DELETE /api/deliveries/:id - Delete delivery (only if draft)
router.delete('/deliveries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check delivery exists and status
      const deliveryResult = await client.query('SELECT status FROM deliveries WHERE id = $1', [id]);
      if (deliveryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Delivery not found' });
      }
      
      if (deliveryResult.rows[0].status !== 'draft') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Can only delete draft deliveries' });
      }
      
      // Delete related stock moves
      await client.query(
        'DELETE FROM stock_moves WHERE related_document_id = $1 AND related_document_type = $2',
        [id, 'delivery']
      );
      
      // Delete delivery (items will be deleted via CASCADE)
      await client.query('DELETE FROM deliveries WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting delivery:', error);
    res.status(500).json({ error: 'Failed to delete delivery', message: error.message });
  }
});

// GET /api/products/available-stock - Get products with available stock
router.get('/products/available-stock', async (req, res) => {
  try {
    const { location_id } = req.query;
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT p.id, p.name, p.sku, p.uom, 
               COALESCE(sl.quantity, p.stock, 0) as stock
        FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id 
          AND ($1::integer IS NULL OR sl.location_id = $1)
      `;
      
      const productsResult = await client.query(query, [location_id || null]);
      
      // Calculate available stock (stock - reserved)
      const products = await Promise.all(productsResult.rows.map(async (product) => {
        const reservedResult = await client.query(
          `SELECT COALESCE(SUM(di.reserved_stock), 0) as reserved
           FROM delivery_items di
           JOIN deliveries d ON d.id = di.delivery_id
           WHERE di.product_id = $1 
             AND d.status IN ('draft', 'waiting', 'ready')
             AND ($2::integer IS NULL OR d.from_location_id = $2)`,
          [product.id, location_id || null]
        );
        
        const reserved = parseFloat(reservedResult.rows[0]?.reserved || 0);
        const stock = parseFloat(product.stock || 0);
        
        return {
          ...product,
          stock: stock,
          reserved: reserved,
          available: stock - reserved
        };
      }));
      
      res.json(products);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching available stock:', error);
    res.status(500).json({ error: 'Failed to fetch available stock', message: error.message });
  }
});

export default router;
