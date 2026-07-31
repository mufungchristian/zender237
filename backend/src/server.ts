/**
 * Zender237 backend — Express server entry point.
 *
 * Wires up all route modules, middleware, and graceful degradation.
 * Run:  npm run dev  (ts-node-dev)  or  npm start  (compiled dist/).
 */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { getStore } from './db';
import { initFirebase } from './config/firebase';
import { errorHandler, notFound } from './middleware/error';

import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { txRouter } from './routes/transactions';
import { borrowRouter } from './routes/borrow';
import { numbersRouter } from './routes/numbers';
import { ratesRouter } from './routes/rates';
import { uploadRouter } from './routes/uploads';
import { miscRouter } from './routes/misc';
import { adminRouter } from './routes/admin';
import { configRouter } from './routes/config';
import { chatRouter } from './routes/chat';

const app = express();

// ---- Security & middleware ----
app.use(cors({
  origin: (origin, cb) => {
    // allow same-origin (no origin) and any configured origin; '*' in demo.
    if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(null, true); // permissive in dev; tighten in prod via CORS_ORIGIN
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (config.nodeEnv !== 'test') app.use(morgan('dev'));

// Basic rate limit on the API.
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
}));

// ---- Health check ----
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'zender237-backend',
    version: '1.0.0',
    store: getStore().kind,
    firebase: process.env.FIREBASE_PROJECT_ID ? 'configured' : 'demo',
    time: new Date().toISOString(),
  });
});

// ---- Routes ----
app.use('/api', configRouter);   // /api/config (public)
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/transactions', txRouter);
app.use('/api/borrow', borrowRouter);
app.use('/api/numbers', numbersRouter);
app.use('/api/rates', ratesRouter);
app.use('/api/uploads', uploadRouter);
app.use('/api/chat', chatRouter);
app.use('/api', miscRouter);     // /api/notifications, /api/audit-logs
app.use('/api/admin', adminRouter);

// ---- 404 + error handler ----
app.use(notFound);
app.use(errorHandler);

// ---- Boot ----
async function boot(): Promise<void> {
  // Initialize Firebase Admin (no-op if unconfigured).
  initFirebase();
  // Warm the store (seeds in-memory or pings Postgres).
  const store = getStore();
  console.log(`[boot] Store ready: ${store.kind}`);

  const port = config.port;
  app.listen(port, () => {
    console.log(`\n  Zender237 backend listening on :${port}`);
    console.log(`  Mode: ${config.nodeEnv} | Store: ${store.kind} | Firebase: ${process.env.FIREBASE_PROJECT_ID ? 'on' : 'off'}\n`);
  });
}

boot().catch((err) => {
  console.error('[boot] Failed to start:', err);
  process.exit(1);
});

export default app;
