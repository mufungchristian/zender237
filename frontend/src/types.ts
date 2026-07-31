/** Shared types mirroring the backend domain. */
export type UserRole = 'user' | 'staff' | 'admin';
export type Tier = 'BRONZE' | 'SILVER' | 'GOLD';
export type Country = 'ML' | 'GN' | 'CM';

export interface SafeUser {
  id: number;
  firebase_uid: string | null;
  full_name: string;
  email: string | null;
  phone: string;
  whatsapp: string | null;
  whatsapp_verified: boolean;
  country: Country;
  role: UserRole;
  tier: Tier;
  balance: number;
  device_token: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'deposit' | 'transfer' | 'withdraw';
export type TransactionStatus =
  | 'draft' | 'pending' | 'awaiting_payment' | 'awaiting_proof'
  | 'under_review' | 'approved' | 'rejected' | 'completed' | 'cancelled';

export interface Transaction {
  id: number;
  reference: string;
  user_id: number;
  type: TransactionType;
  direction: string | null;
  source_country: Country;
  dest_country: Country;
  amount_sent: number;
  currency_sent: string;
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

export interface PaymentNumber {
  id: number;
  label: string;
  number: string;
  country: Country;
  provider: string;
  is_active: boolean;
  daily_limit: number;
  used_today: number;
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

export interface BorrowRequest {
  id: number;
  reference: string;
  user_id: number;
  type: 'money' | 'flight_ticket';
  amount: number | null;
  currency: string;
  interest_rate: number;
  duration_months: number;
  due_date: string | null;
  reason: string | null;
  id_front_url: string | null;
  id_back_url: string | null;
  status: TransactionStatus;
  is_gold: boolean;
  free_accommodation_months: number;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: number;
  user_id: number;
  title: string;
  body: string;
  channel: string;
  is_read: boolean;
  created_at: string;
}

export interface StatusMeta {
  label: string;
  labelFr: string;
  color: string;
  icon: string;
}

export interface AppConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
    messagingSenderId: string;
    measurementId?: string;
    storageBucket?: string;
  };
  app: {
    adminWhatsapp: string;
    maintenanceMode: boolean;
    countries: string[];
    currencies: string[];
  };
}
