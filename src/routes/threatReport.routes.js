const express = require('express');
const { reportThreat, getThreats, voteThreat } = require('../controllers/threatReport.controller');

const router = express.Router();

router.post('/report', reportThreat);
router.get('/threats', getThreats);
router.post('/threats/:id/vote', voteThreat);

module.exports = router;
