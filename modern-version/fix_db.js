const { Client } = require('pg');

async function run() {
  const client = new Client({ 
    connectionString: 'postgresql://postgres.wozbwzpdktryvjslpqse:wdk.m%40UL_4F%3FpUs@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres' 
  });
  
  try {
    await client.connect();
    const query = `
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS price_retail text,
      ADD COLUMN IF NOT EXISTS length_mm text,
      ADD COLUMN IF NOT EXISTS width_mm text,
      ADD COLUMN IF NOT EXISTS height_mm text,
      ADD COLUMN IF NOT EXISTS weight_g text,
      ADD COLUMN IF NOT EXISTS color text,
      ADD COLUMN IF NOT EXISTS name_ru text,
      ADD COLUMN IF NOT EXISTS description_short text,
      ADD COLUMN IF NOT EXISTS description_short_ru text,
      ADD COLUMN IF NOT EXISTS description_full text,
      ADD COLUMN IF NOT EXISTS description_full_ru text;
    `;
    await client.query(query);
    console.log('Barcha yangi ustunlar muvaffaqiyatli qo\'shildi!');
  } catch (error) {
    console.error('Xatolik yuz berdi:', error.message);
  } finally {
    await client.end();
  }
}

run();
