/**
 * Store factory — picks the right DataStore implementation at runtime.
 *
 * If DATABASE_URL is set, the PostgreSQL store is used. Otherwise the
 * in-memory store (seeded with default data) is used. The rest of the
 * backend always talks to the `store` singleton and never knows which
 * implementation is underneath.
 */
import { config } from '../config';
import { MemoryStore } from './memoryStore';
import { PostgresStore } from './postgresStore';
import type { DataStore } from './store';

let _store: DataStore | null = null;

export function getStore(): DataStore {
  if (_store) return _store;
  if (config.useDatabase && config.databaseUrl) {
    console.log('[store] Using PostgreSQL store');
    _store = new PostgresStore(config.databaseUrl);
  } else {
    console.log('[store] Using in-memory store (demo mode)');
    _store = new MemoryStore();
  }
  return _store;
}

export type { DataStore } from './store';
