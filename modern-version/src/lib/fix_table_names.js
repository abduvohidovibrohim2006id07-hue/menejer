const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function fixTableNames() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    
    console.log('Renaming employees table to accounting_employees...');
    
    // 1. Rename the table
    await client.query(`ALTER TABLE IF EXISTS employees RENAME TO accounting_employees;`);
    
    console.log('Table renamed successfully!');
  } catch (err) {
    console.error('Failed to rename table:', err);
  } finally {
    await client.end();
  }
}

fixTableNames();
