/**
 * KmerDiaspora page — diaspora services matching the static demo:
 *   Need a position, Need a driver, Quests, Active Quests.
 * Each service opens a small form; submissions redirect to WhatsApp (admin relays).
 */
import { useState, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';
import { configApi } from '../../api/client';
import BrandHeader from '../../components/BrandHeader';
import BottomNav from '../../components/BottomNav';

type Service = 'position' | 'driver' | 'quests' | 'active' | null;

export default function KmerDiasporaPage() {
  const { t, lang } = useI18n();
  const [waNumber, setWaNumber] = useState('+237700000001');
  const [active, setActive] = useState<Service>(null);

  // Position form
  const [pos, setPos] = useState({ title: '', location: '', details: '' });
  // Driver form
  const [drv, setDrv] = useState({ location: '', time: '', details: '' });
  // Quests (demo data)
  const [acceptedQuests, setAcceptedQuests] = useState<number[]>([]);

  useEffect(() => {
    configApi.get().then((c) => setWaNumber(c.app.adminWhatsapp)).catch(() => {});
  }, []);

  const waLink = (msg: string) =>
    `https://wa.me/${waNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;

  const quests = lang === 'fr' ? [
    { id: 1, icon: 'fa-cart-shopping', title: 'Courses au marché', reward: '5 000 XAF', desc: 'Acheter des denrées et livrer à un membre de la diaspora.' },
    { id: 2, icon: 'fa-id-card', title: 'Retrait de documents', reward: '3 000 XAF', desc: 'Récupérer des documents administratifs en ville.' },
    { id: 3, icon: 'fa-truck', title: 'Transport de colis', reward: '8 000 XAF', desc: 'Acheminer un colis vers un village.' },
    { id: 4, icon: 'fa-hand-holding-medical', title: 'Accompagnement médical', reward: '10 000 XAF', desc: 'Accompagner un parent à un rendez-vous médical.' },
  ] : [
    { id: 1, icon: 'fa-cart-shopping', title: 'Market shopping', reward: '5 000 XAF', desc: 'Buy groceries and deliver to a diaspora member.' },
    { id: 2, icon: 'fa-id-card', title: 'Document pickup', reward: '3 000 XAF', desc: 'Collect administrative documents in town.' },
    { id: 3, icon: 'fa-truck', title: 'Parcel transport', reward: '8 000 XAF', desc: 'Deliver a parcel to a village.' },
    { id: 4, icon: 'fa-hand-holding-medical', title: 'Medical escort', reward: '10 000 XAF', desc: 'Escort a relative to a medical appointment.' },
  ];

  function submitPosition(e: React.FormEvent) {
    e.preventDefault();
    const msg = lang === 'fr'
      ? `Bonjour Zender237, je cherche une position.\nIntitulé: ${pos.title}\nLieu: ${pos.location}\nDétails: ${pos.details}`
      : `Hello Zender237, I'm looking for a position.\nTitle: ${pos.title}\nLocation: ${pos.location}\nDetails: ${pos.details}`;
    window.open(waLink(msg), '_blank');
  }
  function submitDriver(e: React.FormEvent) {
    e.preventDefault();
    const msg = lang === 'fr'
      ? `Bonjour Zender237, j'ai besoin d'un conducteur.\nLieu: ${drv.location}\nDate/heure: ${drv.time}\nDétails: ${drv.details}`
      : `Hello Zender237, I need a driver.\nLocation: ${drv.location}\nDate/time: ${drv.time}\nDetails: ${drv.details}`;
    window.open(waLink(msg), '_blank');
  }

  const services = [
    { key: 'position' as Service, icon: 'fa-briefcase', title: t('diaspora.position'), desc: t('diaspora.positionDesc'), btn: t('diaspora.request') },
    { key: 'driver' as Service, icon: 'fa-car', title: t('diaspora.driver'), desc: t('diaspora.driverDesc'), btn: t('diaspora.request') },
    { key: 'quests' as Service, icon: 'fa-list-check', title: t('diaspora.quests'), desc: t('diaspora.questsDesc'), btn: t('diaspora.browse') },
    { key: 'active' as Service, icon: 'fa-flag-checkered', title: t('diaspora.activeQuests'), desc: t('diaspora.activeQuestsDesc'), btn: t('diaspora.track') },
  ];

  return (
    <div className="app-shell">
      <BrandHeader />
      <div className="page">
        <h1 className="page-title">{t('diaspora.title')}</h1>

        <div className="diaspora-hero">
          <i className="fa-solid fa-globe" />
          <h2>{t('diaspora.hero')}</h2>
          <p>{t('diaspora.heroSub')}</p>
        </div>

        <div className="section-head"><h3>{t('diaspora.services')}</h3></div>
        <div className="diaspora-grid">
          {services.map((s) => (
            <button className="diaspora-card" key={s.key} onClick={() => setActive(s.key)}>
              <i className={`fa-solid ${s.icon}`} />
              <div className="dc-title">{s.title}</div>
              <div className="dc-desc">{s.desc}</div>
              <span className="dc-btn">{s.btn} <i className="fa-solid fa-arrow-right" /></span>
            </button>
          ))}
        </div>

        {/* ---- Position form ---- */}
        {active === 'position' && (
          <div className="modal-overlay" onClick={() => setActive(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3><i className="fa-solid fa-briefcase" /> {t('diaspora.position')}</h3>
                <button onClick={() => setActive(null)}><i className="fa-solid fa-xmark" /></button>
              </div>
              <form onSubmit={submitPosition}>
                <div className="form-group">
                  <label>{t('diaspora.jobTitle')}</label>
                  <input className="form-input" value={pos.title} onChange={(e) => setPos({ ...pos, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>{t('diaspora.location')}</label>
                  <input className="form-input" value={pos.location} onChange={(e) => setPos({ ...pos, location: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>{t('diaspora.details')}</label>
                  <textarea className="form-input" rows={3} value={pos.details} onChange={(e) => setPos({ ...pos, details: e.target.value })} />
                </div>
                <button className="btn wa-btn" type="submit">
                  <i className="fa-brands fa-whatsapp" /> {t('diaspora.submit')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ---- Driver form ---- */}
        {active === 'driver' && (
          <div className="modal-overlay" onClick={() => setActive(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3><i className="fa-solid fa-car" /> {t('diaspora.driver')}</h3>
                <button onClick={() => setActive(null)}><i className="fa-solid fa-xmark" /></button>
              </div>
              <form onSubmit={submitDriver}>
                <div className="form-group">
                  <label>{t('diaspora.driverLocation')}</label>
                  <input className="form-input" value={drv.location} onChange={(e) => setDrv({ ...drv, location: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>{t('diaspora.driverTime')}</label>
                  <input className="form-input" type="datetime-local" value={drv.time} onChange={(e) => setDrv({ ...drv, time: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>{t('diaspora.details')}</label>
                  <textarea className="form-input" rows={3} value={drv.details} onChange={(e) => setDrv({ ...drv, details: e.target.value })} />
                </div>
                <button className="btn wa-btn" type="submit">
                  <i className="fa-brands fa-whatsapp" /> {t('diaspora.submit')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ---- Quests browse ---- */}
        {active === 'quests' && (
          <div className="modal-overlay" onClick={() => setActive(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3><i className="fa-solid fa-list-check" /> {t('diaspora.quests')}</h3>
                <button onClick={() => setActive(null)}><i className="fa-solid fa-xmark" /></button>
              </div>
              <div className="quest-list">
                {quests.map((q) => (
                  <div className="quest-item" key={q.id}>
                    <i className={`fa-solid ${q.icon}`} />
                    <div className="qi-body">
                      <div className="qi-title">{q.title} <span className="qi-reward">{q.reward}</span></div>
                      <div className="qi-desc">{q.desc}</div>
                    </div>
                    {acceptedQuests.includes(q.id) ? (
                      <span className="qi-accepted"><i className="fa-solid fa-check" /> {lang === 'fr' ? 'Acceptée' : 'Accepted'}</span>
                    ) : (
                      <button className="btn sm" onClick={() => setAcceptedQuests([...acceptedQuests, q.id])}>
                        {lang === 'fr' ? 'Accepter' : 'Accept'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---- Active quests ---- */}
        {active === 'active' && (
          <div className="modal-overlay" onClick={() => setActive(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3><i className="fa-solid fa-flag-checkered" /> {t('diaspora.activeQuests')}</h3>
                <button onClick={() => setActive(null)}><i className="fa-solid fa-xmark" /></button>
              </div>
              {acceptedQuests.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 24 }}>{t('diaspora.noActiveQuests')}</p>
              ) : (
                <div className="quest-list">
                  {quests.filter((q) => acceptedQuests.includes(q.id)).map((q) => (
                    <div className="quest-item" key={q.id}>
                      <i className={`fa-solid ${q.icon}`} />
                      <div className="qi-body">
                        <div className="qi-title">{q.title} <span className="qi-reward">{q.reward}</span></div>
                        <div className="qi-desc">{q.desc}</div>
                      </div>
                      <span className="badge green">{lang === 'fr' ? 'En cours' : 'In progress'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="wa-banner" style={{ marginTop: 20 }}>
          <i className="fa-brands fa-whatsapp" />
          <h3>{lang === 'fr' ? "Besoin d'aide ?" : 'Need help?'}</h3>
          <p>{lang === 'fr' ? 'Contactez notre équipe diaspora sur WhatsApp.' : 'Contact our diaspora team on WhatsApp.'}</p>
          <a href={waLink(lang === 'fr' ? 'Bonjour Zender237' : 'Hello Zender237')} target="_blank" rel="noopener noreferrer"><i className="fa-brands fa-whatsapp" /> {waNumber}</a>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
