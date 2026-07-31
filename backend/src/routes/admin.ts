/**
 * Admin routes — dashboard stats and user management.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getStore } from '../db';
import { toSafeUser } from '../db/memoryStore';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/error';
import type { Country, UserRole, Tier } from '../types';

export const adminRouter = Router();

// All admin routes require admin role.
adminRouter.use(requireAuth, requireAdmin);

/** GET /api/admin/dashboard — aggregated stats. */
adminRouter.get('/dashboard', asyncHandler(async (_req, res) => {
  const store = getStore();
  const [users, txs, borrows, numbers, rates] = await Promise.all([
    store.listUsers(),
    store.listTransactions(),
    store.listBorrowRequests(),
    store.listPaymentNumbers(),
    store.listExchangeRates(),
  ]);

  const totalBalance = users.reduce((s, u) => s + u.balance, 0);
  const pendingTx = txs.filter((t) =>
    ['pending', 'awaiting_payment', 'awaiting_proof', 'under_review', 'approved'].includes(t.status));
  const completedTx = txs.filter((t) => t.status === 'completed');
  const pendingBorrows = borrows.filter((b) => ['pending', 'under_review', 'approved'].includes(b.status));

  const volumeByType = {
    deposit: txs.filter((t) => t.type === 'deposit' && t.status === 'completed').reduce((s, t) => s + t.amount_received, 0),
    transfer: txs.filter((t) => t.type === 'transfer' && t.status === 'completed').reduce((s, t) => s + t.amount_received, 0),
    withdraw: txs.filter((t) => t.type === 'withdraw' && t.status === 'completed').reduce((s, t) => s + t.amount_received, 0),
  };

  res.json({
    counts: {
      users: users.length,
      customers: users.filter((u) => u.role === 'user').length,
      staff: users.filter((u) => u.role === 'staff').length,
      admins: users.filter((u) => u.role === 'admin').length,
      transactions: txs.length,
      pendingTransactions: pendingTx.length,
      completedTransactions: completedTx.length,
      borrowRequests: borrows.length,
      pendingBorrows: pendingBorrows.length,
      paymentNumbers: numbers.length,
      exchangeRates: rates.length,
    },
    totalBalance,
    volumeByType,
    pendingTransactions: pendingTx.slice(0, 10),
    pendingBorrows: pendingBorrows.slice(0, 10),
  });
}));

/** GET /api/admin/users — list all users. */
adminRouter.get('/users', asyncHandler(async (_req, res) => {
  const users = await getStore().listUsers();
  res.json({ users: users.map(toSafeUser) });
}));

const createUserSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(4),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(4),
  country: z.enum(['ML', 'GN', 'CM']),
  role: z.enum(['user', 'staff', 'admin']).default('user'),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD']).default('BRONZE'),
  balance: z.number().default(0),
});

/** POST /api/admin/users — create user (admin). */
adminRouter.post('/users', asyncHandler(async (req, res) => {
  const body = createUserSchema.parse(req.body);
  const store = getStore();
  const existing = await store.findUserByPhone(body.phone);
  if (existing) throw new ApiError(409, 'Phone already registered');
  const user = await store.createUser({
    full_name: body.full_name,
    phone: body.phone,
    email: body.email || null,
    country: body.country as Country,
    password_hash: bcrypt.hashSync(body.password, 10),
    role: body.role as UserRole,
    tier: body.tier as Tier,
    balance: body.balance,
  });
  await store.createAudit({
    actor_id: req.userId ?? null, action: 'admin_create_user', entity: 'user',
    entity_id: user.id, detail: `Created ${body.role} ${body.phone}`,
  });
  res.status(201).json(toSafeUser(user));
}));

/** PATCH /api/admin/users/:id — update user (role, tier, active, balance). */
adminRouter.patch('/users/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const store = getStore();
  const user = await store.findUserById(id);
  if (!user) throw new ApiError(404, 'User not found');
  const allowed: any = {};
  for (const k of ['full_name', 'email', 'whatsapp', 'role', 'tier', 'balance', 'is_active', 'country', 'device_token']) {
    if (req.body[k] !== undefined) allowed[k] = req.body[k];
  }
  const updated = await store.updateUser(id, allowed);
  await store.createAudit({
    actor_id: req.userId ?? null, action: 'admin_update_user', entity: 'user',
    entity_id: (id) ?? null, detail: JSON.stringify(allowed),
  });
  res.json(toSafeUser(updated!));
}));

/** DELETE /api/admin/users/:id — deactivate (soft delete). */
adminRouter.delete('/users/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const store = getStore();
  const user = await store.findUserById(id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.id === req.userId) throw new ApiError(400, 'Cannot delete yourself');
  await store.updateUser(id, { is_active: false });
  await store.createAudit({
    actor_id: req.userId ?? null, action: 'admin_deactivate_user', entity: 'user', entity_id: (id) ?? null,
  });
  res.json({ ok: true });
}));
