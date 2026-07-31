/**
 * Shared domain types used across the Zender237 backend.
 * These mirror the PostgreSQL schema and are returned by the data store.
 */

export type UserRole = 'user' | 'staff' | 'admin';
export type Tier = 'BRONZE' | 'SILVER' | 'GOLD';
export type Country = 'ML' | 'GN' | 'CM'; // Mali, Guinea, Cameroon

export interface User {
  id: number;
  firebase_uid: string | null;
  full_name: string;
  email: string | null;
  phone: string;
  whatsapp: string | null;
  whatsapp_verified: boolean;
  country: Country;
  password_hash: string;
  role: UserRole;
  tier: Tier;
  balance: number;
  device_token: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Public user (no password hash) returned to clients. */
export interface SafeUser extends Omit<User, 'password_hash'> {}

export type TransactionType = 'deposit' | 'transfer' | 'withdraw';
export type TransactionStatus =
  | 'draft'
  | 'pending'
  | 'awaiting_payment'
  | 'awaiting_proof'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export type TransactionDirection = 'ML->CM' | 'CM->ML' | 'ML->GN' | 'GN->ML' | 'CM->GN' | 'GN->CM';

export interface Transaction {
  id: number;
  reference: string; // e.g. TX-MS6TVMGD-89E13A
  user_id: number;
  type: TransactionType;
  direction: TransactionDirection | null;
  source_country: Country;
  dest_country: Country;
  amount_sent: number;
  currency_sent: string; // XOF / XAF
  amount_received: number;
  currency_received: string;
  fee: number;
  exchange_rate: number;
  sender_phone: string | null;
  receiver_phone: string | null;
  payment_number_id: number | null;
  status: TransactionStatus;
  proof_url: string | null;
  proof_reference: string | null;
  proof_sender_number: string | null;
  admin_note: string | null;
  reviewed_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionStatusHistory {
  id: number;
  transaction_id: number;
  status: TransactionStatus;
  note: string | null;
  changed_by: number | null;
  created_at: string;
}

export interface PaymentNumber {
  id: number;
  label: string;
  number: string;
  country: Country;
  provider: string; // Orange, MTN, Moov, Wave...
  is_active: boolean;
  daily_limit: number;
  used_today: number;
  created_at: string;
}

export interface Receipt {
  id: number;
  transaction_id: number;
  file_url: string;
  file_name: string;
  uploaded_by: number;
  created_at: string;
}

export interface NotificationLog {
  id: number;
  user_id: number;
  title: string;
  body: string;
  channel: 'push' | 'email' | 'in_app';
  is_read: boolean;
  created_at: string;
}

export interface ExchangeRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

export interface Tariff {
  id: number;
  min_amount: number;
  max_amount: number;
  fee_percent: number;
  fixed_fee: number;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  actor_id: number | null;
  action: string;
  entity: string;
  entity_id: number | null;
  detail: string | null;
  created_at: string;
}

export type BorrowType = 'money' | 'flight_ticket';

export interface BorrowRequest {
  id: number;
  reference: string;
  user_id: number;
  type: BorrowType;
  amount: number | null; // null for flight ticket
  currency: string;
  interest_rate: number;
  duration_months: number;
  due_date: string | null;
  reason: string | null;
  id_front_url: string | null;
  id_back_url: string | null;
  status: TransactionStatus;
  is_gold: boolean; // tier snapshot
  free_accommodation_months: number;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id: number;
  admin_whatsapp: string;
  maintenance_mode: boolean;
  updated_at: string;
}
