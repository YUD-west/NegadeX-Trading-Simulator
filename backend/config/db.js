const mongoose = require('mongoose');

/**
 * Connect to MongoDB. If no MONGO_URI is configured, the application
 * still boots in "in-memory mode" so the simulator can run without
 * a database (great for demos). All persistence layers gracefully
 * degrade when mongoose.connection.readyState !== 1.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('[db] MONGO_URI not set. Running in IN-MEMORY mode.');
    return null;
  }

  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`[db] MongoDB connection failed: ${err.message}`);
    console.warn('[db] Falling back to IN-MEMORY mode.');
    return null;
  }
}

function isDbReady() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDbReady };
