/**
 * Transactions list page — full history of the user's transactions with filters.
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';
import { txApi } from '../../api/client';
import type { Transaction } from '../../types';
import BrandHeader from '../../components/BrandHeader';
import BottomNav from '../../components/BottomNav';
import { TYPE_META, STATUS_META, fmtMoney, fmtDate } from '../../components/ui';

export default function TransactionsPage() {
  const { lang } = useI18n();
  const nav = useNavigate();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const list = await txApi.list(filter !== 'all' ? { type: filter } : undefined);
      setTxs(list);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="app-shell">
      <BrandHeader />
      <div className="page">
        <h1 className="page-title">{lang === 'fr' ? 'Transactions' : 'Transactions'}</h1>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
          {['all', 'deposit', 'transfer', 'withdraw'].map((f) => (
            <button key={f} className={`btn sm ${filter === f ? '' : 'outline'}`} onClick={() => setFilter(f)}>
              {f === 'all' ? (lang === 'fr' ? 'Toutes' : 'All') : TYPE_META[f as keyof typeof TYPE_META][lang === 'fr' ? 'labelFr' : 'label']}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state"><i className="fa-solid fa-spinner fa-spin" /></div>
        ) : txs.length === 0 ? (
          <div className="empty-state"><i className="fa-solid fa-receipt" /><p>{lang === 'fr' ? 'Aucune transaction' : 'No transactions'}</p></div>
        ) : (
          <div className="tx-list">
            {txs.map((tx) => {
              const tm = TYPE_META[tx.type];
              const sm = STATUS_META[tx.status];
              const amt = tx.type === 'deposit' ? tx.amount_received : tx.amount_sent;
              return (
                <div className="tx-item" key={tx.id} onClick={() => nav(`/transactions/${tx.id}`)} style={{ cursor: 'pointer' }}>
                  <div className={`tx-icon ${tx.type}`}><i className={`fa-solid ${tm.icon}`} /></div>
                  <div className="tx-body">
                    <div className="tx-title">{lang === 'fr' ? tm.labelFr : tm.label}</div>
                    <div className="tx-sub">{tx.reference} · {fmtDate(tx.created_at)}</div>
                    <span className={`tx-status badge-${sm.color}`}><i className={`fa-solid ${sm.icon}`} /> {lang === 'fr' ? sm.labelFr : sm.label}</span>
                  </div>
                  <div className="tx-right"><div className="tx-amount">{fmtMoney(amt, tx.currency_sent)}</div></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
