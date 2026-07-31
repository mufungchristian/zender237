/**
 * Root router — splits customer (mobile app shell) and admin (dashboard) layouts.
 */
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import LoginPage from './pages/customer/LoginPage';
import RegisterPage from './pages/customer/RegisterPage';
import HomePage from './pages/customer/HomePage';
import FinancePage from './pages/customer/FinancePage';
import KmerDiasporaPage from './pages/customer/KmerDiasporaPage';
import FaqPage from './pages/customer/FaqPage';
import ChatPage from './pages/customer/ChatPage';
import ProfilePage from './pages/customer/ProfilePage';
import TransactionsPage from './pages/customer/TransactionsPage';
import TransactionDetailPage from './pages/customer/TransactionDetailPage';

import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminNumbers from './pages/admin/AdminNumbers';
import AdminRates from './pages/admin/AdminRates';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBorrows from './pages/admin/AdminBorrows';
import AdminAudit from './pages/admin/AdminAudit';
import AdminSettings from './pages/admin/AdminSettings';
import AdminChat from './pages/admin/AdminChat';

import { JSX } from 'react';

/** Guard: requires any logged-in user. */
function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** Guard: requires admin or staff role. */
function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin' && user.role !== 'staff') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const loc = useLocation();
  const isAdmin = loc.pathname.startsWith('/admin');

  return (
    <Routes>
      {/* Customer auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Customer app */}
      <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
      <Route path="/finance" element={<RequireAuth><FinancePage /></RequireAuth>} />
      <Route path="/diaspora" element={<RequireAuth><KmerDiasporaPage /></RequireAuth>} />
      <Route path="/faq" element={<RequireAuth><FaqPage /></RequireAuth>} />
      <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      <Route path="/transactions" element={<RequireAuth><TransactionsPage /></RequireAuth>} />
      <Route path="/transactions/:id" element={<RequireAuth><TransactionDetailPage /></RequireAuth>} />

      {/* Admin auth */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index element={<AdminDashboard />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="numbers" element={<AdminNumbers />} />
        <Route path="rates" element={<AdminRates />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="borrows" element={<AdminBorrows />} />
        <Route path="chat" element={<AdminChat />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
