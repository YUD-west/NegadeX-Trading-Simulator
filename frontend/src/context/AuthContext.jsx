/**
 * Thin context wrapper around the Zustand auth store.
 * Provides a familiar useAuth() API for components that prefer Context.
 * The actual state lives in src/store/authStore.js.
 */
import { createContext, useContext } from 'react';
import { useAuthStore } from '../store/authStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useAuthStore();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx) return ctx;
  return useAuthStore();
}
