/**
 * Chat routes — customer <-> admin/staff real-time messaging.
 *
 * Endpoints:
 *   GET    /api/chat/conversation        — get (or create) the caller's conversation
 *   GET    /api/chat/messages            — list messages in the caller's conversation
 *   POST   /api/chat/messages            — customer sends a message
 *   GET    /api/chat/conversations       — (staff/admin) list all conversations
 *   GET    /api/chat/conversations/:id   — (staff/admin) list messages in a conversation
 *   POST   /api/chat/conversations/:id   — (staff/admin) reply to a conversation
 *
 * Uses PostgreSQL directly (with Neon SSL) when DATABASE_URL is set,
 * otherwise an in-memory store keyed by user id.
 */
import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { config } from '../config';
import { requireAuth, requireStaff } from '../middleware/auth';

export const chatRouter = Router();

// ---- Storage abstraction (pg or in-memory) ----

interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_role: string;
  sender_name?: string;
  body: string;
  is_read: boolean;
  created_at: string;
}
interface ChatConversation {
  id: number;
  user_id: number;
  user_name?: string;
  user_phone?: string;
  subject?: string | null;
  last_message?: string;
  last_at?: string;
  unread_count?: number;
  created_at: string;
  updated_at: string;
}

let pool: Pool | null = null;
function getPool(): Pool | null {
  if (pool) return pool;
  if (config.useDatabase && config.databaseUrl) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseUrl.includes('render.com') || config.databaseUrl.includes('neon')
        ? { rejectUnauthorized: false }
        : undefined,
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

// In-memory fallback (when no DB configured).
const memConvos = new Map<number, ChatConversation>(); // user_id -> conversation
const memMessages = new Map<number, ChatMessage[]>(); // conversation_id -> messages
let memIdConv = 1;
let memIdMsg = 1;

function isoNow(): string { return new Date().toISOString(); }

// ---- Customer: get or create own conversation ----
chatRouter.get('/conversation', requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const p = getPool();
    if (p) {
      let r = await p.query('SELECT * FROM chat_conversations WHERE user_id = $1', [userId]);
      if (r.rows.length === 0) {
        const ins = await p.query(
          'INSERT INTO chat_conversations (user_id) VALUES ($1) RETURNING *',
          [userId],
        );
        r = ins;
      }
      const conv = r.rows[0];
      const u = await p.query('SELECT full_name, phone FROM users WHERE id = $1', [userId]);
      res.json({
        id: conv.id,
        user_id: conv.user_id,
        user_name: u.rows[0]?.full_name,
        user_phone: u.rows[0]?.phone,
        subject: conv.subject,
        created_at: typeof conv.created_at === 'string' ? conv.created_at : conv.created_at.toISOString(),
        updated_at: typeof conv.updated_at === 'string' ? conv.updated_at : conv.updated_at.toISOString(),
      });
      return;
    }
    // in-memory
    let conv = memConvos.get(userId);
    if (!conv) {
      conv = { id: memIdConv++, user_id: userId, subject: null, created_at: isoNow(), updated_at: isoNow() };
      memConvos.set(userId, conv);
      memMessages.set(conv.id, []);
    }
    res.json(conv);
  } catch (err) {
    console.error('[chat] getConversation error:', err);
    res.status(500).json({ error: 'Failed to load conversation' });
  }
});

// ---- Customer: list own messages ----
chatRouter.get('/messages', requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const p = getPool();
    if (p) {
      const conv = await p.query('SELECT id FROM chat_conversations WHERE user_id = $1', [userId]);
      if (conv.rows.length === 0) { res.json([]); return; }
      const convId = conv.rows[0].id;
      const msgs = await p.query(
        `SELECT m.*, u.full_name AS sender_name
         FROM chat_messages m LEFT JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = $1 ORDER BY m.created_at ASC`,
        [convId],
      );
      // mark incoming (from staff/admin) as read now
      await p.query(
        `UPDATE chat_messages SET is_read = true
         WHERE conversation_id = $1 AND sender_role IN ('staff','admin') AND is_read = false`,
        [convId],
      );
      res.json(msgs.rows.map(rowToMsg));
      return;
    }
    const conv = memConvos.get(userId);
    res.json(conv ? memMessages.get(conv.id) || [] : []);
  } catch (err) {
    console.error('[chat] listMessages error:', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// ---- Customer: send a message ----
chatRouter.post('/messages', requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const body = (req.body?.body || '').toString().trim();
  if (!body) { res.status(400).json({ error: 'Message body is required' }); return; }
  try {
    const p = getPool();
    if (p) {
      let conv = await p.query('SELECT id FROM chat_conversations WHERE user_id = $1', [userId]);
      let convId: number;
      if (conv.rows.length === 0) {
        const ins = await p.query(
          'INSERT INTO chat_conversations (user_id) VALUES ($1) RETURNING id',
          [userId],
        );
        convId = ins.rows[0].id;
      } else {
        convId = conv.rows[0].id;
      }
      const m = await p.query(
        `INSERT INTO chat_messages (conversation_id, sender_id, sender_role, body)
         VALUES ($1, $2, 'user', $3) RETURNING *`,
        [convId, userId, body],
      );
      await p.query('UPDATE chat_conversations SET updated_at = now() WHERE id = $1', [convId]);
      res.status(201).json(rowToMsg(m.rows[0]));
      return;
    }
    let conv = memConvos.get(userId);
    if (!conv) {
      conv = { id: memIdConv++, user_id: userId, subject: null, created_at: isoNow(), updated_at: isoNow() };
      memConvos.set(userId, conv);
      memMessages.set(conv.id, []);
    }
    const msg: ChatMessage = {
      id: memIdMsg++, conversation_id: conv.id, sender_id: userId, sender_role: 'user',
      body, is_read: false, created_at: isoNow(),
    };
    memMessages.get(conv.id)!.push(msg);
    conv.updated_at = isoNow();
    res.status(201).json(msg);
  } catch (err) {
    console.error('[chat] sendMessage error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ---- Staff/Admin: list all conversations ----
chatRouter.get('/conversations', requireAuth, requireStaff, async (_req: Request, res: Response) => {
  try {
    const p = getPool();
    if (p) {
      const r = await p.query(
        `SELECT c.*, u.full_name AS user_name, u.phone AS user_phone,
                (SELECT body FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                (SELECT created_at FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_at,
                (SELECT COUNT(*)::int FROM chat_messages WHERE conversation_id = c.id AND sender_role = 'user' AND is_read = false) AS unread_count
         FROM chat_conversations c
         LEFT JOIN users u ON u.id = c.user_id
         ORDER BY c.updated_at DESC`,
      );
      res.json(r.rows.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        user_name: row.user_name,
        user_phone: row.user_phone,
        subject: row.subject,
        last_message: row.last_message,
        last_at: row.last_at ? (typeof row.last_at === 'string' ? row.last_at : row.last_at.toISOString()) : null,
        unread_count: row.unread_count || 0,
        created_at: typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString(),
        updated_at: typeof row.updated_at === 'string' ? row.updated_at : row.updated_at.toISOString(),
      })));
      return;
    }
    res.json(Array.from(memConvos.values()).map((c) => {
      const msgs = memMessages.get(c.id) || [];
      const last = msgs[msgs.length - 1];
      return {
        ...c,
        last_message: last?.body,
        last_at: last?.created_at,
        unread_count: msgs.filter((m) => m.sender_role === 'user' && !m.is_read).length,
      };
    }));
  } catch (err) {
    console.error('[chat] listConversations error:', err);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// ---- Staff/Admin: list messages in a conversation ----
chatRouter.get('/conversations/:id', requireAuth, requireStaff, async (req: Request, res: Response) => {
  const convId = parseInt(req.params.id, 10);
  try {
    const p = getPool();
    if (p) {
      const msgs = await p.query(
        `SELECT m.*, u.full_name AS sender_name
         FROM chat_messages m LEFT JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = $1 ORDER BY m.created_at ASC`,
        [convId],
      );
      // mark user messages as read
      await p.query(
        `UPDATE chat_messages SET is_read = true WHERE conversation_id = $1 AND sender_role = 'user'`,
        [convId],
      );
      res.json(msgs.rows.map(rowToMsg));
      return;
    }
    res.json(memMessages.get(convId) || []);
  } catch (err) {
    console.error('[chat] getConversationMessages error:', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// ---- Staff/Admin: reply to a conversation ----
chatRouter.post('/conversations/:id', requireAuth, requireStaff, async (req: Request, res: Response) => {
  const convId = parseInt(req.params.id, 10);
  const body = (req.body?.body || '').toString().trim();
  if (!body) { res.status(400).json({ error: 'Message body is required' }); return; }
  const senderId = req.userId!;
  const role = req.user!.role;
  try {
    const p = getPool();
    if (p) {
      const conv = await p.query('SELECT id FROM chat_conversations WHERE id = $1', [convId]);
      if (conv.rows.length === 0) { res.status(404).json({ error: 'Conversation not found' }); return; }
      const m = await p.query(
        `INSERT INTO chat_messages (conversation_id, sender_id, sender_role, body, is_read)
         VALUES ($1, $2, $3, $4, true) RETURNING *`,
        [convId, senderId, role, body],
      );
      await p.query('UPDATE chat_conversations SET updated_at = now() WHERE id = $1', [convId]);
      res.status(201).json(rowToMsg(m.rows[0]));
      return;
    }
    const arr = memMessages.get(convId);
    if (!arr) { res.status(404).json({ error: 'Conversation not found' }); return; }
    const msg: ChatMessage = {
      id: memIdMsg++, conversation_id: convId, sender_id: senderId, sender_role: role,
      body, is_read: true, created_at: isoNow(),
    };
    arr.push(msg);
    res.status(201).json(msg);
  } catch (err) {
    console.error('[chat] reply error:', err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

function rowToMsg(r: any): ChatMessage {
  return {
    id: r.id,
    conversation_id: r.conversation_id,
    sender_id: r.sender_id,
    sender_role: r.sender_role,
    sender_name: r.sender_name,
    body: r.body,
    is_read: r.is_read,
    created_at: typeof r.created_at === 'string' ? r.created_at : r.created_at.toISOString(),
  };
}
