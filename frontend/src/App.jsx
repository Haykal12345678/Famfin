import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import Goals from './pages/Goals';
import Reports from './pages/Reports';
import Members from './pages/Members';
import AuditLogs from './pages/AuditLogs';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/transaksi" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
      <Route path="/rekening" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
      <Route path="/kategori" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
      <Route path="/budget" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
      <Route path="/target-tabungan" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
      <Route path="/laporan" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/anggota" element={<ProtectedRoute><Members /></ProtectedRoute>} />
      <Route path="/audit-log" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
