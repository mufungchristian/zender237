/**
 * Database migration script — runs schema.sql against the configured
 * PostgreSQL DATABASE_URL. No-op (with a message) in demo/in-memory mode.
 */
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { config } from '../config';

async function migrate(): Promise<void> {
  if (!config.useDatabase || !config.databaseUrl) {
    console.log('[migrate] DATABASE_URL not set — running in demo/in-memory mode, nothing to migrate.');
    return;
  }
  console.log('[migrate] Connecting to PostgreSQL...');
  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl.includes('render.com') || config.databaseUrl.includes('neon')
      ? { rejectUnauthorized: false } : undefined,
  });
  const schemaPath = path.join(__dirname, '..', '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  try {
    await pool.query(sql);
    console.log('[migrate] Schema applied successfully.');
  } catch (err) {
    console.error('[migrate] Failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
