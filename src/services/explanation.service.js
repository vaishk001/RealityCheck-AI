function mapSeverity(score = 0) {
  const normalized = Math.max(0, Math.min(100, Number(score || 0)));

  if (normalized <= 30) return 'Safe';
  if (normalized <= 70) return 'Suspicious';
  return 'Dangerous';
}

function normalizeReason(reason) {
  const text = String(reason || '').trim();
  if (!text) return '';

  // Normalize noisy system/provider phrases into user-friendly language.
  return text
    .replace(/\bnot configured\b/gi, 'not available')
    .replace(/\bprovider_error\b/gi, 'service error')
    .replace(/\brate_limited\b/gi, 'rate limited')
    .replace(/\binvalid_api_key\b/gi, 'authentication issue')
    .replace(/\banalysis_pending\b/gi, 'analysis pending')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeReasons(reasons) {
  const seen = new Set();
  const output = [];

  for (const rawReason of reasons) {
    const normalized = normalizeReason(rawReason);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    output.push(normalized);
  }

  return output;
}

function looksThreatIntelReason(reason) {
  const lower = String(reason || '').toLowerCase();
  return /google|virus.?total|threat intel|flagged|malware|phishing|social engineering|analysis pending|rate limit|service error|authentication issue/.test(
    lower
  );
}

function looksTechnicalReason(reason) {
  const lower = String(reason || '').toLowerCase();
  return /url|domain|subdomain|https|http|ip address|tld|hostname|homograph|malformed|shortener|punycode|idn|entropy|dash|port|fragment|base64|encoding|percent|data:\s*uri|at\s*sign|redirect|extension|query\s*param/.test(lower);
}

function looksBehavioralScamReason(reason) {
  const lower = String(reason || '').toLowerCase();
  return /upi|romance|lottery|prize|tech\s*support|investment|crypto|government|impersonation|scam|grooming|advance\s*fee|job\s*scam/.test(lower);
}

function categorizeReasons(reasons) {
  const categories = {
    technical: [],
    behavioral: [],
    threatIntel: [],
    scamPatterns: [],
  };

  for (const reason of reasons) {
    if (looksThreatIntelReason(reason)) {
      categories.threatIntel.push(reason);
      continue;
    }

    if (looksTechnicalReason(reason)) {
      categories.technical.push(reason);
      continue;
    }

    if (looksBehavioralScamReason(reason)) {
      categories.scamPatterns.push(reason);
      continue;
    }

    categories.behavioral.push(reason);
  }

  return categories;
}

function buildSummary({ severity, categories }) {
  const parts = [];

  if (categories.technical.length > 0) {
    parts.push(`${categories.technical.length} structural/technical URL risk indicator(s) detected`);
  }
  if (categories.scamPatterns && categories.scamPatterns.length > 0) {
    parts.push(`${categories.scamPatterns.length} known scam pattern(s) matched`);
  }
  if (categories.behavioral.length > 0) {
    parts.push('social engineering or manipulation tactics identified');
  }
  if (categories.threatIntel.length > 0) {
    parts.push('external threat intelligence sources flagged risk signals');
  }

  if (parts.length === 0) {
    return 'No significant scam indicators were detected based on current checks.';
  }

  const severityLabel = severity === 'Dangerous' ? 'dangerous'
    : severity === 'Suspicious' ? 'suspicious'
    : 'low-risk';

  return `This content is rated ${severityLabel}: ${parts.join('; ')}.`;
}

/**
 * Build structured explanation from rule, threat-intel, and AI outputs.
 */
function buildExplanation({ score = 0, ruleFindings = [], threatIntelResults = [], aiResult = null }) {
  const collectedReasons = [];

  // Rule-based reasons (technical and behavior cues).
  for (const finding of ruleFindings) {
    if (finding?.reason) collectedReasons.push(finding.reason);
  }

  // Threat intel reasons or flags from provider results.
  for (const item of threatIntelResults) {
    if (!item) continue;

    if (Array.isArray(item.flags) && item.flags.length > 0) {
      const provider = item.source || 'Threat intelligence';
      collectedReasons.push(`${provider} reported: ${item.flags.join(', ')}`);
    }

    if (item.reason && (item.flagged || /failed|not configured|not available|rate limit|timeout|error/i.test(item.reason))) {
      collectedReasons.push(item.reason);
    }
  }

  // AI model reasons.
  if (Array.isArray(aiResult?.reasons) && aiResult.reasons.length > 0) {
    collectedReasons.push(...aiResult.reasons);
  }

  const reasons = dedupeReasons(collectedReasons);
  const categories = categorizeReasons(reasons);
  const severity = mapSeverity(score);
  const summary = buildSummary({ severity, categories });

  return {
    summary,
    reasons,
    categories,
    severity
  };
}

/**
 * Backward-compatible helper used by scan.service.
 */
function buildReasons({ score = 0, ruleFindings = [], threatIntelResults = [], aiResult = null }) {
  return buildExplanation({ score, ruleFindings, threatIntelResults, aiResult }).reasons;
}

module.exports = {
  mapSeverity,
  buildExplanation,
  buildReasons
};
