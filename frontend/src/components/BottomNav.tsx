/**
 * Bottom navigation — shown on customer pages.
 * 5 tabs matching the static demo: Home, Finance & Loans, Kmer Diaspora, Chat, Profile.
 * Active state derived from the current route.
 */
import { NavLink } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';

export default function BottomNav() {
  const { t } = useI18n();
  const items = [
    { to: '/', icon: 'fa-house', label: t('nav.home'), end: true },
    { to: '/finance', icon: 'fa-wallet', label: t('nav.finance'), end: false },
    { to: '/diaspora', icon: 'fa-globe', label: t('nav.diaspora'), end: false },
    { to: '/chat', icon: 'fa-comments', label: t('nav.chat'), end: false },
    { to: '/profile', icon: 'fa-user', label: t('nav.profile'), end: false },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <i className={`fa-solid ${it.icon}`} />
          <span>{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
