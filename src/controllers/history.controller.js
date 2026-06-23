const historyService = require('../services/history.service');

async function getHistory(req, res, next) {
  try {
    const { limit } = req.query;
    const history = await historyService.getScanHistory({ limit });
    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHistory
};
