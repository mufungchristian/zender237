/**
 * Transaction status workflow engine.
 *
 * Defines the allowed transitions for transactions and borrow requests,
 * and centralizes the rules so all routes apply them consistently.
 */
import type { TransactionStatus } from '../types';

/**
 * Allowed forward transitions. A status may transition to itself (no-op).
 * The general lifecycle is:
 *
 *   draft -> pending -> awaiting_payment -> awaiting_proof
 *        -> under_review -> approved -> completed
 *        -> rejected  (terminal)
 *        -> cancelled (terminal, from any non-terminal state)
 */
export const ALLOWED_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['awaiting_payment', 'awaiting_proof', 'under_review', 'approved', 'rejected', 'cancelled'],
  awaiting_payment: ['awaiting_proof', 'under_review', 'cancelled', 'rejected'],
  awaiting_proof: ['under_review', 'cancelled', 'rejected'],
  under_review: ['approved', 'rejected', 'cancelled'],
  approved: ['completed', 'cancelled'],
  rejected: [],
  completed: [],
  cancelled: [],
};

export const TERMINAL_STATUSES: TransactionStatus[] = ['completed', 'rejected', 'cancelled'];

export function isTerminal(status: TransactionStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransition(from: TransactionStatus, to: TransactionStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

/**
 * Status metadata used by the frontend to render icons & colors.
 * icon: a Font Awesome icon name (without the fa- prefix).
 */
export const STATUS_META: Record<TransactionStatus, {
  label: string;
  color: string;
  icon: string;
  labelFr: string;
}> = {
  draft:        { label: 'Draft',            labelFr: 'Brouillon',     color: '#94a3b8', icon: 'pen' },
  pending:      { label: 'Pending',          labelFr: 'En attente',    color: '#f59e0b', icon: 'clock' },
  awaiting_payment: { label: 'Awaiting payment', labelFr: 'En attente de paiement', color: '#3b82f6', icon: 'wallet' },
  awaiting_proof:   { label: 'Awaiting proof',    labelFr: 'En attente de preuve',  color: '#8b5cf6', icon: 'upload' },
  under_review: { label: 'Under review',     labelFr: 'En revue',      color: '#6366f1', icon: 'eye' },
  approved:     { label: 'Approved',         labelFr: 'Approuvé',      color: '#10b981', icon: 'check' },
  rejected:     { label: 'Rejected',         labelFr: 'Rejeté',        color: '#ef4444', icon: 'xmark' },
  completed:    { label: 'Completed',        labelFr: 'Terminé',       color: '#22c55e', icon: 'circle-check' },
  cancelled:    { label: 'Cancelled',        labelFr: 'Annulé',        color: '#6b7280', icon: 'ban' },
};
