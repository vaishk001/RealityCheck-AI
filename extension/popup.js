/**
 * popup.js — RealityCheck AI Chrome Extension
 *
 * Lifecycle:
 *  1. DOMContentLoaded → resolve current tab URL
 *  2. Check session cache for an existing scan result
 *  3. If cache hit → render result immediately (no API call)
 *  4. If cache miss → auto-scan the page
 *  5. "Scan This Page" button → always triggers a fresh scan
 *  6. "Dashboard" button → opens the full web app
 */

// ─── Config ────────────────────────────────────────────────────────────────────

const API_BASE       = 'http://localhost:4000/api';
const DASHBOARD_URL  = 'http://localhost:5173/app';
const CIRCUMFERENCE  = 2 * Math.PI * 52; // matches r="52" in SVG

// ─── DOM References ────────────────────────────────────────────────────────────

const elCurrentUrl   = document.getElementById('current-url');
const elStateLoading = document.getElementById('state-loading');
const elStateResult  = document.getElementById('state-result');
const elStateError   = document.getElementById('state-error');

const elScoreValue   = document.getElementById('score-value');
const elScoreArc     = document.getElementById('score-arc');
const elStatusBadge  = document.getElementById('status-badge');
const elRiskLabel    = document.getElementById('risk-label');
const elSummaryText  = document.getElementById('summary-text');
const elReasonsList  = document.getElementById('reasons-list');

const elErrorTitle   = document.getElementById('error-title');
const elErrorMessage = document.getElementById('error-message');

const btnScan        = document.getElementById('btn-scan');
const btnOpenApp     = document.getElementById('btn-open-app');

// ─── State ─────────────────────────────────────────────────────────────────────

let activeTab = null; // The Chrome tab object for the current page

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Resolve the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tab;

    if (!tab?.url) {
      showError('No URL found', 'Could not detect the current page URL.');
      return;
    }

    // 2. Show the URL in the strip (truncate for readability)
    elCurrentUrl.textContent = prettifyUrl(tab.url);
    elCurrentUrl.title       = tab.url;

    // 3. Enable the Scan button now we have a URL
    btnScan.disabled = false;

    // 4. Check for a cached result from background.js
    const cached = await getCachedResult(tab.id);
    if (cached) {
      renderResult(cached);
    } else {
      // Auto-scan on popup open
      await runScan(tab.url, tab.id);
    }

  } catch (err) {
    console.error('[RealityCheck] Bootstrap error:', err);
    showError('Unexpected error', err.message ?? 'An unknown error occurred.');
  }
});

// ─── Button Handlers ───────────────────────────────────────────────────────────

/** "Scan This Page" → always fires a fresh scan */
btnScan.addEventListener('click', async () => {
  if (!activeTab?.url) return;
  await runScan(activeTab.url, activeTab.id);
});

/** "Dashboard" → open the full web app in a new tab */
btnOpenApp.addEventListener('click', () => {
  chrome.tabs.create({ url: DASHBOARD_URL });
});

// ─── Debug Buttons ─────────────────────────────────────────────────────────────

/**
 * Sends a SHOW_OVERLAY message directly to the active tab's content script
 * with a fake scan result. Lets us verify content.js works without waiting
 * for the full background scan pipeline (which needs Ollama + the API).
 *
 * @param {'Dangerous'|'Suspicious'} status
 * @param {number} score
 */
async function testOverlay(status, score) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const fakeResult = {
    score,
    status,
    summary: `[TEST] This is a simulated ${status.toLowerCase()} result injected from the RealityCheck AI popup. The real scan pipeline uses the backend API and Ollama AI analysis.`,
    reasons: [
      'Simulated threat signal #1 — URL pattern matches known phishing templates',
      'Simulated threat signal #2 — Domain registered less than 7 days ago',
      'Simulated threat signal #3 — No HTTPS certificate authority on record',
    ],
  };

  try {
    // Try direct message first (content script already in page via manifest)
    await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_OVERLAY', result: fakeResult });
    console.log('[RealityCheck Popup] Test overlay sent successfully');
  } catch (err) {
    console.warn('[RealityCheck Popup] Direct message failed, injecting content.js first…', err.message);
    // Fallback: programmatically inject content.js then retry
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await new Promise(r => setTimeout(r, 100));
      await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_OVERLAY', result: fakeResult });
      console.log('[RealityCheck Popup] Test overlay sent after injection');
    } catch (injectErr) {
      console.error('[RealityCheck Popup] Could not inject overlay:', injectErr.message);
      showError('Cannot inject overlay', `Page may be blocking content scripts: ${injectErr.message}`);
    }
  }
}

const btnTestDangerous  = document.getElementById('btn-test-dangerous');
const btnTestSuspicious = document.getElementById('btn-test-suspicious');

btnTestDangerous.addEventListener('click',  () => testOverlay('Dangerous',  84));
btnTestSuspicious.addEventListener('click', () => testOverlay('Suspicious', 55));

// ─── Core: Scan ────────────────────────────────────────────────────────────────

/**
 * Runs a full scan for the given URL.
 *  - Notifies background.js to reset the badge
 *  - Calls POST /api/scan-url
 *  - On success → renders result + updates badge
 *  - On failure → shows appropriate error
 *
 * @param {string} url    — The URL to scan
 * @param {number} tabId  — Chrome tab ID (for badge + cache)
 */
async function runScan(url, tabId) {
  showLoading();

  // Tell background.js the scan has started → grey "…" badge
  chrome.runtime.sendMessage({ type: 'SCAN_START', tabId });

  try {
    const result = await callScanApi(url);

    // Notify background.js → update badge + cache the result
    chrome.runtime.sendMessage({ type: 'SCAN_COMPLETE', tabId, result });

    renderResult(result);

  } catch (err) {
    console.error('[RealityCheck] Scan error:', err);

    // Distinguish "backend is down" from other API errors
    if (err.isNetworkError) {
      showError('Backend not reachable',
        'Make sure the RealityCheck AI server is running on localhost:4000.');
    } else {
      showError('Scan failed',
        err.message ?? 'The API returned an unexpected error.');
    }
  }
}

// ─── API Call ──────────────────────────────────────────────────────────────────

/**
 * POSTs the URL to the backend scan endpoint.
 * Throws a typed error on failure so callers can distinguish network vs API errors.
 *
 * @param {string} url
 * @returns {Promise<ScanResult>}
 */
async function callScanApi(url) {
  let response;

  try {
    response = await fetch(`${API_BASE}/scan-url`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url }),
    });
  } catch (_networkErr) {
    // fetch() itself failed → server is unreachable
    const err = new Error('Cannot connect to localhost:4000');
    err.isNetworkError = true;
    throw err;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message ?? `API error ${response.status}`);
  }

  return response.json();
}

// ─── Cached Result ─────────────────────────────────────────────────────────────

/**
 * Asks background.js for a previously cached scan result for this tab.
 * Returns null if none found.
 *
 * @param {number} tabId
 * @returns {Promise<ScanResult|null>}
 */
function getCachedResult(tabId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_CACHED', tabId }, (resp) => {
      // chrome.runtime.lastError can fire if background hasn't woken yet
      if (chrome.runtime.lastError) { resolve(null); return; }
      resolve(resp?.result ?? null);
    });
  });
}

// ─── UI: State Transitions ─────────────────────────────────────────────────────

function showLoading() {
  setActiveState('loading');
  btnScan.disabled = true;
  btnScan.innerHTML = '<span class="btn-icon">⏳</span> Scanning…';
}

function showError(title, message) {
  elErrorTitle.textContent   = title;
  elErrorMessage.textContent = message;
  setActiveState('error');
  btnScan.disabled = false;
  btnScan.innerHTML = '<span class="btn-icon">🔄</span> Retry';
}

function setActiveState(state) {
  elStateLoading.classList.add('hidden');
  elStateResult.classList.add('hidden');
  elStateError.classList.add('hidden');

  if (state === 'loading') elStateLoading.classList.remove('hidden');
  if (state === 'result')  elStateResult.classList.remove('hidden');
  if (state === 'error')   elStateError.classList.remove('hidden');
}

// ─── UI: Render Result ─────────────────────────────────────────────────────────

/**
 * Populates the result state with data from the API.
 *
 * @param {Object} result
 * @param {number}   result.score     — 0–100 risk score
 * @param {string}   result.status    — "Safe" | "Suspicious" | "Dangerous"
 * @param {string}   [result.summary] — AI-generated summary
 * @param {string[]} [result.reasons] — Array of reason strings
 */
function renderResult(result) {
  const score   = result.score   ?? 0;
  const status  = result.status  ?? 'Unknown';
  const summary = result.summary ?? result.aiSummary ?? result.explanation ?? 'No summary available.';
  const reasons = result.reasons ?? result.flags ?? [];

  // ── Score arc animation ──
  const progress   = Math.min(Math.max(score, 0), 100) / 100;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  elScoreValue.textContent       = score;
  elScoreArc.style.strokeDashoffset = dashOffset;

  // ── Status colour ──
  const statusClass = normaliseStatus(status);
  elScoreArc.className = `score-arc ${statusClass}`;

  // Status badge
  const statusEmoji = { safe: '✅', suspicious: '⚠️', dangerous: '🚨' };
  elStatusBadge.className      = `status-badge ${statusClass}`;
  elStatusBadge.textContent    = `${statusEmoji[statusClass] ?? '🔍'} ${status}`;

  // Risk label
  elRiskLabel.textContent = riskLabel(score);

  // ── Summary ──
  elSummaryText.textContent = summary;

  // ── Reasons (top 3) ──
  elReasonsList.innerHTML = '';
  const topReasons = reasons.slice(0, 3);

  if (topReasons.length === 0) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="reason-bullet safe"></span><span>No specific risk signals detected.</span>`;
    elReasonsList.appendChild(li);
  } else {
    topReasons.forEach((reason) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="reason-bullet ${statusClass}"></span><span>${escapeHtml(reason)}</span>`;
      elReasonsList.appendChild(li);
    });
  }

  setActiveState('result');

  // Re-enable button with "Scan Again" label
  btnScan.disabled = false;
  btnScan.innerHTML = '<span class="btn-icon">🔄</span> Scan Again';
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Maps a status string to a CSS class name.
 * Handles inconsistent casing from the backend.
 */
function normaliseStatus(status) {
  const s = (status ?? '').toLowerCase();
  if (s.includes('safe'))       return 'safe';
  if (s.includes('suspicious')) return 'suspicious';
  if (s.includes('danger'))     return 'dangerous';
  return 'suspicious'; // default to amber if unknown
}

/**
 * Returns a descriptive risk label based on the numeric score.
 * @param {number} score
 */
function riskLabel(score) {
  if (score >= 75) return '🔴 High Risk';
  if (score >= 40) return '🟡 Moderate Risk';
  return '🟢 Low Risk';
}

/**
 * Strips the protocol and trailing slash from a URL for display.
 * @param {string} url
 */
function prettifyUrl(url) {
  try {
    const u = new URL(url);
    return (u.hostname + u.pathname).replace(/\/$/, '') || url;
  } catch {
    return url;
  }
}

/**
 * Minimal HTML escape to prevent XSS when injecting reason strings.
 * @param {string} str
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
