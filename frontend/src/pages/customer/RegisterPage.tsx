/**
 * Register page — new customer account creation.
 * Includes country code dropdown + WhatsApp OTP verification step.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { otpApi } from '../../api/client';
import CountryCodeSelect from '../../components/CountryCodeSelect';

export default function RegisterPage() {
  const { t, lang, setLang } = useI18n();
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: '', phone: '', password: '', email: '' });
  const [cc, setCc] = useState('+237');
  const [country, setCountry] = useState('CM');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // OTP step
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState('');
  const [otpMsg, setOtpMsg] = useState('');
  const [waLink, setWaLink] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);

  const fullPhone = `${cc}${form.phone.trim()}`;

  async function requestCode() {
    setErr('');
    if (!form.phone.trim()) { setErr(lang === 'fr' ? 'Entrez votre numéro.' : 'Enter your phone number.'); return; }
    setOtpBusy(true);
    try {
      const res = await otpApi.send(fullPhone);
      setOtpMsg(lang === 'fr' ? 'Code envoyé ! Vérifiez WhatsApp ou demandez le code à notre équipe.' : 'Code sent! Check WhatsApp or ask our team for the code.');
      setWaLink(res.whatsappLink || '');
      setStep('otp');
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Failed to send code');
    } finally { setOtpBusy(false); }
  }

  async function verifyAndRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (otp.length !== 6) { setErr(lang === 'fr' ? 'Entrez le code à 6 chiffres.' : 'Enter the 6-digit code.'); return; }
    setBusy(true);
    try {
      await otpApi.verify(fullPhone, otp);
      await register({
        full_name: form.full_name,
        phone: fullPhone,
        password: form.password,
        email: form.email || undefined,
        country: country as any,
      });
      nav('/');
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Verification failed');
    } finally { setBusy(false); }
  }

  function backToForm() {
    setStep('form');
    setOtp('');
    setOtpMsg('');
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

      {step === 'form' ? (
        <div className="login-card">
          <h2 style={{ marginBottom: 20, fontSize: 22 }}>{t('auth.register')}</h2>
          {err && <div className="login-error"><i className="fa-solid fa-circle-exclamation" /> {err}</div>}
          <form onSubmit={(e) => { e.preventDefault(); requestCode(); }}>
            <div className="form-group">
              <label>{t('auth.fullName')}</label>
              <input className="form-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>{t('auth.phone')}</label>
              <div className="phone-row">
                <CountryCodeSelect value={cc} onChange={(code, ctry) => { setCc(code); setCountry(ctry); }} />
                <input className="form-input phone-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="6XX XXX XXX" inputMode="tel" required />
              </div>
            </div>
            <div className="form-group">
              <label>{t('auth.email')}</label>
              <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t('auth.password')}</label>
              <input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button className="btn" type="submit" disabled={otpBusy} style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6)', color: '#0f172a' }}>
              {otpBusy ? <span className="spinner" /> : <>{t('auth.sendCode')} <i className="fa-brands fa-whatsapp" /></>}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 16, color: '#94a3b8', fontSize: 13 }}>
            <Link to="/login" style={{ color: '#22d3ee' }}>{t('auth.login')}</Link>
          </p>
        </div>
      ) : (
        <div className="login-card">
          <h2 style={{ marginBottom: 12, fontSize: 22 }}>{t('auth.otpTitle')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>{t('auth.otpSubtitle')}</p>
          {otpMsg && <div className="login-success"><i className="fa-solid fa-circle-check" /> {otpMsg}</div>}
          {err && <div className="login-error"><i className="fa-solid fa-circle-exclamation" /> {err}</div>}
          <div className="otp-box">
            <label>{t('auth.enterCode')}</label>
            <input className="form-input otp-input" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t('auth.otpPlaceholder')} inputMode="numeric" maxLength={6} />
          </div>
          <button className="btn" onClick={verifyAndRegister} disabled={busy} style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6)', color: '#0f172a' }}>
            {busy ? <span className="spinner" /> : <>{t('auth.verify')} <i className="fa-solid fa-check" /></>}
          </button>
          {waLink && (
            <a className="wa-link" href={waLink} target="_blank" rel="noopener noreferrer">
              <i className="fa-brands fa-whatsapp" /> {t('auth.openWhatsapp')}
            </a>
          )}
          <div className="otp-actions">
            <button className="link-btn" onClick={requestCode}>{t('auth.resend')}</button>
            <button className="link-btn" onClick={backToForm}>{t('common.back')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
