/**
 * UI helpers — status colors/icons, currency formatting, date formatting.
 * Mirrors the backend STATUS_META so the frontend is self-sufficient.
 */
import type { TransactionStatus, TransactionType } from '../types';

// (types kept for reference; STATUS_META / TYPE_META use string keys for flexible indexing)

export const STATUS_META: Record<string, { label: string; labelFr: string; color: string; icon: string }> = {
  draft:            { label: 'Draft',              labelFr: 'Brouillon',        color: 'gray',  icon: 'fa-pen' },
  pending:          { label: 'Pending',            labelFr: 'En attente',       color: 'gray',  icon: 'fa-clock' },
  awaiting_payment: { label: 'Awaiting payment',   labelFr: 'En attente paiement', color: 'amber', icon: 'fa-wallet' },
  awaiting_proof:   { label: 'Awaiting proof',     labelFr: 'En attente preuve',  color: 'amber', icon: 'fa-camera' },
  under_review:     { label: 'Under review',       labelFr: 'En cours d\'examen', color: 'blue',  icon: 'fa-magnifying-glass' },
  approved:         { label: 'Approved',           labelFr: 'Approuvé',         color: 'blue',  icon: 'fa-circle-check' },
  rejected:         { label: 'Rejected',           labelFr: 'Rejeté',           color: 'red',   icon: 'fa-circle-xmark' },
  completed:        { label: 'Completed',          labelFr: 'Terminé',          color: 'green', icon: 'fa-check-double' },
  cancelled:        { label: 'Cancelled',          labelFr: 'Annulé',           color: 'gray',  icon: 'fa-ban' },
};

export const TYPE_META: Record<string, { label: string; labelFr: string; icon: string }> = {
  deposit:  { label: 'Deposit',  labelFr: 'Dépôt',     icon: 'fa-arrow-down' },
  transfer: { label: 'Transfer', labelFr: 'Transfert', icon: 'fa-paper-plane' },
  withdraw: { label: 'Withdraw', labelFr: 'Retrait',   icon: 'fa-arrow-up' },
};

export function statusBadge(status: string, lang: 'en' | 'fr' = 'en') {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`tx-status badge-${m.color}`}>
      <i className={`fa-solid ${m.icon}`} />
      {lang === 'fr' ? m.labelFr : m.label}
    </span>
  );
}

export function badgeClass(color: string): string {
  return `badge-${color}`;
}

export function fmtMoney(amount: number, currency = 'XAF'): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' ' + currency;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
