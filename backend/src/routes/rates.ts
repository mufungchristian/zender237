/**
 * Exchange rates & tariffs routes.
 */
import { Router } from 'express';
import { z } from 'zod';
import { getStore } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/error';

export const ratesRouter = Router();

const rateSchema = z.object({
  from_currency: z.string().min(2).max(5),
  to_currency: z.string().min(2).max(5),
  rate: z.number().positive(),
});

const tariffSchema = z.object({
  min_amount: z.number().min(0),
  max_amount: z.number().positive(),
  fee_percent: z.number().min(0).max(100),
  fixed_fee: z.number().min(0),
});

/** GET /api/rates — list exchange rates. */
ratesRouter.get('/', requireAuth, asyncHandler(async (_req, res) => {
  res.json({ rates: await getStore().listExchangeRates() });
}));

/** PUT /api/rates — admin upsert rate. */
ratesRouter.put('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const body = rateSchema.parse(req.body);
  const r = await getStore().upsertExchangeRate(body);
  await getStore().createAudit({
    actor_id: req.userId ?? null, action: 'upsert_rate', entity: 'exchange_rate',
    entity_id: (r.id) ?? null, detail: `${body.from_currency}->${body.to_currency} = ${body.rate}`,
  });
  res.json(r);
}));

/** GET /api/tariffs — list tariffs. */
ratesRouter.get('/tariffs', requireAuth, asyncHandler(async (_req, res) => {
  res.json({ tariffs: await getStore().listTariffs() });
}));

/** PUT /api/tariffs — admin upsert tariff. */
ratesRouter.put('/tariffs', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const body = tariffSchema.parse(req.body);
  const t = await getStore().upsertTariff(body);
  await getStore().createAudit({
    actor_id: req.userId ?? null, action: 'upsert_tariff', entity: 'tariff',
    entity_id: (t.id) ?? null, detail: JSON.stringify(body),
  });
  res.json(t);
}));

/** DELETE /api/tariffs/:id — admin delete tariff. */
ratesRouter.delete('/tariffs/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const ok = await getStore().deleteTariff(id);
  if (!ok) throw new ApiError(404, 'Not found');
  await getStore().createAudit({
    actor_id: req.userId ?? null, action: 'delete_tariff', entity: 'tariff', entity_id: (id) ?? null,
  });
  res.json({ ok: true });
}));

/** GET /api/rates/quote — compute a fee + converted amount for a transfer quote. */
ratesRouter.get('/quote', requireAuth, asyncHandler(async (req, res) => {
  const amount = parseFloat(String(req.query.amount));
  const from = String(req.query.from || 'XOF');
  const to = String(req.query.to || 'XAF');
  if (!amount || amount <= 0) throw new ApiError(400, 'amount is required and must be positive');
  const store = getStore();
  const { fee } = await (await import('../services/helpers')).computeFee(amount);
  const converted = await (await import('../services/helpers')).convertCurrency(amount, from, to);
  const rateRow = await store.findExchangeRate(from, to);
  res.json({ amount, fee, total: amount + fee, converted, rate: rateRow?.rate ?? (from === 'XOF' && to === 'XAF' ? 0.94 : 1) });
}));
