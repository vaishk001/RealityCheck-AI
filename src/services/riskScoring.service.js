'use strict';

/**
 * riskScoring.service.js — Weighted risk aggregator
 *
 * Score budget (0–100):
 *   Rules        → up to 55 pts  (was 45 — rules are now much richer)
 *   Threat Intel → up to 40 pts  (was 35)
 *   AI           → up to 25 pts  (was 20)
 *
 * Bonus multipliers applied AFTER component capping:
 *   • If all three sources flag a threat → +8 convergence bonus
 *   • If threat intel confirms AND rules score ≥ 30 → +5 corroboration bonus
 *
 * Final score is always clamped to [0, 100].
 */

// ─── Thresholds ───────────────────────────────────────────────────────────────

const STATUS_DANGEROUS   = 70;
const STATUS_SUSPICIOUS  = 30;

// ─── Component Caps ───────────────────────────────────────────────────────────

const CAP_RULES       = 55;
const CAP_THREAT_INTEL = 40;
const CAP_AI          = 25;

// ─── Threat Intel Scoring ────────────────────────────────────────────────────
// Each flagged provider contributes points weighted by severity field if present.

const THREAT_INTEL_BASE_PER_FLAG = 22;

function scoreThreatIntel(threatIntelResults) {
  if (!Array.isArray(threatIntelResults) || threatIntelResults.length === 0) return 0;

  const flagged = threatIntelResults.filter((item) => item.flagged);
  if (flagged.length === 0) return 0;

  // Each flagged provider adds base points; extra weight when severity is explicit.
  const raw = flagged.reduce((sum, item) => {
    const base = THREAT_INTEL_BASE_PER_FLAG;
    // Some providers return a numeric severity (0–10) or a string label.
    const severity = Number(item.severity || 0);
    const extra = Number.isFinite(severity) ? Math.min(8, severity) : 0;
    return sum + base + extra;
  }, 0);

  return Math.min(CAP_THREAT_INTEL, raw);
}

// ─── AI Scoring ──────────────────────────────────────────────────────────────

function scoreAi(aiResult) {
  if (!aiResult) return 0;

  const confidence = Math.max(0, Math.min(1, Number(aiResult.confidence || 0)));

  // Lower gates: allow threats at 0.30+ confidence to contribute score.
  // isScam threshold is also lowered to 0.35 so moderate-confidence threats
  // from the AI still feed into the composite score.
  const isScamGate = typeof aiResult.isScam === 'boolean' ? aiResult.isScam : confidence >= 0.35;
  if (!isScamGate || confidence < 0.30) return 0;

  // User-risk multiplier: High → full credit, Medium → 85%, Low → 60%
  const riskMultiplierMap = { High: 1.0, Medium: 0.85, Low: 0.60 };
  const riskMultiplier = riskMultiplierMap[aiResult.userRisk] ?? 0.60;

  return Math.min(CAP_AI, Math.round(confidence * CAP_AI * riskMultiplier));
}

// ─── Status Mapping ───────────────────────────────────────────────────────────

function mapScoreToStatus(score) {
  if (score >= STATUS_DANGEROUS)  return 'Dangerous';
  if (score >= STATUS_SUSPICIOUS) return 'Suspicious';
  return 'Safe';
}

// ─── Main Scorer ──────────────────────────────────────────────────────────────

/**
 * Combines rule findings, threat intel results, and AI result into a
 * final 0–100 risk score with status and a breakdown for the API response.
 *
 * @param {Object} params
 * @param {Array}  params.ruleFindings        - Array of { weight, reason, source }
 * @param {Array}  params.threatIntelResults  - Array of { flagged, provider, severity? }
 * @param {Object} params.aiResult            - { isScam, confidence, userRisk, … }
 * @returns {{ score: number, status: string, breakdown: object }}
 */
function calculateRiskScore({ ruleFindings = [], threatIntelResults = [], aiResult = null }) {
  // ── Component scores ────────────────────────────────────────────────────────
  const ruleScoreRaw  = ruleFindings.reduce((s, f) => s + Number(f.weight || 0), 0);
  const ruleScore     = Math.min(CAP_RULES, ruleScoreRaw);
  const threatScore   = scoreThreatIntel(threatIntelResults);
  const aiScore       = scoreAi(aiResult);

  // ── Convergence bonus ───────────────────────────────────────────────────────
  // When all three independent sources agree there's a threat, apply a strong bonus.
  const allThreeFlagged = ruleScore > 0 && threatScore > 0 && aiScore > 0;
  const convergenceBonus = allThreeFlagged ? 10 : 0;

  // Corroboration: threat intel + strong rule signal (even without AI)
  const threatIntelFlagged = threatScore > 0;
  const rulesStrong = ruleScore >= 25;
  const corroborationBonus = (threatIntelFlagged && rulesStrong && !allThreeFlagged) ? 7 : 0;

  // ── Rule-AI synergy bonus ──────────────────────────────────────────────────
  // When rules and AI independently agree on a threat (no intel needed),
  // add a synergy bonus. This catches cases where threat intel APIs have no
  // data but the URL is structurally + semantically suspicious.
  const confidence = Math.max(0, Math.min(1, Number(aiResult?.confidence || 0)));
  const ruleAiSynergy = (ruleScore >= 20 && confidence >= 0.5 && !allThreeFlagged) ? 6 : 0;

  const total = Math.max(
    0,
    Math.min(100, ruleScore + threatScore + aiScore + convergenceBonus + corroborationBonus + ruleAiSynergy)
  );

  return {
    score:  total,
    status: mapScoreToStatus(total),
    breakdown: {
      ruleScore,
      threatIntelScore: threatScore,
      aiScore,
      convergenceBonus,
      corroborationBonus,
      ruleAiSynergy,
      ruleScoreRaw,  // raw before cap, useful for debugging
    },
  };
}

module.exports = { calculateRiskScore, mapScoreToStatus };
