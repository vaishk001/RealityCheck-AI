const path = require('path');
const multer = require('multer');

const ALLOWED_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.eml',
  '.pdf',
  '.docx',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.bmp',
  '.tif',
  '.tiff'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      const error = new Error('Unsupported file type. Upload txt, pdf, docx, or image files.');
      error.statusCode = 400;
      return cb(error);
    }

    cb(null, true);
  }
});

module.exports = {
  upload
};
