const scanService = require('../services/scan.service');
const AppError = require('../utils/appError');

async function scanUrl(req, res, next) {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      throw new AppError('Invalid payload: url must be a non-empty string', 400);
    }

    const result = await scanService.scanUrl(url);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function scanText(req, res, next) {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      throw new AppError('Invalid payload: text must be a non-empty string', 400);
    }

    const result = await scanService.scanText(text);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function scanFile(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError('Invalid payload: file is required', 400);
    }

    const result = await scanService.scanFile(req.file);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  scanUrl,
  scanText,
  scanFile
};
