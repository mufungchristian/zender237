/**
 * PostgreSQL implementation of the DataStore interface.
 *
 * Used when DATABASE_URL is set. Maps rows to the shared domain types.
 * All amounts are stored as integers (cents) in the DB to avoid float
 * rounding issues; here we keep the application-level numbers as-is
 * (the schema uses numeric for amounts).
 */
import { Pool, PoolClient, types } from 'pg';

// Force pg to return NUMERIC/DECIMAL columns as JavaScript numbers instead of
// strings (the default). This keeps the API responses JSON-clean and matches
// the TypeScript domain types (e.g. ExchangeRate.rate: number).
types.setTypeParser(types.builtins.NUMERIC, (val: string) => (val === null ? null : parseFloat(val)));
// Also parse INT8 (bigint) as number for consistency.
types.setTypeParser(types.builtins.INT8, (val: string) => (val === null ? null : parseInt(val, 10)));
import type {
  AppSettings, AuditLog, BorrowRequest, Country, ExchangeRate,
  NotificationLog, PaymentNumber, Receipt, Tariff, Transaction,
  TransactionStatus, TransactionStatusHistory, User,
} from '../types';
import { toSafeUser } from './inMemory';
import type {
  DataStore, ListTxFilter, CreateUserInput, UpdateUserInput,
  CreateTransactionInput, UpdateTransactionInput, CreateBorrowInput,
  CreateReceiptInput, CreateNotificationInput, CreateAuditInput,
  CreatePaymentNumberInput, CreateExchangeRateInput, CreateTariffInput,
  StatusHistoryInput,
} from './store';

/** Map a snake_case pg row to the User type. */
function rowToUser(r: any): User {
  return {
    id: r.id,
    firebase_uid: r.firebase_uid,
    full_name: r.full_name,
    email: r.email,
    phone: r.phone,
    whatsapp: r.whatsapp,
    whatsapp_verified: r.whatsapp_verified,
    country: r.country,
    password_hash: r.password_hash,
    role: r.role,
    tier: r.tier,
    balance: Number(r.balance),
    device_token: r.device_token,
    is_active: r.is_active,
    created_at: typeof r.created_at === 'string' ? r.created_at : r.created_at.toISOString(),
    updated_at: typeof r.updated_at === 'string' ? r.updated_at : r.updated_at.toISOString(),
  };
}

function rowToTx(r: any): Transaction {
  return {
    id: r.id,
    reference: r.reference,
    user_id: r.user_id,
    type: r.type,
    direction: r.direction,
    source_country: r.source_country,
    dest_country: r.dest_country,
    amount_sent: Number(r.amount_sent),
    currency_sent: r.currency_sent,
    amount_received: Number(r.amount_received),
    currency_received: r.currency_received,
    fee: Number(r.fee),
    exchange_rate: Number(r.exchange_rate),
    sender_phone: r.sender_phone,
    receiver_phone: r.receiver_phone,
    payment_number_id: r.payment_number_id,
    status: r.status,
    proof_url: r.proof_url,
    proof_reference: r.proof_reference,
    proof_sender_number: r.proof_sender_number,
    admin_note: r.admin_note,
    reviewed_by: r.reviewed_by,
    created_at: typeof r.created_at === 'string' ? r.created_at : r.created_at.toISOString(),
    updated_at: typeof r.updated_at === 'string' ? r.updated_at : r.updated_at.toISOString(),
  };
}

function iso(d: any): string {
  if (!d) return d;
  return typeof d === 'string' ? d : d.toISOString();
}

export class PostgresStore implements DataStore {
  readonly kind = 'postgres' as const;
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('render.com') || databaseUrl.includes('neon')
        ? { rejectUnauthorized: false }
        : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }

  /** Run the seed.sql file once (used on first boot). */
  async ensureSeeded(): Promise<void> {
    try {
      const res = await this.pool.query('SELECT COUNT(*)::int AS c FROM users');
      if (res.rows[0].c > 0) return;
    } catch {
      // table may not exist yet — migrate first
    }
    // Defer to seed script; nothing here. migrate+seed are run via npm scripts.
  }

  // ---- Users ----
  async findUserById(id: number): Promise<User | null> {
    const r = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return r.rows[0] ? rowToUser(r.rows[0]) : null;
  }
  async findUserByPhone(phone: string): Promise<User | null> {
    const r = await this.pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    return r.rows[0] ? rowToUser(r.rows[0]) : null;
  }
  async findUserByEmail(email: string): Promise<User | null> {
    const r = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return r.rows[0] ? rowToUser(r.rows[0]) : null;
  }
  async listUsers(): Promise<User[]> {
    const r = await this.pool.query('SELECT * FROM users ORDER BY id');
    return r.rows.map(rowToUser);
  }
  async createUser(input: CreateUserInput): Promise<User> {
    const r = await this.pool.query(
      `INSERT INTO users (full_name, email, phone, whatsapp, whatsapp_verified, country,
         password_hash, role, tier, balance)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        input.full_name, input.email ?? null, input.phone,
        input.whatsapp ?? input.phone, false, input.country,
        input.password_hash, input.role ?? 'user', input.tier ?? 'BRONZE',
        input.balance ?? 0,
      ],
    );
    return rowToUser(r.rows[0]);
  }
  async updateUser(id: number, input: UpdateUserInput): Promise<User | null> {
    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    const map: Record<string, string> = {
      full_name: 'full_name', email: 'email', whatsapp: 'whatsapp',
      whatsapp_verified: 'whatsapp_verified', country: 'country', role: 'role',
      tier: 'tier', balance: 'balance', device_token: 'device_token',
      is_active: 'is_active', password_hash: 'password_hash',
    };
    for (const k of Object.keys(input)) {
      if (map[k]) {
        fields.push(`${map[k]} = $${i++}`);
        vals.push((input as any)[k]);
      }
    }
    fields.push(`updated_at = NOW()`);
    if (fields.length === 1) return this.findUserById(id);
    vals.push(id);
    const r = await this.pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      vals,
    );
    return r.rows[0] ? rowToUser(r.rows[0]) : null;
  }
  async deleteUser(id: number): Promise<boolean> {
    const r = await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
    return (r.rowCount ?? 0) > 0;
  }

  // ---- Transactions ----
  async findTransactionById(id: number): Promise<Transaction | null> {
    const r = await this.pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    return r.rows[0] ? rowToTx(r.rows[0]) : null;
  }
  async findTransactionByReference(reference: string): Promise<Transaction | null> {
    const r = await this.pool.query('SELECT * FROM transactions WHERE reference = $1', [reference]);
    return r.rows[0] ? rowToTx(r.rows[0]) : null;
  }
  async listTransactions(filter: ListTxFilter = {}): Promise<Transaction[]> {
    const where: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (filter.user_id) { where.push(`user_id = $${i++}`); vals.push(filter.user_id); }
    if (filter.type) { where.push(`type = $${i++}`); vals.push(filter.type); }
    if (filter.status) { where.push(`status = $${i++}`); vals.push(filter.status); }
    const sql = `SELECT * FROM transactions${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    vals.push(filter.limit ?? 200, filter.offset ?? 0);
    const r = await this.pool.query(sql, vals);
    return r.rows.map(rowToTx);
  }
  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const r = await this.pool.query(
      `INSERT INTO transactions (reference, user_id, type, direction, source_country, dest_country,
         amount_sent, currency_sent, amount_received, currency_received, fee, exchange_rate,
         sender_phone, receiver_phone, payment_number_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [
        input.reference, input.user_id, input.type, input.direction ?? null,
        input.source_country, input.dest_country, input.amount_sent, input.currency_sent,
        input.amount_received, input.currency_received, input.fee, input.exchange_rate,
        input.sender_phone ?? null, input.receiver_phone ?? null,
        input.payment_number_id ?? null, input.status ?? 'pending',
      ],
    );
    return rowToTx(r.rows[0]);
  }
  async updateTransaction(id: number, input: UpdateTransactionInput): Promise<Transaction | null> {
    const map: Record<string, string> = {
      status: 'status', proof_url: 'proof_url', proof_reference: 'proof_reference',
      proof_sender_number: 'proof_sender_number', admin_note: 'admin_note',
      reviewed_by: 'reviewed_by',
    };
    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    for (const k of Object.keys(input)) {
      if (map[k]) { fields.push(`${map[k]} = $${i++}`); vals.push((input as any)[k]); }
    }
    if (!fields.length) return this.findTransactionById(id);
    fields.push('updated_at = NOW()');
    vals.push(id);
    const r = await this.pool.query(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      vals,
    );
    return r.rows[0] ? rowToTx(r.rows[0]) : null;
  }

  // ---- Status history ----
  async addStatusHistory(input: StatusHistoryInput): Promise<TransactionStatusHistory> {
    const r = await this.pool.query(
      `INSERT INTO transaction_status_history (transaction_id, status, note, changed_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [input.transaction_id, input.status, input.note ?? null, input.changed_by ?? null],
    );
    const x = r.rows[0];
    return { ...x, created_at: iso(x.created_at) };
  }
  async listStatusHistory(transactionId: number): Promise<TransactionStatusHistory[]> {
    const r = await this.pool.query(
      'SELECT * FROM transaction_status_history WHERE transaction_id = $1 ORDER BY created_at ASC',
      [transactionId],
    );
    return r.rows.map((x) => ({ ...x, created_at: iso(x.created_at) }));
  }

  // ---- Receipts ----
  async createReceipt(input: CreateReceiptInput): Promise<Receipt> {
    const r = await this.pool.query(
      `INSERT INTO receipts (transaction_id, file_url, file_name, uploaded_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [input.transaction_id, input.file_url, input.file_name, input.uploaded_by],
    );
    const x = r.rows[0];
    return { ...x, created_at: iso(x.created_at) };
  }
  async listReceiptsForTransaction(transactionId: number): Promise<Receipt[]> {
    const r = await this.pool.query(
      'SELECT * FROM receipts WHERE transaction_id = $1 ORDER BY created_at DESC',
      [transactionId],
    );
    return r.rows.map((x) => ({ ...x, created_at: iso(x.created_at) }));
  }

  // ---- Payment numbers ----
  async listPaymentNumbers(country?: Country): Promise<PaymentNumber[]> {
    if (country) {
      const r = await this.pool.query('SELECT * FROM payment_numbers WHERE country = $1 ORDER BY id', [country]);
      return r.rows.map((x) => ({ ...x, created_at: iso(x.created_at) }));
    }
    const r = await this.pool.query('SELECT * FROM payment_numbers ORDER BY id');
    return r.rows.map((x) => ({ ...x, created_at: iso(x.created_at) }));
  }
  async findPaymentNumberById(id: number): Promise<PaymentNumber | null> {
    const r = await this.pool.query('SELECT * FROM payment_numbers WHERE id = $1', [id]);
    if (!r.rows[0]) return null;
    return { ...r.rows[0], created_at: iso(r.rows[0].created_at) };
  }
  async createPaymentNumber(input: CreatePaymentNumberInput): Promise<PaymentNumber> {
    const r = await this.pool.query(
      `INSERT INTO payment_numbers (label, number, country, provider, daily_limit, used_today)
       VALUES ($1,$2,$3,$4,$5,0) RETURNING *`,
      [input.label, input.number, input.country, input.provider, input.daily_limit ?? 1000000],
    );
    return { ...r.rows[0], created_at: iso(r.rows[0].created_at) };
  }
  async updatePaymentNumber(id: number, input: Partial<PaymentNumber>): Promise<PaymentNumber | null> {
    const allowed = ['label', 'number', 'country', 'provider', 'is_active', 'daily_limit', 'used_today'];
    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    for (const k of Object.keys(input)) {
      if (allowed.includes(k)) { fields.push(`${k} = $${i++}`); vals.push((input as any)[k]); }
    }
    if (!fields.length) return this.findPaymentNumberById(id);
    vals.push(id);
    const r = await this.pool.query(
      `UPDATE payment_numbers SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      vals,
    );
    return r.rows[0] ? { ...r.rows[0], created_at: iso(r.rows[0].created_at) } : null;
  }
  async deletePaymentNumber(id: number): Promise<boolean> {
    const r = await this.pool.query('DELETE FROM payment_numbers WHERE id = $1', [id]);
    return (r.rowCount ?? 0) > 0;
  }

  // ---- Exchange rates ----
  async listExchangeRates(): Promise<ExchangeRate[]> {
    const r = await this.pool.query('SELECT * FROM exchange_rates ORDER BY id');
    return r.rows.map((x) => ({ ...x, updated_at: iso(x.updated_at) }));
  }
  async findExchangeRate(from: string, to: string): Promise<ExchangeRate | null> {
    const r = await this.pool.query(
      'SELECT * FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2',
      [from, to],
    );
    return r.rows[0] ? { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } : null;
  }
  async upsertExchangeRate(input: CreateExchangeRateInput): Promise<ExchangeRate> {
    const r = await this.pool.query(
      `INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (from_currency, to_currency)
       DO UPDATE SET rate = EXCLUDED.rate, updated_at = NOW()
       RETURNING *`,
      [input.from_currency, input.to_currency, input.rate],
    );
    return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) };
  }

  // ---- Tariffs ----
  async listTariffs(): Promise<Tariff[]> {
    const r = await this.pool.query('SELECT * FROM tariffs ORDER BY min_amount');
    return r.rows.map((x) => ({ ...x, updated_at: iso(x.updated_at) }));
  }
  async findTariffForAmount(amount: number): Promise<Tariff | null> {
    const r = await this.pool.query(
      'SELECT * FROM tariffs WHERE $1 >= min_amount AND $1 <= max_amount LIMIT 1',
      [amount],
    );
    return r.rows[0] ? { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) } : null;
  }
  async upsertTariff(input: CreateTariffInput): Promise<Tariff> {
    const r = await this.pool.query(
      `INSERT INTO tariffs (min_amount, max_amount, fee_percent, fixed_fee, updated_at)
       VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [input.min_amount, input.max_amount, input.fee_percent, input.fixed_fee],
    );
    return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) };
  }
  async deleteTariff(id: number): Promise<boolean> {
    const r = await this.pool.query('DELETE FROM tariffs WHERE id = $1', [id]);
    return (r.rowCount ?? 0) > 0;
  }

  // ---- Borrow requests ----
  async findBorrowById(id: number): Promise<BorrowRequest | null> {
    const r = await this.pool.query('SELECT * FROM borrow_requests WHERE id = $1', [id]);
    return r.rows[0] ? this.rowToBorrow(r.rows[0]) : null;
  }
  async findBorrowByReference(reference: string): Promise<BorrowRequest | null> {
    const r = await this.pool.query('SELECT * FROM borrow_requests WHERE reference = $1', [reference]);
    return r.rows[0] ? this.rowToBorrow(r.rows[0]) : null;
  }
  async listBorrowRequests(filter: { user_id?: number; status?: TransactionStatus } = {}): Promise<BorrowRequest[]> {
    const where: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (filter.user_id) { where.push(`user_id = $${i++}`); vals.push(filter.user_id); }
    if (filter.status) { where.push(`status = $${i++}`); vals.push(filter.status); }
    const sql = `SELECT * FROM borrow_requests${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`;
    const r = await this.pool.query(sql, vals);
    return r.rows.map((x) => this.rowToBorrow(x));
  }
  async createBorrow(input: CreateBorrowInput): Promise<BorrowRequest> {
    const r = await this.pool.query(
      `INSERT INTO borrow_requests (reference, user_id, type, amount, currency, interest_rate,
         duration_months, due_date, reason, id_front_url, id_back_url, status, is_gold,
         free_accommodation_months)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        input.reference, input.user_id, input.type, input.amount ?? null,
        input.currency, input.interest_rate, input.duration_months,
        input.due_date ?? null, input.reason ?? null,
        input.id_front_url ?? null, input.id_back_url ?? null,
        'pending', input.is_gold, input.free_accommodation_months ?? 0,
      ],
    );
    return this.rowToBorrow(r.rows[0]);
  }
  async updateBorrow(id: number, input: Partial<BorrowRequest>): Promise<BorrowRequest | null> {
    const allowed = ['status', 'admin_note', 'interest_rate', 'duration_months', 'due_date', 'amount'];
    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    for (const k of Object.keys(input)) {
      if (allowed.includes(k)) { fields.push(`${k} = $${i++}`); vals.push((input as any)[k]); }
    }
    if (!fields.length) return this.findBorrowById(id);
    fields.push('updated_at = NOW()');
    vals.push(id);
    const r = await this.pool.query(
      `UPDATE borrow_requests SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      vals,
    );
    return r.rows[0] ? this.rowToBorrow(r.rows[0]) : null;
  }
  private rowToBorrow(x: any): BorrowRequest {
    return {
      id: x.id, reference: x.reference, user_id: x.user_id, type: x.type,
      amount: x.amount === null ? null : Number(x.amount), currency: x.currency,
      interest_rate: Number(x.interest_rate), duration_months: x.duration_months,
      due_date: iso(x.due_date), reason: x.reason, id_front_url: x.id_front_url,
      id_back_url: x.id_back_url, status: x.status, is_gold: x.is_gold,
      free_accommodation_months: x.free_accommodation_months,
      admin_note: x.admin_note,
      created_at: iso(x.created_at), updated_at: iso(x.updated_at),
    };
  }

  // ---- Notifications ----
  async createNotification(input: CreateNotificationInput): Promise<NotificationLog> {
    const r = await this.pool.query(
      `INSERT INTO notification_logs (user_id, title, body, channel, is_read)
       VALUES ($1,$2,$3,$4,false) RETURNING *`,
      [input.user_id, input.title, input.body, input.channel ?? 'in_app'],
    );
    return { ...r.rows[0], created_at: iso(r.rows[0].created_at) };
  }
  async listNotifications(userId: number): Promise<NotificationLog[]> {
    const r = await this.pool.query(
      'SELECT * FROM notification_logs WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return r.rows.map((x) => ({ ...x, created_at: iso(x.created_at) }));
  }
  async markNotificationRead(id: number): Promise<boolean> {
    const r = await this.pool.query('UPDATE notification_logs SET is_read = true WHERE id = $1', [id]);
    return (r.rowCount ?? 0) > 0;
  }

  // ---- Audit logs ----
  async createAudit(input: CreateAuditInput): Promise<AuditLog> {
    const r = await this.pool.query(
      `INSERT INTO audit_logs (actor_id, action, entity, entity_id, detail)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [input.actor_id, input.action, input.entity, input.entity_id ?? null, input.detail ?? null],
    );
    return { ...r.rows[0], created_at: iso(r.rows[0].created_at) };
  }
  async listAuditLogs(limit = 100): Promise<AuditLog[]> {
    const r = await this.pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1', [limit]);
    return r.rows.map((x) => ({ ...x, created_at: iso(x.created_at) }));
  }

  // ---- Settings ----
  async getSettings(): Promise<AppSettings> {
    const r = await this.pool.query('SELECT * FROM app_settings WHERE id = 1');
    if (!r.rows[0]) {
      // create default row
      const ins = await this.pool.query(
        `INSERT INTO app_settings (id, admin_whatsapp, maintenance_mode) VALUES (1, '+237700000001', false) RETURNING *`,
      );
      return { ...ins.rows[0], updated_at: iso(ins.rows[0].updated_at) };
    }
    return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) };
  }
  async updateSettings(input: Partial<Pick<AppSettings, 'admin_whatsapp' | 'maintenance_mode'>>): Promise<AppSettings> {
    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (input.admin_whatsapp !== undefined) { fields.push(`admin_whatsapp = $${i++}`); vals.push(input.admin_whatsapp); }
    if (input.maintenance_mode !== undefined) { fields.push(`maintenance_mode = $${i++}`); vals.push(input.maintenance_mode); }
    fields.push('updated_at = NOW()');
    vals.push(1);
    const r = await this.pool.query(
      `UPDATE app_settings SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      vals,
    );
    if (!r.rows[0]) return this.getSettings();
    return { ...r.rows[0], updated_at: iso(r.rows[0].updated_at) };
  }
}

export { toSafeUser };
