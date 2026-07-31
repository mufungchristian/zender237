-- ============================================================
-- Zender237 PostgreSQL schema
-- Run with: npm run migrate  (or psql -f db/schema.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  firebase_uid    VARCHAR(128) UNIQUE,
  full_name       VARCHAR(120) NOT NULL,
  email           VARCHAR(160) UNIQUE,
  phone           VARCHAR(30)  UNIQUE NOT NULL,
  whatsapp        VARCHAR(30),
  whatsapp_verified BOOLEAN DEFAULT false,
  country         VARCHAR(3)   NOT NULL DEFAULT 'ML',
  password_hash   TEXT NOT NULL,
  role            VARCHAR(10)  NOT NULL DEFAULT 'user',
  tier            VARCHAR(10)  NOT NULL DEFAULT 'BRONZE',
  balance         NUMERIC(18,2) NOT NULL DEFAULT 0,
  device_token    VARCHAR(255),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_numbers (
  id          SERIAL PRIMARY KEY,
  label       VARCHAR(80) NOT NULL,
  number      VARCHAR(30) NOT NULL,
  country     VARCHAR(3)  NOT NULL,
  provider    VARCHAR(40) NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  daily_limit NUMERIC(18,2) NOT NULL DEFAULT 1000000,
  used_today  NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id               SERIAL PRIMARY KEY,
  reference        VARCHAR(40) UNIQUE NOT NULL,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type             VARCHAR(12) NOT NULL,
  direction        VARCHAR(10),
  source_country   VARCHAR(3) NOT NULL,
  dest_country     VARCHAR(3) NOT NULL,
  amount_sent      NUMERIC(18,2) NOT NULL,
  currency_sent    VARCHAR(6) NOT NULL,
  amount_received  NUMERIC(18,2) NOT NULL,
  currency_received VARCHAR(6) NOT NULL,
  fee              NUMERIC(18,2) NOT NULL DEFAULT 0,
  exchange_rate    NUMERIC(12,6) NOT NULL DEFAULT 1,
  sender_phone     VARCHAR(30),
  receiver_phone   VARCHAR(30),
  payment_number_id INTEGER REFERENCES payment_numbers(id),
  status           VARCHAR(20) NOT NULL DEFAULT 'draft',
  proof_url        TEXT,
  proof_reference  VARCHAR(80),
  proof_sender_number VARCHAR(30),
  admin_note       TEXT,
  reviewed_by      INTEGER REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);

CREATE TABLE IF NOT EXISTS transaction_status_history (
  id            SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL,
  note          TEXT,
  changed_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receipts (
  id            SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  file_url      TEXT NOT NULL,
  file_name     VARCHAR(200) NOT NULL,
  uploaded_by   INTEGER NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title     VARCHAR(160) NOT NULL,
  body      TEXT NOT NULL,
  channel   VARCHAR(10) NOT NULL DEFAULT 'in_app',
  is_read   BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notification_logs(user_id);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id            SERIAL PRIMARY KEY,
  from_currency VARCHAR(6) NOT NULL,
  to_currency   VARCHAR(6) NOT NULL,
  rate          NUMERIC(12,6) NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_currency, to_currency)
);

CREATE TABLE IF NOT EXISTS tariffs (
  id          SERIAL PRIMARY KEY,
  min_amount  NUMERIC(18,2) NOT NULL,
  max_amount  NUMERIC(18,2) NOT NULL,
  fee_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
  fixed_fee   NUMERIC(18,2) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         SERIAL PRIMARY KEY,
  actor_id   INTEGER REFERENCES users(id),
  action     VARCHAR(80) NOT NULL,
  entity     VARCHAR(40) NOT NULL,
  entity_id  INTEGER,
  detail     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS borrow_requests (
  id             SERIAL PRIMARY KEY,
  reference      VARCHAR(40) UNIQUE NOT NULL,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           VARCHAR(20) NOT NULL,
  amount         NUMERIC(18,2),
  currency       VARCHAR(6) NOT NULL DEFAULT 'XAF',
  interest_rate  NUMERIC(6,3) NOT NULL DEFAULT 0,
  duration_months INTEGER NOT NULL DEFAULT 1,
  due_date       TIMESTAMPTZ,
  reason         TEXT,
  id_front_url   TEXT,
  id_back_url    TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_gold        BOOLEAN DEFAULT false,
  free_accommodation_months INTEGER NOT NULL DEFAULT 0,
  admin_note     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_borrow_user ON borrow_requests(user_id);

CREATE TABLE IF NOT EXISTS app_settings (
  id                SERIAL PRIMARY KEY,
  admin_whatsapp    VARCHAR(30) NOT NULL,
  maintenance_mode  BOOLEAN DEFAULT false,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Chat: customer <-> admin/staff conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject     VARCHAR(160),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chatconv_user ON chat_conversations(user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role     VARCHAR(10) NOT NULL,
  body            TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chatmsg_conv ON chat_messages(conversation_id);
