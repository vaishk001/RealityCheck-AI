const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || '',
  googleSafeBrowsingApiKey: process.env.GOOGLE_SAFE_BROWSING_API_KEY || '',
  virusTotalApiKey: process.env.VIRUSTOTAL_API_KEY || '',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
  ollamaEnabled: String(process.env.OLLAMA_ENABLED || 'true').toLowerCase() === 'true'
};

module.exports = env;
