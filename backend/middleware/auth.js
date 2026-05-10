const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const { isDbReady } = require('../config/db');
const User = require('../models/User');
const memUsers = require('../utils/inMemoryUsers');

async function loadUser(decoded) {
  if (isDbReady()) {
    return await User.findById(decoded.id).select('-password');
  }
  const u = await memUsers.findById(decoded.id);
  return memUsers.toSafe(u);
}

const protect = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Not authenticated');
    const decoded = verifyToken(token);
    const user = await loadUser(decoded);
    if (!user) throw new ApiError(401, 'User no longer exists');
    if (user.isSuspended) throw new ApiError(403, 'Account suspended');
    req.user = user;
    next();
  } catch (err) {
    if (err.isApi) return next(err);
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

const adminOnly = (req, _res, next) => {
  if (req.user?.role !== 'admin') return next(new ApiError(403, 'Admin only'));
  next();
};

module.exports = { protect, adminOnly };
