/**
 * Unified DataStore interface.
 *
 * Both the in-memory store and the PostgreSQL store implement this interface,
 * so the rest of the backend (routes, services) is completely storage-agnostic.
 * The store to use is chosen at runtime based on whether DATABASE_URL is set.
 */
import type {
  AppSettings, AuditLog, BorrowRequest, BorrowType, Country,
  ExchangeRate, NotificationLog, PaymentNumber, Receipt, SafeUser, Tariff,
  Transaction, TransactionStatus, TransactionStatusHistory,
  TransactionType, User,
} from '../types';

/** Create-input shapes (no id / timestamps / computed fields). */

export interface CreateUserInput {
  full_name: string;
  email?: string | null;
  phone: string;
  whatsapp?: string | null;
  country: Country;
  password_hash: string;
  role?: 'user' | 'staff' | 'admin';
  tier?: 'BRONZE' | 'SILVER' | 'GOLD';
  balance?: number;
}

export interface UpdateUserInput {
  full_name?: string;
  email?: string | null;
  whatsapp?: string | null;
  whatsapp_verified?: boolean;
  country?: Country;
  role?: 'user' | 'staff' | 'admin';
  tier?: 'BRONZE' | 'SILVER' | 'GOLD';
  balance?: number;
  device_token?: string | null;
  is_active?: boolean;
  password_hash?: string;
}

export interface CreateTransactionInput {
  reference: string;
  user_id: number;
  type: TransactionType;
  direction?: Transaction['direction'];
  source_country: Country;
  dest_country: Country;
  amount_sent: number;
  currency_sent: string;
  amount_received: number;
  currency_received: string;
  fee: number;
  exchange_rate: number;
  sender_phone?: string | null;
  receiver_phone?: string | null;
  payment_number_id?: number | null;
  status?: TransactionStatus;
}

export interface UpdateTransactionInput {
  status?: TransactionStatus;
  proof_url?: string | null;
  proof_reference?: string | null;
  proof_sender_number?: string | null;
  admin_note?: string | null;
  reviewed_by?: number | null;
}

export interface CreateBorrowInput {
  reference: string;
  user_id: number;
  type: BorrowType;
  amount?: number | null;
  currency: string;
  interest_rate: number;
  duration_months: number;
  due_date?: string | null;
  reason?: string | null;
  id_front_url?: string | null;
  id_back_url?: string | null;
  is_gold: boolean;
  free_accommodation_months?: number;
}

export interface CreateReceiptInput {
  transaction_id: number;
  file_url: string;
  file_name: string;
  uploaded_by: number;
}

export interface CreateNotificationInput {
  user_id: number;
  title: string;
  body: string;
  channel?: 'push' | 'email' | 'in_app';
}

export interface CreateAuditInput {
  actor_id: number | null;
  action: string;
  entity: string;
  entity_id?: number | null;
  detail?: string | null;
}

export interface CreatePaymentNumberInput {
  label: string;
  number: string;
  country: Country;
  provider: string;
  daily_limit?: number;
}

export interface CreateExchangeRateInput {
  from_currency: string;
  to_currency: string;
  rate: number;
}

export interface CreateTariffInput {
  min_amount: number;
  max_amount: number;
  fee_percent: number;
  fixed_fee: number;
}

export interface StatusHistoryInput {
  transaction_id: number;
  status: TransactionStatus;
  note?: string | null;
  changed_by?: number | null;
}

export interface ListTxFilter {
  user_id?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  limit?: number;
  offset?: number;
}

/**
 * The store contract. Methods are async so the Postgres implementation can
 * perform real I/O while the in-memory implementation resolves immediately.
 */
export interface DataStore {
  readonly kind: 'memory' | 'postgres';

  // ---- Users ----
  findUserById(id: number): Promise<User | null>;
  findUserByPhone(phone: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  listUsers(): Promise<User[]>;
  createUser(input: CreateUserInput): Promise<User>;
  updateUser(id: number, input: UpdateUserInput): Promise<User | null>;
  deleteUser(id: number): Promise<boolean>;

  // ---- Transactions ----
  findTransactionById(id: number): Promise<Transaction | null>;
  findTransactionByReference(reference: string): Promise<Transaction | null>;
  listTransactions(filter?: ListTxFilter): Promise<Transaction[]>;
  createTransaction(input: CreateTransactionInput): Promise<Transaction>;
  updateTransaction(id: number, input: UpdateTransactionInput): Promise<Transaction | null>;

  // ---- Status history ----
  addStatusHistory(input: StatusHistoryInput): Promise<TransactionStatusHistory>;
  listStatusHistory(transactionId: number): Promise<TransactionStatusHistory[]>;

  // ---- Receipts ----
  createReceipt(input: CreateReceiptInput): Promise<Receipt>;
  listReceiptsForTransaction(transactionId: number): Promise<Receipt[]>;

  // ---- Payment numbers ----
  listPaymentNumbers(country?: Country): Promise<PaymentNumber[]>;
  findPaymentNumberById(id: number): Promise<PaymentNumber | null>;
  createPaymentNumber(input: CreatePaymentNumberInput): Promise<PaymentNumber>;
  updatePaymentNumber(id: number, input: Partial<PaymentNumber>): Promise<PaymentNumber | null>;
  deletePaymentNumber(id: number): Promise<boolean>;

  // ---- Exchange rates ----
  listExchangeRates(): Promise<ExchangeRate[]>;
  findExchangeRate(from: string, to: string): Promise<ExchangeRate | null>;
  upsertExchangeRate(input: CreateExchangeRateInput): Promise<ExchangeRate>;

  // ---- Tariffs ----
  listTariffs(): Promise<Tariff[]>;
  findTariffForAmount(amount: number): Promise<Tariff | null>;
  upsertTariff(input: CreateTariffInput): Promise<Tariff>;
  deleteTariff(id: number): Promise<boolean>;

  // ---- Borrow requests ----
  findBorrowById(id: number): Promise<BorrowRequest | null>;
  findBorrowByReference(reference: string): Promise<BorrowRequest | null>;
  listBorrowRequests(filter?: { user_id?: number; status?: TransactionStatus }): Promise<BorrowRequest[]>;
  createBorrow(input: CreateBorrowInput): Promise<BorrowRequest>;
  updateBorrow(id: number, input: Partial<BorrowRequest>): Promise<BorrowRequest | null>;

  // ---- Notifications ----
  createNotification(input: CreateNotificationInput): Promise<NotificationLog>;
  listNotifications(userId: number): Promise<NotificationLog[]>;
  markNotificationRead(id: number): Promise<boolean>;

  // ---- Audit logs ----
  createAudit(input: CreateAuditInput): Promise<AuditLog>;
  listAuditLogs(limit?: number): Promise<AuditLog[]>;

  // ---- Settings ----
  getSettings(): Promise<AppSettings>;
  updateSettings(input: Partial<Pick<AppSettings, 'admin_whatsapp' | 'maintenance_mode'>>): Promise<AppSettings>;
}
