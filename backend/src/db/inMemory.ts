/**
 * In-memory data store.
 *
 * This is the fallback implementation used when DATABASE_URL is not set
 * (demo/local mode). It implements the exact same interface as the Postgres
 * store so the rest of the backend is completely storage-agnostic.
 *
 * It is seeded with the default users, payment numbers, exchange rates,
 * tariffs and a few sample transactions so the application is fully
 * functional and testable immediately.
 */
import bcrypt from 'bcryptjs';
import type {
  AppSettings, AuditLog, BorrowRequest, BorrowType, Country,
  ExchangeRate, NotificationLog, PaymentNumber, Receipt, SafeUser, Tariff,
  Transaction, TransactionDirection, TransactionStatusHistory,
  TransactionStatus, TransactionType, User,
} from '../types';

/** Strip the password hash before returning a user to clients. */
export function toSafeUser(u: User): SafeUser {
  const { password_hash, ...rest } = u;
  return rest;
}

/** Auto-incrementing id helper per table. */
class Counter {
  n = 0;
  next(): number { return ++this.n; }
}

interface DB {
  users: Map<number, User>;
  paymentNumbers: Map<number, PaymentNumber>;
  transactions: Map<number, Transaction>;
  statusHistory: TransactionStatusHistory[];
  receipts: Map<number, Receipt>;
  notifications: Map<number, NotificationLog>;
  exchangeRates: Map<number, ExchangeRate>;
  tariffs: Map<number, Tariff>;
  auditLogs: Map<number, AuditLog>;
  borrowRequests: Map<number, BorrowRequest>;
  settings: AppSettings;
  seq: Record<string, Counter>;
}

let db: DB;

/** Build (and seed) the in-memory database. Idempotent. */
export function initInMemory(): void {
  if (db) return;

  const now = () => new Date().toISOString();
  const seq: Record<string, Counter> = {};
  const counter = (name: string) => (seq[name] = seq[name] || new Counter());

  const users = new Map<number, User>();
  const paymentNumbers = new Map<number, PaymentNumber>();
  const transactions = new Map<number, Transaction>();
  const receipts = new Map<number, Receipt>();
  const notifications = new Map<number, NotificationLog>();
  const exchangeRates = new Map<number, ExchangeRate>();
  const tariffs = new Map<number, Tariff>();
  const auditLogs = new Map<number, AuditLog>();
  const borrowRequests = new Map<number, BorrowRequest>();

  // ---- Seed users (default credentials maintained) ----
  // Passwords are hashed with bcrypt.
  const mkUser = (id: number, data: Partial<User> & { full_name: string; phone: string; password: string }): User => {
    const u: User = {
      id,
      firebase_uid: null,
      full_name: data.full_name,
      email: data.email ?? null,
      phone: data.phone,
      whatsapp: data.whatsapp ?? data.phone,
      whatsapp_verified: data.whatsapp_verified ?? true,
      country: data.country ?? 'ML',
      password_hash: bcrypt.hashSync(data.password, 10),
      role: data.role ?? 'user',
      tier: data.tier ?? 'BRONZE',
      balance: data.balance ?? 0,
      device_token: data.device_token ?? null,
      is_active: data.is_active ?? true,
      created_at: now(),
      updated_at: now(),
    };
    users.set(id, u);
    counter('users').n = Math.max(counter('users').n, id);
    return u;
  };

  // Customer (default): +223 70 00 00 00 / demo1234
  mkUser(1, {
    full_name: 'Demo Customer', phone: '+22370000000',
    email: 'demo@zender237.app', country: 'ML',
    role: 'user', tier: 'GOLD', balance: 125000, password: 'demo1234',
  });
  // Admin (default): +237 700 000 001 / admin123
  mkUser(2, {
    full_name: 'Super Admin', phone: '+237700000001',
    email: 'admin@zender237.app', country: 'CM',
    role: 'admin', tier: 'GOLD', balance: 0, password: 'admin123',
  });
  // Partner (default): +237 700 000 002 / partner123
  mkUser(3, {
    full_name: 'Bank Partner', phone: '+237700000002',
    email: 'partner@zender237.app', country: 'CM',
    role: 'staff', tier: 'SILVER', balance: 0, password: 'partner123',
  });
  // Extra sample customer
  mkUser(4, {
    full_name: 'Awa Traore', phone: '+22371234567',
    email: 'awa@zender237.app', country: 'ML',
    role: 'user', tier: 'SILVER', balance: 42000, password: 'demo1234',
  });

  // ---- Payment numbers ----
  const mkNumber = (id: number, label: string, number: string, country: Country, provider: string, daily_limit = 1000000): PaymentNumber => {
    const pn: PaymentNumber = {
      id, label, number, country, provider,
      is_active: true, daily_limit, used_today: 0, created_at: now(),
    };
    paymentNumbers.set(id, pn);
    counter('paymentNumbers').n = Math.max(counter('paymentNumbers').n, id);
    return pn;
  };
  mkNumber(1, 'Orange Money ML', '+22376000001', 'ML', 'Orange Money', 2000000);
  mkNumber(2, 'Moov Money ML', '+22376000002', 'ML', 'Moov Money', 1500000);
  mkNumber(3, 'MTN CM', '+23768000001', 'CM', 'MTN Mobile Money', 3000000);
  mkNumber(4, 'Orange CM', '+23769000001', 'CM', 'Orange Money', 3000000);
  mkNumber(5, 'Orange GN', '+22462000001', 'GN', 'Orange Money', 1500000);

  // ---- Exchange rates ----
  const mkRate = (id: number, f: string, t: string, rate: number): ExchangeRate => {
    const r: ExchangeRate = { id, from_currency: f, to_currency: t, rate, updated_at: now() };
    exchangeRates.set(id, r);
    counter('exchangeRates').n = Math.max(counter('exchangeRates').n, id);
    return r;
  };
  // 1 XOF = 0.94 XAF (as shown in the design image)
  mkRate(1, 'XOF', 'XAF', 0.94);
  mkRate(2, 'XAF', 'XOF', 1.0638);
  mkRate(3, 'XOF', 'XOF', 1);
  mkRate(4, 'XAF', 'XAF', 1);

  // ---- Tariffs ----
  const mkTariff = (id: number, min: number, max: number, pct: number, fixed: number): Tariff => {
    const t: Tariff = { id, min_amount: min, max_amount: max, fee_percent: pct, fixed_fee: fixed, updated_at: now() };
    tariffs.set(id, t);
    counter('tariffs').n = Math.max(counter('tariffs').n, id);
    return t;
  };
  mkTariff(1, 0, 50000, 2.5, 200);
  mkTariff(2, 50001, 200000, 2.0, 500);
  mkTariff(3, 200001, 10000000, 1.5, 1000);

  // ---- Sample transactions for the demo customer ----
  const mkTx = (id: number, data: Partial<Transaction> & {
    type: TransactionType; source_country: Country; dest_country: Country;
    amount_sent: number; currency_sent: string; amount_received: number; currency_received: string;
  }): Transaction => {
    const t: Transaction = {
      id,
      reference: data.reference ?? `TX-MS6TVMGD-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
      user_id: data.user_id ?? 1,
      type: data.type,
      direction: data.direction ?? null,
      source_country: data.source_country,
      dest_country: data.dest_country,
      amount_sent: data.amount_sent,
      currency_sent: data.currency_sent,
      amount_received: data.amount_received,
      currency_received: data.currency_received,
      fee: data.fee ?? 0,
      exchange_rate: data.exchange_rate ?? 0.94,
      sender_phone: data.sender_phone ?? null,
      receiver_phone: data.receiver_phone ?? null,
      payment_number_id: data.payment_number_id ?? null,
      status: data.status ?? 'completed',
      proof_url: data.proof_url ?? null,
      proof_reference: data.proof_reference ?? null,
      proof_sender_number: data.proof_sender_number ?? null,
      admin_note: data.admin_note ?? null,
      reviewed_by: data.reviewed_by ?? 2,
      created_at: data.created_at ?? now(),
      updated_at: data.updated_at ?? now(),
    };
    transactions.set(id, t);
    counter('transactions').n = Math.max(counter('transactions').n, id);
    return t;
  };
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();
  mkTx(1, { reference: 'TX-MS6TVMGD-89E13A', type: 'transfer', direction: 'ML->CM', source_country: 'ML', dest_country: 'CM', amount_sent: 53000, currency_sent: 'XOF', amount_received: 50000, currency_received: 'XAF', fee: 1325, receiver_phone: '+23768000001', status: 'completed', created_at: hoursAgo(28) });
  mkTx(2, { reference: 'TX-MS6TVMGD-453864', type: 'transfer', direction: 'ML->CM', source_country: 'ML', dest_country: 'CM', amount_sent: 12000, currency_sent: 'XOF', amount_received: 11280, currency_received: 'XAF', fee: 500, receiver_phone: '+23769000001', status: 'completed', created_at: hoursAgo(52) });
  mkTx(3, { reference: 'TX-MS7T215T-9ED8C0', type: 'deposit', direction: null, source_country: 'ML', dest_country: 'ML', amount_sent: 78500, currency_sent: 'XOF', amount_received: 75000, currency_received: 'XAF', fee: 0, sender_phone: '+22376000001', status: 'completed', created_at: hoursAgo(100) });
  mkTx(4, { reference: 'TX-MS7T215T-026F5B', type: 'transfer', direction: 'ML->CM', source_country: 'ML', dest_country: 'CM', amount_sent: 206000, currency_sent: 'XOF', amount_received: 200000, currency_received: 'XAF', fee: 4120, receiver_phone: '+23768000001', status: 'under_review', created_at: hoursAgo(3) });

  // ---- App settings ----
  const settings: AppSettings = {
    id: 1,
    admin_whatsapp: '+237700000001',
    maintenance_mode: false,
    updated_at: now(),
  };

  db = {
    users, paymentNumbers, transactions, receipts, notifications,
    exchangeRates, tariffs, auditLogs, borrowRequests,
    statusHistory: [],
    settings,
    seq,
  };
}

// ---------------------------------------------------------------------------
// Access helpers used by the store implementation.
// ---------------------------------------------------------------------------
export function getDB(): DB {
  if (!db) initInMemory();
  return db;
}

export function nextId(table: keyof DB): number {
  const d = getDB();
  const name = String(table);
  d.seq[name] = d.seq[name] || new Counter();
  return d.seq[name].next();
}
