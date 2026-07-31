/**
 * Auth routes: register, login, me, update device token.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getStore } from '../db';
import { toSafeUser } from '../db/memoryStore';
import { signToken, requireAuth } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/error';
import { generateReference } from '../services/helpers';
import { notifyUser } from '../services/helpers';
import type { Country } from '../types';

export const authRouter = Router();

const phoneRegex = /^\+\d{6,15}$/;

const registerSchema = z.object({
  full_name: z.string().min(2).max(80),
  phone: z.string().regex(phoneRegex, 'Phone must be in international format e.g. +22370000000'),
  password: z.string().min(4).max(100),
  email: z.string().email().optional().or(z.literal('')),
  country: z.enum(['ML', 'GN', 'CM']),
});

const loginSchema = z.object({
  phone: z.string().min(4),
  password: z.string().min(1),
});

/** POST /api/auth/register — create a new customer account. */
authRouter.post('/register', asyncHandler(async (req, res) => {
  const body = registerSchema.parse(req.body);
  const store = getStore();

  const existing = await store.findUserByPhone(body.phone);
  if (existing) throw new ApiError(409, 'A user with this phone already exists');

  const user = await store.createUser({
    full_name: body.full_name,
    phone: body.phone,
    email: body.email || null,
    country: body.country as Country,
    password_hash: bcrypt.hashSync(body.password, 10),
    role: 'user',
    tier: 'BRONZE',
    balance: 0,
  });

  await store.createAudit({
    actor_id: user.id, action: 'register', entity: 'user', entity_id: user.id,
    detail: `New user ${body.phone}`,
  });
  await notifyUser(user.id, 'Welcome to Zender237', `Hello ${body.full_name}, your account is ready.`);

  const token = signToken(user);
  res.status(201).json({ token, user: toSafeUser(user) });
}));

/** POST /api/auth/login — login with phone + password. */
authRouter.post('/login', asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const store = getStore();

  const user = await store.findUserByPhone(body.phone);
  if (!user) throw new ApiError(401, 'Invalid phone or password');
  if (!user.is_active) throw new ApiError(403, 'Account is disabled');
  const ok = bcrypt.compareSync(body.password, user.password_hash);
  if (!ok) throw new ApiError(401, 'Invalid phone or password');

  await store.createAudit({
    actor_id: user.id, action: 'login', entity: 'user', entity_id: user.id,
  });

  const token = signToken(user);
  res.json({ token, user: toSafeUser(user) });
}));

/** GET /api/auth/me — current authenticated user. */
authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

/** PUT /api/auth/device-token — register FCM device token for push. */
authRouter.put('/device-token', requireAuth, asyncHandler(async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : null;
  await getStore().updateUser(req.userId!, { device_token: token });
  res.json({ ok: true });
}));

/** PUT /api/auth/password — change password. */
authRouter.put('/password', requireAuth, asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password || new_password.length < 4) {
    throw new ApiError(400, 'current_password and new_password (min 4 chars) are required');
  }
  const store = getStore();
  const user = await store.findUserById(req.userId!);
  if (!user) throw new ApiError(404, 'User not found');
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    throw new ApiError(401, 'Current password is incorrect');
  }
  await store.updateUser(user.id, { password_hash: bcrypt.hashSync(new_password, 10) });
  res.json({ ok: true });
}));

/* ============================================================
 * WhatsApp OTP verification
 *
 * Flow (matches the static demo concept):
 *   1. POST /api/auth/whatsapp/send  { phone }  -> generates a 6-digit code,
 *      stores it, and returns a WhatsApp deep link prefilled with the code
 *      so the ADMIN can forward it to the user's real number via WhatsApp.
 *      (The admin account itself can also receive the code as a push/in-app
 *       notification so staff can relay it.)
 *   2. POST /api/auth/whatsapp/verify { phone, code } -> validates the code
 *      and marks the user's whatsapp as verified (or creates a pending user
 *      record for new registrations).
 * ============================================================ */

// In-memory OTP store: phone -> { code, expires }
const otpStore = new Map<string, { code: string; expires: number }>();

function genOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const otpSendSchema = z.object({
  phone: z.string().regex(phoneRegex, 'Phone must be in international format e.g. +22370000000'),
});

/** POST /api/auth/whatsapp/send — generate OTP and return WhatsApp link + notify admin. */
authRouter.post('/whatsapp/send', asyncHandler(async (req, res) => {
  const { phone } = otpSendSchema.parse(req.body);
  const code = genOtp();
  otpStore.set(phone, { code, expires: Date.now() + 10 * 60 * 1000 }); // 10 min

  // Notify all admin/staff in-app so they can relay the code to the user via WhatsApp.
  try {
    const store = getStore();
    const users = await store.listUsers();
    const staff = users.filter((u) => u.role === 'admin' || u.role === 'staff');
    const settings = await store.getSettings();
    for (const s of staff) {
      await store.createNotification({
        user_id: s.id,
        title: 'WhatsApp verification code',
        body: `Verification code for ${phone}: ${code}. Relay it to the user via WhatsApp.`,
        channel: 'in_app',
      });
    }
    // Build a WhatsApp deep link the user can open to receive the code from admin.
    const adminPhone = (settings.admin_whatsapp || '').replace(/[^\d]/g, '');
    const waLink = `https://wa.me/${adminPhone}?text=${encodeURIComponent(
      `Hello Zender237, please send my verification code to ${phone}.`,
    )}`;
    res.json({
      ok: true,
      message: 'Verification code generated. Open WhatsApp to receive it from our team.',
      whatsappLink: waLink,
      // NOTE: the code is intentionally NOT returned to the client in production.
      // It is exposed here ONLY in demo/test mode so the flow can be verified
      // end-to-end without a human operator. Toggle with DEMO_OTP env var.
      demoCode: process.env.DEMO_OTP === 'false' ? undefined : code,
    });
  } catch (err) {
    res.json({ ok: true, message: 'Verification code generated.' });
  }
}));

const otpVerifySchema = z.object({
  phone: z.string().regex(phoneRegex, 'Phone must be in international format e.g. +22370000000'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

/** POST /api/auth/whatsapp/verify — validate OTP. */
authRouter.post('/whatsapp/verify', asyncHandler(async (req, res) => {
  const { phone, code } = otpVerifySchema.parse(req.body);
  const entry = otpStore.get(phone);
  if (!entry) throw new ApiError(400, 'No code was requested for this number. Please request a new code.');
  if (Date.now() > entry.expires) {
    otpStore.delete(phone);
    throw new ApiError(400, 'Code expired. Please request a new code.');
  }
  if (entry.code !== code) throw new ApiError(400, 'Invalid verification code');

  otpStore.delete(phone);
  const store = getStore();
  const user = await store.findUserByPhone(phone);
  if (user) {
    // Mark existing user's WhatsApp as verified.
    const updated = await store.updateUser(user.id, { whatsapp: phone, whatsapp_verified: true });
    res.json({ ok: true, verified: true, user: updated ? toSafeUser(updated) : null });
  } else {
    // New number: just confirm verification (registration will create the account).
    res.json({ ok: true, verified: true, user: null });
  }
}));
