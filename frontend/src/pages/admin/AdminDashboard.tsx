/**
 * Admin dashboard — KPI stats + recent transactions + recent borrow requests.
 */
import { useEffect, useState } from 'react';
import { adminApi, txApi, borrowApi } from '../../api/client';
import { STATUS_META, fmtMoney, fmtDate } from '../../components/ui';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [borrows, setBorrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.dashboard().catch(() => null),
      txApi.list({ limit: 10 }).catch(() => []),
      borrowApi.list({ limit: 5 }).catch(() => []),
    ]).then(([s, t, b]) => {
      setStats(s);
      setTxs(t);
      setBorrows(b);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="empty-state"><i className="fa-solid fa-spinner fa-spin" /></div>;

  const sc = stats?.counts || stats?.stats || stats || {};

  return (
    <>
      <h1 className="page-title">Dashboard</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="sc-label">TOTAL USERS</div>
          <div className="sc-value">{sc.users ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">TOTAL TRANSACTIONS</div>
          <div className="sc-value">{sc.transactions ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">PENDING APPROVAL</div>
          <div className="sc-value">{sc.pendingTransactions ?? sc.pending ?? sc.pending_transactions ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">COMPLETED</div>
          <div className="sc-value">{sc.completedTransactions ?? sc.completed ?? sc.completed_transactions ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">TOTAL VOLUME</div>
          <div className="sc-value">{sc.totalBalance ? fmtMoney(sc.totalBalance) : (stats?.totalBalance ? fmtMoney(stats.totalBalance) : '—')}</div>
        </div>
        <div className="stat-card">
          <div className="sc-label">BORROW REQUESTS</div>
          <div className="sc-value">{sc.borrowRequests ?? sc.borrows ?? sc.borrow_requests ?? '—'}</div>
        </div>
      </div>

      <div className="section-head"><h3>Recent Transactions</h3></div>
      {txs.length === 0 ? (
        <div className="empty-state"><i className="fa-solid fa-receipt" /><p>No transactions</p></div>
      ) : (
        <table className="tbl">
          <thead><tr><th>Ref</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {txs.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.reference}</td>
                <td style={{ textTransform: 'capitalize' }}>{tx.type}</td>
                <td>{fmtMoney(tx.amount_sent, tx.currency_sent)}</td>
                <td><span className={`badge badge-${STATUS_META[tx.status]?.color}`}><i className={`fa-solid ${STATUS_META[tx.status]?.icon}`} /> {STATUS_META[tx.status]?.label}</span></td>
                <td>{fmtDate(tx.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="section-head"><h3>Recent Borrow Requests</h3></div>
      {borrows.length === 0 ? (
        <div className="empty-state"><i className="fa-solid fa-hand-holding-dollar" /><p>No borrow requests</p></div>
      ) : (
        <table className="tbl">
          <thead><tr><th>Ref</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {borrows.map((b) => (
              <tr key={b.id}>
                <td>{b.reference}</td>
                <td>{b.type === 'money' ? 'Money' : 'Flight ticket'}</td>
                <td>{b.amount ? fmtMoney(b.amount, b.currency) : '—'}</td>
                <td><span className={`badge badge-${STATUS_META[b.status]?.color}`}><i className={`fa-solid ${STATUS_META[b.status]?.icon}`} /> {STATUS_META[b.status]?.label}</span></td>
                <td>{fmtDate(b.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
