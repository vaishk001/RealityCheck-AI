const axios = require('axios');
const env = require('../config/env');

const AI_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 20000);
const MAX_PARSE_RETRIES = 2;
const ALLOWED_THREAT_TYPES = new Set([
  'Phishing',
  'Malware',
  'Social Engineering',
  'Fake Payment',
  'Job Scam',
  'Crypto Scam',
  'Investment Fraud',
  'Romance Scam',
  'Tech Support Scam',
  'Lottery Scam',
  'Government Impersonation',
  'UPI Payment Scam',
  'Advance Fee Fraud',
  'Brand Impersonation',
]);
const ALLOWED_USER_RISK = new Set(['Low', 'Medium', 'High']);

const SAFE_FALLBACK = {
  threatType: 'Social Engineering',
  confidence: 0,
  attackExplanation: 'AI response invalid',
  attackFlow: ['Insufficient AI signal'],
  userRisk: 'Low',
  recommendedActions: ['Use rule-based signals and threat intel checks as primary guidance.']
};

/**
 * Extract JSON object from model output defensively.
 */
function parseJsonFromModelOutput(outputText) {
  const raw = String(outputText || '').trim();

  try {
    return JSON.parse(raw);
  } catch (_) {
    // Try extracting the first JSON object if model prepends/appends text.
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback: balanced-brace extraction for noisy outputs.
      const start = raw.indexOf('{');
      if (start === -1) return null;

      let depth = 0;
      for (let i = start; i < raw.length; i += 1) {
        const ch = raw[i];
        if (ch === '{') depth += 1;
        if (ch === '}') depth -= 1;

        if (depth === 0) {
          const candidate = raw.slice(start, i + 1);
          try {
            return JSON.parse(candidate);
          } catch {
            return null;
          }
        }
      }

      return null;
    }
  }
}

/**
 * Validate and normalize strict threat-intel schema.
 * Required schema:
 * {
 *   threatType: "Phishing" | "Malware" | "Social Engineering" | "Fake Payment" | "Job Scam" | "Crypto Scam",
 *   confidence: number (0..1),
 *   attackExplanation: string,
 *   attackFlow: string[],
 *   userRisk: "Low" | "Medium" | "High",
 *   recommendedActions: string[]
 * }
 */
function normalizeAiSchema(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return { ...SAFE_FALLBACK };
  }

  const normalizedThreatType = String(candidate.threatType || '').trim();
  const threatType = ALLOWED_THREAT_TYPES.has(normalizedThreatType)
    ? normalizedThreatType
    : SAFE_FALLBACK.threatType;

  const confidenceRaw = Number(candidate.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, confidenceRaw))
    : SAFE_FALLBACK.confidence;

  const attackExplanationRaw = String(candidate.attackExplanation || '').trim();
  const attackExplanation = attackExplanationRaw || SAFE_FALLBACK.attackExplanation;

  const attackFlowInput = Array.isArray(candidate.attackFlow)
    ? candidate.attackFlow
    : typeof candidate.attackFlow === 'string'
      ? [candidate.attackFlow]
      : [];

  const attackFlow = attackFlowInput
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 6);

  const normalizedUserRisk = String(candidate.userRisk || '').trim();
  const userRisk = ALLOWED_USER_RISK.has(normalizedUserRisk)
    ? normalizedUserRisk
    : SAFE_FALLBACK.userRisk;

  const actionsInput = Array.isArray(candidate.recommendedActions)
    ? candidate.recommendedActions
    : typeof candidate.recommendedActions === 'string'
      ? [candidate.recommendedActions]
      : [];

  const recommendedActions = actionsInput
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 6);

  return {
    threatType,
    confidence,
    attackExplanation,
    attackFlow: attackFlow.length > 0 ? attackFlow : [...SAFE_FALLBACK.attackFlow],
    userRisk,
    recommendedActions:
      recommendedActions.length > 0 ? recommendedActions : [...SAFE_FALLBACK.recommendedActions]
  };
}

/**
 * Convert strict AI schema to existing scoring pipeline format.
 */
function toScoringOutput(aiResult, source = 'ollama') {
  const riskMultiplierMap = {
    Low: 0.45,
    Medium: 0.75,
    High: 1
  };

  const riskMultiplier = riskMultiplierMap[aiResult.userRisk] || 0.45;
  const score = Math.round(aiResult.confidence * 100 * riskMultiplier);

  const reasons = [
    `${aiResult.threatType} pattern detected`,
    aiResult.attackExplanation,
    ...aiResult.attackFlow.slice(0, 2)
  ].filter(Boolean);

  const isScam = aiResult.confidence >= 0.35;

  return {
    score,
    reasons: reasons.slice(0, 5),
    source,
    confidence: aiResult.confidence,
    isScam,
    threatType: aiResult.threatType,
    attackExplanation: aiResult.attackExplanation,
    attackFlow: aiResult.attackFlow,
    userRisk: aiResult.userRisk,
    recommendedActions: aiResult.recommendedActions
  };
}

function buildPrompt(text) {
  return [
    'You are a senior cybersecurity threat intelligence engine with expertise in scam detection.',
    'You MUST return ONLY valid JSON. No markdown. No code fences. No prose. No extra keys.',
    'No text is allowed before or after the JSON object.',
    '',
    'Analyze the input for ALL of the following threat signals:',
    '  PHISHING: Fake login pages, credential harvesting, spoofed bank/service emails',
    '  MALWARE: Drive-by downloads, malicious attachments, exploit kits',
    '  SOCIAL ENGINEERING: Impersonation, pretexting, authority abuse, fake alerts',
    '  FAKE PAYMENT: Fake invoices, payment portals, QR code fraud',
    '  JOB SCAM: Fake job offers, work-from-home fraud, recruitment fee demands',
    '  CRYPTO SCAM: Fake crypto exchanges, rug pulls, pump-and-dump, wallet drainers',
    '  INVESTMENT FRAUD: Ponzi schemes, fake forex/binary options, guaranteed returns',
    '  ROMANCE SCAM: Grooming for money, fake relationships, overseas emergency requests',
    '  TECH SUPPORT SCAM: Fake virus alerts, remote access requests, Microsoft/Apple impersonation',
    '  LOTTERY SCAM: You won a prize, claim fees, fake lottery notifications',
    '  GOVERNMENT IMPERSONATION: Fake IRS/police/UIDAI/RBI/EPF notices, arrest threats',
    '  UPI PAYMENT SCAM: Fake UPI collect requests, KYC expiry threats, QR-to-receive tricks',
    '  ADVANCE FEE FRAUD: Pay a fee to unlock larger reward (Nigerian prince variant)',
    '  BRAND IMPERSONATION: Typosquatting, lookalike domains, spoofed brand communications',
    '',
    'Confidence scoring guide:',
    '  0.0–0.2: Likely legitimate content, no meaningful threat signals',
    '  0.2–0.4: Weak signals, could be benign (low confidence)',
    '  0.4–0.6: Moderate threat signals, suspicious but not conclusive',
    '  0.6–0.8: Strong threat signals, likely a scam',
    '  0.8–1.0: Very high confidence — multiple strong indicators present',
    '',
    'Return ONLY valid minified JSON matching EXACTLY this schema:',
    '{"threatType":"<one of the 14 types above>","confidence":0.0,"attackExplanation":"string","attackFlow":["step1","step2"],"userRisk":"Low|Medium|High","recommendedActions":["action1"]}',
    '',
    'Rules:',
    '- threatType MUST be exactly one of: Phishing, Malware, Social Engineering, Fake Payment, Job Scam, Crypto Scam, Investment Fraud, Romance Scam, Tech Support Scam, Lottery Scam, Government Impersonation, UPI Payment Scam, Advance Fee Fraud, Brand Impersonation',
    '- confidence: float 0.0 to 1.0',
    '- attackFlow: array of 2-4 short strings describing attacker steps',
    '- userRisk: Low (score<0.4), Medium (0.4-0.7), High (>0.7)',
    '- recommendedActions: 2-3 concrete user actions',
    '- If no threat detected: return confidence 0.05 and userRisk Low',
    '',
    `INPUT: """${String(text || '').slice(0, 1200)}"""`,
  ].join('\n');
}

async function callGemini(text) {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.geminiApiKey}`,
    {
      contents: [
        {
          parts: [
            { text: buildPrompt(text) }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    },
    { timeout: AI_TIMEOUT_MS }
  );

  const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  let parsed = null;

  if (typeof raw === 'string' && raw.length > 0) {
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      logInvalidAiResponse(raw, 'gemini-parse');
      parsed = parseJsonFromModelOutput(raw);
    }
  }

  return { raw, parsed };
}

async function callOllama(text) {
  const response = await axios.post(
    `${env.ollamaBaseUrl}/api/generate`,
    {
      model: env.ollamaModel,
      prompt: buildPrompt(text),
      stream: false,
      format: 'json',
      options: {
        temperature: 0,
        // 320 tokens — enough for a full JSON response across all 14 threat types
        num_predict: 320
      }
    },
    { timeout: AI_TIMEOUT_MS }
  );

  // IMPORTANT: Ollama payload of interest is in response.data.response (string JSON).
  // Do not parse response.data directly.
  const rawResponse = response.data?.response;
  const raw = typeof rawResponse === 'string' ? rawResponse.trim() : rawResponse;

  let parsed = null;

  // Preferred path: direct JSON.parse(raw) from response.data.response.
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      // Log raw when invalid so we can tune prompt/format safely.
      logInvalidAiResponse(raw, 'parse');
      // Fallback extraction for cases where model adds extra text around JSON.
      parsed = parseJsonFromModelOutput(raw);
    }
  } else if (raw && typeof raw === 'object') {
    // Defensive: some model/runtime configs may already return an object.
    parsed = raw;
  }

  return { raw, parsed };
}

function logInvalidAiResponse(raw, attempt) {
  const preview = String(raw || '').slice(0, 500).replace(/\s+/g, ' ');
  console.warn(`[AI] Invalid JSON response on attempt ${attempt}. Raw preview: ${preview}`);
}

function logAiProviderError(error, provider = 'Ollama') {
  const status = error?.response?.status;
  const dataPreview = JSON.stringify(error?.response?.data || {}).slice(0, 500);
  const msg = error?.message || 'unknown error';

  console.warn(`[AI] ${provider} request failed (status: ${status || 'n/a'}): ${msg}. Response: ${dataPreview}`);
}

/**
 * Primary AI function for scam analysis.
 * Returns { score, reasons } for direct scoring pipeline integration.
 */
async function analyzeTextWithAI(text) {
  // Use Gemini if API key is present
  if (env.geminiApiKey) {
    try {
      let lastRaw = '';

      for (let attempt = 1; attempt <= MAX_PARSE_RETRIES + 1; attempt += 1) {
        const { raw, parsed } = await callGemini(text);
        lastRaw = raw;

        if (parsed && typeof parsed === 'object') {
          const normalized = normalizeAiSchema(parsed);
          return toScoringOutput(normalized, 'gemini');
        }

        logInvalidAiResponse(raw, attempt);
      }

      logInvalidAiResponse(lastRaw, MAX_PARSE_RETRIES + 1);
      return toScoringOutput(normalizeAiSchema(SAFE_FALLBACK), 'gemini');
    } catch (error) {
      logAiProviderError(error, 'Gemini');
      const normalizedFallback = normalizeAiSchema(SAFE_FALLBACK);
      const fallbackOutput = toScoringOutput(normalizedFallback, 'gemini');
      fallbackOutput.reasons = ['Gemini AI analyzer error/timeout'];
      return fallbackOutput;
    }
  }

  // Fallback to Ollama if enabled
  if (!env.ollamaEnabled) {
    return { score: 0, reasons: ['AI analyzer disabled'], source: 'ollama' };
  }

  try {
    // Timeout ensures request pipeline is not blocked by slow local model execution.
    // Retry when output is not parseable JSON (max retries: MAX_PARSE_RETRIES).
    let lastRaw = '';

    for (let attempt = 1; attempt <= MAX_PARSE_RETRIES + 1; attempt += 1) {
      const { raw, parsed } = await callOllama(text);
      lastRaw = raw;

      if (parsed && typeof parsed === 'object') {
        const normalized = normalizeAiSchema(parsed);
        return toScoringOutput(normalized, 'ollama');
      }

      logInvalidAiResponse(raw, attempt);
    }

    // If all retries fail, return safe fallback.
    logInvalidAiResponse(lastRaw, MAX_PARSE_RETRIES + 1);
    return toScoringOutput(normalizeAiSchema(SAFE_FALLBACK), 'ollama');
  } catch (error) {
    logAiProviderError(error, 'Ollama');

    // Graceful fallback on timeout / model crash / parse issues.
    const normalizedFallback = normalizeAiSchema(SAFE_FALLBACK);
    const fallbackOutput = toScoringOutput(normalizedFallback, 'ollama');

    if (error.code === 'ECONNABORTED') {
      fallbackOutput.reasons = ['AI analyzer timeout'];
    } else if (error.response?.status === 404) {
      fallbackOutput.reasons = ['AI model not found (check OLLAMA_MODEL)'];
    } else if (error.response?.status === 400) {
      fallbackOutput.reasons = ['AI request rejected by Ollama'];
    }

    return fallbackOutput;
  }
}

/**
 * Backward-compatible alias used by existing scan service.
 */
async function analyzeTextWithOllama(text) {
  return analyzeTextWithAI(text);
}

module.exports = {
  analyzeTextWithAI,
  analyzeTextWithOllama
};
