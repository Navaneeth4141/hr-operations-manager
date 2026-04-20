// backend/config/db.js
// Production-ready database connection using MongoDB Atlas (or any MongoDB URI)

const mongoose = require('mongoose');

// Use environment variable in production, fallback for local dev
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hr_ops';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[DB] MongoDB connected successfully');
    console.log('[DB] Host:', mongoose.connection.host);
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  console.log('[DB] MongoDB disconnected');
}

module.exports = { connectDB, disconnectDB };
