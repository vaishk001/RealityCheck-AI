const express = require('express');
const { scanUrl, scanText, scanFile } = require('../controllers/scan.controller');
const { upload } = require('../middlewares/upload.middleware');

const router = express.Router();

router.post('/scan-url', scanUrl);
router.post('/scan-text', scanText);
router.post('/scan-file', upload.single('file'), scanFile);

module.exports = router;
