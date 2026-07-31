/**
 * Admin layout — responsive top bar + collapsible sidebar nav + outlet.
 * - Sidebar collapses into a hamburger drawer on narrow screens.
 * - Theme toggle (dark/light) + language toggle (EN/FR) + logo.
 */
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../context/I18nContext';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { t, lang, setLang } = useI18n();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const tabs = [
    { to: '/admin', label: t('adminNav.dashboard'), icon: 'fa-gauge', end: true },
    { to: '/admin/transactions', label: t('adminNav.transactions'), icon: 'fa-arrow-right-arrow-left', end: false },
    { to: '/admin/borrows', label: t('adminNav.borrows'), icon: 'fa-hand-holding-dollar', end: false },
    { to: '/admin/chat', label: t('adminNav.chat'), icon: 'fa-comments', end: false },
    { to: '/admin/numbers', label: t('adminNav.numbers'), icon: 'fa-mobile-screen', end: false },
    { to: '/admin/rates', label: t('adminNav.rates'), icon: 'fa-chart-line', end: false },
    { to: '/admin/users', label: t('adminNav.users'), icon: 'fa-users', end: false },
    { to: '/admin/audit', label: t('adminNav.audit'), icon: 'fa-list-check', end: false },
    { to: '/admin/settings', label: t('adminNav.settings'), icon: 'fa-gear', end: false },
  ];

  function doLogout() {
    logout();
    nav('/admin/login');
  }

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <div className="at-left">
          <button className="at-hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
            <i className="fa-solid fa-bars" />
          </button>
          <img src="/logo.png" alt="Zender237" className="at-logo" />
          <div className="at-brand">Zender<span>237</span> <small>Admin</small></div>
        </div>
        <div className="at-actions">
          <button onClick={() => setLang(lang === 'en' ? 'fr' : 'en')} className="at-icon-btn" title="Language">
            {lang === 'en' ? 'FR' : 'EN'}
          </button>
          <button onClick={toggle} className="at-icon-btn" title="Toggle theme">
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
          </button>
          <span className="at-user">{user?.full_name} <small>({user?.role})</small></span>
          <button className="btn sm red" onClick={doLogout} title="Logout"><i className="fa-solid fa-right-from-bracket" /></button>
        </div>
      </div>

      {/* Overlay for mobile drawer */}
      {open && <div className="admin-drawer-overlay" onClick={() => setOpen(false)} />}

      <div className="admin-body">
        <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
          {tabs.map((tb) => (
            <NavLink
              key={tb.to}
              to={tb.to}
              end={tb.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setOpen(false)}
            >
              <i className={`fa-solid ${tb.icon}`} /> <span>{tb.label}</span>
            </NavLink>
          ))}
        </aside>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
