/**
 * Admin login — separate entry for staff/admin. Redirects to /admin dashboard.
 * Includes country code dropdown + logo.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import CountryCodeSelect from '../../components/CountryCodeSelect';

export default function AdminLogin() {
  const { t, lang, setLang } = useI18n();
  const { login } = useAuth();
  const nav = useNavigate();
  const [cc, setCc] = useState('+237');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const fullPhone = `${cc}${phone.trim()}`;
      const u = await login(fullPhone, password);
      if (u.role === 'admin' || u.role === 'staff') nav('/admin');
      else { setErr(lang === 'fr' ? 'Accès refusé — admin/staff uniquement' : 'Access denied — admin/staff only'); }
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Login failed');
    } finally { setBusy(false); }
  }

  function fill(p: string, pw: string) {
    const m = p.match(/^(\+\d{3})(.*)$/);
    if (m) { setCc(m[1]); setPhone(m[2]); }
    else { setPhone(p); }
    setPassword(pw);
  }

  return (
    <div className="login-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <img src="/logo.png" alt="Zender237" className="login-page-logo" />
        <button onClick={() => setLang(lang === 'en' ? 'fr' : 'en')} className="lang-toggle">
          {lang === 'en' ? 'Français' : 'English'}
        </button>
      </div>
      <div className="login-logo">
        <div className="ll-name">{t('app.name')}</div>
        <div className="ll-tag">{lang === 'fr' ? 'Panel Admin' : 'Admin Panel'}</div>
      </div>
      <div className="login-card">
        <h2 style={{ marginBottom: 20, fontSize: 22 }}>{lang === 'fr' ? 'Connexion Staff' : 'Staff Login'}</h2>
        {err && <div className="login-error"><i className="fa-solid fa-circle-exclamation" /> {err}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>{t('auth.phone')}</label>
            <div className="phone-row">
              <CountryCodeSelect value={cc} onChange={(code) => setCc(code)} />
              <input className="form-input phone-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="700000001" inputMode="tel" required />
            </div>
          </div>
          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn" type="submit" disabled={busy} style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6)', color: '#0f172a' }}>
            {busy ? <span className="spinner" /> : <>{t('auth.loginBtn')} <i className="fa-solid fa-arrow-right" /></>}
          </button>
        </form>
        <div className="login-demo">
          <b>{lang === 'fr' ? 'Démo :' : 'Demo:'}</b><br />
          <span onClick={() => fill('+237700000001', 'admin123')} className="demo-line">
            🛡️ {lang === 'fr' ? 'Admin' : 'Admin'}: +237 700000001 / admin123
          </span>
          <span onClick={() => fill('+237700000002', 'partner123')} className="demo-line">
            🤝 {lang === 'fr' ? 'Partenaire' : 'Partner'}: +237 700000002 / partner123
          </span>
        </div>
      </div>
    </div>
  );
}
