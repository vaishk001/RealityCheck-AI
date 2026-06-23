const crypto = require('crypto');
const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const { ThreatReport, THREAT_TYPES } = require('../models/ThreatReport.model');

const DUPLICATE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function clampLimit(value, { min = 1, max = 100, fallback = 25 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function normalizeContent(content) {
  return String(content || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function hashText(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex');
}

function buildUserKey({ ip, userAgent }) {
  const normalizedIp = String(ip || '').trim();
  const normalizedUa = String(userAgent || '').trim().slice(0, 300);

  if (!normalizedIp && !normalizedUa) {
    throw new AppError('Unable to identify request source', 400);
  }

  return hashText(`${normalizedIp}|${normalizedUa}`);
}

function validateThreatType(threatType) {
  if (!THREAT_TYPES.includes(threatType)) {
    throw new AppError(`Invalid threatType. Allowed values: ${THREAT_TYPES.join(', ')}`, 400);
  }
}

function validateScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new AppError('Invalid score. Must be a number between 0 and 100', 400);
  }
  return Math.round(n);
}

async function createThreatReport({ content, threatType, score, ip, userAgent }) {
  const normalized = normalizeContent(content);
  if (normalized.length < 8) {
    throw new AppError('content must be at least 8 characters long', 400);
  }

  validateThreatType(threatType);
  const safeScore = validateScore(score);

  const userKey = buildUserKey({ ip, userAgent });
  const contentHash = hashText(normalized);
  const duplicateSince = new Date(Date.now() - DUPLICATE_WINDOW_MS);

  const existing = await ThreatReport.findOne({
    contentHash,
    threatType,
    createdAt: { $gte: duplicateSince }
  });

  if (existing) {
    const alreadyReported = Array.isArray(existing.reporterKeys) && existing.reporterKeys.includes(userKey);
    if (alreadyReported) {
      throw new AppError('Duplicate report blocked for this content', 429);
    }

    const merged = await ThreatReport.findOneAndUpdate(
      { _id: existing._id, reporterKeys: { $ne: userKey } },
      {
        $addToSet: {
          reporterKeys: userKey,
          voterKeys: userKey
        },
        $inc: { votes: 1 },
        $max: { score: safeScore }
      },
      { new: true }
    ).lean();

    return {
      created: false,
      report: merged || existing.toObject()
    };
  }

  const created = await ThreatReport.create({
    content: String(content || '').trim(),
    threatType,
    score: safeScore,
    votes: 1,
    contentHash,
    reporterKeys: [userKey],
    voterKeys: [userKey]
  });

  return {
    created: true,
    report: created.toObject()
  };
}

async function getLatestThreats({ limit, threatType } = {}) {
  const safeLimit = clampLimit(limit);

  const query = {};
  if (threatType) {
    validateThreatType(threatType);
    query.threatType = threatType;
  }

  return ThreatReport.find(query)
    .sort({ votes: -1, createdAt: -1 })
    .limit(safeLimit)
    .select({
      content: 1,
      threatType: 1,
      score: 1,
      votes: 1,
      createdAt: 1
    })
    .lean();
}

async function voteThreat({ threatId, ip, userAgent }) {
  if (!mongoose.Types.ObjectId.isValid(threatId)) {
    throw new AppError('Invalid threat id', 400);
  }

  const userKey = buildUserKey({ ip, userAgent });

  const updated = await ThreatReport.findOneAndUpdate(
    {
      _id: threatId,
      voterKeys: { $ne: userKey }
    },
    {
      $addToSet: { voterKeys: userKey },
      $inc: { votes: 1 }
    },
    {
      new: true,
      projection: {
        content: 1,
        threatType: 1,
        score: 1,
        votes: 1,
        createdAt: 1
      }
    }
  ).lean();

  if (updated) return updated;

  const exists = await ThreatReport.exists({ _id: threatId });
  if (!exists) {
    throw new AppError('Threat report not found', 404);
  }

  throw new AppError('Vote already recorded from this user', 429);
}

module.exports = {
  createThreatReport,
  getLatestThreats,
  voteThreat
};
