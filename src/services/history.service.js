const ScanLog = require('../models/ScanLog.model');

function clampLimit(value, { min = 1, max = 100, fallback = 20 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

async function getScanHistory({ limit } = {}) {
  const safeLimit = clampLimit(limit);

  const rows = await ScanLog.find({})
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .select({ input: 1, score: 1, status: 1, createdAt: 1, _id: 0 })
    .lean();

  return rows;
}

module.exports = {
  getScanHistory
};
