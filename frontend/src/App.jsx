import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import CommandPalette from './components/CommandPalette';
import { useAuthStore } from './store/authStore';
import { useMarketStore } from './store/marketStore';
import { useNotificationStore } from './store/notificationStore';

const Landing      = lazy(() => import('./pages/Landing'));
const Login        = lazy(() => import('./pages/Login'));
const Register     = lazy(() => import('./pages/Register'));
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Market       = lazy(() => import('./pages/Market'));
const Trade        = lazy(() => import('./pages/Trade'));
const Portfolio    = lazy(() => import('./pages/Portfolio'));
const Leaderboard  = lazy(() => import('./pages/Leaderboard'));
const Profile      = lazy(() => import('./pages/Profile'));
const Admin        = lazy(() => import('./pages/Admin'));
const Heatmap      = lazy(() => import('./pages/Heatmap'));
const Compare      = lazy(() => import('./pages/Compare'));
const ProSuite     = lazy(() => import('./pages/ProSuite'));
const NotFound     = lazy(() => import('./pages/NotFound'));

function Loader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
          <div className="absolute inset-0 rounded-full bg-cyan-400/15 blur-xl" />
        </div>
        <div className="eyebrow text-slate-500">Booting NegadeX…</div>
      </div>
    </div>
  );
}

export default function App() {
  const hydrate = useAuthStore(s => s.hydrate);
  const initialized = useAuthStore(s => s.initialized);
  const user = useAuthStore(s => s.user);
  const fetchInitial = useMarketStore(s => s.fetchInitial);
  const fetchPortfolio = useMarketStore(s => s.fetchPortfolio);
  const connect = useMarketStore(s => s.connect);
  const bindNotifications = useNotificationStore(s => s.bind);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (!initialized) return;
    fetchInitial();
  }, [initialized, fetchInitial]);

  // Re-attach socket handlers whenever auth state changes
  // (login/logout creates a new underlying connection so user-rooms work).
  useEffect(() => {
    if (!initialized) return;
    connect();
    bindNotifications();
  }, [initialized, user, connect, bindNotifications]);

  useEffect(() => {
    if (user) fetchPortfolio();
  }, [user, fetchPortfolio]);

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/"             element={<Landing />} />
          <Route path="/login"        element={<Login />} />
          <Route path="/register"     element={<Register />} />

          <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/market"       element={<ProtectedRoute><Market /></ProtectedRoute>} />
          <Route path="/trade"        element={<ProtectedRoute><Trade /></ProtectedRoute>} />
          <Route path="/trade/:symbol" element={<ProtectedRoute><Trade /></ProtectedRoute>} />
          <Route path="/portfolio"    element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
          <Route path="/leaderboard"  element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/heatmap"      element={<ProtectedRoute><Heatmap /></ProtectedRoute>} />
          <Route path="/compare"      element={<ProtectedRoute><Compare /></ProtectedRoute>} />
          <Route path="/pro"          element={<ProtectedRoute><ProSuite /></ProtectedRoute>} />
          <Route path="/profile"      element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin"        element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />

          <Route path="*"             element={<NotFound />} />
        </Route>
      </Routes>
      <CommandPalette />
    </Suspense>
  );
}
