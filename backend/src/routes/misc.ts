/**
 * Notifications & audit logs routes.
 */
import { Router } from 'express';
import { getStore } from '../db';
import { requireAuth, requireStaff } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/error';

export const miscRouter = Router();

/** GET /api/notifications — list current user's notifications. */
miscRouter.get('/notifications', requireAuth, asyncHandler(async (req, res) => {
  const list = await getStore().listNotifications(req.userId!);
  res.json({ notifications: list });
}));

/** PATCH /api/notifications/:id/read — mark read. */
miscRouter.patch('/notifications/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await getStore().markNotificationRead(id);
  res.json({ ok: true });
}));

/** GET /api/audit-logs — staff/admin list recent audit logs. */
miscRouter.get('/audit-logs', requireAuth, requireStaff, asyncHandler(async (req, res) => {
  const limit = parseInt(String(req.query.limit || 100), 10);
  const list = await getStore().listAuditLogs(limit);
  res.json({ logs: list });
}));
