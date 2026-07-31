/**
 * Brand header — dark gradient header with Zender237 logo + tagline + theme toggle + notifications.
 * Renders identically in light and dark mode (intentionally dark per design).
 */
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function BrandHeader({ onOpenNotifications }: { onOpenNotifications?: () => void }) {
  const { t } = useI18n();
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const nav = useNavigate();

  return (
    <header className="brand-header">
      <div className="brand-row">
        <div className="brand-id">
          <img src="/logo.png" alt="Zender237" className="brand-logo" />
          <div>
            <div className="brand-name">{t('app.name')}</div>
            <div className="brand-tag">{t('app.tagline')}</div>
          </div>
        </div>
        <div className="brand-icons">
          <button onClick={toggle} aria-label="Toggle theme" title="Toggle theme">
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
          </button>
          <button onClick={() => onOpenNotifications?.()} aria-label="Notifications" title="Notifications">
            <i className="fa-solid fa-bell" />
          </button>
          <button onClick={() => nav('/profile')} aria-label="Profile" title="Profile">
            <i className="fa-solid fa-user" />
          </button>
        </div>
      </div>
      {user && (
        <div style={{ marginTop: 14, fontSize: 13, color: '#94a3b8' }}>
          {t('home.hello')}, <b style={{ color: '#f1f5f9' }}>{user.full_name}</b>
        </div>
      )}
    </header>
  );
}
