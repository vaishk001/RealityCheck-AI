const axios = require('axios');
const env = require('../config/env');

const CACHE_TTL_MS = 5 * 60 * 1000;
const GOOGLE_SOURCE = 'GoogleSafeBrowsing';
const VT_SOURCE = 'VirusTotal';

// Simple in-memory cache: key -> { expiresAt, value }
const threatCache = new Map();

function nowMs() {
  return Date.now();
}

function normalizeUrlForCache(url) {
  return String(url || '').trim().toLowerCase();
}

function getCached(key) {
  const item = threatCache.get(key);
  if (!item) return null;

  if (item.expiresAt <= nowMs()) {
    threatCache.delete(key);
    return null;
  }

  return item.value;
}

function setCached(key, value) {
  threatCache.set(key, {
    expiresAt: nowMs() + CACHE_TTL_MS,
    value
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toLegacyShape(result, sourceSlug) {
  const score = Number(result.score || 0);
  const flags = Array.isArray(result.flags) ? result.flags : [];

  return {
    // New unified shape.
    score,
    flags,
    source: result.source,
    // Backward-compatible fields used by existing scoring/explanation pipeline.
    flagged: score > 0 || flags.length > 0,
    reason: flags.length > 0 ? `${result.source} flags: ${flags.join(', ')}` : `No detections from ${result.source}`,
    sourceSlug
  };
}

function buildFailureResult({ source, sourceSlug, failureFlag, friendlyReason }) {
  return {
    score: 0,
    flags: [failureFlag],
    source,
    flagged: false,
    reason: friendlyReason,
    sourceSlug
  };
}

function mapHttpError(error) {
  if (error.code === 'ECONNABORTED') {
    return { flag: 'timeout', reason: 'Threat intelligence request timed out' };
  }

  const status = error.response?.status;
  if (status === 401 || status === 403) {
    return { flag: 'invalid_api_key', reason: 'Threat intelligence API key is invalid or unauthorized' };
  }
  if (status === 429) {
    return { flag: 'rate_limited', reason: 'Threat intelligence API rate limit reached' };
  }
  if (status >= 500) {
    return { flag: 'provider_unavailable', reason: 'Threat intelligence provider is temporarily unavailable' };
  }

  return { flag: 'provider_error', reason: error.message || 'Threat intelligence provider error' };
}

function calculateThreatIntelScore(results) {
  return Math.min(100, results.reduce((sum, item) => sum + Number(item.score || 0), 0));
}

async function checkGoogleSafeBrowsing(url) {
  const cacheKey = `gsb:${normalizeUrlForCache(url)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (!env.googleSafeBrowsingApiKey) {
    const fallback = buildFailureResult({
      source: GOOGLE_SOURCE,
      sourceSlug: 'google-safe-browsing',
      failureFlag: 'not_configured',
      friendlyReason: 'Google Safe Browsing not configured'
    });
    setCached(cacheKey, fallback);
    return fallback;
  }

  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${env.googleSafeBrowsingApiKey}`;

  const payload = {
    client: {
      clientId: 'realitycheck-ai',
      clientVersion: '1.0.0'
    },
    threatInfo: {
      // SOCIAL_ENGINEERING in GSB includes phishing-style abuse.
      threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: [{ url }]
    }
  };

  try {
    const response = await axios.post(endpoint, payload, {
      timeout: 8000,
      headers: { 'Content-Type': 'application/json' }
    });

    const matches = response.data?.matches || [];
    const flagsSet = new Set();

    for (const match of matches) {
      const threatType = String(match.threatType || '').toUpperCase();
      if (threatType === 'MALWARE') flagsSet.add('malware');
      if (threatType === 'SOCIAL_ENGINEERING') {
        flagsSet.add('social_engineering');
        flagsSet.add('phishing');
      }
      if (threatType === 'UNWANTED_SOFTWARE') flagsSet.add('unwanted_software');
    }

    const flags = [...flagsSet];
    const score = Math.min(
      60,
      (flags.includes('malware') ? 30 : 0) +
        (flags.includes('phishing') ? 25 : 0) +
        (flags.includes('social_engineering') ? 10 : 0) +
        (flags.includes('unwanted_software') ? 10 : 0)
    );

    const result = toLegacyShape({ score, flags, source: GOOGLE_SOURCE }, 'google-safe-browsing');
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    const mapped = mapHttpError(error);
    const fallback = buildFailureResult({
      source: GOOGLE_SOURCE,
      sourceSlug: 'google-safe-browsing',
      failureFlag: mapped.flag,
      friendlyReason: `${GOOGLE_SOURCE} failed: ${mapped.reason}`
    });
    setCached(cacheKey, fallback);
    return fallback;
  }
}

async function fetchVirusTotalAnalysis(analysisId, headers) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await axios.get(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      headers,
      timeout: 10000
    });

    const attributes = response.data?.data?.attributes || {};
    const status = String(attributes.status || '').toLowerCase();
    const stats = attributes.stats || {};

    if (status === 'completed') {
      return { status, stats };
    }

    // Free tier can be delayed. Retry with short incremental backoff.
    if (attempt < maxAttempts) {
      await sleep(1000 * attempt);
    }
  }

  return { status: 'queued', stats: {} };
}

async function checkVirusTotal(url) {
  const cacheKey = `vt:${normalizeUrlForCache(url)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (!env.virusTotalApiKey) {
    const fallback = buildFailureResult({
      source: VT_SOURCE,
      sourceSlug: 'virustotal',
      failureFlag: 'not_configured',
      friendlyReason: 'VirusTotal not configured'
    });
    setCached(cacheKey, fallback);
    return fallback;
  }

  const headers = { 'x-apikey': env.virusTotalApiKey };

  try {
    // Submit URL for scan and get analysis task ID.
    const submitRes = await axios.post('https://www.virustotal.com/api/v3/urls', new URLSearchParams({ url }), {
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    const analysisId = submitRes.data?.data?.id;
    if (!analysisId) {
      const fallback = buildFailureResult({
        source: VT_SOURCE,
        sourceSlug: 'virustotal',
        failureFlag: 'provider_error',
        friendlyReason: 'VirusTotal response missing analysis id'
      });
      setCached(cacheKey, fallback);
      return fallback;
    }

    const analysis = await fetchVirusTotalAnalysis(analysisId, headers);
    const malicious = Number(analysis.stats?.malicious || 0);
    const suspicious = Number(analysis.stats?.suspicious || 0);

    const flags = [];
    if (malicious > 0) flags.push('malware');
    if (suspicious > 0) flags.push('suspicious');
    if (analysis.status !== 'completed') flags.push('analysis_pending');

    const score = Math.min(60, malicious * 12 + suspicious * 6);
    const result = toLegacyShape({ score, flags, source: VT_SOURCE }, 'virustotal');
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    const mapped = mapHttpError(error);
    const fallback = buildFailureResult({
      source: VT_SOURCE,
      sourceSlug: 'virustotal',
      failureFlag: mapped.flag,
      friendlyReason: `${VT_SOURCE} failed: ${mapped.reason}`
    });
    setCached(cacheKey, fallback);
    return fallback;
  }
}

async function scanUrlThreatIntel(url) {
  const cacheKey = `combined:${normalizeUrlForCache(url)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const [google, virustotal] = await Promise.allSettled([
    checkGoogleSafeBrowsing(url),
    checkVirusTotal(url)
  ]);

  const results = [google, virustotal].map((result) => {
    if (result.status === 'fulfilled') return result.value;
    return {
      score: 0,
      flags: ['provider_error'],
      source: 'ThreatIntel',
      flagged: false,
      reason: `Threat intel check failed: ${result.reason?.message || 'unknown error'}`,
      sourceSlug: 'threat-intel'
    };
  });

  // Combined score is computed for observability and future use.
  const combinedScore = calculateThreatIntelScore(results);
  for (const item of results) {
    item.combinedScore = combinedScore;
  }

  setCached(cacheKey, results);
  return results;
}

module.exports = {
  checkGoogleSafeBrowsing,
  checkVirusTotal,
  calculateThreatIntelScore,
  scanUrlThreatIntel
};
