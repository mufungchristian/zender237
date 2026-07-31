/**
 * Chat page — real in-app chat with admin/staff + FAQ section + WhatsApp fallback.
 *
 * - Loads the customer's conversation and message history.
 * - Customer can type and send messages; messages auto-refresh (poll every 4s).
 * - Quick FAQ accordion below the chat for common questions.
 * - WhatsApp button as a secondary contact option.
 */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../context/I18nContext';
import { chatApi, configApi, ChatMessage } from '../../api/client';
import BrandHeader from '../../components/BrandHeader';
import BottomNav from '../../components/BottomNav';

export default function ChatPage() {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [waNumber, setWaNumber] = useState('+237700000001');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const msgs = await chatApi.listMessages();
      setMessages(msgs);
    } catch { /* ignore poll errors */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    configApi.get().then((c) => setWaNumber(c.app.adminWhatsapp)).catch(() => {});
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setText('');
    try {
      const msg = await chatApi.send(body);
      setMessages((prev) => [...prev, msg]);
    } catch {
      setText(body); // restore on failure
    } finally { setBusy(false); }
  }

  const waUrl = `https://wa.me/${waNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
    lang === 'fr' ? 'Bonjour Zender237, j\'ai besoin d\'assistance.' : 'Hello Zender237, I need assistance.',
  )}`;

  const faqs = lang === 'fr' ? [
    { q: 'Comment déposer de l\'argent ?', a: 'Allez sur Accueil, appuyez sur Dépôt, choisissez le pays et le numéro de paiement, puis envoyez et téléversez le reçu.' },
    { q: 'Combien de temps prend un transfert ?', a: 'Les transferts sont généralement traités sous 24h après vérification du reçu par notre équipe.' },
    { q: 'Comment emprunter de l\'argent ?', a: 'Dans Finance & Prêts, choisissez Emprunter de l\'argent. Le taux dépend de votre niveau (BRONZE/SILVER/GOLD).' },
    { q: 'Quels pays sont supportés ?', a: 'Zender237 supporte le Mali (XOF), la Guinée (GNF) et le Cameroun (XAF).' },
  ] : [
    { q: 'How do I deposit money?', a: 'Go to Home, tap Deposit, choose the country and payment number, then send and upload the receipt.' },
    { q: 'How long does a transfer take?', a: 'Transfers are usually processed within 24 hours after our team verifies the receipt.' },
    { q: 'How do I borrow money?', a: 'In Finance & Loans, choose Borrow Money. The interest rate depends on your tier (BRONZE/SILVER/GOLD).' },
    { q: 'Which countries are supported?', a: 'Zender237 supports Mali (XOF), Guinea (GNF), and Cameroon (XAF).' },
  ];

  return (
    <div className="app-shell">
      <BrandHeader />
      <div className="page">
        <h1 className="page-title">{t('chat.title')}</h1>

        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-status">
              <span className="dot online" />
              <span>{lang === 'fr' ? 'Service client Zender237' : t('chat.service')}</span>
            </div>
          </div>

          <div className="chat-messages" ref={scrollRef}>
            {loading && messages.length === 0 ? (
              <div className="chat-empty-msg"><span className="spinner" /></div>
            ) : messages.length === 0 ? (
              <div className="chat-empty-msg">
                <i className="fa-regular fa-comments" style={{ fontSize: 34, color: 'var(--text-muted)' }} />
                <p>{lang === 'fr' ? 'Démarrez la conversation — notre équipe vous répondra.' : 'Start the conversation — our team will reply.'}</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`chat-bubble ${m.sender_role === 'user' ? 'me' : 'them'}`}>
                  <div className="cb-body">{m.body}</div>
                  <div className="cb-time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))
            )}
          </div>

          <form className="chat-input-row" onSubmit={send}>
            <input
              className="chat-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={lang === 'fr' ? 'Écrivez votre message…' : 'Type your message…'}
            />
            <button className="chat-send" type="submit" disabled={busy || !text.trim()} aria-label="Send">
              {busy ? <span className="spinner" /> : <i className="fa-solid fa-paper-plane" />}
            </button>
          </form>
        </div>

        <div className="section-head" style={{ marginTop: 20 }}>
          <h3>{lang === 'fr' ? 'Questions fréquentes' : 'Frequently asked questions'}</h3>
        </div>
        <div className="faq-list">
          {faqs.map((f, i) => (
            <div className={`faq-item ${openFaq === i ? 'open' : ''}`} key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <div className="faq-q">
                <span>{f.q}</span>
                <i className={`fa-solid fa-chevron-${openFaq === i ? 'up' : 'down'}`} />
              </div>
              {openFaq === i && <div className="faq-a">{f.a}</div>}
            </div>
          ))}
        </div>

        <div className="wa-banner" style={{ marginTop: 20 }}>
          <i className="fa-brands fa-whatsapp" />
          <h3>{lang === 'fr' ? 'Préférez WhatsApp ?' : 'Prefer WhatsApp?'}</h3>
          <p>{lang === 'fr' ? 'Discutez aussi avec nous directement sur WhatsApp.' : 'Chat with us directly on WhatsApp too.'}</p>
          <a href={waUrl} target="_blank" rel="noopener noreferrer">
            <i className="fa-brands fa-whatsapp" /> {waNumber}
          </a>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
