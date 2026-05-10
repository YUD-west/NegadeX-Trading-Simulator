import { create } from 'zustand';
import { ai } from '../services/api';

const STORAGE_KEY = 'negadex:ai:thread';
const MAX_MESSAGES = 60;

const greeting = {
  id: 'welcome',
  role: 'assistant',
  text:
    'Hi, I am the NegadeX coach. I read your live portfolio and the market regime, then answer in plain words.\n\n' +
    'Try a prompt below or ask anything — from "what is a stop-loss" to "evaluate my risk".',
  level: null,
  actions: [],
  related: [],
  ts: Date.now(),
};

function loadThread() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [greeting];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [greeting];
    return parsed.slice(-MAX_MESSAGES);
  } catch {
    return [greeting];
  }
}

function saveThread(messages) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES))); } catch {}
}

export const useAIStore = create((set, get) => ({
  open: false,
  sending: false,
  level: 'junior',
  suggestions: [],
  messages: loadThread(),
  unread: 0,

  toggle() {
    set(s => ({
      open: !s.open,
      unread: s.open ? s.unread : 0,
    }));
    if (!get().open && get().suggestions.length === 0) {
      get().refreshSuggestions();
    }
  },

  setOpen(open) {
    set({ open, unread: open ? 0 : get().unread });
    if (open && get().suggestions.length === 0) get().refreshSuggestions();
  },

  async refreshSuggestions() {
    try {
      const data = await ai.suggestions();
      set({ level: data.level || 'junior', suggestions: data.suggestions || [] });
    } catch {
      set({ suggestions: ['How am I doing?', 'What is a stop-loss?', 'Recommend a stock'] });
    }
  },

  async send(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed || get().sending) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      ts: Date.now(),
    };
    const next = [...get().messages, userMsg];
    set({ messages: next, sending: true });
    saveThread(next);

    // 12 most recent messages, in chronological order, exclude greeting
    const history = next
      .filter(m => m.id !== 'welcome')
      .slice(-12)
      .map(m => ({ role: m.role, text: m.text }));

    try {
      const data = await ai.chat(trimmed, history);
      const r = data.response || {};
      const aiMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: r.reply || 'I am not sure how to answer that yet — try asking another way.',
        level: r.level,
        intent: r.intent,
        actions: r.actions || [],
        related: r.related || [],
        symbol: r.symbol || null,
        ts: r.timestamp || Date.now(),
      };
      const updated = [...get().messages, aiMsg];
      set({
        messages: updated,
        sending: false,
        level: r.level || get().level,
        suggestions: r.related?.length ? r.related : get().suggestions,
        unread: get().open ? 0 : get().unread + 1,
      });
      saveThread(updated);
    } catch (err) {
      const fallback = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text:
          'I could not reach the coach service. Check your connection and try again — your message is still in the thread.',
        actions: [],
        related: [],
        ts: Date.now(),
      };
      const updated = [...get().messages, fallback];
      set({ messages: updated, sending: false });
      saveThread(updated);
    }
  },

  reset() {
    const fresh = [greeting];
    set({ messages: fresh, unread: 0 });
    saveThread(fresh);
  },
}));
