const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');

async function startServer() {
  try {
    await connectDB();

    app.listen(env.port, () => {
      console.log(`[API] Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error('[BOOT] Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
