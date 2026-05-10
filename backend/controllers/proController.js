const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const pro = require('../services/proFeatures');

const challenges = asyncHandler(async (req, res) => {
  res.json({ success: true, items: pro.getChallenges(req.user) });
});

const optionQuote = asyncHandler(async (req, res) => {
  try {
    res.json({ success: true, quote: pro.optionQuote(req.query) });
  } catch (err) {
    throw new ApiError(400, err.message);
  }
});

const createAdvancedOrder = asyncHandler(async (req, res) => {
  try {
    res.status(201).json({ success: true, order: pro.createAdvancedOrder(req.user, req.body) });
  } catch (err) {
    throw new ApiError(400, err.message);
  }
});

const advancedOrders = asyncHandler(async (req, res) => {
  res.json({ success: true, items: pro.listAdvancedOrders(req.user._id || req.user.id) });
});

const socialList = asyncHandler(async (_req, res) => {
  res.json({ success: true, items: pro.socialPosts });
});

const socialCreate = asyncHandler(async (req, res) => {
  if (!String(req.body.text || '').trim()) throw new ApiError(400, 'Post text required');
  res.status(201).json({ success: true, post: pro.createPost(req.user, req.body) });
});

const socialLike = asyncHandler(async (req, res) => {
  const post = pro.likePost(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');
  res.json({ success: true, post });
});

const backtest = asyncHandler(async (req, res) => {
  try {
    res.json({ success: true, result: pro.backtest(req.query) });
  } catch (err) {
    throw new ApiError(400, err.message);
  }
});

const analytics = asyncHandler(async (req, res) => {
  res.json({ success: true, metrics: pro.analytics(req.user) });
});

const sentiment = asyncHandler(async (_req, res) => {
  res.json({ success: true, ...pro.sentimentScan() });
});

module.exports = {
  challenges,
  optionQuote,
  createAdvancedOrder,
  advancedOrders,
  socialList,
  socialCreate,
  socialLike,
  backtest,
  analytics,
  sentiment,
};
