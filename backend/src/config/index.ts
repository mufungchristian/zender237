/**
 * Centralized configuration loader.
 * Reads environment variables once and exposes a typed config object.
 */
import dotenv from 'dotenv';

dotenv.config();

function required(key: string, fallback = ''): string {
  const v = process.env[key];
  return v === undefined ? fallback : v;
}

function bool(key: string, fallback = false): boolean {
  const v = process.env[key];
  if (v === undefined) return fallback;
  return v === 'true' || v === '1';
}

function int(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

/** Comma-separated list of allowed CORS origins. */
const corsOrigins = required('CORS_ORIGIN', '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const config = {
  port: int('PORT', 8080),
  nodeEnv: required('NODE_ENV', 'development'),
  isProd: required('NODE_ENV', 'development') === 'production',
  corsOrigins,

  jwt: {
    secret: required('JWT_SECRET', 'zender237-dev-secret-change-me'),
    expiresIn: required('JWT_EXPIRES_IN', '7d'),
  },

  /** Empty DATABASE_URL => run in demo/in-memory mode. */
  databaseUrl: required('DATABASE_URL', ''),
  useDatabase: required('DATABASE_URL', '') !== '',

  adminWhatsapp: required('ADMIN_WHATSAPP', '+237700000001'),

  firebase: {
    projectId: required('FIREBASE_PROJECT_ID', 'zender237-309ae'),
    clientEmail: required('FIREBASE_CLIENT_EMAIL', ''),
    /** The private key uses literal \n; convert to real newlines. */
    privateKey: required('FIREBASE_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
    storageBucket: required('FIREBASE_STORAGE_BUCKET', 'zender237-309ae.firebasestorage.app'),
    // Web config (exposed to the frontend via /api/config)
    web: {
      apiKey: required('FIREBASE_API_KEY', ''),
      authDomain: required('FIREBASE_AUTH_DOMAIN', ''),
      appId: required('FIREBASE_APP_ID', ''),
      messagingSenderId: required('FIREBASE_MESSAGING_SENDER_ID', ''),
      measurementId: required('FIREBASE_MEASUREMENT_ID', ''),
    },
  },
} as const;

export type AppConfig = typeof config;
