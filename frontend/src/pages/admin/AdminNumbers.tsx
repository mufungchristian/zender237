/**
 * Admin payment numbers — CRUD for deposit/withdrawal phone numbers.
 */
import { useEffect, useState, useCallback } from 'react';
import { numbersApi } from '../../api/client';
import type { PaymentNumber } from '../../types';

export default function AdminNumbers() {
  const [numbers, setNumbers] = useState<PaymentNumber[]>([]);
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PaymentNumber | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: '', number: '', country: 'CM', provider: '', daily_limit: '1000000' });

  const load = useCallback(async () => {
    try {
      const list = await numbersApi.list(country || undefined);
      setNumbers(list);
    } catch { /* ignore */ }
    setLoading(false);
  }, [country]);

  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = { ...form, daily_limit: parseInt(form.daily_limit) };
      if (editing) await numbersApi.update(editing.id, payload);
      else await numbersApi.create(payload);
      setShowForm(false); setEditing(null);
      setForm({ label: '', number: '', country: 'CM', provider: '', daily_limit: '1000000' });
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  }

  async function remove(id: number) {
    if (!confirm('Delete this number?')) return;
    await numbersApi.remove(id);
    load();
  }

  return (
    <>
      <h1 className="page-title">Payment Numbers</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select className="form-select" style={{ width: 'auto' }} value={country} onChange={(e) => { setCountry(e.target.value); setLoading(true); }}>
          <option value="">All countries</option>
          <option value="CM">Cameroon</option>
          <option value="ML">Mali</option>
          <option value="GN">Guinea</option>
        </select>
        <button className="btn sm" onClick={() => { setShowForm(true); setEditing(null); setForm({ label: '', number: '', country: 'CM', provider: '', daily_limit: '1000000' }); }}>
          <i className="fa-solid fa-plus" /> Add number
        </button>
      </div>

      {loading ? <div className="empty-state"><i className="fa-solid fa-spinner fa-spin" /></div> : numbers.length === 0 ? (
        <div className="empty-state"><i className="fa-solid fa-mobile-screen" /><p>No numbers</p></div>
      ) : (
        <table className="tbl">
          <thead><tr><th>Label</th><th>Number</th><th>Country</th><th>Provider</th><th>Active</th><th>Used/Limit</th><th></th></tr></thead>
          <tbody>
            {numbers.map((n) => (
              <tr key={n.id}>
                <td>{n.label}</td>
                <td>{n.number}</td>
                <td>{n.country}</td>
                <td>{n.provider}</td>
                <td><span className={`badge ${n.is_active ? 'badge-green' : 'badge-gray'}`}>{n.is_active ? 'Yes' : 'No'}</span></td>
                <td>{n.used_today} / {n.daily_limit}</td>
                <td>
                  <button className="btn sm outline" onClick={() => { setEditing(n); setShowForm(true); setForm({ label: n.label, number: n.number, country: n.country, provider: n.provider, daily_limit: String(n.daily_limit) }); }}>Edit</button>
                  <button className="btn sm red" onClick={() => remove(n.id)}>Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">{editing ? 'Edit number' : 'Add number'} <button onClick={() => setShowForm(false)}>×</button></div>
            <form onSubmit={save}>
              <div className="form-group"><label>Label</label><input className="form-input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required /></div>
              <div className="form-group"><label>Number</label><input className="form-input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required /></div>
              <div className="form-group"><label>Country</label><select className="form-select" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}><option value="CM">Cameroon</option><option value="ML">Mali</option><option value="GN">Guinea</option></select></div>
              <div className="form-group"><label>Provider</label><input className="form-input" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="MTN, Orange, Wave..." required /></div>
              <div className="form-group"><label>Daily limit</label><input className="form-input" type="number" value={form.daily_limit} onChange={(e) => setForm({ ...form, daily_limit: e.target.value })} required /></div>
              <button className="btn" type="submit">{editing ? 'Update' : 'Create'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
