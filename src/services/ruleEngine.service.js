'use strict';

const { safeParseUrl, isIpHost, countDots } = require('../utils/url.utils');

// ─── URL Rule Constants ────────────────────────────────────────────────────────

/** Free/abused TLDs commonly used in phishing infrastructure */
const SUSPICIOUS_TLDS = new Set([
  'xyz', 'tk', 'ru', 'ml', 'ga', 'cf', 'gq', 'pw', 'top', 'click',
  'download', 'review', 'stream', 'gdn', 'accountant', 'date', 'faith',
  'loan', 'men', 'racing', 'trade', 'webcam', 'win', 'work', 'party',
  'science', 'bid', 'cricket', 'ninja', 'link', 'site', 'online',
  'space', 'tech', 'website', 'store', 'icu', 'vip', 'life', 'live',
]);

/** Common URL shorteners used to hide malicious destinations */
const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd',
  'buff.ly', 'adf.ly', 'j.mp', 'short.link', 'rebrand.ly', 'cutt.ly',
  'shorte.st', 'link.tl', 'bc.vc', 'clck.ru', 'tiny.cc', 'lnkd.in',
]);

/** Phishing/scam keywords found in URLs */
const URL_KEYWORDS = [
  'login', 'verify', 'update', 'secure', 'bank', 'free', 'urgent',
  'account', 'confirm', 'password', 'recover', 'reset', 'validate',
  'billing', 'support', 'help-center', 'suspended', 'unusual',
  'webscr', 'checkout', 'invoice', 'refund', 'claim', 'winner',
  'limited', 'expire', 'activation', 'signin', 'auth', 'wallet',
  'crypto', 'investment', 'bonus', 'prize', 'lottery',
];

/** Major brands frequently impersonated in phishing */
const IMPERSONATED_BRANDS = [
  'paypal', 'google', 'microsoft', 'apple', 'amazon', 'facebook',
  'instagram', 'netflix', 'steam', 'binance', 'coinbase', 'metamask',
  'wellsfargo', 'chase', 'bankofamerica', 'citibank', 'hdfc', 'icici',
  'sbi', 'axis', 'flipkart', 'ebay', 'twitter', 'whatsapp', 'telegram',
  'irs', 'uidai', 'incometax', 'epfo', 'paytm', 'phonepe', 'gpay',
  'upi', 'bhim', 'dhl', 'fedex', 'ups', 'usps', 'linkedin', 'yahoo',
  'dropbox', 'adobe', 'docusign', 'zoom', 'webex', 'office365',
];

/** Truly trusted domains — suppress most URL signals for these */
const TRUSTED_DOMAIN_SUFFIXES = [
  'google.com', 'microsoft.com', 'apple.com', 'github.com',
  'paypal.com', 'amazon.com', 'facebook.com', 'instagram.com',
  'linkedin.com', 'x.com', 'twitter.com', 'youtube.com',
  'wikipedia.org', 'stackoverflow.com', 'mozilla.org',
];

/** Digit ↔ letter homograph substitution map */
const HOMOGRAPH_CHAR_MAP = { '0': 'o', '1': 'l', '3': 'e', '5': 's', '7': 't', '@': 'a' };

/** Non-standard ports that are red flags for web traffic */
const SUSPICIOUS_PORTS = new Set([8080, 8443, 8888, 9090, 3000, 4200, 5000, 4000]);

// ─── Text Rule Constants ───────────────────────────────────────────────────────

const URGENCY_PATTERNS = [
  'act now', 'limited time', 'urgent', 'immediately', 'final warning',
  'expires today', 'last chance', 'hurry', 'don\'t delay', 'respond now',
  'within 24 hours', 'within 48 hours', 'action required', 'time sensitive',
  'deadline', 'your account will be', 'account suspended',
];

const TOO_GOOD_PATTERNS = [
  /earn\s*\$?\d+(?:\s*\/\s*(?:day|week|month))?/i,
  /free\s+money/i,
  /guaranteed\s+income/i,
  /risk[-\s]?free\s+profit/i,
  /winner|you\s+won/i,
  /\$\s*\d{3,}[\d,]*\s*(prize|reward|bonus|profit|return)/i,
  /double\s+your\s+(money|investment|bitcoin)/i,
  /\d{2,3}%\s*(roi|return|profit|interest)\s*(per\s*(day|week|month))?/i,
  /no\s+(risk|experience|skills?)\s+required/i,
  /work\s+from\s+home.{0,30}(earn|\$)/i,
  /passive\s+income/i,
  /financial\s+freedom/i,
  /lottery|jackpot|mega\s+prize/i,
  /you\s+have\s+been\s+(selected|chosen|awarded)/i,
];

const SENSITIVE_INFO_PATTERNS = [
  /\botp\b/i, /\bone[\s-]time[\s-]password\b/i, /\bpassword\b/i,
  /\bpin\b/i, /\bbank\s+details\b/i, /\bcard\s+number\b/i,
  /\bcvv\b/i, /\bssn\b/i, /\baadhar\b/i, /\baadhaar\b/i,
  /\bpan\s+card\b/i, /\bvpa\b/i, /\bupi\s+(id|pin)\b/i,
  /\bmpin\b/i, /\bnet\s*banking\b/i, /\binternet\s+banking\b/i,
  /\baccount\s+(number|no\.?)\b/i, /\bifsc\b/i, /\bsort\s+code\b/i,
  /\bcredit\s+card\b/i, /\bdebit\s+card\b/i, /\bexpiry\b/i,
  /\bsocial\s+security\b/i, /\btax\s+(id|number)\b/i,
  /\bdriving\s+licen[sc]e\b/i, /\bpassport\s+number\b/i,
  /\bwallet\s+(address|seed|phrase|key)\b/i, /\bprivate\s+key\b/i,
  /\bseed\s+phrase\b/i, /\brecovery\s+phrase\b/i,
];

const REQUEST_VERB_PATTERNS = [
  /\bshare\b/i, /\bsend\b/i, /\bprovide\b/i, /\bconfirm\b/i,
  /\breply\s+with\b/i, /\bsubmit\b/i, /\benter\b/i, /\bgive\b/i,
  /\btype\b/i, /\bkey\s+in\b/i, /\bfill\s+(in|out)\b/i,
  /\bupload\b/i, /\bclick\s+(here|the\s+link|below)\b/i,
  /\btap\s+(here|the\s+link)\b/i,
];

const NEGATION_PATTERNS = [
  /\bdo\s+not\s+share\b/i, /\bnever\s+share\b/i,
  /\bdo\s+not\s+give\b/i, /\bnever\s+give\b/i,
  /\bdo\s+not\s+reply\s+with\b/i, /\bnever\s+reply\s+with\b/i,
  /\bdo\s+not\s+click\b/i, /\bbeware\b/i,
];

const EMOTIONAL_MANIPULATION_TERMS = [
  'panic', 'fear', 'suspended', 'locked', 'penalty', 'reward',
  'claim now', 'last chance', 'terminated', 'deactivated', 'blocked',
  'restricted', 'compromised', 'hacked', 'unauthorized access',
  'unusual activity', 'suspicious login', 'police', 'legal action',
  'arrest', 'warrant', 'cybercrime', 'edd', 'irs notice', 'tax evasion',
];

/** Government/authority impersonation indicators */
const GOV_IMPERSONATION_PATTERNS = [
  /\b(irs|fbi|cia|interpol|police|court|magistrate)\b/i,
  /\b(income\s+tax\s+department|cbdt|enforcement\s+directorate)\b/i,
  /\b(uidai|epfo|ministry|government\s+of)\b/i,
  /\b(reserve\s+bank|rbi|sebi|trai)\b/i,
  /\b(social\s+security\s+administration|ssa)\b/i,
  /\b(medicare|medicaid|federal)\b/i,
];

/** Tech support scam indicators */
const TECH_SUPPORT_PATTERNS = [
  /your\s+(computer|pc|device|system)\s+(is\s+)?(infected|hacked|compromised|at\s+risk)/i,
  /call\s+(microsoft|apple|google|amazon)\s+(support|helpline|toll[\s-]?free)/i,
  /virus\s+(detected|found|alert)/i,
  /\b(toll[\s-]?free|helpline|customer\s+care)\s*:?\s*\+?[\d\s()-]{7,}/i,
  /remote\s+(access|desktop|assistance|control)/i,
  /download\s+(anydesk|teamviewer|ultraviewer)/i,
  /your\s+license\s+(has\s+)?(expired|is\s+invalid)/i,
];

/** Romance/grooming scam indicators */
const ROMANCE_SCAM_PATTERNS = [
  /\b(i\s+love\s+you|i\s+miss\s+you).{0,50}(money|send|help|urgent)/i,
  /stuck\s+(in|at).{0,30}(airport|customs|hospital).{0,50}(money|help|urgent)/i,
  /military\s+(doctor|officer|engineer).{0,50}(love|money|gift)/i,
  /send\s+(gift\s+card|itunes|amazon\s+card|google\s+play)/i,
  /western\s+union|moneygram|wire\s+transfer.{0,50}(urgent|love|help)/i,
];

/** Investment / crypto scam indicators */
const INVESTMENT_SCAM_PATTERNS = [
  /\b(bitcoin|eth|usdt|crypto)\s+(investment|trading|profit|earn)/i,
  /guaranteed\s+(return|profit|income)\s+of\s+\d+%/i,
  /pump\s+and\s+dump/i,
  /insider\s+(tip|trading|information)/i,
  /(forex|binary\s+option)\s+(signal|trading|bot|robot)/i,
  /nft\s+(investment|profit|giveaway|airdrop)/i,
  /crypto\s+(recovery|wallet|restore)\s+(service|expert)/i,
  /ponzi|pyramid\s+scheme|mlm\s+(income|business)/i,
];

/** UPI / payment scam indicators (India-specific) */
const UPI_SCAM_PATTERNS = [
  /scan\s+(the\s+)?(qr|code)\s+(to\s+)?(receive|get|claim)/i,
  /upi\s+(request|collect|mandate)/i,
  /send\s+\d+\s*(rs|inr|₹)\s+(to\s+)?(receive|get|claim)\s+\d+/i,
  /paytm\s+(wallet|cashback|offer)/i,
  /\b(phonepe|gpay|paytm)\s+(verification|kyc|update)/i,
  /kyc\s+(expired|update|verify|pending)/i,
  /your\s+upi\s+(id\s+)?(has\s+been\s+)?(blocked|suspended|deactivated)/i,
];

/** Lottery / prize scam indicators */
const LOTTERY_PATTERNS = [
  /you\s+have\s+(won|been\s+selected|been\s+awarded)/i,
  /\b(lottery|sweepstake|raffle|prize\s+draw)\b/i,
  /claim\s+your\s+(prize|reward|gift|winnings)/i,
  /\$\s*[\d,]+\s*(million|thousand)?\s*(prize|jackpot|reward)/i,
  /processing\s+(fee|charge|tax)\s+(to\s+)?(release|claim|receive)/i,
  /congratulations.{0,60}(winner|selected|prize)/i,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLower(input) {
  return String(input || '').toLowerCase();
}

function isTrustedDomain(hostname) {
  const host = toLower(hostname);
  return TRUSTED_DOMAIN_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

function toFindings(ruleResults) {
  return ruleResults.flatMap((rule) =>
    (rule.reasons || []).map((reason) => ({
      reason,
      weight: Number(rule.score || 0),
      source: 'rule',
    }))
  );
}

function normalizeHomographLikeText(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[013578@]/g, (ch) => HOMOGRAPH_CHAR_MAP[ch] || ch);
}

// ─── URL Rules ────────────────────────────────────────────────────────────────

function ruleSuspiciousTld(parsed) {
  if (isTrustedDomain(parsed.hostname)) return { score: 0, reasons: [] };
  const tld = toLower(parsed.hostname).split('.').filter(Boolean).pop() || '';
  if (!SUSPICIOUS_TLDS.has(tld)) return { score: 0, reasons: [] };
  return { score: 14, reasons: [`URL uses high-risk TLD: .${tld}`] };
}

function ruleUrlShortener(parsed) {
  const host = toLower(parsed.hostname).replace(/^www\./, '');
  if (!URL_SHORTENERS.has(host)) return { score: 0, reasons: [] };
  return { score: 18, reasons: [`URL uses a link shortener (${host}) — final destination hidden`] };
}

function ruleExcessiveSubdomains(parsed) {
  if (isTrustedDomain(parsed.hostname)) return { score: 0, reasons: [] };
  const dots = countDots(parsed.hostname);
  if (dots < 3) return { score: 0, reasons: [] };
  return {
    score: Math.min(20, 8 + (dots - 3) * 4),
    reasons: [`Excessive subdomain depth (${dots} levels) — common in brand-impersonation attacks`],
  };
}

function ruleUrlLength(rawUrl) {
  const len = String(rawUrl || '').length;
  if (len < 90) return { score: 0, reasons: [] };
  if (len >= 180) return { score: 18, reasons: [`URL is extremely long (${len} chars) — typical of obfuscation`] };
  if (len >= 140) return { score: 14, reasons: [`URL is suspiciously long (${len} chars)`] };
  return { score: 8, reasons: [`URL length above normal threshold (${len} chars)`] };
}

function ruleIpBasedUrl(parsed) {
  if (!isIpHost(parsed.hostname)) return { score: 0, reasons: [] };
  // Private IP ranges are higher risk (exfiltration / SSRF bait)
  const isPrivate = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(parsed.hostname);
  return {
    score: isPrivate ? 22 : 20,
    reasons: [`URL uses a raw IP address (${parsed.hostname}) instead of a domain name`],
  };
}

function ruleSuspiciousPort(parsed) {
  const port = Number(parsed.port);
  if (!port || !SUSPICIOUS_PORTS.has(port)) return { score: 0, reasons: [] };
  return { score: 12, reasons: [`URL uses non-standard port ${port} — uncommon for legitimate web services`] };
}

function ruleDataUri(rawUrl) {
  if (!toLower(rawUrl).startsWith('data:')) return { score: 0, reasons: [] };
  return { score: 30, reasons: ['URL is a data: URI — used to embed malicious content without a domain'] };
}

function ruleEncodedCharacters(rawUrl) {
  if (isTrustedDomain(safeParseUrl(rawUrl)?.hostname || '')) return { score: 0, reasons: [] };
  const pctCount = (rawUrl.match(/%[0-9a-fA-F]{2}/g) || []).length;
  if (pctCount < 5) return { score: 0, reasons: [] };
  return {
    score: Math.min(16, 8 + Math.floor(pctCount / 5) * 2),
    reasons: [`URL contains heavy percent-encoding (${pctCount} encoded chars) — possible obfuscation`],
  };
}

function rulePunycodeOrIdn(parsed) {
  if (isTrustedDomain(parsed.hostname)) return { score: 0, reasons: [] };
  const hasXnLabel = parsed.hostname.split('.').some((l) => l.startsWith('xn--'));
  if (!hasXnLabel) return { score: 0, reasons: [] };
  return { score: 20, reasons: ['Domain uses Punycode/IDN encoding — potential IDN homograph attack'] };
}

function ruleUrlKeywords(rawUrl) {
  const parsed = safeParseUrl(rawUrl);
  if (parsed?.hostname && isTrustedDomain(parsed.hostname)) return { score: 0, reasons: [] };
  const lowered = toLower(rawUrl);
  const matched = URL_KEYWORDS.filter((kw) => lowered.includes(kw));
  if (matched.length === 0) return { score: 0, reasons: [] };
  return {
    score: Math.min(20, 6 + matched.length * 2),
    reasons: [`URL contains phishing keywords: ${matched.slice(0, 5).join(', ')}`],
  };
}

function ruleBrandImpersonation(parsed) {
  if (isTrustedDomain(parsed.hostname)) return { score: 0, reasons: [] };
  const host = normalizeHomographLikeText(parsed.hostname);
  const matched = IMPERSONATED_BRANDS.filter((brand) => host.includes(brand));
  if (matched.length === 0) return { score: 0, reasons: [] };
  // Extra weight when brand name appears in a subdomain (not the registrable domain)
  const domainParts = host.split('.');
  const registrable = domainParts.slice(-2).join('.');
  const isInSubdomain = matched.some((b) => !registrable.includes(b));
  return {
    score: isInSubdomain ? 28 : 18,
    reasons: [
      isInSubdomain
        ? `Brand impersonation in subdomain: "${matched[0]}" (common phishing tactic)`
        : `Domain name resembles trusted brand: "${matched[0]}"`,
    ],
  };
}

function ruleBasicHomograph(parsed) {
  if (isTrustedDomain(parsed.hostname)) return { score: 0, reasons: [] };
  const host = toLower(parsed.hostname);
  const hasLettersAndDigits = /[a-z]/.test(host) && /\d/.test(host);
  if (!hasLettersAndDigits) return { score: 0, reasons: [] };
  const normalizedHost = normalizeHomographLikeText(host);
  if (normalizedHost === host) return { score: 0, reasons: [] };
  const revealed = IMPERSONATED_BRANDS.filter((b) => normalizedHost.includes(b));
  if (revealed.length === 0) return { score: 0, reasons: [] };
  return {
    score: 22,
    reasons: [`Homograph obfuscation detected — hostname normalizes to impersonated brand: ${revealed[0]}`],
  };
}

function ruleHttps(parsed) {
  if (isTrustedDomain(parsed.hostname)) return { score: 0, reasons: [] };
  if (toLower(parsed.protocol) === 'https:') return { score: 0, reasons: [] };
  return { score: 8, reasons: ['URL uses HTTP instead of HTTPS — no transport encryption'] };
}

function ruleQueryParamCount(parsed) {
  if (isTrustedDomain(parsed.hostname)) return { score: 0, reasons: [] };
  const params = [...new URLSearchParams(parsed.search).keys()].length;
  if (params < 6) return { score: 0, reasons: [] };
  return {
    score: Math.min(12, 6 + params),
    reasons: [`URL has ${params} query parameters — consistent with redirect/tracking abuse`],
  };
}

/**
 * Rule: Detect http://trusted.com@evil.com — the @ sign makes the browser
 * treat everything before @ as userinfo and navigate to evil.com.
 */
function ruleAtSignRedirect(rawUrl) {
  // Only flag if @ appears in the authority portion (before first /)
  const withoutProtocol = rawUrl.replace(/^https?:\/\//, '');
  const authority = withoutProtocol.split('/')[0] || '';
  if (!authority.includes('@')) return { score: 0, reasons: [] };
  return { score: 28, reasons: ['URL contains @ sign — classic redirect trick (real destination is after the @)'] };
}

/**
 * Rule: Dash-bombing — excessive hyphens in hostname labels indicate
 * machine-generated or typosquatting domains (e.g. paypal-secure-login-verify.com).
 */
function ruleDashBombing(parsed) {
  if (isTrustedDomain(parsed.hostname)) return { score: 0, reasons: [] };
  const dashCount = (parsed.hostname.match(/-/g) || []).length;
  if (dashCount < 3) return { score: 0, reasons: [] };
  return {
    score: Math.min(18, 6 + dashCount * 3),
    reasons: [`Hostname has ${dashCount} hyphens — typical of generated phishing domains`],
  };
}

/**
 * Rule: Hostname entropy — random-looking hostnames (DGA, typosquatting generators)
 * have high character entropy.  We compute Shannon entropy over the labels.
 */
function ruleHostnameEntropy(parsed) {
  if (isTrustedDomain(parsed.hostname)) return { score: 0, reasons: [] };
  const labels = toLower(parsed.hostname).split('.').slice(0, -1).join(''); // strip TLD
  if (labels.length < 8) return { score: 0, reasons: [] };

  // Shannon entropy
  const freq = {};
  for (const ch of labels) freq[ch] = (freq[ch] || 0) + 1;
  let entropy = 0;
  for (const ch of Object.keys(freq)) {
    const p = freq[ch] / labels.length;
    entropy -= p * Math.log2(p);
  }
  if (entropy < 3.8) return { score: 0, reasons: [] };
  return {
    score: Math.min(16, Math.round((entropy - 3.8) * 12)),
    reasons: [`Hostname has high randomness (entropy ${entropy.toFixed(2)}) — possible auto-generated domain`],
  };
}

/**
 * Rule: Double file extension in URL path — e.g. /document.pdf.exe, /invoice.doc.html
 */
function ruleDoubleExtension(rawUrl) {
  const parsed = safeParseUrl(rawUrl);
  if (!parsed) return { score: 0, reasons: [] };
  const path = parsed.pathname || '';
  const dangerousExts = /\.(exe|bat|cmd|scr|pif|com|vbs|js|jar|msi|ps1|sh)\s*$/i;
  const hasDouble = /\.\w{2,5}\.\w{2,5}$/.test(path) && dangerousExts.test(path);
  if (!hasDouble) return { score: 0, reasons: [] };
  return { score: 22, reasons: ['URL path contains double file extension — disguised executable download'] };
}

/**
 * Rule: Suspicious fragment hash — base64-encoded data or very long fragments
 * used to smuggle payloads past server-side inspection.
 */
function ruleSuspiciousFragment(rawUrl) {
  const parsed = safeParseUrl(rawUrl);
  if (!parsed || !parsed.hash) return { score: 0, reasons: [] };
  const frag = parsed.hash.slice(1); // remove leading #
  if (frag.length < 40) return { score: 0, reasons: [] };
  const looksBase64 = /^[A-Za-z0-9+/=]{40,}$/.test(frag);
  return {
    score: looksBase64 ? 18 : 10,
    reasons: [looksBase64
      ? 'URL fragment contains base64-encoded payload — possible data exfiltration'
      : `URL fragment is unusually long (${frag.length} chars) — possible payload smuggling`
    ],
  };
}

/**
 * Master URL rule orchestrator.
 */
function analyzeUrlRules(rawUrl) {
  const parsed = safeParseUrl(rawUrl);
  if (!parsed) {
    const ruleResults = [{ score: 30, reasons: ['URL is malformed or unparseable'] }];
    return { score: 30, reasons: ruleResults[0].reasons, ruleResults, findings: toFindings(ruleResults) };
  }

  const ruleResults = [
    ruleSuspiciousTld(parsed),
    ruleUrlShortener(parsed),
    ruleExcessiveSubdomains(parsed),
    ruleUrlLength(rawUrl),
    ruleIpBasedUrl(parsed),
    ruleSuspiciousPort(parsed),
    ruleDataUri(rawUrl),
    ruleEncodedCharacters(rawUrl),
    rulePunycodeOrIdn(parsed),
    ruleUrlKeywords(rawUrl),
    ruleBrandImpersonation(parsed),
    ruleBasicHomograph(parsed),
    ruleHttps(parsed),
    ruleQueryParamCount(parsed),
    ruleAtSignRedirect(rawUrl),
    ruleDashBombing(parsed),
    ruleHostnameEntropy(parsed),
    ruleDoubleExtension(rawUrl),
    ruleSuspiciousFragment(rawUrl),
  ];

  const reasons = ruleResults.flatMap((r) => r.reasons);
  const score   = Math.min(100, ruleResults.reduce((s, r) => s + Number(r.score || 0), 0));

  return { score, reasons, ruleResults, findings: toFindings(ruleResults), parsedHost: parsed.hostname };
}

// ─── Text Rules ───────────────────────────────────────────────────────────────

function ruleUrgencyLanguage(text) {
  const lowered = toLower(text);
  const matched = URGENCY_PATTERNS.filter((t) => lowered.includes(t));
  if (matched.length === 0) return { score: 0, reasons: [] };
  return {
    score: Math.min(14, 4 + matched.length * 3),
    reasons: [`Urgency language detected: "${matched.slice(0, 3).join('", "')}"`],
  };
}

function ruleTooGoodToBeTrue(text) {
  const matched = TOO_GOOD_PATTERNS.filter((r) => r.test(text));
  if (matched.length === 0) return { score: 0, reasons: [] };
  return { score: 20, reasons: ['Unrealistic financial promises detected (too-good-to-be-true)'] };
}

function ruleSensitiveInfoRequest(text) {
  const matched = SENSITIVE_INFO_PATTERNS.filter((r) => r.test(text));
  if (matched.length === 0) return { score: 0, reasons: [] };
  if (NEGATION_PATTERNS.some((r) => r.test(text))) return { score: 0, reasons: [] };
  if (!REQUEST_VERB_PATTERNS.some((r) => r.test(text))) return { score: 0, reasons: [] };
  return {
    score: 25,
    reasons: [`Request for sensitive credentials detected (OTP/PIN/bank/crypto details)`],
  };
}

function ruleEmotionalManipulation(text) {
  const lowered = toLower(text);
  const matched = EMOTIONAL_MANIPULATION_TERMS.filter((t) => lowered.includes(t));
  if (matched.length === 0) return { score: 0, reasons: [] };
  return {
    score: Math.min(16, 6 + matched.length * 2),
    reasons: [`Emotional manipulation detected: "${matched.slice(0, 3).join('", "')}"`],
  };
}

function ruleGovImpersonation(text) {
  const matched = GOV_IMPERSONATION_PATTERNS.filter((r) => r.test(text));
  if (matched.length === 0) return { score: 0, reasons: [] };
  return { score: 22, reasons: ['Government or law enforcement impersonation detected'] };
}

function ruleTechSupportScam(text) {
  const matched = TECH_SUPPORT_PATTERNS.filter((r) => r.test(text));
  if (matched.length === 0) return { score: 0, reasons: [] };
  return { score: Math.min(24, 10 + matched.length * 7), reasons: ['Tech support scam indicators detected'] };
}

function ruleRomanceScam(text) {
  const matched = ROMANCE_SCAM_PATTERNS.filter((r) => r.test(text));
  if (matched.length === 0) return { score: 0, reasons: [] };
  return { score: 22, reasons: ['Romance/grooming scam pattern detected'] };
}

function ruleInvestmentScam(text) {
  const matched = INVESTMENT_SCAM_PATTERNS.filter((r) => r.test(text));
  if (matched.length === 0) return { score: 0, reasons: [] };
  return { score: Math.min(24, 10 + matched.length * 5), reasons: ['Investment or crypto scam indicators detected'] };
}

function ruleUpiScam(text) {
  const matched = UPI_SCAM_PATTERNS.filter((r) => r.test(text));
  if (matched.length === 0) return { score: 0, reasons: [] };
  return { score: Math.min(22, 8 + matched.length * 6), reasons: ['UPI/payment scam pattern detected'] };
}

function ruleLotteryScam(text) {
  const matched = LOTTERY_PATTERNS.filter((r) => r.test(text));
  if (matched.length === 0) return { score: 0, reasons: [] };
  return { score: 20, reasons: ['Lottery or prize scam pattern detected'] };
}

/**
 * Master text rule orchestrator.
 */
function analyzeTextRules(text) {
  const ruleResults = [
    ruleUrgencyLanguage(text),
    ruleTooGoodToBeTrue(text),
    ruleSensitiveInfoRequest(text),
    ruleEmotionalManipulation(text),
    ruleGovImpersonation(text),
    ruleTechSupportScam(text),
    ruleRomanceScam(text),
    ruleInvestmentScam(text),
    ruleUpiScam(text),
    ruleLotteryScam(text),
  ];

  const reasons = ruleResults.flatMap((r) => r.reasons);
  const score   = Math.min(100, ruleResults.reduce((s, r) => s + Number(r.score || 0), 0));

  return { score, reasons, ruleResults, findings: toFindings(ruleResults) };
}

module.exports = { analyzeUrlRules, analyzeTextRules };
