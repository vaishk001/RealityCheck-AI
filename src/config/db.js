const mongoose = require('mongoose');
const env = require('./env');

async function connectDB() {
  if (!env.mongoUri) {
    console.warn('[DB] MONGO_URI not set. Running without persistence.');
    return;
  }

  await mongoose.connect(env.mongoUri, {
    dbName: undefined
  });

  console.log('[DB] MongoDB connected');
}

module.exports = { connectDB };
