const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');
const { isDbReady } = require('../config/db');
const User = require('../models/User');
const memUsers = require('../utils/inMemoryUsers');
const { getOrCreatePortfolio } = require('../services/store');

const STARTING = Number(process.env.STARTING_BALANCE || 1000000);

function publicUser(u) {
  return {
    id: u._id || u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    cash: u.cash,
    startingBalance: u.startingBalance,
    avatar: u.avatar || '',
    bio: u.bio || '',
    createdAt: u.createdAt,
  };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  let user;
  if (isDbReady()) {
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) throw new ApiError(400, 'Email already in use');
    user = await User.create({
      name, email, password,
      cash: STARTING, startingBalance: STARTING,
    });
  } else {
    user = await memUsers.create({ name, email, password });
  }
  // Bootstrap an in-memory portfolio for the user
  getOrCreatePortfolio(user._id, STARTING);
  const token = signToken({ id: String(user._id), role: user.role });
  res.status(201).json({ success: true, token, user: publicUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  let user;
  let ok = false;
  if (isDbReady()) {
    user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
    if (user) ok = await user.matchPassword(password);
  } else {
    user = await memUsers.findByEmail(email);
    if (user) ok = await memUsers.matchPassword(user, password);
  }
  if (!user || !ok) throw new ApiError(401, 'Invalid credentials');
  if (user.isSuspended) throw new ApiError(403, 'Account suspended');

  getOrCreatePortfolio(user._id, user.startingBalance || STARTING);
  const token = signToken({ id: String(user._id), role: user.role });
  res.json({ success: true, token, user: publicUser(user) });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'avatar', 'bio'];
  const patch = {};
  for (const key of allowed) {
    if (typeof req.body[key] === 'string') patch[key] = req.body[key];
  }
  let updated;
  if (isDbReady()) {
    updated = await User.findByIdAndUpdate(req.user._id || req.user.id, patch, { new: true });
  } else {
    updated = await memUsers.update(req.user._id || req.user.id, patch);
    updated = memUsers.toSafe(updated);
  }
  res.json({ success: true, user: publicUser(updated) });
});

module.exports = { register, login, me, updateProfile };
