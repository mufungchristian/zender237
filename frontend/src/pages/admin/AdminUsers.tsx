/**
 * Admin users — list, create, update, delete users. Change tier/role/balance.
 */
import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../api/client';
import type { SafeUser } from '../../types';
import { fmtMoney, fmtDate } from '../../components/ui';

export default function AdminUsers() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SafeUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', password: '', email: '', country: 'CM', role: 'user', tier: 'BRONZE', balance: '0' });

  const load = useCallback(async () => {
    try { const list = await adminApi.users(); setUsers(list); } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: any = { full_name: form.full_name, phone: form.phone, email: form.email || undefined, country: form.country, role: form.role, tier: form.tier, balance: parseFloat(form.balance) };
      if (form.password) payload.password = form.password;
      if (editing) await adminApi.updateUser(editing.id, payload);
      else await adminApi.createUser(payload);
      setShowForm(false); setEditing(null);
      setForm({ full_name: '', phone: '', password: '', email: '', country: 'CM', role: 'user', tier: 'BRONZE', balance: '0' });
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  }

  async function remove(id: number) {
    if (!confirm('Delete this user?')) return;
    await adminApi.deleteUser(id);
    load();
  }

  return (
    <>
      <h1 className="page-title">Users</h1>
      <button className="btn sm" style={{ marginBottom: 16 }} onClick={() => { setShowForm(true); setEditing(null); setForm({ full_name: '', phone: '', password: '', email: '', country: 'CM', role: 'user', tier: 'BRONZE', balance: '0' }); }}>
        <i className="fa-solid fa-plus" /> Add user
      </button>

      {loading ? <div className="empty-state"><i className="fa-solid fa-spinner fa-spin" /></div> : (
        <table className="tbl">
          <thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Tier</th><th>Balance</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.phone}</td>
                <td><span className={`badge ${u.role === 'admin' ? 'badge-red' : u.role === 'staff' ? 'badge-blue' : 'badge-gray'}`}>{u.role}</span></td>
                <td><span className={`badge ${u.tier === 'GOLD' ? 'badge-amber' : u.tier === 'SILVER' ? 'badge-blue' : 'badge-gray'}`}>{u.tier}</span></td>
                <td>{fmtMoney(u.balance)}</td>
                <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>{u.is_active ? 'Yes' : 'No'}</span></td>
                <td>
                  <button className="btn sm outline" onClick={() => { setEditing(u); setShowForm(true); setForm({ full_name: u.full_name, phone: u.phone, password: '', email: u.email || '', country: u.country, role: u.role, tier: u.tier, balance: String(u.balance) }); }}>Edit</button>
                  <button className="btn sm red" onClick={() => remove(u.id)}>Del</button>
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
            <div className="modal-title">{editing ? 'Edit user' : 'Add user'} <button onClick={() => setShowForm(false)}>×</button></div>
            <form onSubmit={save}>
              <div className="form-group"><label>Full name</label><input className="form-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
              <div className="form-group"><label>Phone</label><input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
              <div className="form-group"><label>Password {editing && '(leave blank to keep)'}</label><input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} /></div>
              <div className="form-group"><label>Email</label><input className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="form-group"><label>Country</label><select className="form-select" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}><option value="CM">Cameroon</option><option value="ML">Mali</option><option value="GN">Guinea</option></select></div>
              <div className="form-group"><label>Role</label><select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="user">User</option><option value="staff">Staff</option><option value="admin">Admin</option></select></div>
              <div className="form-group"><label>Tier</label><select className="form-select" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}><option value="BRONZE">BRONZE</option><option value="SILVER">SILVER</option><option value="GOLD">GOLD</option></select></div>
              <div className="form-group"><label>Balance</label><input className="form-input" type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></div>
              <button className="btn" type="submit">{editing ? 'Update' : 'Create'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
