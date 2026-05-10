const asyncHandler = require('../utils/asyncHandler');
const coach = require('../services/aiCoach');

/**
 * POST /api/ai/chat
 * Body: { message: string, history?: [{role, text}] }
 * Auth: required.
 *
 * The coach NEVER throws — but we still wrap it defensively so any unexpected
 * runtime hiccup degrades to a polite fall-back instead of a 500.
 */
const chat = asyncHandler(async (req, res) => {
  const message = String(req.body?.message || '').slice(0, 1000);
  const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
  const history = rawHistory
    .slice(-12)
    .map(m => ({
      role: m?.role === 'assistant' ? 'assistant' : 'user',
      text: String(m?.text || '').slice(0, 600),
    }))
    .filter(m => m.text);

  let response;
  try {
    response = coach.respond({ message, user: req.user, history });
  } catch (err) {
    response = {
      reply: 'I hit a snag answering that one. Try rephrasing — for example "How am I doing?" or "What is a heap?"',
      intent: 'error',
      level: 'junior',
      actions: [],
      related: coach.suggestionsForLevel('junior'),
      symbol: null,
    };
  }

  res.json({
    success: true,
    response: {
      ...response,
      timestamp: Date.now(),
    },
  });
});

/**
 * GET /api/ai/suggestions
 * Returns level-appropriate prompt chips for the chat UI.
 * Auth: required.
 */
const suggestions = asyncHandler(async (req, res) => {
  const store = require('../services/store');
  const userId = req.user?.id || req.user?._id;
  let level = 'junior';
  try {
    const pm = store.getOrCreatePortfolio(userId);
    const snapshot = pm.snapshot(store.getPriceMap());
    level = coach.detectLevel(snapshot, pm.tradeStack?.length || 0);
  } catch {
    level = 'junior';
  }
  res.json({
    success: true,
    level,
    suggestions: coach.suggestionsForLevel(level),
  });
});

module.exports = { chat, suggestions };
