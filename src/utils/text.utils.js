const SUSPICIOUS_KEYWORDS = [
  'urgent',
  'verify',
  'free',
  'winner',
  'limited time',
  'account locked',
  'click now',
  'password reset',
  'confirm identity',
  'bank'
];

function detectSuspiciousKeywords(text) {
  const lower = (text || '').toLowerCase();
  return SUSPICIOUS_KEYWORDS.filter((keyword) => lower.includes(keyword));
}

module.exports = {
  SUSPICIOUS_KEYWORDS,
  detectSuspiciousKeywords
};
