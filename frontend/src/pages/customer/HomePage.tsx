/**
 * Home page — adopts the top design from the provided image:
 *  - Brand header (dark) with Zender237 + Mali·Guinea·Cameroon tagline
 *  - Dark balance card showing available balance + tier badge
 *  - Three colored action buttons: Deposit (green) / Transfer (amber) / Withdraw (red)
 *  - "Today's rates" collapsible toggle
 *  - Recent transactions list with type + status icons
 *  - Bottom navigation
 * Action buttons open bottom-sheet modals to create new transactions.
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { txApi, numbersApi, ratesApi, usersApi, miscApi } from '../../api/client';
import type { Transaction, PaymentNumber, ExchangeRate, NotificationLog, TransactionType } from '../../types';
import BrandHeader from '../../components/BrandHeader';
import BottomNav from '../../components/BottomNav';
import { TYPE_META, STATUS_META, fmtMoney, fmtDate, statusBadge } from '../../components/ui';

export default function HomePage() {
  const { user, setUser } = useAuth();
  const { t, lang } = useI18n();
  const nav = useNavigate();

  const [balance, setBalance] = useState(user?.balance ?? 0);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [numbers, setNumbers] = useState<PaymentNumber[]>([]);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotificationLog[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [modal, setModal] = useState<TransactionType | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [b, list, rs, ns, nfs] = await Promise.all([
        usersApi.balance(),
        txApi.list(),
        ratesApi.list(),
        numbersApi.list(),
        miscApi.notifications().catch(() => []),
      ]);
      setBalance(b.balance);
      setTxs(list.slice(0, 5));
      setRates(rs);
      setNumbers(ns);
      setNotifs(nfs);
    } catch (e) {
      // silent — demo mode may have stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  return (
    <div className="app-shell">
      <BrandHeader onOpenNotifications={() => setNotifOpen(true)} />

      <div className="page">
        {/* Balance card */}
        <div className="balance-card">
          <div className="bal-tier">{user?.tier ?? 'BRONZE'}</div>
          <div className="bal-label">{t('home.balance')}</div>
          <div className="bal-amount">{fmtMoney(balance)}</div>
          <div className="bal-currency">XAF · Central African CFA</div>
        </div>

        {/* Action buttons */}
        <div className="actions-row">
          <button className="action-btn deposit" onClick={() => setModal('deposit')}>
            <i className="fa-solid fa-arrow-down" />
            <span>{t('home.deposit')}</span>
          </button>
          <button className="action-btn transfer" onClick={() => setModal('transfer')}>
            <i className="fa-solid fa-paper-plane" />
            <span>{t('home.transfer')}</span>
          </button>
          <button className="action-btn withdraw" onClick={() => setModal('withdraw')}>
            <i className="fa-solid fa-arrow-up" />
            <span>{t('home.withdraw')}</span>
          </button>
        </div>

        {/* Rates toggle */}
        <div className={`rates-toggle ${ratesOpen ? 'open' : ''}`} onClick={() => setRatesOpen((v) => !v)}>
          <span className="rt-label"><i className="fa-solid fa-chart-line" /> {t('home.rates')}</span>
          <i className="fa-solid fa-chevron-down rt-chev" />
        </div>
        <div className={`rates-list ${ratesOpen ? 'show' : ''}`}>
          {rates.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No rates configured.</p>}
          {rates.map((r) => (
            <div className="rate-row" key={r.id}>
              <span className="rr-pair">{r.from_currency} → {r.to_currency}</span>
              <span className="rr-val">{r.rate.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Recent transactions */}
        <div className="section-head">
          <h3>{t('home.recent')}</h3>
          <a onClick={() => nav('/transactions')}>{t('home.viewAll')} →</a>
        </div>

        {loading ? (
          <div className="empty-state"><i className="fa-solid fa-spinner fa-spin" /></div>
        ) : txs.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-receipt" />
            <p>{t('home.noTx')}</p>
          </div>
        ) : (
          <div className="tx-list">
            {txs.map((tx) => {
              const tm = TYPE_META[tx.type];
              const sm = STATUS_META[tx.status];
              const amt = tx.type === 'deposit' ? tx.amount_received : tx.amount_sent;
              return (
                <div className="tx-item" key={tx.id} onClick={() => nav(`/transactions/${tx.id}`)} style={{ cursor: 'pointer' }}>
                  <div className={`tx-icon ${tx.type}`}>
                    <i className={`fa-solid ${tm.icon}`} />
                  </div>
                  <div className="tx-body">
                    <div className="tx-title">{lang === 'fr' ? tm.labelFr : tm.label}</div>
                    <div className="tx-sub">{tx.reference} · {fmtDate(tx.created_at)}</div>
                    <span className={`tx-status badge-${sm.color}`}>
                      <i className={`fa-solid ${sm.icon}`} />
                      {lang === 'fr' ? sm.labelFr : sm.label}
                    </span>
                  </div>
                  <div className="tx-right">
                    <div className="tx-amount">{fmtMoney(amt, tx.currency_sent)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction modal */}
      {modal && (
        <TxModal
          type={modal}
          numbers={numbers}
          rates={rates}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); refresh(); }}
        />
      )}

      {/* Notifications modal */}
      {notifOpen && (
        <div className="modal-overlay" onClick={() => setNotifOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">
              Notifications {unreadCount > 0 && <span className="badge badge-red">{unreadCount} new</span>}
              <button onClick={() => setNotifOpen(false)}>×</button>
            </div>
            {notifs.length === 0 ? (
              <div className="empty-state"><i className="fa-solid fa-bell-slash" /><p>No notifications</p></div>
            ) : (
              notifs.map((n) => (
                <div key={n.id} className="card" style={{ opacity: n.is_read ? 0.6 : 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{fmtDate(n.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

/* ---------------- Transaction creation modal ---------------- */
function TxModal({ type, numbers, rates, onClose, onDone }: {
  type: TransactionType;
  numbers: PaymentNumber[];
  rates: ExchangeRate[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, lang } = useI18n();
  const { setUser } = useAuth();
  const [form, setForm] = useState({
    amount: '',
    source_country: 'CM',
    dest_country: 'ML',
    receiver_phone: '',
    sender_phone: '',
    payment_number_id: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<any>(null);

  const countries = [
    { code: 'CM', label: 'Cameroon', cur: 'XAF' },
    { code: 'ML', label: 'Mali', cur: 'XOF' },
    { code: 'GN', label: 'Guinea', cur: 'GNF' },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      let res;
      if (type === 'deposit') {
        res = await txApi.deposit({
          source_country: form.source_country,
          amount_sent: parseFloat(form.amount),
          payment_number_id: parseInt(form.payment_number_id),
          sender_number: form.sender_phone,
        });
      } else if (type === 'transfer') {
        res = await txApi.transfer({
          source_country: form.source_country,
          dest_country: form.dest_country,
          amount_sent: parseFloat(form.amount),
          receiver_phone: form.receiver_phone,
          payment_number_id: form.payment_number_id ? parseInt(form.payment_number_id) : undefined,
        });
      } else {
        // withdraw
        res = await txApi.withdraw({
          country: form.dest_country,
          amount: parseFloat(form.amount),
          receiver_number: form.receiver_phone || form.sender_phone,
          payment_number_id: parseInt(form.payment_number_id),
        });
      }
      setResult(res);
      // refresh balance
      const b = await usersApi.balance();
      setUser({ ...(JSON.parse(localStorage.getItem('zender_user')!)), balance: b.balance });
    } catch (e: any) {
      setErr(e.response?.data?.error || e.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  const title = type === 'deposit' ? t('home.deposit') : type === 'transfer' ? t('home.transfer') : t('home.withdraw');
  const availNumbers = numbers.filter((n) => n.is_active);

  if (result) {
    const sm = STATUS_META[result.status as keyof typeof STATUS_META];
    return (
      <div className="modal-overlay" onClick={onDone}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="modal-handle" />
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, color: 'var(--green)', marginBottom: 12 }}>
              <i className="fa-solid fa-circle-check" />
            </div>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>{title} created</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Reference: <b>{result.reference}</b></p>
            <p style={{ marginTop: 12 }}>
              <span className={`tx-status badge-${sm.color}`}>
                <i className={`fa-solid ${sm.icon}`} /> {lang === 'fr' ? sm.labelFr : sm.label}
              </span>
            </p>

            {(result.status === 'awaiting_payment' || result.status === 'awaiting_proof') && (
              <div className="alert alert-info" style={{ textAlign: 'left', marginTop: 16 }}>
                {type === 'deposit' && 'Please send the money to the selected payment number, then upload your proof of payment.'}
                {type === 'transfer' && 'Your transfer is being processed. You can track its status in Transactions.'}
                {type === 'withdraw' && 'Your withdrawal request has been submitted. Funds have been deducted from your balance.'}
              </div>
            )}
            <button className="btn" onClick={onDone} style={{ marginTop: 20 }}>{t('common.continue')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{title} <button onClick={onClose}>×</button></div>
        {err && <div className="alert alert-error"><i className="fa-solid fa-circle-exclamation" /> {err}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Amount</label>
            <input className="form-input" type="number" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="1" />
          </div>

          <div className="form-group">
            <label>From (source country)</label>
            <select className="form-select" value={form.source_country}
              onChange={(e) => setForm({ ...form, source_country: e.target.value })}>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.label} ({c.cur})</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>To (destination country)</label>
            <select className="form-select" value={form.dest_country}
              onChange={(e) => setForm({ ...form, dest_country: e.target.value })}>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.label} ({c.cur})</option>)}
            </select>
          </div>

          {(type === 'transfer') && (
            <div className="form-group">
              <label>Receiver phone</label>
              <input className="form-input" value={form.receiver_phone}
                onChange={(e) => setForm({ ...form, receiver_phone: e.target.value })} placeholder="+223..." required />
            </div>
          )}

          {type === 'deposit' && (
            <>
              <div className="form-group">
                <label>Sender phone (your number that sent the payment)</label>
                <input className="form-input" value={form.sender_phone}
                  onChange={(e) => setForm({ ...form, sender_phone: e.target.value })} placeholder="+237..." />
              </div>
              <div className="form-group">
                <label>Payment number (where you sent the money)</label>
                <select className="form-select" value={form.payment_number_id}
                  onChange={(e) => setForm({ ...form, payment_number_id: e.target.value })} required>
                  <option value="">Select a number...</option>
                  {availNumbers.map((n) => <option key={n.id} value={n.id}>{n.label} — {n.number} ({n.provider})</option>)}
                </select>
              </div>
            </>
          )}

          {type === 'withdraw' && (
            <>
              <div className="form-group">
                <label>Withdrawal number (where to receive funds)</label>
                <select className="form-select" value={form.payment_number_id}
                  onChange={(e) => setForm({ ...form, payment_number_id: e.target.value })} required>
                  <option value="">Select a number...</option>
                  {availNumbers.map((n) => <option key={n.id} value={n.id}>{n.label} — {n.number}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Your phone number (receiver)</label>
                <input className="form-input" value={form.receiver_phone}
                  onChange={(e) => setForm({ ...form, receiver_phone: e.target.value })} placeholder="+237..." required />
              </div>
            </>
          )}

          <button className={`btn ${type === 'deposit' ? 'green' : type === 'transfer' ? 'amber' : 'red'}`} type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : <>{t('common.submit')} <i className="fa-solid fa-paper-plane" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
