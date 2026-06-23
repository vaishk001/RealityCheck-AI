const express = require('express');
const { getHistory } = require('../controllers/history.controller');

const router = express.Router();

// GET /api/history?limit=20
router.get('/history', getHistory);

module.exports = router;
