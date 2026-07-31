/**
 * Admin settings — WhatsApp contact number, maintenance mode, other app settings.
 */
import { useEffect, useState } from 'react';
import { configApi } from '../../api/client';

export default function AdminSettings() {
  const [settings, setSettings] = useState<any>({ admin_whatsapp: '+237700000001', maintenance_mode: false });
  const [form, setForm] = useState({ admin_whatsapp: '', maintenance_mode: false });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    configApi.settings().then((s) => {
      setSettings(s);
      setForm({ admin_whatsapp: s.admin_whatsapp || '', maintenance_mode: !!s.maintenance_mode });
    }).catch(() => {});
  }, []);

  async function save() {
    setBusy(true); setMsg('');
    try {
      await configApi.updateSettings(form);
      setMsg('Settings saved');
    } catch (e: any) {
      setMsg(e.response?.data?.error || 'Failed');
    } finally { setBusy(false); }
  }

  return (
    <>
      <h1 className="page-title">Settings</h1>
      {msg && <div className="alert alert-success"><i className="fa-solid fa-check" /> {msg}</div>}

      <div className="card">
        <h3><i className="fa-brands fa-whatsapp" style={{ color: '#25d366' }} /> WhatsApp contact</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          This number is used for all WhatsApp redirects (borrow requests, chat, diaspora contact).
        </p>
        <div className="form-group">
          <label>Admin WhatsApp number</label>
          <input className="form-input" value={form.admin_whatsapp} onChange={(e) => setForm({ ...form, admin_whatsapp: e.target.value })} placeholder="+237..." />
        </div>
      </div>

      <div className="card">
        <h3><i className="fa-solid fa-screwdriver-wrench" /> Maintenance</h3>
        <div className="toggle-row">
          <span>Maintenance mode</span>
          <div className={`switch ${form.maintenance_mode ? 'on' : ''}`} onClick={() => setForm({ ...form, maintenance_mode: !form.maintenance_mode })} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          When enabled, the app shows a maintenance banner to customers.
        </p>
      </div>

      <button className="btn green" onClick={save} disabled={busy}>
        {busy ? <span className="spinner" /> : <><i className="fa-solid fa-floppy-disk" /> Save settings</>}
      </button>
    </>
  );
}
