/**
 * API client — thin axios wrapper with JWT token handling.
 * Reads the backend URL from Vite env or falls back to same-origin (proxy).
 */
import axios from 'axios';
import type { SafeUser, Transaction, PaymentNumber, ExchangeRate, Tariff, BorrowRequest, NotificationLog, AppConfig } from '../types';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL, timeout: 30000 });

// Attach token to every request.
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('zender_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Auto-logout on 401.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // Don't redirect if we're already on login
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('zender_token');
        localStorage.removeItem('zender_user');
      }
    }
    return Promise.reject(err);
  },
);

// ---- Auth ----
export const authApi = {
  login: (phone: string, password: string) =>
    api.post<{ token: string; user: SafeUser }>('/auth/login', { phone, password }).then((r) => r.data),
  register: (data: { full_name: string; phone: string; password: string; email?: string; country: string }) =>
    api.post<{ token: string; user: SafeUser }>('/auth/register', data).then((r) => r.data),
  me: () => api.get<{ user: SafeUser }>('/auth/me').then((r) => r.data.user),
  changePassword: (current_password: string, new_password: string) =>
    api.put('/auth/password', { current_password, new_password }),
  setDeviceToken: (token: string) => api.put('/auth/device-token', { token }),
};

// ---- Users ----
export const usersApi = {
  updateProfile: (data: any) => api.patch<{ user: SafeUser }>('/users/me', data).then((r) => r.data.user),
  balance: () => api.get<{ balance: number; currency: string }>('/users/me/balance').then((r) => r.data),
};

// ---- Transactions ----
export const txApi = {
  deposit: (data: any) => api.post<Transaction>('/transactions/deposit', data).then((r) => r.data),
  transfer: (data: any) => api.post<Transaction>('/transactions/transfer', data).then((r) => r.data),
  withdraw: (data: any) => api.post<Transaction>('/transactions/withdraw', data).then((r) => r.data),
  list: (params?: any) => api.get<{ transactions: Transaction[] }>('/transactions', { params }).then((r) => r.data.transactions),
  detail: (id: number) => api.get(`/transactions/${id}`).then((r) => r.data),
  uploadProof: (id: number, data: { proof_url: string; proof_reference?: string; proof_sender_number?: string }) =>
    api.post(`/transactions/${id}/proof`, data).then((r) => r.data),
  updateStatus: (id: number, status: string, note?: string) =>
    api.patch(`/transactions/${id}/status`, { status, note }).then((r) => r.data),
  statusMeta: () => api.get('/transactions/meta/statuses').then((r) => r.data.statuses),
};

// ---- Borrow ----
export const borrowApi = {
  money: (data: any) => api.post('/borrow/money', data).then((r) => r.data),
  flightTicket: (data: any) => api.post('/borrow/flight-ticket', data).then((r) => r.data),
  list: (params?: any) => api.get<{ borrows: BorrowRequest[] }>('/borrow', { params }).then((r) => r.data.borrows),
  detail: (id: number) => api.get(`/borrow/${id}`).then((r) => r.data.borrow),
  updateStatus: (id: number, status: string, note?: string) =>
    api.patch(`/borrow/${id}/status`, { status, note }).then((r) => r.data),
  whatsapp: (id: number) => api.get(`/borrow/whatsapp/${id}`).then((r) => r.data.whatsapp_redirect),
};

// ---- Numbers / Rates / Tariffs ----
export const numbersApi = {
  list: (country?: string) => api.get<{ numbers: PaymentNumber[] }>('/numbers', { params: { country } }).then((r) => r.data.numbers),
  create: (data: any) => api.post('/numbers', data).then((r) => r.data),
  update: (id: number, data: any) => api.patch(`/numbers/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/numbers/${id}`),
};

export const ratesApi = {
  list: () => api.get<{ rates: ExchangeRate[] }>('/rates').then((r) => r.data.rates),
  upsert: (data: any) => api.put('/rates', data).then((r) => r.data),
  tariffs: () => api.get<{ tariffs: Tariff[] }>('/rates/tariffs').then((r) => r.data.tariffs),
  upsertTariff: (data: any) => api.put('/rates/tariffs', data).then((r) => r.data),
  removeTariff: (id: number) => api.delete(`/rates/tariffs/${id}`),
  quote: (amount: number, from: string, to: string) =>
    api.get('/rates/quote', { params: { amount, from, to } }).then((r) => r.data),
};

// ---- Notifications / Audit ----
export const miscApi = {
  notifications: () => api.get<{ notifications: NotificationLog[] }>('/notifications').then((r) => r.data.notifications),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
  auditLogs: (limit = 100) => api.get('/audit-logs', { params: { limit } }).then((r) => r.data.logs),
};

// ---- Admin ----
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard').then((r) => r.data),
  users: () => api.get<{ users: SafeUser[] }>('/admin/users').then((r) => r.data.users),
  createUser: (data: any) => api.post('/admin/users', data).then((r) => r.data),
  updateUser: (id: number, data: any) => api.patch(`/admin/users/${id}`, data).then((r) => r.data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
};

// ---- Settings / Config ----
export const configApi = {
  get: () => api.get<AppConfig>('/config').then((r) => r.data),
  settings: () => api.get('/settings').then((r) => r.data),
  updateSettings: (data: any) => api.patch('/settings', data).then((r) => r.data),
};

// ---- Uploads ----
export const uploadApi = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
};

// ---- Chat ----
export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_role: string;
  sender_name?: string;
  body: string;
  is_read: boolean;
  created_at: string;
}
export interface ChatConversation {
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

export const chatApi = {
  // Customer side
  getConversation: () => api.get('/chat/conversation').then((r) => r.data) as Promise<ChatConversation>,
  listMessages: () => api.get<ChatMessage[]>('/chat/messages').then((r) => r.data) as Promise<ChatMessage[]>,
  send: (body: string) => api.post('/chat/messages', { body }).then((r) => r.data) as Promise<ChatMessage>,
  // Admin / staff side
  listConversations: () => api.get<ChatConversation[]>('/chat/conversations').then((r) => r.data) as Promise<ChatConversation[]>,
  getMessages: (convId: number) => api.get<ChatMessage[]>(`/chat/conversations/${convId}`).then((r) => r.data) as Promise<ChatMessage[]>,
  reply: (convId: number, body: string) => api.post(`/chat/conversations/${convId}`, { body }).then((r) => r.data) as Promise<ChatMessage>,
};

// ---- Auth helpers ----
export function saveSession(token: string, user: SafeUser) {
  localStorage.setItem('zender_token', token);
  localStorage.setItem('zender_user', JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem('zender_token');
  localStorage.removeItem('zender_user');
}
export function getStoredUser(): SafeUser | null {
  const raw = localStorage.getItem('zender_user');
  return raw ? JSON.parse(raw) : null;
}
export function getToken(): string | null {
  return localStorage.getItem('zender_token');
}

// ---- WhatsApp OTP verification ----
export const otpApi = {
  send: (phone: string) => api.post('/auth/whatsapp/send', { phone }).then((r) => r.data),
  verify: (phone: string, code: string) => api.post('/auth/whatsapp/verify', { phone, code }).then((r) => r.data),
};
