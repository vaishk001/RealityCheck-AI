const statusService = require('../services/status.service');

async function getStatus(req, res, next) {
  try {
    const data = await statusService.getSystemStatus();
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStatus
};
