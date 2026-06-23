const path = require('path');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');

const MAX_TEXT_LENGTH = 12000;

function normalizeText(text) {
  return String(text || '')
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

function isTextLike(mime, ext) {
  return mime?.startsWith('text/') || ['.txt', '.md', '.csv', '.json', '.eml'].includes(ext);
}

function isPdf(mime, ext) {
  return mime === 'application/pdf' || ext === '.pdf';
}

function isDocx(mime, ext) {
  return (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  );
}

function isImage(mime, ext) {
  return mime?.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tif', '.tiff'].includes(ext);
}

async function extractTextFromFile(file) {
  if (!file || !file.buffer) {
    throw new Error('No file uploaded');
  }

  const mime = String(file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (isTextLike(mime, ext)) {
    return normalizeText(file.buffer.toString('utf8'));
  }

  if (isPdf(mime, ext)) {
    const parser = new PDFParse({ data: file.buffer });
    try {
      const parsed = await parser.getText();
      return normalizeText(parsed?.text || '');
    } finally {
      await parser.destroy();
    }
  }

  if (isDocx(mime, ext)) {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return normalizeText(parsed?.value || '');
  }

  if (isImage(mime, ext)) {
    const result = await Tesseract.recognize(file.buffer, 'eng');
    return normalizeText(result?.data?.text || '');
  }

  throw new Error('Unsupported file type. Upload txt, pdf, docx, or image files.');
}

module.exports = {
  extractTextFromFile
};
