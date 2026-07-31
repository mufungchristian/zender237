/**
 * Settings & config routes.
 *
 * - GET /api/config: public endpoint exposing the Firebase *web* config
 *   (safe to expose to the frontend) plus the public app settings.
 * - GET/PATCH /api/settings: admin-only app settings (admin WhatsApp,
 *   maintenance mode).
 */
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { getStore } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';

export const configRouter = Router();

/** GET /api/config — public config for the frontend. */
configRouter.get('/config', asyncHandler(async (_req, res) => {
  const settings = await getStore().getSettings();
  res.json({
    firebase: {
      apiKey: config.firebase.web.apiKey,
      authDomain: config.firebase.web.authDomain,
      projectId: config.firebase.projectId,
      appId: config.firebase.web.appId,
      messagingSenderId: config.firebase.web.messagingSenderId,
      measurementId: config.firebase.web.measurementId || undefined,
      storageBucket: config.firebase.storageBucket || undefined,
    },
    app: {
      adminWhatsapp: settings.admin_whatsapp,
      maintenanceMode: settings.maintenance_mode,
      countries: ['ML', 'GN', 'CM'],
      currencies: ['XOF', 'XAF'],
    },
  });
}));

const settingsSchema = z.object({
  admin_whatsapp: z.string().min(4).optional(),
  maintenance_mode: z.boolean().optional(),
});

/** GET /api/settings — admin get settings. */
configRouter.get('/settings', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  res.json(await getStore().getSettings());
}));

/** PATCH /api/settings — admin update settings. */
configRouter.patch('/settings', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const body = settingsSchema.parse(req.body);
  const s = await getStore().updateSettings(body);
  await getStore().createAudit({
    actor_id: req.userId ?? null, action: 'update_settings', entity: 'app_settings',
    entity_id: 1, detail: JSON.stringify(body),
  });
  res.json(s);
}));
