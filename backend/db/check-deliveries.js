import { pool } from './index.js';

async function checkDeliveries() {
  try {
    const result = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM deliveries 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('\n📦 Delivery Status Distribution:');
    console.log('================================');
    result.rows.forEach(row => {
      console.log(`  ${row.status.padEnd(10)}: ${row.count} deliveries`);
    });
    
    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    console.log(`\n  Total: ${total} deliveries\n`);
    
    // Show a sample from each status
    for (const status of ['draft', 'waiting', 'ready', 'done']) {
      const sample = await pool.query(
        'SELECT reference, to_customer, contact, schedule_date FROM deliveries WHERE status = $1 LIMIT 3',
        [status]
      );
      if (sample.rows.length > 0) {
        console.log(`\nSample ${status} deliveries:`);
        sample.rows.forEach(d => {
          console.log(`  - ${d.reference || 'N/A'}: ${d.to_customer || 'N/A'} (${d.contact || 'N/A'}) - ${d.schedule_date || 'N/A'}`);
        });
      }
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDeliveries();


