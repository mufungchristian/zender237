/**
 * Database seed script — inserts default users, payment numbers, rates,
 * tariffs and sample transactions into PostgreSQL.
 *
 * Uses INSERT ... ON CONFLICT DO NOTHING so it is idempotent.
 * No-op in demo/in-memory mode (the in-memory store auto-seeds).
 */
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { config } from '../config';

async function seed(): Promise<void> {
  if (!config.useDatabase || !config.databaseUrl) {
    console.log('[seed] DATABASE_URL not set — in-memory mode auto-seeds, nothing to do.');
    return;
  }
  console.log('[seed] Connecting to PostgreSQL...');
  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl.includes('render.com') || config.databaseUrl.includes('neon')
      ? { rejectUnauthorized: false } : undefined,
  });

  const hash = (p: string) => bcrypt.hashSync(p, 10);
  const now = () => new Date().toISOString();
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();

  try {
    // ---- Users ----
    const users = [
      [1, 'Demo Customer', 'demo@zender237.app', '+22370000000', '+22370000000', true, 'ML', hash('demo1234'), 'user', 'GOLD', 125000],
      [2, 'Super Admin', 'admin@zender237.app', '+237700000001', '+237700000001', true, 'CM', hash('admin123'), 'admin', 'GOLD', 0],
      [3, 'Bank Partner', 'partner@zender237.app', '+237700000002', '+237700000002', true, 'CM', hash('partner123'), 'staff', 'SILVER', 0],
      [4, 'Awa Traore', 'awa@zender237.app', '+22371234567', '+22371234567', true, 'ML', hash('demo1234'), 'user', 'SILVER', 42000],
    ];
    for (const u of users) {
      await pool.query(
        `INSERT INTO users (id, full_name, email, phone, whatsapp, whatsapp_verified, country, password_hash, role, tier, balance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
        u,
      );
    }

    // ---- Payment numbers ----
    const numbers = [
      [1, 'Orange Money Mali', '+22376000001', 'ML', 'Orange', 1000000, 0],
      [2, 'Moov Mali', '+22376000002', 'ML', 'Moov', 800000, 0],
      [3, 'Orange Money Cameroon', '+23768000001', 'CM', 'Orange', 1000000, 0],
      [4, 'MTN MoMo Cameroon', '+23769000001', 'CM', 'MTN', 1000000, 0],
      [5, 'Orange Money Guinea', '+22462000001', 'GN', 'Orange', 800000, 0],
    ];
    for (const n of numbers) {
      await pool.query(
        `INSERT INTO payment_numbers (id, label, number, country, provider, daily_limit, used_today)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        n,
      );
    }

    // ---- Exchange rates ----
    const rates = [
      [1, 'XOF', 'XAF', 0.94],
      [2, 'XAF', 'XOF', 1.064],
      [3, 'XOF', 'XOF', 1],
      [4, 'XAF', 'XAF', 1],
    ];
    for (const r of rates) {
      await pool.query(
        `INSERT INTO exchange_rates (id, from_currency, to_currency, rate)
         VALUES ($1,$2,$3,$4) ON CONFLICT (from_currency, to_currency) DO UPDATE SET rate = EXCLUDED.rate`,
        r,
      );
    }

    // ---- Tariffs ----
    const tariffs = [
      [1, 0, 50000, 2.5, 0],
      [2, 50001, 200000, 2, 0],
      [3, 200001, 10000000, 1.5, 500],
    ];
    for (const t of tariffs) {
      await pool.query(
        `INSERT INTO tariffs (id, min_amount, max_amount, fee_percent, fixed_fee)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        t,
      );
    }

    // ---- App settings ----
    await pool.query(
      `INSERT INTO app_settings (id, admin_whatsapp, maintenance_mode)
       VALUES (1, '+237700000001', false)
       ON CONFLICT (id) DO UPDATE SET admin_whatsapp = EXCLUDED.admin_whatsapp`,
    );

    // ---- Sample transactions ----
    const txs = [
      [1, 'TX-MS6TVMGD-89E13A', 1, 'transfer', 'ML->CM', 'ML', 'CM', 53000, 'XOF', 50000, 'XAF', 1325, 0.94, null, '+23768000001', 3, 'completed', hoursAgo(28)],
      [2, 'TX-MS6TVMGD-453864', 1, 'transfer', 'ML->CM', 'ML', 'CM', 12000, 'XOF', 11280, 'XAF', 500, 0.94, null, '+23769000001', 4, 'completed', hoursAgo(52)],
      [3, 'TX-MS7T215T-9ED8C0', 1, 'deposit', null, 'ML', 'ML', 78500, 'XOF', 75000, 'XAF', 0, 0.94, '+22376000001', null, 1, 'completed', hoursAgo(100)],
      [4, 'TX-MS7T215T-026F5B', 1, 'transfer', 'ML->CM', 'ML', 'CM', 206000, 'XOF', 200000, 'XAF', 4120, 0.94, null, '+23768000001', 3, 'under_review', hoursAgo(3)],
    ];
    for (const t of txs) {
      await pool.query(
        `INSERT INTO transactions (id, reference, user_id, type, direction, source_country, dest_country,
            amount_sent, currency_sent, amount_received, currency_received, fee, exchange_rate,
            sender_phone, receiver_phone, payment_number_id, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18) ON CONFLICT (id) DO NOTHING`,
        t,
      );
    }

    console.log('[seed] Seed data inserted successfully.');

    // Sync all SERIAL sequences so new inserts don't collide with seeded IDs.
    const seqs = await pool.query(`
      SELECT c.relname AS seq, t.relname AS tbl
      FROM pg_class c JOIN pg_depend d ON d.objid = c.oid
      JOIN pg_class t ON t.oid = d.refobjid
      WHERE c.relkind = 'S'
    `);
    for (const s of seqs.rows) {
      await pool.query(`SELECT setval('${s.seq}', COALESCE((SELECT MAX(id) FROM ${s.tbl}), 1))`);
    }
    console.log('[seed] Sequences synced.');
  } catch (err) {
    console.error('[seed] Failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
