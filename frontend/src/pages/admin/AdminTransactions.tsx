/**
 * Admin transactions — list all transactions with status filter, approve/reject workflow.
 */
import { useEffect, useState, useCallback } from 'react';
import { txApi } from '../../api/client';
import { STATUS_META, fmtMoney, fmtDate } from '../../components/ui';

export default function AdminTransactions() {
  const [txs, setTxs] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await txApi.list(filter !== 'all' ? { status: filter } : undefined);
      setTxs(list);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: number, status: string) {
    setBusy(true);
    try {
      await txApi.updateStatus(id, status, note || undefined);
      setSelected(null);
      setNote('');
      load();
    } catch (e) {
      alert('Failed to update status');
    } finally { setBusy(false); }
  }

  const statuses = ['all', 'awaiting_payment', 'awaiting_proof', 'under_review', 'approved', 'completed', 'rejected', 'cancelled'];

  return (
    <>
      <h1 className="page-title">Transactions</h1>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
        {statuses.map((s) => (
          <button key={s} className={`btn sm ${filter === s ? '' : 'outline'}`} onClick={() => { setFilter(s); setLoading(true); }}>
            {s === 'all' ? 'All' : STATUS_META[s as keyof typeof STATUS_META]?.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state"><i className="fa-solid fa-spinner fa-spin" /></div>
      ) : txs.length === 0 ? (
        <div className="empty-state"><i className="fa-solid fa-receipt" /><p>No transactions</p></div>
      ) : (
        <table className="tbl">
          <thead><tr><th>Ref</th><th>User</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {txs.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.reference}</td>
                <td>#{tx.user_id}</td>
                <td style={{ textTransform: 'capitalize' }}>{tx.type}</td>
                <td>{fmtMoney(tx.amount_sent, tx.currency_sent)}</td>
                <td><span className={`badge badge-${STATUS_META[tx.status]?.color}`}><i className={`fa-solid ${STATUS_META[tx.status]?.icon}`} /> {STATUS_META[tx.status]?.label}</span></td>
                <td>{fmtDate(tx.created_at)}</td>
                <td><button className="btn sm outline" onClick={() => { setSelected(tx); setNote(tx.admin_note || ''); }}>Manage</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-sheet" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Manage {selected.reference} <button onClick={() => setSelected(null)}>×</button></div>

            <div className="card">
              <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Type</span><b style={{ textTransform: 'capitalize' }}>{selected.type}</b></div>
              <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Amount sent</span><b>{fmtMoney(selected.amount_sent, selected.currency_sent)}</b></div>
              <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Amount received</span><b>{fmtMoney(selected.amount_received, selected.currency_received)}</b></div>
              <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Fee</span><b>{fmtMoney(selected.fee, selected.currency_sent)}</b></div>
              <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>From → To</span><b>{selected.source_country} → {selected.dest_country}</b></div>
              {selected.receiver_phone && <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Receiver</span><b>{selected.receiver_phone}</b></div>}
              {selected.sender_phone && <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Sender</span><b>{selected.sender_phone}</b></div>}
              {selected.proof_url && <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Proof</span><a href={selected.proof_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)' }}>View</a></div>}
              <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Current status</span><span className={`badge badge-${STATUS_META[selected.status]?.color}`}><i className={`fa-solid ${STATUS_META[selected.status]?.icon}`} /> {STATUS_META[selected.status]?.label}</span></div>
            </div>

            <div className="card">
              <h3>Update status</h3>
              <div className="form-group">
                <label>Admin note</label>
                <textarea className="form-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note..." />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn sm blue" onClick={() => updateStatus(selected.id, 'under_review')} disabled={busy}>Mark under review</button>
                <button className="btn sm green" onClick={() => updateStatus(selected.id, 'approved')} disabled={busy}>Approve</button>
                <button className="btn sm green" onClick={() => updateStatus(selected.id, 'completed')} disabled={busy}>Complete</button>
                <button className="btn sm red" onClick={() => updateStatus(selected.id, 'rejected')} disabled={busy}>Reject (refund)</button>
                <button className="btn sm outline" onClick={() => updateStatus(selected.id, 'cancelled')} disabled={busy}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
