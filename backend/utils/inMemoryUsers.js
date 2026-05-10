const bcrypt = require('bcryptjs');

/**
 * Tiny in-memory user store used when MongoDB is unavailable so the
 * platform stays demo-able. Mirrors the User model API minimally.
 */
class InMemoryUserStore {
  constructor() {
    this.byId    = new Map();
    this.byEmail = new Map();
    this._seq    = 1;
  }

  async create({ name, email, password, role = 'user' }) {
    if (this.byEmail.has(email.toLowerCase())) {
      const err = new Error('Email already in use');
      err.statusCode = 400;
      throw err;
    }
    const _id = String(this._seq++);
    const hashed = await bcrypt.hash(password, 10);
    const user = {
      _id,
      name,
      email: email.toLowerCase(),
      password: hashed,
      role,
      isSuspended: false,
      startingBalance: Number(process.env.STARTING_BALANCE || 1000000),
      cash: Number(process.env.STARTING_BALANCE || 1000000),
      realizedPnL: 0,
      avatar: '',
      bio: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.byId.set(_id, user);
    this.byEmail.set(user.email, user);
    return user;
  }

  async findByEmail(email) {
    return this.byEmail.get(String(email).toLowerCase()) || null;
  }

  async findById(id) {
    return this.byId.get(String(id)) || null;
  }

  async list() {
    return [...this.byId.values()];
  }

  async update(id, patch) {
    const u = this.byId.get(String(id));
    if (!u) return null;
    Object.assign(u, patch, { updatedAt: new Date() });
    return u;
  }

  async matchPassword(user, raw) {
    return bcrypt.compare(raw, user.password);
  }

  toSafe(u) {
    if (!u) return null;
    const { password, ...rest } = u;
    return rest;
  }
}

const store = new InMemoryUserStore();
module.exports = store;
