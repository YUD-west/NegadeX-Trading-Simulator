import { create } from 'zustand';
import { auth } from '../services/api';
import { disconnectSocket, refreshSocket } from '../services/socket';

const TOKEN_KEY = 'negadex:token';
const LEGACY_TOKEN_KEY = 'pulse:token';

(function migrateLegacyToken() {
  try {
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacy && !localStorage.getItem(TOKEN_KEY)) {
      localStorage.setItem(TOKEN_KEY, legacy);
    }
    if (legacy) localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {}
})();

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY) || null,
  loading: false,
  initialized: false,

  async login(email, password) {
    set({ loading: true });
    try {
      const data = await auth.login({ email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      set({ user: data.user, token: data.token, loading: false });
      refreshSocket();
      return data.user;
    } finally {
      set({ loading: false });
    }
  },

  async register(name, email, password) {
    set({ loading: true });
    try {
      const data = await auth.register({ name, email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      set({ user: data.user, token: data.token, loading: false });
      refreshSocket();
      return data.user;
    } finally {
      set({ loading: false });
    }
  },

  async hydrate() {
    const token = get().token;
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const data = await auth.me();
      set({ user: data.user, initialized: true });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ user: null, token: null, initialized: true });
    }
  },

  async updateProfile(patch) {
    const data = await auth.update(patch);
    set({ user: data.user });
    return data.user;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    disconnectSocket();
    set({ user: null, token: null });
  },
}));
