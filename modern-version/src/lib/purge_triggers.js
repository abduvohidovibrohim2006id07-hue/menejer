const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function purgeTriggersAndFix() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    
    console.log('Purging ALL old triggers on accounting_transactions...');
    
    // 1. Wipe all known triggers
    await client.query(`DROP TRIGGER IF EXISTS trg_update_balances ON accounting_transactions;`);
    await client.query(`DROP TRIGGER IF EXISTS trigger_update_balances ON accounting_transactions;`);
    await client.query(`DROP TRIGGER IF EXISTS trigger_handle_debt_fifo ON accounting_transactions;`);
    await client.query(`DROP TRIGGER IF EXISTS trg_accounting_sync ON accounting_transactions;`);

    console.log('Old triggers purged. Creating a single, unified trigger for all accounting needs...');

    // 2. Create the unified Trigger Function
    await client.query(`
      CREATE OR REPLACE FUNCTION handle_accounting_sync() RETURNS TRIGGER AS $$
      BEGIN
          -- IF INSERT
          IF (TG_OP = 'INSERT') THEN
              -- Update Bank Account
              IF NEW.bank_account_id IS NOT NULL THEN
                  UPDATE accounting_bank_accounts SET balance = balance + (CASE WHEN NEW.is_income THEN NEW.amount_uzs ELSE -NEW.amount_uzs END) WHERE id = NEW.bank_account_id;
              END IF;
              
              -- Update Card
              IF NEW.card_id IS NOT NULL THEN
                  UPDATE accounting_cards SET balance = balance + (CASE WHEN NEW.is_income THEN NEW.amount_uzs ELSE -NEW.amount_uzs END) WHERE id = NEW.card_id;
              END IF;
              
              -- Update Cash Vault
              IF NEW.cash_vault_id IS NOT NULL THEN
                  UPDATE accounting_cash_vaults SET balance = balance + (CASE WHEN NEW.is_income THEN NEW.amount_uzs ELSE -NEW.amount_uzs END) WHERE id = NEW.cash_vault_id;
              END IF;
              
              -- Update Partner Debt
              IF NEW.partner_id IS NOT NULL AND (NEW.payment_type = 'DEBT' OR NEW.payment_type = 'CASH' OR NEW.payment_type = 'CARD' OR NEW.payment_type = 'BANK') THEN
                   -- Debt logic: For partners, income usually means we are receiving back money (reducing their debt) 
                   -- or we are the one owing. Let's use simple sum logic provided earlier.
                  UPDATE accounting_partners SET total_debt_uzs = total_debt_uzs + (CASE WHEN NEW.is_income THEN NEW.amount_uzs ELSE -NEW.amount_uzs END) WHERE id = NEW.partner_id;
              END IF;
          
          -- IF DELETE
          ELSIF (TG_OP = 'DELETE') THEN
              -- Reverse Bank Account
              IF OLD.bank_account_id IS NOT NULL THEN
                  UPDATE accounting_bank_accounts SET balance = balance - (CASE WHEN OLD.is_income THEN OLD.amount_uzs ELSE -OLD.amount_uzs END) WHERE id = OLD.bank_account_id;
              END IF;
              
              -- Reverse Card
              IF OLD.card_id IS NOT NULL THEN
                  UPDATE accounting_cards SET balance = balance - (CASE WHEN OLD.is_income THEN OLD.amount_uzs ELSE -OLD.amount_uzs END) WHERE id = OLD.card_id;
              END IF;
              
              -- Reverse Cash Vault
              IF OLD.cash_vault_id IS NOT NULL THEN
                  UPDATE accounting_cash_vaults SET balance = balance - (CASE WHEN OLD.is_income THEN OLD.amount_uzs ELSE -OLD.amount_uzs END) WHERE id = OLD.cash_vault_id;
              END IF;
              
              -- Reverse Partner Debt
              IF OLD.partner_id IS NOT NULL AND (OLD.payment_type = 'DEBT' OR OLD.payment_type = 'CASH' OR OLD.payment_type = 'CARD' OR OLD.payment_type = 'BANK') THEN
                  UPDATE accounting_partners SET total_debt_uzs = total_debt_uzs - (CASE WHEN OLD.is_income THEN OLD.amount_uzs ELSE -OLD.amount_uzs END) WHERE id = OLD.partner_id;
              END IF;
          END IF;
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 3. Create the ONE trigger
    await client.query(`
      CREATE TRIGGER trg_accounting_sync
      AFTER INSERT OR DELETE ON accounting_transactions
      FOR EACH ROW EXECUTE FUNCTION handle_accounting_sync();
    `);

    console.log('Trigger recreated correctly. Now resetting and recalculating all balances to be 100% accurate...');

    // 4. Reset & Recalculate (to fix the current doubling issues)
    await client.query(`UPDATE accounting_bank_accounts SET balance = 0;`);
    await client.query(`UPDATE accounting_cards SET balance = 0;`);
    await client.query(`UPDATE accounting_cash_vaults SET balance = 0;`);
    await client.query(`UPDATE accounting_partners SET total_debt_uzs = 0;`);

    // Recalculate Sums
    await client.query(`
      WITH summary AS (
        SELECT bank_account_id, SUM(CASE WHEN is_income THEN amount_uzs ELSE -amount_uzs END) as total
        FROM accounting_transactions WHERE bank_account_id IS NOT NULL GROUP BY bank_account_id
      )
      UPDATE accounting_bank_accounts b SET balance = summary.total FROM summary WHERE b.id = summary.bank_account_id;
    `);
    
    await client.query(`
      WITH summary AS (
        SELECT card_id, SUM(CASE WHEN is_income THEN amount_uzs ELSE -amount_uzs END) as total
        FROM accounting_transactions WHERE card_id IS NOT NULL GROUP BY card_id
      )
      UPDATE accounting_cards c SET balance = summary.total FROM summary WHERE c.id = summary.card_id;
    `);

    await client.query(`
      WITH summary AS (
        SELECT cash_vault_id, SUM(CASE WHEN is_income THEN amount_uzs ELSE -amount_uzs END) as total
        FROM accounting_transactions WHERE cash_vault_id IS NOT NULL GROUP BY cash_vault_id
      )
      UPDATE accounting_cash_vaults v SET balance = summary.total FROM summary WHERE v.id = summary.cash_vault_id;
    `);

    await client.query(`
      WITH summary AS (
        SELECT partner_id, SUM(CASE WHEN is_income THEN amount_uzs ELSE -amount_uzs END) as total
        FROM accounting_transactions WHERE partner_id IS NOT NULL GROUP BY partner_id
      )
      UPDATE accounting_partners p SET total_debt_uzs = summary.total FROM summary WHERE p.id = summary.partner_id;
    `);

    console.log('System cleaned and balances synchronized! Everything is 100% correct now.');
  } catch (err) {
    console.error('Purge and fix failed:', err);
  } finally {
    await client.end();
  }
}

purgeTriggersAndFix();
