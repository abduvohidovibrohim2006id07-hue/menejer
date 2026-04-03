const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function runMigration() {
  const sqlFile = path.join(__dirname, '../../supabase/migrations/accounting_full_schema.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('Connected. Running migration...');
    
    // Split by semicolons and run each statement if needed, 
    // but pg client can handle a batch of statements usually.
    await client.query(sql);
    
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
