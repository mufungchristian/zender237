/**
 * Transaction routes: deposit, transfer, withdraw, list, detail,
 * upload proof, admin status updates (approve/reject/complete).
 */
import { Router } from 'express';
import { z } from 'zod';
import { getStore } from '../db';
import { toSafeUser } from '../db/memoryStore';
import { requireAuth, requireStaff, requireAdmin } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/error';
import {
  generateReference, computeFee, convertCurrency, directionOf, notifyUser,
} from '../services/helpers';
import { canTransition, isTerminal, STATUS_META } from '../services/workflow';
import type { Country, TransactionStatus, TransactionType } from '../types';

export const txRouter = Router();

const countryEnum = z.enum(['ML', 'GN', 'CM']);

const depositSchema = z.object({
  source_country: countryEnum,
  amount_sent: z.number().positive(),
  payment_number_id: z.number().int().positive(),
  sender_number: z.string().min(4),
  currency_sent: z.enum(['XOF', 'XAF']).default('XOF'),
});

const transferSchema = z.object({
  source_country: countryEnum,
  dest_country: countryEnum,
  amount_sent: z.number().positive(),
  receiver_phone: z.string().min(4),
  payment_number_id: z.number().int().positive().optional(),
});

const withdrawSchema = z.object({
  country: countryEnum,
  amount: z.number().positive(),
  receiver_number: z.string().min(4),
  payment_number_id: z.number().int().positive(),
});

const proofSchema = z.object({
  proof_url: z.string().min(1),
  proof_reference: z.string().optional(),
  proof_sender_number: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum([
    'pending', 'awaiting_payment', 'awaiting_proof', 'under_review',
    'approved', 'rejected', 'completed', 'cancelled',
  ]),
  note: z.string().optional(),
});

/** POST /api/transactions/deposit — create a deposit request. */
txRouter.post('/deposit', requireAuth, asyncHandler(async (req, res) => {
  const body = depositSchema.parse(req.body);
  const store = getStore();
  const user = await store.findUserById(req.userId!);
  if (!user) throw new ApiError(404, 'User not found');

  const number = await store.findPaymentNumberById(body.payment_number_id);
  if (!number || !number.is_active) throw new ApiError(400, 'Selected payment number is unavailable');

  const destCountry = number.country;
  const amountReceived = await convertCurrency(body.amount_sent, body.currency_sent, 'XAF');
  const { fee } = await computeFee(body.amount_sent);

  const tx = await store.createTransaction({
    reference: generateReference('TX'),
    user_id: user.id,
    type: 'deposit',
    direction: directionOf(body.source_country, destCountry) as any,
    source_country: body.source_country,
    dest_country: destCountry,
    amount_sent: body.amount_sent,
    currency_sent: body.currency_sent,
    amount_received: amountReceived,
    currency_received: 'XAF',
    fee,
    exchange_rate: body.currency_sent === 'XAF' ? 1 : 0.94,
    sender_phone: body.sender_number,
    payment_number_id: number.id,
    status: 'awaiting_payment',
  });

  await store.addStatusHistory({
    transaction_id: tx.id, status: 'awaiting_payment',
    changed_by: user.id, note: 'Deposit request created',
  });
  await store.createAudit({
    actor_id: user.id, action: 'create_deposit', entity: 'transaction',
    entity_id: tx.id, detail: `Deposit ${body.amount_sent} ${body.currency_sent}`,
  });

  res.status(201).json(tx);
}));

/** POST /api/transactions/transfer — create a transfer (deducts balance immediately). */
txRouter.post('/transfer', requireAuth, asyncHandler(async (req, res) => {
  const body = transferSchema.parse(req.body);
  const store = getStore();
  const user = await store.findUserById(req.userId!);
  if (!user) throw new ApiError(404, 'User not found');

  const { fee } = await computeFee(body.amount_sent);
  const total = body.amount_sent + fee;
  if (user.balance < total) {
    throw new ApiError(400, `Insufficient balance. Need ${total} XOF (incl. fee ${fee}), have ${user.balance}`);
  }

  const destCountry = body.dest_country;
  const amountReceived = await convertCurrency(body.amount_sent, 'XOF', 'XAF');

  const tx = await store.createTransaction({
    reference: generateReference('TX'),
    user_id: user.id,
    type: 'transfer',
    direction: directionOf(body.source_country, destCountry) as any,
    source_country: body.source_country,
    dest_country: destCountry,
    amount_sent: body.amount_sent,
    currency_sent: 'XOF',
    amount_received: amountReceived,
    currency_received: 'XAF',
    fee,
    exchange_rate: 0.94,
    receiver_phone: body.receiver_phone,
    payment_number_id: body.payment_number_id ?? null,
    status: 'pending',
  });

  // Deduct balance immediately for transfers (held until completed).
  await store.updateUser(user.id, { balance: user.balance - total });
  await store.addStatusHistory({
    transaction_id: tx.id, status: 'pending',
    changed_by: user.id, note: 'Transfer created; balance deducted',
  });
  await store.createAudit({
    actor_id: user.id, action: 'create_transfer', entity: 'transaction',
    entity_id: tx.id, detail: `Transfer ${body.amount_sent} XOF to ${body.receiver_phone}`,
  });

  // Notify admins
  const admins = await store.listUsers();
  for (const a of admins) {
    if (a.role === 'admin') {
      await notifyUser(a.id, 'New transfer request', `Ref ${tx.reference} — ${body.amount_sent} XOF`);
    }
  }

  res.status(201).json(tx);
}));

/** POST /api/transactions/withdraw — create a withdrawal request. */
txRouter.post('/withdraw', requireAuth, asyncHandler(async (req, res) => {
  const body = withdrawSchema.parse(req.body);
  const store = getStore();
  const user = await store.findUserById(req.userId!);
  if (!user) throw new ApiError(404, 'User not found');

  if (user.balance < body.amount) {
    throw new ApiError(400, `Insufficient balance. Need ${body.amount}, have ${user.balance}`);
  }

  const number = await store.findPaymentNumberById(body.payment_number_id);
  if (!number || !number.is_active) throw new ApiError(400, 'Selected payment number is unavailable');

  const { fee } = await computeFee(body.amount);
  const total = body.amount + fee;
  if (user.balance < total) {
    throw new ApiError(400, `Insufficient balance including fee (${fee}). Need ${total}, have ${user.balance}`);
  }

  const tx = await store.createTransaction({
    reference: generateReference('TX'),
    user_id: user.id,
    type: 'withdraw',
    direction: directionOf(body.country, body.country) as any,
    source_country: body.country,
    dest_country: body.country,
    amount_sent: body.amount,
    currency_sent: 'XAF',
    amount_received: body.amount,
    currency_received: 'XAF',
    fee,
    exchange_rate: 1,
    receiver_phone: body.receiver_number,
    payment_number_id: number.id,
    status: 'pending',
  });

  await store.updateUser(user.id, { balance: user.balance - total });
  await store.addStatusHistory({
    transaction_id: tx.id, status: 'pending',
    changed_by: user.id, note: 'Withdrawal created; balance held',
  });
  await store.createAudit({
    actor_id: user.id, action: 'create_withdraw', entity: 'transaction',
    entity_id: tx.id, detail: `Withdraw ${body.amount} XAF to ${body.receiver_number}`,
  });

  res.status(201).json(tx);
}));

/** GET /api/transactions — list (user sees own; staff/admin see all with filters). */
txRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const store = getStore();
  const filter: any = {};
  const role = req.user!.role;
  if (role === 'user') filter.user_id = req.userId;
  if (req.query.type) filter.type = String(req.query.type);
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.limit) filter.limit = parseInt(String(req.query.limit), 10);
  const list = await store.listTransactions(filter);
  res.json({ transactions: list });
}));

/** GET /api/transactions/meta/statuses — status metadata for frontend icons/colors. */
txRouter.get('/meta/statuses', (_req, res) => {
  res.json({ statuses: STATUS_META });
});

/** GET /api/transactions/:id — detail (with status history + receipts). */
txRouter.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const store = getStore();
  const id = parseInt(req.params.id, 10);
  const tx = await store.findTransactionById(id);
  if (!tx) throw new ApiError(404, 'Transaction not found');
  if (req.user!.role === 'user' && tx.user_id !== req.userId) {
    throw new ApiError(403, 'Not allowed to view this transaction');
  }
  const [history, receipts] = await Promise.all([
    store.listStatusHistory(id),
    store.listReceiptsForTransaction(id),
  ]);
  res.json({ transaction: tx, history, receipts });
}));

/** POST /api/transactions/:id/proof — user uploads proof of payment. */
txRouter.post('/:id/proof', requireAuth, asyncHandler(async (req, res) => {
  const body = proofSchema.parse(req.body);
  const store = getStore();
  const id = parseInt(req.params.id, 10);
  const tx = await store.findTransactionById(id);
  if (!tx) throw new ApiError(404, 'Transaction not found');
  if (tx.user_id !== req.userId && req.user!.role === 'user') {
    throw new ApiError(403, 'Not allowed');
  }
  if (isTerminal(tx.status)) throw new ApiError(400, 'Transaction is already terminal');

  const updated = await store.updateTransaction(id, {
    proof_url: body.proof_url,
    proof_reference: body.proof_reference ?? null,
    proof_sender_number: body.proof_sender_number ?? null,
    status: 'awaiting_proof',
  });
  await store.createReceipt({
    transaction_id: id, file_url: body.proof_url,
    file_name: body.proof_reference ?? 'proof.jpg', uploaded_by: req.userId!,
  });
  await store.addStatusHistory({
    transaction_id: id, status: 'awaiting_proof',
    changed_by: req.userId, note: 'Proof of payment uploaded',
  });
  await store.createAudit({
    actor_id: req.userId ?? null, action: 'upload_proof', entity: 'transaction',
    entity_id: (id) ?? null, detail: `Proof uploaded for ${tx.reference}`,
  });

  // Notify admins
  const admins = await store.listUsers();
  for (const a of admins) {
    if (a.role === 'admin') {
      await notifyUser(a.id, 'Proof uploaded', `Ref ${tx.reference} — proof awaiting review`);
    }
  }
  res.json(updated);
}));

/** PATCH /api/transactions/:id/status — staff/admin update status (approve/reject/complete...). */
txRouter.patch('/:id/status', requireAuth, requireStaff, asyncHandler(async (req, res) => {
  const body = statusSchema.parse(req.body);
  const store = getStore();
  const id = parseInt(req.params.id, 10);
  const tx = await store.findTransactionById(id);
  if (!tx) throw new ApiError(404, 'Transaction not found');
  if (!canTransition(tx.status, body.status)) {
    throw new ApiError(400, `Cannot transition from ${tx.status} to ${body.status}`);
  }

  const updated = await store.updateTransaction(id, {
    status: body.status,
    admin_note: body.note ?? tx.admin_note,
    reviewed_by: req.userId,
  });
  await store.addStatusHistory({
    transaction_id: id, status: body.status, changed_by: req.userId, note: body.note,
  });
  await store.createAudit({
    actor_id: req.userId ?? null, action: `status_${body.status}`, entity: 'transaction',
    entity_id: (id) ?? null, detail: `${tx.reference} -> ${body.status}`,
  });

  // On completed: for deposit add funds; for rejected transfer/withdraw refund.
  if (body.status === 'completed') {
    if (tx.type === 'deposit') {
      const u = await store.findUserById(tx.user_id);
      if (u) {
        await store.updateUser(u.id, { balance: u.balance + tx.amount_received });
        await notifyUser(u.id, 'Deposit completed', `Your deposit of ${tx.amount_received} XAF is now available.`);
      }
    }
  } else if (body.status === 'rejected') {
    if (tx.type === 'transfer' || tx.type === 'withdraw') {
      // refund the held amount
      const u = await store.findUserById(tx.user_id);
      if (u) {
        const refund = tx.amount_sent + tx.fee;
        await store.updateUser(u.id, { balance: u.balance + refund });
        await notifyUser(u.id, 'Transaction rejected', `Ref ${tx.reference} rejected. ${refund} XOF refunded.`);
      }
    }
  } else if (body.status === 'approved') {
    await notifyUser(tx.user_id, 'Transaction approved', `Ref ${tx.reference} has been approved.`);
  } else {
    await notifyUser(tx.user_id, 'Transaction update', `Ref ${tx.reference} is now ${STATUS_META[body.status].label}.`);
  }

  res.json(updated);
}));
