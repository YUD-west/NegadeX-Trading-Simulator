/* Standalone CLI: `node utils/seed.js` */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, isDbReady } = require('../config/db');
const Stock = require('../models/Stock');
const User  = require('../models/User');
const SEED  = require('../config/stocksSeed');

async function run() {
  await connectDB();
  if (!isDbReady()) {
    console.log('[seed] No DB connection — nothing to do.');
    process.exit(0);
  }
  console.log('[seed] Wiping stocks…');
  await Stock.deleteMany({});
  const docs = SEED.map(s => ({
    ...s,
    open: s.price, high: s.price, low: s.price, previousClose: s.price,
    change: 0, changePercent: 0,
    volume24h: Math.floor(50_000 + Math.random() * 950_000),
    marketCap: s.price * (50_000_000 + Math.random() * 5_000_000_000),
  }));
  await Stock.insertMany(docs);
  console.log(`[seed] Inserted ${docs.length} stocks`);

  // Ensure admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@market.io';
  const adminPass  = process.env.ADMIN_PASSWORD || 'Admin@12345';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Market Admin',
      email: adminEmail,
      password: adminPass,
      role: 'admin',
    });
    console.log(`[seed] Created admin: ${adminEmail} / ${adminPass}`);
  } else {
    console.log('[seed] Admin already exists');
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
