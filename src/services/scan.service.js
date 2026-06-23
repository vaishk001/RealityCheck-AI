const ScanLog = require('../models/ScanLog.model');
const { analyzeUrlRules, analyzeTextRules } = require('./ruleEngine.service');
const { scanUrlThreatIntel } = require('./threatIntel.service');
const { analyzeTextWithAI } = require('./aiAnalyzer.service');
const { calculateRiskScore } = require('./riskScoring.service');
const { buildExplanation } = require('./explanation.service');
const { extractTextFromFile } = require('./fileTextExtraction.service');

async function saveScanLog(payload) {
  // Keeps API functional even when DB is unavailable.
  try {
    await ScanLog.create(payload);
  } catch (error) {
    // Non-blocking persistence failure.
    console.warn('[SCAN_LOG] Failed to save scan result:', error.message);
  }
}

function buildScanResponse({ scoreResult, ruleFindings, threatIntelResults, aiResult }) {
  const explanation = buildExplanation({
    score: scoreResult.score,
    ruleFindings,
    threatIntelResults,
    aiResult
  });

  return {
    score: scoreResult.score,
    status: scoreResult.status,
    summary: explanation.summary,
    reasons: explanation.reasons,
    categories: explanation.categories,
    breakdown: scoreResult.breakdown,
    aiConfidence: Number.isFinite(Number(aiResult?.confidence)) ? Number(aiResult.confidence) : undefined,
    threatType: aiResult?.threatType,
    attackExplanation: aiResult?.attackExplanation,
    attackFlow: Array.isArray(aiResult?.attackFlow) ? aiResult.attackFlow : [],
    userRisk: aiResult?.userRisk,
    recommendedActions: Array.isArray(aiResult?.recommendedActions) ? aiResult.recommendedActions : []
  };
}

function ensureAiResultShape(aiResult) {
  if (!aiResult || typeof aiResult !== 'object') {
    return {
      score: 0,
      reasons: ['AI analyzer unavailable'],
      source: 'ollama',
      threatType: 'Social Engineering',
      attackExplanation: 'AI analyzer unavailable',
      attackFlow: ['No AI attack flow available'],
      userRisk: 'Low',
      recommendedActions: ['Rely on rule-based and threat-intel signals.']
    };
  }

  const score = Number.isFinite(Number(aiResult.score)) ? Number(aiResult.score) : 0;
  const rawConfidence = Number(aiResult.confidence);
  const confidence = Number.isFinite(rawConfidence)
    ? Math.max(0, Math.min(1, rawConfidence))
    : Math.max(0, Math.min(1, score / 100));

  const isScam = typeof aiResult.isScam === 'boolean' ? aiResult.isScam : undefined;

  return {
    score,
    reasons: Array.isArray(aiResult.reasons) ? aiResult.reasons : [],
    source: aiResult.source || 'ollama',
    confidence,
    isScam,
    threatType: aiResult.threatType || 'Social Engineering',
    attackExplanation: aiResult.attackExplanation || 'No attack explanation available',
    attackFlow: Array.isArray(aiResult.attackFlow) ? aiResult.attackFlow : [],
    userRisk: aiResult.userRisk || 'Low',
    recommendedActions: Array.isArray(aiResult.recommendedActions) ? aiResult.recommendedActions : []
  };
}

async function getAiResult(inputText) {
  try {
    const aiResult = await analyzeTextWithAI(inputText);
    const normalized = ensureAiResultShape(aiResult);

    if (process.env.NODE_ENV !== 'production') {
      console.log('AI RESULT:', normalized);
    }

    return normalized;
  } catch {
    return {
      score: 0,
      reasons: ['AI analyzer unavailable'],
      source: 'ollama',
      confidence: 0,
      isScam: false,
      threatType: 'Social Engineering',
      attackExplanation: 'AI analyzer unavailable',
      attackFlow: ['No AI attack flow available'],
      userRisk: 'Low',
      recommendedActions: ['Rely on rule-based and threat-intel signals.']
    };
  }
}

/**
 * Builds a rich, structured text block for the AI to analyze for URL scans.
 * Instead of a bare URL string, we decompose the URL into its structural parts
 * and include any rule-engine signals as "prior intelligence" so the AI can
 * confirm or refute them with its semantic understanding.
 *
 * @param {string} url
 * @param {{ score: number, reasons: string[] }} ruleResult
 * @returns {string}
 */
function buildUrlContextForAi(url, ruleResult) {
  const parts = [];

  parts.push(`Analyze this URL for scam, phishing, or malicious intent.`);
  parts.push(`Full URL: ${url}`);

  // Decompose the URL so the AI can reason about each part
  try {
    const parsed = new URL(url);
    parts.push(`Protocol: ${parsed.protocol}`);
    parts.push(`Hostname: ${parsed.hostname}`);
    if (parsed.port) parts.push(`Port: ${parsed.port}`);
    if (parsed.pathname && parsed.pathname !== '/') parts.push(`Path: ${parsed.pathname}`);
    if (parsed.search) parts.push(`Query: ${parsed.search}`);
    if (parsed.hash) parts.push(`Fragment: ${parsed.hash}`);
    if (parsed.username) parts.push(`Username in URL: ${parsed.username} (suspicious)`);
  } catch (_) {
    parts.push('URL could not be parsed — this itself is suspicious.');
  }

  // Feed rule-engine findings as prior intelligence signals
  if (ruleResult.reasons && ruleResult.reasons.length > 0) {
    parts.push('');
    parts.push(`Rule-engine pre-analysis detected ${ruleResult.reasons.length} signal(s) with a heuristic score of ${ruleResult.score}/100:`);
    for (const reason of ruleResult.reasons.slice(0, 6)) {
      parts.push(`  • ${reason}`);
    }
    parts.push('Use these signals as additional context. Confirm or refute them with your analysis. Adjust your confidence accordingly.');
  }

  return parts.join('\n');
}

async function scanUrl(url) {
  const ruleResult = analyzeUrlRules(url);
  const threatIntelResults = await scanUrlThreatIntel(url);

  // Build rich context for AI instead of bare URL string
  const aiInputText = buildUrlContextForAi(url, ruleResult);
  const aiResult = await getAiResult(aiInputText);

  const scoreResult = calculateRiskScore({
    ruleFindings: ruleResult.findings,
    threatIntelResults,
    aiResult
  });

  const response = buildScanResponse({
    scoreResult,
    ruleFindings: ruleResult.findings,
    threatIntelResults,
    aiResult
  });

  await saveScanLog({
    type: 'url',
    input: url,
    ...response,
    telemetry: {
      host: ruleResult.parsedHost,
      severity: scoreResult.status,
      summary: response.summary,
      categories: response.categories,
      ...scoreResult.breakdown
    }
  });

  return response;
}

async function scanText(text) {
  const ruleResult = analyzeTextRules(text);

  const aiResult = await getAiResult(text);

  const scoreResult = calculateRiskScore({
    ruleFindings: ruleResult.findings,
    threatIntelResults: [],
    aiResult
  });

  const response = buildScanResponse({
    scoreResult,
    ruleFindings: ruleResult.findings,
    threatIntelResults: [],
    aiResult
  });

  await saveScanLog({
    type: 'text',
    input: text,
    ...response,
    telemetry: {
      severity: scoreResult.status,
      summary: response.summary,
      categories: response.categories,
      ...scoreResult.breakdown
    }
  });

  return response;
}

async function scanFile(file) {
  const extractedText = await extractTextFromFile(file);

  if (!extractedText) {
    return {
      score: 0,
      status: 'Safe',
      summary: 'No readable text found in the uploaded file.',
      reasons: ['The file appears empty or contains non-readable content.'],
      categories: {
        technical: [],
        behavioral: [],
        threatIntel: []
      },
      breakdown: {
        ruleScore: 0,
        threatIntelScore: 0,
        aiScore: 0
      },
      aiConfidence: 0
    };
  }

  const ruleResult = analyzeTextRules(extractedText);
  const aiResult = await getAiResult(extractedText);

  const scoreResult = calculateRiskScore({
    ruleFindings: ruleResult.findings,
    threatIntelResults: [],
    aiResult
  });

  const response = buildScanResponse({
    scoreResult,
    ruleFindings: ruleResult.findings,
    threatIntelResults: [],
    aiResult
  });

  await saveScanLog({
    type: 'file',
    input: file.originalname || 'uploaded-file',
    ...response,
    telemetry: {
      fileName: file.originalname,
      mimeType: file.mimetype,
      extractedChars: extractedText.length,
      severity: scoreResult.status,
      summary: response.summary,
      categories: response.categories,
      ...scoreResult.breakdown
    }
  });

  return {
    ...response,
    sourceFile: {
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      extractedChars: extractedText.length
    }
  };
}

module.exports = {
  scanUrl,
  scanText,
  scanFile
};
