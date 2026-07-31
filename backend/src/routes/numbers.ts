/**
 * Payment numbers routes — list (public), CRUD (admin).
 */
import { Router } from 'express';
import { z } from 'zod';
import { getStore } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/error';

export const numbersRouter = Router();

const createSchema = z.object({
  label: z.string().min(2),
  number: z.string().min(4),
  country: z.enum(['ML', 'GN', 'CM']),
  provider: z.string().min(2),
  daily_limit: z.number().int().positive().optional(),
});

/** GET /api/numbers — list (optionally filtered by country). */
numbersRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const country = req.query.country as any;
  const list = await getStore().listPaymentNumbers(country);
  res.json({ numbers: list });
}));

/** POST /api/numbers — admin create. */
numbersRouter.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const body = createSchema.parse(req.body);
  const n = await getStore().createPaymentNumber(body);
  await getStore().createAudit({
    actor_id: req.userId ?? null, action: 'create_number', entity: 'payment_number',
    entity_id: (n.id) ?? null, detail: `${body.provider} ${body.number}`,
  });
  res.status(201).json(n);
}));

/** PATCH /api/numbers/:id — admin update (toggle active, etc). */
numbersRouter.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const updated = await getStore().updatePaymentNumber(id, req.body);
  if (!updated) throw new ApiError(404, 'Not found');
  await getStore().createAudit({
    actor_id: req.userId ?? null, action: 'update_number', entity: 'payment_number',
    entity_id: (id) ?? null, detail: JSON.stringify(req.body),
  });
  res.json(updated);
}));

/** DELETE /api/numbers/:id — admin delete. */
numbersRouter.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const ok = await getStore().deletePaymentNumber(id);
  if (!ok) throw new ApiError(404, 'Not found');
  await getStore().createAudit({
    actor_id: req.userId ?? null, action: 'delete_number', entity: 'payment_number', entity_id: (id) ?? null,
  });
  res.json({ ok: true });
}));
