const { isDbReady } = require('../config/db');
const memUsers = require('./inMemoryUsers');
let User;
try { User = require('../models/User'); } catch { User = null; }

/**
 * Ensures an operator account exists at boot.
 *
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD from env (with sane defaults). Works in
 * both Mongo-connected mode and the in-memory fallback so the /admin console
 * is always reachable on a fresh start without running `npm run seed`.
 *
 * Behavior:
 *   - If no user with ADMIN_EMAIL exists → create one with role: 'admin'
 *   - If a user with ADMIN_EMAIL exists but role !== 'admin' → promote it
 *   - Otherwise no-op
 */
async function ensureAdmin() {
  const email = String(process.env.ADMIN_EMAIL || 'admin@market.io').toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || 'Admin@12345');
  const name = process.env.ADMIN_NAME || 'Market Admin';

  try {
    if (isDbReady() && User) {
      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({ name, email, password, role: 'admin' });
        console.log(`[admin] Created admin (db): ${email}`);
        return { created: true, email };
      }
      if (user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
        console.log(`[admin] Promoted existing user to admin (db): ${email}`);
        return { promoted: true, email };
      }
      console.log(`[admin] Admin already present (db): ${email}`);
      return { existed: true, email };
    }

    let user = await memUsers.findByEmail(email);
    if (!user) {
      user = await memUsers.create({ name, email, password, role: 'admin' });
      const reveal = process.env.NODE_ENV !== 'production';
      console.log(`[admin] Created admin (in-memory): ${email}${reveal ? `  password: ${password}` : ''}`);
      return { created: true, email };
    }
    if (user.role !== 'admin') {
      await memUsers.update(user._id, { role: 'admin' });
      console.log(`[admin] Promoted existing user to admin (in-memory): ${email}`);
      return { promoted: true, email };
    }
    console.log(`[admin] Admin already present (in-memory): ${email}`);
    return { existed: true, email };
  } catch (err) {
    console.error('[admin] Failed to ensure admin user:', err.message);
    return { error: err.message };
  }
}

module.exports = ensureAdmin;
