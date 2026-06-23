const express = require('express');
const { getStatus } = require('../controllers/status.controller');

const router = express.Router();

// GET /api/status
router.get('/status', getStatus);

module.exports = router;
