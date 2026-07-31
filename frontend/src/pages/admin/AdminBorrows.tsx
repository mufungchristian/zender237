/**
 * Admin borrow requests — list, review, approve/reject borrow money & flight ticket requests.
 */
import { useEffect, useState, useCallback } from 'react';
import { borrowApi } from '../../api/client';
import { STATUS_META, fmtMoney, fmtDate } from '../../components/ui';

export default function AdminBorrows() {
  const [borrows, setBorrows] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await borrowApi.list(filter !== 'all' ? { status: filter } : undefined);
      setBorrows(list);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: number, status: string) {
    setBusy(true);
    try {
      await borrowApi.updateStatus(id, status, note || undefined);
      setSelected(null); setNote('');
      load();
    } catch { alert('Failed'); }
    finally { setBusy(false); }
  }

  const statuses = ['all', 'pending', 'under_review', 'approved', 'completed', 'rejected', 'cancelled'];

  return (
    <>
      <h1 className="page-title">Borrow Requests</h1>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
        {statuses.map((s) => (
          <button key={s} className={`btn sm ${filter === s ? '' : 'outline'}`} onClick={() => { setFilter(s); setLoading(true); }}>
            {s === 'all' ? 'All' : STATUS_META[s as keyof typeof STATUS_META]?.label}
          </button>
        ))}
      </div>

      {loading ? <div className="empty-state"><i className="fa-solid fa-spinner fa-spin" /></div> : borrows.length === 0 ? (
        <div className="empty-state"><i className="fa-solid fa-hand-holding-dollar" /><p>No borrow requests</p></div>
      ) : (
        <table className="tbl">
          <thead><tr><th>Ref</th><th>Type</th><th>Amount</th><th>Interest</th><th>Duration</th><th>GOLD</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {borrows.map((b) => (
              <tr key={b.id}>
                <td>{b.reference}</td>
                <td>{b.type === 'money' ? 'Money' : 'Flight ticket'}</td>
                <td>{b.amount ? fmtMoney(b.amount, b.currency) : '—'}</td>
                <td>{b.interest_rate}%</td>
                <td>{b.duration_months}mo</td>
                <td>{b.is_gold ? <span className="badge badge-amber">GOLD</span> : '—'}</td>
                <td><span className={`badge badge-${STATUS_META[b.status]?.color}`}><i className={`fa-solid ${STATUS_META[b.status]?.icon}`} /> {STATUS_META[b.status]?.label}</span></td>
                <td>{fmtDate(b.created_at)}</td>
                <td><button className="btn sm outline" onClick={() => { setSelected(b); setNote(b.admin_note || ''); }}>Manage</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-sheet" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Borrow {selected.reference} <button onClick={() => setSelected(null)}>×</button></div>

            <div className="card">
              <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Type</span><b>{selected.type === 'money' ? 'Money loan' : 'Flight ticket'}</b></div>
              {selected.amount && <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Amount</span><b>{fmtMoney(selected.amount, selected.currency)}</b></div>}
              <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Interest</span><b>{selected.interest_rate}%</b></div>
              <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Duration</span><b>{selected.duration_months} months</b></div>
              {selected.due_date && <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Due date</span><b>{fmtDate(selected.due_date)}</b></div>}
              <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>GOLD benefits</span><b>{selected.is_gold ? 'Yes' : 'No'}</b></div>
              {selected.free_accommodation_months > 0 && <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Free accommodation</span><b>{selected.free_accommodation_months} month(s)</b></div>}
              {selected.reason && <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Reason</span><b>{selected.reason}</b></div>}
              {selected.id_front_url && <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>ID front</span><a href={selected.id_front_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)' }}>View</a></div>}
              {selected.id_back_url && <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>ID back</span><a href={selected.id_back_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)' }}>View</a></div>}
              <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Status</span><span className={`badge badge-${STATUS_META[selected.status]?.color}`}>{STATUS_META[selected.status]?.label}</span></div>
            </div>

            <div className="card">
              <h3>Update status</h3>
              <div className="form-group"><label>Admin note</label><textarea className="form-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional..." /></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn sm blue" onClick={() => updateStatus(selected.id, 'under_review')} disabled={busy}>Review</button>
                <button className="btn sm green" onClick={() => updateStatus(selected.id, 'approved')} disabled={busy}>Approve</button>
                <button className="btn sm green" onClick={() => updateStatus(selected.id, 'completed')} disabled={busy}>Complete</button>
                <button className="btn sm red" onClick={() => updateStatus(selected.id, 'rejected')} disabled={busy}>Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
