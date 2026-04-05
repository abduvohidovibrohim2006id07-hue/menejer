const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function upgradeBusinessSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    
    console.log('Upgrading schema for advanced expense management...');
    
    // 1. Create employees table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name TEXT NOT NULL,
        position TEXT,
        phone TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );
    `);
    
    // 2. Add dynamic expense columns to transactions
    await client.query(`
      ALTER TABLE accounting_transactions 
      ADD COLUMN IF NOT EXISTS expense_type TEXT,
      ADD COLUMN IF NOT EXISTS product_name TEXT,
      ADD COLUMN IF NOT EXISTS supplier_name TEXT,
      ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id),
      ADD COLUMN IF NOT EXISTS logistics_from TEXT,
      ADD COLUMN IF NOT EXISTS logistics_to TEXT,
      ADD COLUMN IF NOT EXISTS ad_platform TEXT,
      ADD COLUMN IF NOT EXISTS expense_reason TEXT;
    `);
    
    console.log('Business schema upgrade completed successfully!');
  } catch (err) {
    console.error('Failed to upgrade schema:', err);
  } finally {
    await client.end();
  }
}

upgradeBusinessSchema();
