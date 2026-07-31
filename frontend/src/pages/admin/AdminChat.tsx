/**
 * Admin Chat page — staff/admin can see all customer conversations and reply.
 * Two-pane layout: conversation list (left) + messages (right).
 * Responsive: on narrow screens, selecting a conversation shows the message pane.
 */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../context/I18nContext';
import { chatApi, ChatConversation, ChatMessage } from '../../api/client';

export default function AdminChat() {
  const { t, lang } = useI18n();
  const [convos, setConvos] = useState<ChatConversation[]>([]);
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadConvos() {
    try {
      const list = await chatApi.listConversations();
      setConvos(list);
      // keep selected in sync (update unread etc.)
      if (selected) {
        const upd = list.find((c) => c.id === selected.id);
        if (upd) setSelected(upd);
      }
    } catch { /* ignore */ }
  }

  async function loadMessages(conv: ChatConversation) {
    try {
      const msgs = await chatApi.getMessages(conv.id);
      setMessages(msgs);
      setSelected(conv);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadConvos();
    const id = setInterval(loadConvos, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !selected || busy) return;
    setBusy(true); setText('');
    try {
      const msg = await chatApi.reply(selected.id, body);
      setMessages((prev) => [...prev, msg]);
      loadConvos();
    } catch { setText(body); }
    finally { setBusy(false); }
  }

  return (
    <div className="admin-chat">
      <div className={`ac-list ${selected ? 'hidden-mobile' : ''}`}>
        <h3 style={{ padding: '0 4px 12px' }}>
          <i className="fa-solid fa-comments" /> {lang === 'fr' ? 'Conversations' : 'Conversations'}
          {convos.some((c) => (c.unread_count || 0) > 0) && (
            <span className="ac-badge">{convos.reduce((s, c) => s + (c.unread_count || 0), 0)}</span>
          )}
        </h3>
        {convos.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
            {lang === 'fr' ? 'Aucune conversation.' : 'No conversations yet.'}
          </p>
        ) : (
          convos.map((c) => (
            <button
              key={c.id}
              className={`ac-conv ${selected?.id === c.id ? 'active' : ''}`}
              onClick={() => loadMessages(c)}
            >
              <div className="ac-avatar"><i className="fa-solid fa-user" /></div>
              <div className="ac-meta">
                <div className="ac-name">
                  {c.user_name || c.user_phone || `User #${c.user_id}`}
                  {(c.unread_count || 0) > 0 && <span className="ac-dot" />}
                </div>
                <div className="ac-last">{c.last_message || (lang === 'fr' ? 'Nouvelle conversation' : 'New conversation')}</div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className={`ac-pane ${selected ? '' : 'hidden-mobile'}`}>
        {!selected ? (
          <div className="ac-empty">
            <i className="fa-regular fa-comments" />
            <p>{lang === 'fr' ? 'Sélectionnez une conversation.' : 'Select a conversation.'}</p>
          </div>
        ) : (
          <>
            <div className="ac-pane-head">
              <button className="ac-back" onClick={() => setSelected(null)}><i className="fa-solid fa-arrow-left" /></button>
              <div>
                <div className="ac-name">{selected.user_name || selected.user_phone}</div>
                <div className="ac-phone">{selected.user_phone}</div>
              </div>
            </div>
            <div className="ac-messages" ref={scrollRef}>
              {messages.map((m) => (
                <div key={m.id} className={`chat-bubble ${m.sender_role === 'user' ? 'them' : 'me'}`}>
                  <div className="cb-body">{m.body}</div>
                  <div className="cb-time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
            </div>
            <form className="chat-input-row" onSubmit={send}>
              <input className="chat-input" value={text} onChange={(e) => setText(e.target.value)}
                placeholder={lang === 'fr' ? 'Répondre…' : 'Reply…'} />
              <button className="chat-send" type="submit" disabled={busy || !text.trim()}>
                {busy ? <span className="spinner" /> : <i className="fa-solid fa-paper-plane" />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
