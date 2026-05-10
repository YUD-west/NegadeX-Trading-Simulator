import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const user = useAuthStore(s => s.user);
  const initialized = useAuthStore(s => s.initialized);
  const loc = useLocation();
  if (!initialized) return <div className="p-12 text-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}
