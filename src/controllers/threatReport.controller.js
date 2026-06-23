const threatReportService = require('../services/threatReport.service');
const AppError = require('../utils/appError');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
}

async function reportThreat(req, res, next) {
  try {
    const { content, threatType, score } = req.body || {};

    if (!content || typeof content !== 'string') {
      throw new AppError('Invalid payload: content must be a non-empty string', 400);
    }

    const result = await threatReportService.createThreatReport({
      content,
      threatType,
      score,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent']
    });

    res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    next(error);
  }
}

async function getThreats(req, res, next) {
  try {
    const { limit, threatType } = req.query || {};
    const threats = await threatReportService.getLatestThreats({ limit, threatType });
    res.status(200).json(threats);
  } catch (error) {
    next(error);
  }
}

async function voteThreat(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await threatReportService.voteThreat({
      threatId: id,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent']
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  reportThreat,
  getThreats,
  voteThreat
};
