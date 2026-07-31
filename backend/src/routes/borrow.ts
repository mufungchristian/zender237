/**
 * Borrow routes: borrow money + borrow flight ticket.
 *
 * - Borrow money: requires ID front/back photos, interest rate & duration
 *   depend on tier (GOLD gets better terms). After submission the user is
 *   redirected to the admin-configured WhatsApp contact to finalize.
 * - Borrow flight ticket: GOLD members get the ticket + 1 month free
 *   accommodation; non-GOLD get the ticket + WhatsApp redirect for
 *   accommodation arrangement.
 */
import { Router } from 'express';
import { z } from 'zod';
import { getStore } from '../db';
import { requireAuth, requireStaff } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/error';
import { generateReference, whatsappLink, notifyUser } from '../services/helpers';
import { canTransition, STATUS_META } from '../services/workflow';
import type { Tier, TransactionStatus } from '../types';

export const borrowRouter = Router();

const borrowMoneySchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['XOF', 'XAF']).default('XOF'),
  duration_months: z.number().int().min(1).max(24),
  reason: z.string().max(500).optional(),
  id_front_url: z.string().min(1),
  id_back_url: z.string().min(1),
});

const borrowTicketSchema = z.object({
  currency: z.enum(['XOF', 'XAF']).default('XOF'),
  reason: z.string().max(500).optional(),
  id_front_url: z.string().min(1),
  id_back_url: z.string().min(1),
});

/** Tier-based borrow terms. */
function borrowTerms(tier: Tier, amount: number, duration: number) {
  const isGold = tier === 'GOLD';
  const interestRate = isGold ? 5 : tier === 'SILVER' ? 10 : 15; // % per period
  const maxDuration = isGold ? 24 : tier === 'SILVER' ? 12 : 6;
  const cappedDuration = Math.min(duration, maxDuration);
  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + cappedDuration);
  return {
    interest_rate: interestRate,
    duration_months: cappedDuration,
    due_date: dueDate.toISOString(),
    free_accommodation_months: isGold ? 1 : 0,
    max_duration: maxDuration,
  };
}

/** POST /api/borrow/money — request to borrow money. */
borrowRouter.post('/money', requireAuth, asyncHandler(async (req, res) => {
  const body = borrowMoneySchema.parse(req.body);
  const store = getStore();
  const user = await store.findUserById(req.userId!);
  if (!user) throw new ApiError(404, 'User not found');

  const terms = borrowTerms(user.tier, body.amount, body.duration_months);
  const ref = generateReference('BR');

  const borrow = await store.createBorrow({
    reference: ref,
    user_id: user.id,
    type: 'money',
    amount: body.amount,
    currency: body.currency,
    interest_rate: terms.interest_rate,
    duration_months: terms.duration_months,
    due_date: terms.due_date,
    reason: body.reason ?? null,
    id_front_url: body.id_front_url,
    id_back_url: body.id_back_url,
    is_gold: user.tier === 'GOLD',
    free_accommodation_months: terms.free_accommodation_months,
  });

  await store.createAudit({
    actor_id: user.id, action: 'borrow_money', entity: 'borrow_request',
    entity_id: borrow.id, detail: `Borrow ${body.amount} ${body.currency}, ${user.tier}`,
  });

  // Build the WhatsApp redirect link for the admin contact.
  const waMsg = `Hello Zender237, I would like to borrow money.\n` +
    `Reference: ${ref}\nName: ${user.full_name}\nPhone: ${user.phone}\n` +
    `Amount: ${body.amount} ${body.currency}\nDuration: ${terms.duration_months} months\n` +
    `Interest: ${terms.interest_rate}%\nDue: ${new Date(terms.due_date).toLocaleDateString()}`;
  const whatsapp = await whatsappLink(waMsg);

  // Notify admins
  const admins = await store.listUsers();
  for (const a of admins) {
    if (a.role === 'admin') {
      await notifyUser(a.id, 'New borrow-money request', `${ref} — ${body.amount} ${body.currency} (${user.tier})`);
    }
  }

  res.status(201).json({ borrow, whatsapp_redirect: whatsapp, terms });
}));

/** POST /api/borrow/flight-ticket — request to borrow a flight ticket. */
borrowRouter.post('/flight-ticket', requireAuth, asyncHandler(async (req, res) => {
  const body = borrowTicketSchema.parse(req.body);
  const store = getStore();
  const user = await store.findUserById(req.userId!);
  if (!user) throw new ApiError(404, 'User not found');

  const isGold = user.tier === 'GOLD';
  const ref = generateReference('FT');

  const borrow = await store.createBorrow({
    reference: ref,
    user_id: user.id,
    type: 'flight_ticket',
    amount: null,
    currency: body.currency,
    interest_rate: 0, // flight ticket terms handled via WhatsApp
    duration_months: 0,
    due_date: null,
    reason: body.reason ?? null,
    id_front_url: body.id_front_url,
    id_back_url: body.id_back_url,
    is_gold: isGold,
    free_accommodation_months: isGold ? 1 : 0,
  });

  await store.createAudit({
    actor_id: user.id, action: 'borrow_ticket', entity: 'borrow_request',
    entity_id: borrow.id, detail: `Flight ticket request (${user.tier})`,
  });

  // WhatsApp message differs for GOLD vs non-GOLD.
  const waMsg = isGold
    ? `Hello Zender237, I am a GOLD member requesting a flight ticket.\nReference: ${ref}\nName: ${user.full_name}\nPhone: ${user.phone}\n(Eligible for 1 month free accommodation)`
    : `Hello Zender237, I would like to borrow a flight ticket.\nReference: ${ref}\nName: ${user.full_name}\nPhone: ${user.phone}\n(Please arrange accommodation)`;
  const whatsapp = await whatsappLink(waMsg);

  const admins = await store.listUsers();
  for (const a of admins) {
    if (a.role === 'admin') {
      await notifyUser(a.id, 'New flight-ticket request', `${ref} — ${user.full_name} (${user.tier})`);
    }
  }

  res.status(201).json({
    borrow,
    whatsapp_redirect: whatsapp,
    is_gold: isGold,
    free_accommodation_months: isGold ? 1 : 0,
    note: isGold
      ? 'As a GOLD member you get the flight ticket + 1 month free accommodation. Tap continue to finalize on WhatsApp.'
      : 'Your flight ticket request has been recorded. Tap continue to arrange accommodation via WhatsApp.',
  });
}));

/** GET /api/borrow — list borrow requests (user: own; staff/admin: all). */
borrowRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const store = getStore();
  const filter: any = {};
  if (req.user!.role === 'user') filter.user_id = req.userId;
  if (req.query.status) filter.status = String(req.query.status);
  const list = await store.listBorrowRequests(filter);
  res.json({ borrows: list });
}));

/** GET /api/borrow/:id — detail. */
borrowRouter.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const store = getStore();
  const id = parseInt(req.params.id, 10);
  const b = await store.findBorrowById(id);
  if (!b) throw new ApiError(404, 'Borrow request not found');
  if (req.user!.role === 'user' && b.user_id !== req.userId) {
    throw new ApiError(403, 'Not allowed');
  }
  res.json({ borrow: b });
}));

/** PATCH /api/borrow/:id/status — staff/admin approve/reject. */
borrowRouter.patch('/:id/status', requireAuth, requireStaff, asyncHandler(async (req, res) => {
  const store = getStore();
  const id = parseInt(req.params.id, 10);
  const status = String(req.body?.status) as TransactionStatus;
  const note = req.body?.note ? String(req.body.note) : undefined;
  const b = await store.findBorrowById(id);
  if (!b) throw new ApiError(404, 'Borrow request not found');
  if (!canTransition(b.status, status)) {
    throw new ApiError(400, `Cannot transition from ${b.status} to ${status}`);
  }
  const updated = await store.updateBorrow(id, { status, admin_note: note ?? b.admin_note });
  await store.createAudit({
    actor_id: req.userId ?? null, action: `borrow_${status}`, entity: 'borrow_request',
    entity_id: (id) ?? null, detail: `${b.reference} -> ${status}`,
  });
  await notifyUser(b.user_id, 'Borrow request update', `Ref ${b.reference} is now ${STATUS_META[status].label}.`);
  res.json(updated);
}));

/** GET /api/borrow/whatsapp/:id — re-fetch the WhatsApp redirect link for a request. */
borrowRouter.get('/whatsapp/:id', requireAuth, asyncHandler(async (req, res) => {
  const store = getStore();
  const id = parseInt(req.params.id, 10);
  const b = await store.findBorrowById(id);
  if (!b) throw new ApiError(404, 'Borrow request not found');
  if (req.user!.role === 'user' && b.user_id !== req.userId) {
    throw new ApiError(403, 'Not allowed');
  }
  const user = await store.findUserById(b.user_id);
  const waMsg = b.type === 'money'
    ? `Hello Zender237, following up on borrow-money request ${b.reference} (${b.amount} ${b.currency}). Name: ${user?.full_name}, Phone: ${user?.phone}`
    : `Hello Zender237, following up on flight-ticket request ${b.reference}. Name: ${user?.full_name}, Phone: ${user?.phone}`;
  const whatsapp = await whatsappLink(waMsg);
  res.json({ whatsapp_redirect: whatsapp });
}));
