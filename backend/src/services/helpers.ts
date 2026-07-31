/**
 * Helper services: reference generation, fee calc, notifications.
 */
import { v4 as uuidv4 } from 'uuid';
import { getStore } from '../db';
import { sendPushNotification } from '../config/firebase';
import type { Country, TransactionType } from '../types';

/** Generate a unique transaction reference like TX-MS6TVMGD-89E13A. */
export function generateReference(prefix = 'TX'): string {
  const id = uuidv4().replace(/-/g, '').toUpperCase();
  return `${prefix}-${id.slice(0, 8)}-${id.slice(8, 14)}`;
}

/** Direction label from source/dest countries. */
export function directionOf(src: Country, dst: Country): string {
  return `${src}->${dst}`;
}

/** Compute the fee for an amount using the configured tariffs. */
export async function computeFee(amount: number): Promise<{ fee: number; percent: number; fixed: number }> {
  const tariff = await getStore().findTariffForAmount(amount);
  if (!tariff) return { fee: 0, percent: 0, fixed: 0 };
  const fee = Math.round(amount * tariff.fee_percent / 100 + tariff.fixed_fee);
  return { fee, percent: tariff.fee_percent, fixed: tariff.fixed_fee };
}

/** Convert an amount using the stored exchange rate (fallback 0.94 XOF->XAF). */
export async function convertCurrency(amount: number, from: string, to: string): Promise<number> {
  if (from === to) return amount;
  const rate = await getStore().findExchangeRate(from, to);
  const r = rate ? rate.rate : (from === 'XOF' && to === 'XAF' ? 0.94 : 1);
  return Math.round(amount * r * 100) / 100;
}

/** Send a notification (in-app + push if device token present). */
export async function notifyUser(
  userId: number,
  title: string,
  body: string,
  opts: { channel?: 'push' | 'email' | 'in_app' } = {},
): Promise<void> {
  const store = getStore();
  await store.createNotification({ user_id: userId, title, body, channel: opts.channel ?? 'in_app' });
  const user = await store.findUserById(userId);
  if (user?.device_token) {
    await sendPushNotification(user.device_token, title, body);
  }
}

/** Build a WhatsApp deep link to the admin-configured contact. */
export async function whatsappLink(message: string): Promise<string> {
  const settings = await getStore().getSettings();
  const phone = (settings.admin_whatsapp || '').replace(/[^\d]/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/** Type label map (EN/FR) for transactions. */
export const TYPE_META: Record<TransactionType, { label: string; labelFr: string; icon: string }> = {
  deposit:  { label: 'Deposit',  labelFr: 'Dépôt',    icon: 'arrow-down' },
  transfer: { label: 'Transfer', labelFr: 'Transfert', icon: 'paper-plane' },
  withdraw: { label: 'Withdraw', labelFr: 'Retrait',  icon: 'arrow-up' },
};
