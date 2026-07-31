/**
 * Profile page — user info, tier, language toggle, dark mode toggle, change password, logout.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { useTheme } from '../../context/ThemeContext';
import { usersApi, authApi } from '../../api/client';
import BrandHeader from '../../components/BrandHeader';
import BottomNav from '../../components/BottomNav';

export default function ProfilePage() {
  const { user, logout, setUser } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();

  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ full_name: user?.full_name ?? '', email: user?.email ?? '', whatsapp: user?.whatsapp ?? '' });
  const [pwForm, setPwForm] = useState({ current: '', next: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function saveProfile() {
    setErr(''); setMsg(''); setBusy(true);
    try {
      const u = await usersApi.updateProfile(form);
      setUser(u);
      setMsg('Profile updated');
      setEdit(false);
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Update failed');
    } finally { setBusy(false); }
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setMsg(''); setBusy(true);
    try {
      await authApi.changePassword(pwForm.current, pwForm.next);
      setMsg('Password changed');
      setPwForm({ current: '', next: '' });
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Password change failed');
    } finally { setBusy(false); }
  }

  function doLogout() {
    logout();
    nav('/login');
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'staff';

  return (
    <div className="app-shell">
      <BrandHeader />
      <div className="page">
        <h1 className="page-title">{t('profile.title')}</h1>

        {/* User card */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #22d3ee, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28, color: '#fff', fontWeight: 800 }}>
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <h3 style={{ fontSize: 18 }}>{user?.full_name}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.phone}</p>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <span className={`badge badge-${user?.tier === 'GOLD' ? 'amber' : user?.tier === 'SILVER' ? 'blue' : 'gray'}`}>{user?.tier}</span>
            <span className="badge badge-gray">{user?.country}</span>
            {isAdmin && <span className="badge badge-red">{user?.role}</span>}
          </div>
        </div>

        {msg && <div className="alert alert-success"><i className="fa-solid fa-check" /> {msg}</div>}
        {err && <div className="alert alert-error"><i className="fa-solid fa-circle-exclamation" /> {err}</div>}

        {/* Admin link */}
        {isAdmin && (
          <button className="btn outline" onClick={() => nav('/admin')} style={{ marginBottom: 14 }}>
            <i className="fa-solid fa-shield-halved" /> Admin Dashboard
          </button>
        )}

        {/* Profile edit */}
        <div className="card">
          <h3>{lang === 'fr' ? 'Informations personnelles' : 'Personal info'}</h3>
          {!edit ? (
            <>
              <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Name</span><b>{user?.full_name}</b></div>
              <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Email</span><b>{user?.email || '—'}</b></div>
              <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>WhatsApp</span><b>{user?.whatsapp || '—'}</b></div>
              <button className="btn outline sm" style={{ marginTop: 12 }} onClick={() => setEdit(true)}>{lang === 'fr' ? 'Modifier' : 'Edit'}</button>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Full name</label>
                <input className="form-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>WhatsApp</label>
                <input className="form-input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn sm" onClick={saveProfile} disabled={busy}>{busy ? '...' : t('common.submit')}</button>
                <button className="btn outline sm" onClick={() => setEdit(false)}>{t('common.cancel')}</button>
              </div>
            </>
          )}
        </div>

        {/* Change password */}
        <div className="card">
          <h3>{lang === 'fr' ? 'Changer le mot de passe' : 'Change password'}</h3>
          <form onSubmit={changePw}>
            <div className="form-group">
              <label>{lang === 'fr' ? 'Mot de passe actuel' : 'Current password'}</label>
              <input className="form-input" type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>{lang === 'fr' ? 'Nouveau mot de passe' : 'New password'}</label>
              <input className="form-input" type="password" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} required />
            </div>
            <button className="btn outline sm" type="submit" disabled={busy}>{busy ? '...' : (lang === 'fr' ? 'Changer' : 'Change')}</button>
          </form>
        </div>

        {/* Settings */}
        <div className="card">
          <h3>{t('profile.settings')}</h3>
          <div className="toggle-row">
            <span>{lang === 'fr' ? 'Langue' : 'Language'}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`btn sm ${lang === 'en' ? '' : 'outline'}`} onClick={() => setLang('en')}>EN</button>
              <button className={`btn sm ${lang === 'fr' ? '' : 'outline'}`} onClick={() => setLang('fr')}>FR</button>
            </div>
          </div>
          <div className="toggle-row">
            <span><i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`} /> {theme === 'dark' ? (lang === 'fr' ? 'Mode sombre' : 'Dark mode') : (lang === 'fr' ? 'Mode clair' : 'Light mode')}</span>
            <div className={`switch ${theme === 'dark' ? 'on' : ''}`} onClick={toggle} />
          </div>
        </div>

        <button className="btn red" onClick={doLogout}>
          <i className="fa-solid fa-right-from-bracket" /> {t('profile.logout')}
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
