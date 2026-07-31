/**
 * In-memory implementation of the DataStore interface.
 *
 * Wraps the seeded maps from inMemory.ts and exposes the async contract
 * expected by the rest of the backend. Used when DATABASE_URL is empty.
 */
import type {
  AppSettings, AuditLog, BorrowRequest, BorrowType,
  ExchangeRate, NotificationLog, PaymentNumber, Receipt,
  Tariff, Transaction, TransactionStatus, TransactionStatusHistory, User,
} from '../types';
import { toSafeUser, getDB, nextId } from './inMemory';
import type {
  DataStore, ListTxFilter, CreateUserInput, UpdateUserInput,
  CreateTransactionInput, UpdateTransactionInput, CreateBorrowInput,
  CreateReceiptInput, CreateNotificationInput, CreateAuditInput,
  CreatePaymentNumberInput, CreateExchangeRateInput, CreateTariffInput,
  StatusHistoryInput,
} from './store';

const now = () => new Date().toISOString();
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export class MemoryStore implements DataStore {
  readonly kind = 'memory' as const;

  // ---- Users ----
  async findUserById(id: number): Promise<User | null> {
    const u = getDB().users.get(id);
    return u ? clone(u) : null;
  }
  async findUserByPhone(phone: string): Promise<User | null> {
    const u = [...getDB().users.values()].find((x) => x.phone === phone);
    return u ? clone(u) : null;
  }
  async findUserByEmail(email: string): Promise<User | null> {
    const u = [...getDB().users.values()].find((x) => x.email === email);
    return u ? clone(u) : null;
  }
  async listUsers(): Promise<User[]> {
    return [...getDB().users.values()].map(clone);
  }
  async createUser(input: CreateUserInput): Promise<User> {
    const id = nextId('users');
    const u: User = {
      id,
      firebase_uid: null,
      full_name: input.full_name,
      email: input.email ?? null,
      phone: input.phone,
      whatsapp: input.whatsapp ?? input.phone,
      whatsapp_verified: false,
      country: input.country,
      password_hash: input.password_hash,
      role: input.role ?? 'user',
      tier: input.tier ?? 'BRONZE',
      balance: input.balance ?? 0,
      device_token: null,
      is_active: true,
      created_at: now(),
      updated_at: now(),
    };
    getDB().users.set(id, u);
    return clone(u);
  }
  async updateUser(id: number, input: UpdateUserInput): Promise<User | null> {
    const u = getDB().users.get(id);
    if (!u) return null;
    Object.assign(u, input, { updated_at: now() });
    return clone(u);
  }
  async deleteUser(id: number): Promise<boolean> {
    return getDB().users.delete(id);
  }

  // ---- Transactions ----
  async findTransactionById(id: number): Promise<Transaction | null> {
    const t = getDB().transactions.get(id);
    return t ? clone(t) : null;
  }
  async findTransactionByReference(reference: string): Promise<Transaction | null> {
    const t = [...getDB().transactions.values()].find((x) => x.reference === reference);
    return t ? clone(t) : null;
  }
  async listTransactions(filter: ListTxFilter = {}): Promise<Transaction[]> {
    let arr = [...getDB().transactions.values()];
    if (filter.user_id) arr = arr.filter((t) => t.user_id === filter.user_id);
    if (filter.type) arr = arr.filter((t) => t.type === filter.type);
    if (filter.status) arr = arr.filter((t) => t.status === filter.status);
    arr.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? arr.length;
    return arr.slice(offset, offset + limit).map(clone);
  }
  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const id = nextId('transactions');
    const t: Transaction = {
      id,
      reference: input.reference,
      user_id: input.user_id,
      type: input.type,
      direction: input.direction ?? null,
      source_country: input.source_country,
      dest_country: input.dest_country,
      amount_sent: input.amount_sent,
      currency_sent: input.currency_sent,
      amount_received: input.amount_received,
      currency_received: input.currency_received,
      fee: input.fee,
      exchange_rate: input.exchange_rate,
      sender_phone: input.sender_phone ?? null,
      receiver_phone: input.receiver_phone ?? null,
      payment_number_id: input.payment_number_id ?? null,
      status: input.status ?? 'pending',
      proof_url: null,
      proof_reference: null,
      proof_sender_number: null,
      admin_note: null,
      reviewed_by: null,
      created_at: now(),
      updated_at: now(),
    };
    getDB().transactions.set(id, t);
    return clone(t);
  }
  async updateTransaction(id: number, input: UpdateTransactionInput): Promise<Transaction | null> {
    const t = getDB().transactions.get(id);
    if (!t) return null;
    Object.assign(t, input, { updated_at: now() });
    return clone(t);
  }

  // ---- Status history ----
  async addStatusHistory(input: StatusHistoryInput): Promise<TransactionStatusHistory> {
    const id = nextId('statusHistory');
    const h: TransactionStatusHistory = {
      id,
      transaction_id: input.transaction_id,
      status: input.status,
      note: input.note ?? null,
      changed_by: input.changed_by ?? null,
      created_at: now(),
    };
    getDB().statusHistory.push(h);
    return clone(h);
  }
  async listStatusHistory(transactionId: number): Promise<TransactionStatusHistory[]> {
    return getDB().statusHistory
      .filter((h) => h.transaction_id === transactionId)
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .map(clone);
  }

  // ---- Receipts ----
  async createReceipt(input: CreateReceiptInput): Promise<Receipt> {
    const id = nextId('receipts');
    const r: Receipt = {
      id,
      transaction_id: input.transaction_id,
      file_url: input.file_url,
      file_name: input.file_name,
      uploaded_by: input.uploaded_by,
      created_at: now(),
    };
    getDB().receipts.set(id, r);
    return clone(r);
  }
  async listReceiptsForTransaction(transactionId: number): Promise<Receipt[]> {
    return [...getDB().receipts.values()]
      .filter((r) => r.transaction_id === transactionId)
      .map(clone);
  }

  // ---- Payment numbers ----
  async listPaymentNumbers(country?: any): Promise<PaymentNumber[]> {
    let arr = [...getDB().paymentNumbers.values()];
    if (country) arr = arr.filter((p) => p.country === country);
    return arr.map(clone);
  }
  async findPaymentNumberById(id: number): Promise<PaymentNumber | null> {
    const p = getDB().paymentNumbers.get(id);
    return p ? clone(p) : null;
  }
  async createPaymentNumber(input: CreatePaymentNumberInput): Promise<PaymentNumber> {
    const id = nextId('paymentNumbers');
    const p: PaymentNumber = {
      id,
      label: input.label,
      number: input.number,
      country: input.country,
      provider: input.provider,
      is_active: true,
      daily_limit: input.daily_limit ?? 1000000,
      used_today: 0,
      created_at: now(),
    };
    getDB().paymentNumbers.set(id, p);
    return clone(p);
  }
  async updatePaymentNumber(id: number, input: Partial<PaymentNumber>): Promise<PaymentNumber | null> {
    const p = getDB().paymentNumbers.get(id);
    if (!p) return null;
    Object.assign(p, input);
    return clone(p);
  }
  async deletePaymentNumber(id: number): Promise<boolean> {
    return getDB().paymentNumbers.delete(id);
  }

  // ---- Exchange rates ----
  async listExchangeRates(): Promise<ExchangeRate[]> {
    return [...getDB().exchangeRates.values()].map(clone);
  }
  async findExchangeRate(from: string, to: string): Promise<ExchangeRate | null> {
    const r = [...getDB().exchangeRates.values()].find(
      (x) => x.from_currency === from && x.to_currency === to,
    );
    return r ? clone(r) : null;
  }
  async upsertExchangeRate(input: CreateExchangeRateInput): Promise<ExchangeRate> {
    const existing = await this.findExchangeRate(input.from_currency, input.to_currency);
    if (existing) {
      const e = getDB().exchangeRates.get(existing.id)!;
      e.rate = input.rate;
      e.updated_at = now();
      return clone(e);
    }
    const id = nextId('exchangeRates');
    const r: ExchangeRate = {
      id,
      from_currency: input.from_currency,
      to_currency: input.to_currency,
      rate: input.rate,
      updated_at: now(),
    };
    getDB().exchangeRates.set(id, r);
    return clone(r);
  }

  // ---- Tariffs ----
  async listTariffs(): Promise<Tariff[]> {
    return [...getDB().tariffs.values()]
      .sort((a, b) => a.min_amount - b.min_amount)
      .map(clone);
  }
  async findTariffForAmount(amount: number): Promise<Tariff | null> {
    const t = [...getDB().tariffs.values()].find(
      (x) => amount >= x.min_amount && amount <= x.max_amount,
    );
    return t ? clone(t) : null;
  }
  async upsertTariff(input: CreateTariffInput): Promise<Tariff> {
    const id = nextId('tariffs');
    const t: Tariff = {
      id,
      min_amount: input.min_amount,
      max_amount: input.max_amount,
      fee_percent: input.fee_percent,
      fixed_fee: input.fixed_fee,
      updated_at: now(),
    };
    getDB().tariffs.set(id, t);
    return clone(t);
  }
  async deleteTariff(id: number): Promise<boolean> {
    return getDB().tariffs.delete(id);
  }

  // ---- Borrow requests ----
  async findBorrowById(id: number): Promise<BorrowRequest | null> {
    const b = getDB().borrowRequests.get(id);
    return b ? clone(b) : null;
  }
  async findBorrowByReference(reference: string): Promise<BorrowRequest | null> {
    const b = [...getDB().borrowRequests.values()].find((x) => x.reference === reference);
    return b ? clone(b) : null;
  }
  async listBorrowRequests(filter: { user_id?: number; status?: TransactionStatus } = {}): Promise<BorrowRequest[]> {
    let arr = [...getDB().borrowRequests.values()];
    if (filter.user_id) arr = arr.filter((b) => b.user_id === filter.user_id);
    if (filter.status) arr = arr.filter((b) => b.status === filter.status);
    arr.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return arr.map(clone);
  }
  async createBorrow(input: CreateBorrowInput): Promise<BorrowRequest> {
    const id = nextId('borrowRequests');
    const b: BorrowRequest = {
      id,
      reference: input.reference,
      user_id: input.user_id,
      type: input.type,
      amount: input.amount ?? null,
      currency: input.currency,
      interest_rate: input.interest_rate,
      duration_months: input.duration_months,
      due_date: input.due_date ?? null,
      reason: input.reason ?? null,
      id_front_url: input.id_front_url ?? null,
      id_back_url: input.id_back_url ?? null,
      status: 'pending',
      is_gold: input.is_gold,
      free_accommodation_months: input.free_accommodation_months ?? 0,
      admin_note: null,
      created_at: now(),
      updated_at: now(),
    };
    getDB().borrowRequests.set(id, b);
    return clone(b);
  }
  async updateBorrow(id: number, input: Partial<BorrowRequest>): Promise<BorrowRequest | null> {
    const b = getDB().borrowRequests.get(id);
    if (!b) return null;
    Object.assign(b, input, { updated_at: now() });
    return clone(b);
  }

  // ---- Notifications ----
  async createNotification(input: CreateNotificationInput): Promise<NotificationLog> {
    const id = nextId('notifications');
    const n: NotificationLog = {
      id,
      user_id: input.user_id,
      title: input.title,
      body: input.body,
      channel: input.channel ?? 'in_app',
      is_read: false,
      created_at: now(),
    };
    getDB().notifications.set(id, n);
    return clone(n);
  }
  async listNotifications(userId: number): Promise<NotificationLog[]> {
    return [...getDB().notifications.values()]
      .filter((n) => n.user_id === userId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map(clone);
  }
  async markNotificationRead(id: number): Promise<boolean> {
    const n = getDB().notifications.get(id);
    if (!n) return false;
    n.is_read = true;
    return true;
  }

  // ---- Audit logs ----
  async createAudit(input: CreateAuditInput): Promise<AuditLog> {
    const id = nextId('auditLogs');
    const a: AuditLog = {
      id,
      actor_id: input.actor_id,
      action: input.action,
      entity: input.entity,
      entity_id: input.entity_id ?? null,
      detail: input.detail ?? null,
      created_at: now(),
    };
    getDB().auditLogs.set(id, a);
    return clone(a);
  }
  async listAuditLogs(limit = 100): Promise<AuditLog[]> {
    return [...getDB().auditLogs.values()]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit)
      .map(clone);
  }

  // ---- Settings ----
  async getSettings(): Promise<AppSettings> {
    return clone(getDB().settings);
  }
  async updateSettings(input: Partial<Pick<AppSettings, 'admin_whatsapp' | 'maintenance_mode'>>): Promise<AppSettings> {
    const s = getDB().settings;
    if (input.admin_whatsapp !== undefined) s.admin_whatsapp = input.admin_whatsapp;
    if (input.maintenance_mode !== undefined) s.maintenance_mode = input.maintenance_mode;
    s.updated_at = now();
    return clone(s);
  }
}

export { toSafeUser };
