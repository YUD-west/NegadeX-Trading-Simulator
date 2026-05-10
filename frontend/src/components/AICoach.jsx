import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles, X, Send, RefreshCw, MessageSquare, Cpu,
  ChevronRight, BookOpen,
} from 'lucide-react';
import { useAIStore } from '../store/aiStore';
import { useAuthStore } from '../store/authStore';

/* ────────────────────────────── widget ─────────────────────────────── */

export default function AICoach() {
  const user = useAuthStore(s => s.user);
  const open    = useAIStore(s => s.open);
  const toggle  = useAIStore(s => s.toggle);
  const setOpen = useAIStore(s => s.setOpen);
  const unread  = useAIStore(s => s.unread);

  if (!user) return null;

  return (
    <>
      <FloatingButton open={open} unread={unread} onClick={toggle} />
      <AnimatePresence>
        {open && <ChatPanel onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

/* ─────────────────────── floating launcher button ───────────────────── */

function FloatingButton({ open, unread, onClick }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.4, type: 'spring', stiffness: 280, damping: 20 }}
      onClick={onClick}
      aria-label={open ? 'Close coach' : 'Open AI coach'}
      className="fixed bottom-5 right-5 lg:bottom-7 lg:right-7 z-[60] group"
    >
      <span className="absolute inset-0 -m-1 rounded-full bg-cyan-400/30 blur-xl group-hover:bg-cyan-400/50 transition" />
      <span className="relative flex items-center gap-2 px-4 py-3 rounded-full text-ink-950 font-semibold text-sm shadow-[0_8px_30px_-6px_rgba(34,211,238,0.55)] bg-gradient-to-br from-cyan-300 via-cyan-400 to-fuchsia-400 border border-white/30 backdrop-blur">
        <span className="relative h-6 w-6 rounded-full bg-ink-950/15 grid place-items-center">
          {open ? <X size={14} /> : <Sparkles size={14} />}
        </span>
        <span className="hidden sm:inline">{open ? 'Close coach' : 'Ask coach'}</span>
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-fuchsia-400 text-ink-950 text-[10px] font-bold grid place-items-center border border-white/40">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </span>
    </motion.button>
  );
}

/* ─────────────────────────── chat panel ─────────────────────────────── */

function ChatPanel({ onClose }) {
  const messages    = useAIStore(s => s.messages);
  const sending     = useAIStore(s => s.sending);
  const level       = useAIStore(s => s.level);
  const suggestions = useAIStore(s => s.suggestions);
  const send        = useAIStore(s => s.send);
  const reset       = useAIStore(s => s.reset);
  const refresh     = useAIStore(s => s.refreshSuggestions);

  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  function submit(e) {
    e?.preventDefault?.();
    if (!draft.trim() || sending) return;
    send(draft);
    setDraft('');
  }

  function onChip(text) {
    if (sending) return;
    send(text);
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <>
      {/* Mobile scrim */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[58] bg-ink-950/60 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />
      <motion.aside
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 32 }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        role="dialog"
        aria-label="NegadeX AI Coach"
        className="fixed z-[59] bottom-0 right-0 lg:bottom-6 lg:right-6
                   w-full lg:w-[420px] xl:w-[460px]
                   h-[88vh] lg:h-[calc(100vh-7rem)] max-h-[760px]
                   flex flex-col overflow-hidden
                   rounded-t-[28px] lg:rounded-[28px]
                   border border-white/10
                   bg-ink-950/90 backdrop-blur-2xl
                   shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.04)]"
      >
        <Header level={level} onReset={reset} onClose={onClose} />

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scroll-smooth">
          {messages.map(m => <MessageBubble key={m.id} m={m} onChip={onChip} />)}
          {sending && <Typing />}
        </div>

        <Suggestions chips={suggestions} sending={sending} onPick={onChip} />

        <form
          onSubmit={submit}
          className="border-t border-white/5 p-3 lg:p-4 bg-ink-950/80 backdrop-blur"
        >
          <div className="flex items-end gap-2">
            <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] focus-within:border-cyan-400/40 focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.12)] transition">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={onKey}
                rows={1}
                maxLength={1000}
                placeholder='Ask anything — "evaluate my risk", "analyse CBE", "what is a heap?"'
                className="w-full bg-transparent resize-none px-3.5 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none max-h-32"
                style={{ minHeight: 44 }}
              />
            </div>
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className={`shrink-0 h-11 w-11 rounded-xl grid place-items-center font-semibold transition border
                ${sending || !draft.trim()
                  ? 'bg-white/[0.03] border-white/10 text-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-br from-cyan-300 via-cyan-400 to-fuchsia-400 border-white/30 text-ink-950 hover:shadow-[0_0_22px_rgba(34,211,238,0.45)]'}`}
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-600">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-400">Enter</kbd> to send · <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-400">Shift+Enter</kbd> newline</span>
            <span>{draft.length}/1000</span>
          </div>
        </form>
      </motion.aside>
    </>
  );
}

/* ───────────────────────────── header ───────────────────────────────── */

function Header({ level, onReset, onClose }) {
  return (
    <div className="relative px-4 lg:px-5 py-4 border-b border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.08] via-transparent to-fuchsia-500/[0.08]" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br from-cyan-300 via-cyan-400 to-fuchsia-400 grid place-items-center text-ink-950 shadow-[0_0_24px_-6px_rgba(34,211,238,0.6)]">
            <Sparkles size={16} />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-bull-400 border-2 border-ink-950" />
          </span>
          <div className="min-w-0">
            <div className="font-display font-semibold text-sm leading-tight truncate">
              NegadeX Coach
            </div>
            <div className="text-[11px] text-slate-500 leading-tight truncate flex items-center gap-1.5">
              <Cpu size={10} className="text-cyan-300" />
              <span>Adaptive · {level ? labelFor(level) : 'calibrating'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onReset}
            title="Reset conversation"
            className="h-8 w-8 grid place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-100 hover:border-cyan-400/30 transition"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="h-8 w-8 grid place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-100 hover:border-fuchsia-400/30 transition"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function labelFor(level) {
  if (level === 'senior')       return 'Senior desk';
  if (level === 'intermediate') return 'Active trader';
  return 'Beginner mode';
}

/* ───────────────────────── message bubbles ──────────────────────────── */

function MessageBubble({ m, onChip }) {
  const isUser = m.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <span className="shrink-0 h-7 w-7 rounded-xl bg-gradient-to-br from-cyan-300 via-cyan-400 to-fuchsia-400 grid place-items-center text-ink-950">
          <Sparkles size={12} />
        </span>
      )}
      <div className={`max-w-[82%] ${isUser ? 'order-1' : ''}`}>
        <div
          className={`relative px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
            ${isUser
              ? 'bg-gradient-to-br from-cyan-500/15 to-fuchsia-500/10 border border-cyan-400/25 text-slate-100 rounded-tr-md'
              : 'bg-white/[0.04] border border-white/10 text-slate-200 rounded-tl-md'}`}
        >
          {m.text}
        </div>

        {!isUser && (m.actions?.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {m.actions.map((a, i) => (
              <ActionChip key={i} action={a} onChip={onChip} />
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <span className="shrink-0 h-7 w-7 rounded-xl bg-white/[0.05] border border-white/10 grid place-items-center text-slate-300 text-[11px] font-bold">
          <UserInitial />
        </span>
      )}
    </motion.div>
  );
}

function UserInitial() {
  const user = useAuthStore(s => s.user);
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();
  return <span>{initial}</span>;
}

function ActionChip({ action, onChip }) {
  if (action.kind === 'link' && action.to) {
    return (
      <Link
        to={action.to}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 transition"
      >
        {action.label}
        <ChevronRight size={11} />
      </Link>
    );
  }
  if (action.kind === 'concept' && action.text) {
    return (
      <button
        onClick={() => onChip(action.text)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-white/10 bg-white/[0.03] text-slate-300 hover:border-fuchsia-400/30 hover:bg-fuchsia-500/10 transition"
      >
        <BookOpen size={10} /> {action.label}
      </button>
    );
  }
  return null;
}

function Typing() {
  return (
    <div className="flex gap-2.5">
      <span className="shrink-0 h-7 w-7 rounded-xl bg-gradient-to-br from-cyan-300 via-cyan-400 to-fuchsia-400 grid place-items-center text-ink-950">
        <Sparkles size={12} />
      </span>
      <div className="px-3.5 py-3 rounded-2xl rounded-tl-md bg-white/[0.04] border border-white/10">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-cyan-300"
              animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── suggestion strip ────────────────────────── */

function Suggestions({ chips, sending, onPick }) {
  if (!chips?.length) return null;
  return (
    <div className="border-t border-white/5 px-3 lg:px-4 py-2.5 bg-ink-950/40">
      <div className="flex items-center gap-2 mb-1.5">
        <MessageSquare size={11} className="text-slate-500" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Try asking</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {chips.map((c, i) => (
          <button
            key={i}
            onClick={() => onPick(c)}
            disabled={sending}
            className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/30 hover:text-cyan-200 hover:bg-cyan-500/10 transition disabled:opacity-50"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
