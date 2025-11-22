# Database Setup Guide

This directory contains the database schema and initialization scripts for the StockMaster application.

## Files

- `index.js` - PostgreSQL connection pool configuration
- `schema.sql` - Complete database schema with all tables, indexes, triggers, and functions
- `init.js` - Database initialization script
- `seed.js` - Database seeding script with test data

## Setup

### 1. Install Dependencies

Make sure you have all required dependencies installed:

```bash
cd backend
npm install
```

### 2. Configure Database Connection

Set up your database connection in a `.env` file in the `backend` directory:

```env
# Option 1: Using Neon (PostgreSQL) connection string
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Option 2: Using individual parameters
DB_USER=postgres
DB_HOST=localhost
DB_NAME=stockmaster
DB_PASSWORD=your_password
DB_PORT=5432
```

### 3. Initialize Database

Run the schema to create all tables:

```bash
npm run db:init
```

Or manually:
```bash
node db/init.js init
```

### 4. Seed Database (Optional)

Populate the database with test data:

```bash
npm run db:seed
```

Or manually:
```bash
node db/seed.js
```

### 5. Reset Database (if needed)

To drop all tables and recreate them:

```bash
npm run db:reset
```

Or manually:
```bash
node db/init.js reset
```

## Database Schema Overview

### Core Tables

- **users** - User accounts for authentication
- **warehouses** - Warehouse locations
- **locations** - Storage locations within warehouses
- **products** - Product catalog with SKU, category, UoM, stock levels
- **stock_levels** - Multi-warehouse stock tracking

### Transaction Tables

- **receipts** - Incoming stock receipts
- **receipt_items** - Items in receipts
- **deliveries** - Outgoing delivery orders
- **delivery_items** - Items in deliveries
- **transfers** - Internal stock transfers between warehouses
- **transfer_items** - Items in transfers
- **adjustments** - Stock adjustment records

### Audit Tables

- **stock_ledger** - Complete audit trail of all stock movements

## Features

### Automatic Status Updates

Products automatically get their status updated based on stock levels:
- `out_of_stock` - Stock is 0
- `low_stock` - Stock <= reorder_level
- `in_stock` - Stock > reorder_level

### Timestamps

All tables with `created_at` and `updated_at` fields automatically update timestamps via triggers.

### Indexes

Comprehensive indexes are created for optimal query performance on:
- SKU lookups
- Status filters
- Date ranges
- Foreign key relationships

## Test User

The seed script creates a test user:
- **Email**: `admin@stockmaster.com`
- **Password**: `password123`

⚠️ **Change this in production!**

## Notes

- The schema uses PostgreSQL-specific features (SERIAL, triggers, etc.)
- All foreign keys have appropriate CASCADE/SET NULL behaviors
- The schema supports multi-warehouse and multi-location inventory management
- Stock ledger provides a complete audit trail for compliance

