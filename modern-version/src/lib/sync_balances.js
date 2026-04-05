const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function syncBalances() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    
    console.log('Updating balances based on all transactions...');

    // 1. Reset all balances to 0 first (except initial balances if any, but let's assume 0 for now as they are dynamically tracked)
    await client.query(`UPDATE accounting_bank_accounts SET balance = 0;`);
    await client.query(`UPDATE accounting_cards SET balance = 0;`);
    await client.query(`UPDATE accounting_cash_vaults SET balance = 0;`);
    await client.query(`UPDATE accounting_partners SET total_debt_uzs = 0;`);

    // 2. Recalculate everything from accounting_transactions
    // Sum for Bank Accounts
    await client.query(`
      WITH summary AS (
        SELECT bank_account_id, SUM(CASE WHEN is_income THEN amount_uzs ELSE -amount_uzs END) as total
        FROM accounting_transactions 
        WHERE bank_account_id IS NOT NULL 
        GROUP BY bank_account_id
      )
      UPDATE accounting_bank_accounts b
      SET balance = summary.total
      FROM summary
      WHERE b.id = summary.bank_account_id;
    `);

    // Sum for Cards
    await client.query(`
      WITH summary AS (
        SELECT card_id, SUM(CASE WHEN is_income THEN amount_uzs ELSE -amount_uzs END) as total
        FROM accounting_transactions 
        WHERE card_id IS NOT NULL 
        GROUP BY card_id
      )
      UPDATE accounting_cards c
      SET balance = summary.total
      FROM summary
      WHERE c.id = summary.card_id;
    `);

    // Sum for Cash Vaults
    await client.query(`
      WITH summary AS (
        SELECT cash_vault_id, SUM(CASE WHEN is_income THEN amount_uzs ELSE -amount_uzs END) as total
        FROM accounting_transactions 
        WHERE cash_vault_id IS NOT NULL 
        GROUP BY cash_vault_id
      )
      UPDATE accounting_cash_vaults v
      SET balance = summary.total
      FROM summary
      WHERE v.id = summary.cash_vault_id;
    `);

    // Sum for Partners (Debt)
    await client.query(`
      WITH summary AS (
        SELECT partner_id, SUM(CASE WHEN is_income THEN amount_uzs ELSE -amount_uzs END) as total
        FROM accounting_transactions 
        WHERE partner_id IS NOT NULL AND payment_type = 'DEBT'
        GROUP BY partner_id
      )
      UPDATE accounting_partners p
      SET total_debt_uzs = summary.total
      FROM summary
      WHERE p.id = summary.partner_id;
    `);

    console.log('Balances synced successfully! Now creating triggers for future automation...');

    // 3. Create Trigger Function
    await client.query(`
      CREATE OR REPLACE FUNCTION handle_transaction_change() RETURNS TRIGGER AS $$
      BEGIN
          -- IF INSERT
          IF (TG_OP = 'INSERT') THEN
              IF NEW.bank_account_id IS NOT NULL THEN
                  UPDATE accounting_bank_accounts SET balance = balance + (CASE WHEN NEW.is_income THEN NEW.amount_uzs ELSE -NEW.amount_uzs END) WHERE id = NEW.bank_account_id;
              END IF;
              IF NEW.card_id IS NOT NULL THEN
                  UPDATE accounting_cards SET balance = balance + (CASE WHEN NEW.is_income THEN NEW.amount_uzs ELSE -NEW.amount_uzs END) WHERE id = NEW.card_id;
              END IF;
              IF NEW.cash_vault_id IS NOT NULL THEN
                  UPDATE accounting_cash_vaults SET balance = balance + (CASE WHEN NEW.is_income THEN NEW.amount_uzs ELSE -NEW.amount_uzs END) WHERE id = NEW.cash_vault_id;
              END IF;
              IF NEW.partner_id IS NOT NULL AND NEW.payment_type = 'DEBT' THEN
                  UPDATE accounting_partners SET total_debt_uzs = total_debt_uzs + (CASE WHEN NEW.is_income THEN NEW.amount_uzs ELSE -NEW.amount_uzs END) WHERE id = NEW.partner_id;
              END IF;
          
          -- IF DELETE
          ELSIF (TG_OP = 'DELETE') THEN
              IF OLD.bank_account_id IS NOT NULL THEN
                  UPDATE accounting_bank_accounts SET balance = balance - (CASE WHEN OLD.is_income THEN OLD.amount_uzs ELSE -OLD.amount_uzs END) WHERE id = OLD.bank_account_id;
              END IF;
              IF OLD.card_id IS NOT NULL THEN
                  UPDATE accounting_cards SET balance = balance - (CASE WHEN OLD.is_income THEN OLD.amount_uzs ELSE -OLD.amount_uzs END) WHERE id = OLD.card_id;
              END IF;
              IF OLD.cash_vault_id IS NOT NULL THEN
                  UPDATE accounting_cash_vaults SET balance = balance - (CASE WHEN OLD.is_income THEN OLD.amount_uzs ELSE -OLD.amount_uzs END) WHERE id = OLD.cash_vault_id;
              END IF;
              IF OLD.partner_id IS NOT NULL AND OLD.payment_type = 'DEBT' THEN
                  UPDATE accounting_partners SET total_debt_uzs = total_debt_uzs - (CASE WHEN OLD.is_income THEN OLD.amount_uzs ELSE -OLD.amount_uzs END) WHERE id = OLD.partner_id;
              END IF;
          END IF;
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 4. Create Trigger
    await client.query(`DROP TRIGGER IF EXISTS trg_update_balances ON accounting_transactions;`);
    await client.query(`
      CREATE TRIGGER trg_update_balances
      AFTER INSERT OR DELETE ON accounting_transactions
      FOR EACH ROW EXECUTE FUNCTION handle_transaction_change();
    `);

    console.log('Automated balance synchronization (Triggers) set up correctly!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

syncBalances();
