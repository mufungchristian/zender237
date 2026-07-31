/**
 * User routes — profile, update profile, balance, notifications count.
 */
import { Router } from 'express';
import { z } from 'zod';
import { getStore } from '../db';
import { toSafeUser } from '../db/memoryStore';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/error';
import type { Country } from '../types';

export const usersRouter = Router();

const updateProfileSchema = z.object({
  full_name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp: z.string().optional().or(z.literal('')),
  country: z.enum(['ML', 'GN', 'CM']).optional(),
});

/** GET /api/users/me — profile (alias of auth/me for convenience). */
usersRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

/** PATCH /api/users/me — update own profile. */
usersRouter.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const body = updateProfileSchema.parse(req.body);
  const store = getStore();
  const data: any = {};
  if (body.full_name) data.full_name = body.full_name;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.whatsapp !== undefined) data.whatsapp = body.whatsapp || null;
  if (body.country) data.country = body.country as Country;
  const updated = await store.updateUser(req.userId!, data);
  if (!updated) throw new ApiError(404, 'User not found');
  res.json({ user: toSafeUser(updated) });
}));

/** GET /api/users/me/balance — quick balance check. */
usersRouter.get('/me/balance', requireAuth, asyncHandler(async (req, res) => {
  res.json({ balance: req.user!.balance, currency: 'XAF' });
}));
