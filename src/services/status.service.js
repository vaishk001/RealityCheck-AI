const axios = require('axios');
const env = require('../config/env');

function trimTrailingSlashes(url) {
  return String(url || '').replace(/\/+$/, '');
}

async function checkOllama() {
  const enabled = Boolean(env.ollamaEnabled);
  const baseUrl = trimTrailingSlashes(env.ollamaBaseUrl);
  const model = String(env.ollamaModel || '').trim();

  if (!enabled) {
    return {
      enabled: false,
      reachable: false,
      model,
      modelAvailable: false
    };
  }

  if (!baseUrl) {
    return {
      enabled: true,
      reachable: false,
      model,
      modelAvailable: false,
      error: 'OLLAMA_BASE_URL is not set'
    };
  }

  try {
    const res = await axios.get(`${baseUrl}/api/tags`, { timeout: 1500 });
    const models = Array.isArray(res?.data?.models) ? res.data.models : [];

    const names = models
      .map((m) => m?.name || m?.model || '')
      .filter(Boolean)
      .map((n) => String(n));

    const modelAvailable = model ? names.includes(model) : false;

    return {
      enabled: true,
      reachable: true,
      model,
      modelAvailable,
      modelsCount: names.length
    };
  } catch (error) {
    return {
      enabled: true,
      reachable: false,
      model,
      modelAvailable: false,
      error: error?.message || 'Failed to reach Ollama'
    };
  }
}

async function getSystemStatus() {
  const ai = await checkOllama();

  return {
    status: 'ok',
    service: 'RealityCheck AI API',
    timestamp: new Date().toISOString(),
    backend: {
      nodeEnv: env.nodeEnv
    },
    ai,
    threatIntel: {
      googleSafeBrowsingConfigured: Boolean(env.googleSafeBrowsingApiKey),
      virusTotalConfigured: Boolean(env.virusTotalApiKey)
    }
  };
}

module.exports = {
  getSystemStatus
};
