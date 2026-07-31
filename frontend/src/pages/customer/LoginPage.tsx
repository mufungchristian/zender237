/**
 * Login page — gradient dark background, country code + phone + password, logo, demo hint.
 * Redirects admin/staff users to /admin, regular users to /.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import CountryCodeSelect from '../../components/CountryCodeSelect';

export default function LoginPage() {
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
    setErr('');
    setBusy(true);
    try {
      const fullPhone = `${cc}${phone.trim()}`;
      const u = await login(fullPhone, password);
      if (u.role === 'admin' || u.role === 'staff') nav('/admin');
      else nav('/');
    } catch (e: any) {
      setErr(e.response?.data?.error || e.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  function fill(p: string, pw: string) {
    // Parse the country code out of the demo numbers.
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
        <div className="ll-tag">{t('app.tagline')}</div>
      </div>

      <div className="login-card">
        <h2 style={{ marginBottom: 20, fontSize: 22 }}>{t('auth.login')}</h2>
        {err && <div className="login-error"><i className="fa-solid fa-circle-exclamation" /> {err}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>{t('auth.phone')}</label>
            <div className="phone-row">
              <CountryCodeSelect value={cc} onChange={(code) => setCc(code)} />
              <input className="form-input phone-input" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="6XX XXX XXX" inputMode="tel" required />
            </div>
          </div>
          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>
          <button className="btn" type="submit" disabled={busy} style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6)', color: '#0f172a' }}>
            {busy ? <span className="spinner" /> : <>{t('auth.loginBtn')} <i className="fa-solid fa-arrow-right" /></>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, color: '#94a3b8', fontSize: 13 }}>
          <Link to="/register" style={{ color: '#22d3ee' }}>{t('auth.register')}</Link>
        </p>

        <div className="login-demo">
          <b>{lang === 'fr' ? 'Identifiants démo — cliquez pour remplir :' : 'Demo credentials — click to fill:'}</b><br />
          <span onClick={() => fill('+22370000000', 'demo1234')} className="demo-line">
            👤 {lang === 'fr' ? 'Client' : 'Customer'}: +223 70000000 / demo1234
          </span>
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
