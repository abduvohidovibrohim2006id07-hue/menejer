const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function fixUniqueness() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    
    console.log('Replacing functional index with standard unique constraint...');
    
    // 1. Oldingi indeksni o'chirish
    await client.query(`DROP INDEX IF EXISTS idx_unique_payme_transaction;`);
    
    // 2. payme_details null bo'lsa uni bo'sh string qilish (agar null bo'lsa unique constraint ishlamasligi mumkin)
    await client.query(`UPDATE accounting_transactions SET payme_details = '' WHERE payme_details IS NULL;`);
    
    // 3. Standart Unique Constraint qo'shish (Supabase onConflict taniy olishi uchun)
    await client.query(`
      ALTER TABLE accounting_transactions 
      ADD CONSTRAINT unique_payme_tx UNIQUE (transaction_date, amount_uzs, payme_details);
    `);
    
    console.log('Constraint fixed successfully!');
  } catch (err) {
    console.error('Failed to fix constraint:', err);
  } finally {
    await client.end();
  }
}

fixUniqueness();
