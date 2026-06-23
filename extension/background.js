/**
 * background.js — RealityCheck AI Service Worker (MV3)
 *
 * ═══════════════════════════════════════════════════════════════════
 *  TWO modes of operation:
 *
 *  1. POPUP-DRIVEN (existing)
 *     popup.js sends SCAN_START / SCAN_COMPLETE / GET_CACHED messages.
 *     background.js updates the badge and caches the result.
 *
 *  2. REAL-TIME PROTECTION (new)
 *     background.js itself listens to tab navigation events,
 *     calls POST /api/scan-url for each new URL, and if the score
 *     is >= 40 it sends a SHOW_OVERLAY message to content.js so the
 *     page receives a warning modal before the user can interact.
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Message API
 *  ───────────────────────────────────────────────────────────────────
 *  popup.js → background.js
 *    { type: 'SCAN_START',    tabId }           Show "…" badge
 *    { type: 'SCAN_COMPLETE', tabId, result }   Update badge + cache
 *    { type: 'GET_CACHED',    tabId }           Return cached result or null
 *
 *  background.js → content.js  (via chrome.tabs.sendMessage)
 *    { type: 'SHOW_OVERLAY', result }           Render warning overlay
 */

'use strict';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE       = 'http://localhost:4000/api';
const DASHBOARD_URL  = 'http://localhost:5173/app';

/**
 * Score thresholds for overlay injection.
 * Scores below THRESHOLD_SUSPICIOUS are considered Safe → no overlay shown.
 */
const THRESHOLD_DANGEROUS   = 70;
const THRESHOLD_SUSPICIOUS  = 40;

/**
 * Milliseconds to wait after a tab update fires before starting the scan.
 * Prevents spamming the API when Chrome fires multiple rapid onUpdated events
 * (e.g. redirect chains).
 */
const DEBOUNCE_MS = 600;

/**
 * URLs whose scheme/host should NEVER be scanned or injected into.
 * Checked via a prefix or hostname match.
 */
const BLOCKLIST_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'data:',
  'javascript:',
  'file://',
];

const BLOCKLIST_HOSTNAMES = [
  'localhost',    // covers :4000 (backend) and :5173 (frontend)
  '127.0.0.1',
  '0.0.0.0',
  'extensions',   // chrome://extensions
];

// ─── Runtime State ────────────────────────────────────────────────────────────

/**
 * Per-tab debounce timer IDs.
 * Map<tabId: number, timeoutId: number>
 */
const debounceTimers = new Map();

/**
 * In-flight scan promises keyed by URL.
 * Prevents duplicate concurrent API calls for the same URL
 * (e.g. two tabs navigating to the same site simultaneously).
 * Map<url: string, Promise<ScanResult>>
 */
const inFlightScans = new Map();

// ─── Badge Colours ────────────────────────────────────────────────────────────

const BADGE_COLOURS = {
  Safe:       '#22c55e',   // green-500
  Suspicious: '#f59e0b',   // amber-500
  Dangerous:  '#ef4444',   // red-500
  default:    '#6b7280',   // gray-500  (scanning / unknown)
};

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB EVENT LISTENERS  —  Real-time protection engine
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fired when a tab's content changes (navigation, reload, redirect…).
 * We only act when status === 'complete' so the page DOM is fully ready
 * for content script injection.
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;

  scheduleProtectionScan(tabId, tab.url);
});

/**
 * Fired when the user switches between tabs.
 * Lets us run a protection scan for a tab that may have been opened in the
 * background and is now being focused for the first time.
 */
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) return;

    // Only re-scan if there is no cached result for this URL yet
    const cached = await getUrlCache(tab.url);
    if (cached) return; // already scanned — no need to rescan on focus

    scheduleProtectionScan(tabId, tab.url);
  } catch (_err) {
    // Tab may have been closed between the event and the get() call — ignore
  }
});

/**
 * When a tab starts loading a new page, clear the old badge so stale
 * scores are never shown for the wrong page.
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    setBadge(tabId, '', BADGE_COLOURS.default);
    // Note: we keep the URL-keyed scan cache so revisiting the same URL
    // is still instant.  Only the tab-scoped badge is cleared.
  }
});

// ─── Tab removed — clean up debounce timers ───────────────────────────────────

chrome.tabs.onRemoved.addListener((tabId) => {
  clearDebounce(tabId);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PROTECTION SCAN  —  Debounce → API call → Badge + Overlay
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schedules a protection scan for a tab after a short debounce window.
 * Multiple rapid onUpdated events for the same tab collapse into one scan.
 *
 * @param {number} tabId
 * @param {string} url
 */
function scheduleProtectionScan(tabId, url) {
  if (!isScannable(url)) {
    console.log('[RealityCheck BG] Skipped (blocklisted):', url);
    return;
  }

  console.log(`[RealityCheck BG] Scheduling scan for tab ${tabId}:`, url);
  clearDebounce(tabId);

  const timer = setTimeout(async () => {
    debounceTimers.delete(tabId);
    await runProtectionScan(tabId, url);
  }, DEBOUNCE_MS);

  debounceTimers.set(tabId, timer);
}

/**
 * Performs the full protection scan lifecycle for one tab:
 *   1. Check URL cache → skip API call if already scanned
 *   2. Show "…" badge while scanning
 *   3. POST /api/scan-url
 *   4. Cache result by URL
 *   5. Update badge
 *   6. If score >= THRESHOLD_SUSPICIOUS → inject overlay into the tab
 *
 * @param {number} tabId
 * @param {string} url
 */
async function runProtectionScan(tabId, url) {
  console.log(`[RealityCheck BG] runProtectionScan tab=${tabId}`, url);

  // ── 1. URL cache check ───────────────────────────────────────────────────────
  const cached = await getUrlCache(url);
  if (cached) {
    console.log(`[RealityCheck BG] Cache HIT — score=${cached.score} status=${cached.status}`);
    applyResultToBadge(tabId, cached);

    if (shouldShowOverlay(cached.score)) {
      console.log('[RealityCheck BG] Cache hit — injecting overlay from cache');
      await injectOverlay(tabId, cached);
    }
    return;
  }

  // ── 2. Scanning badge ────────────────────────────────────────────────────────
  console.log('[RealityCheck BG] Cache MISS — calling API…');
  setBadge(tabId, '…', BADGE_COLOURS.default);

  // ── 3. API call (deduped per URL) ────────────────────────────────────────────
  let result;
  try {
    result = await scanUrl(url);
    console.log(`[RealityCheck BG] API result — score=${result.score} status=${result.status}`, result);
  } catch (err) {
    console.warn('[RealityCheck BG] Scan API failed for', url, err.message);
    setBadge(tabId, '!', BADGE_COLOURS.default);
    return;
  }

  // ── 4. Cache result by URL ───────────────────────────────────────────────────
  await setUrlCache(url, result);

  // ── 5. Update badge ──────────────────────────────────────────────────────────
  applyResultToBadge(tabId, result);

  // Also cache by tabId so popup.js gets it instantly on open
  chrome.storage.session.set({ [`scan_${tabId}`]: result });

  // ── 6. Inject overlay if score is above threshold ────────────────────────────
  if (shouldShowOverlay(result.score)) {
    console.log(`[RealityCheck BG] Score ${result.score} >= threshold — injecting overlay into tab ${tabId}`);
    await injectOverlay(tabId, result);
  } else {
    console.log(`[RealityCheck BG] Score ${result.score} < threshold — no overlay needed`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  POPUP MESSAGE ROUTER  —  handles messages from popup.js
// ═══════════════════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {

    // ── Popup started a scan: show scanning badge ────────────────────────────
    case 'SCAN_START': {
      setBadge(message.tabId, '…', BADGE_COLOURS.default);
      sendResponse({ ok: true });
      break;
    }

    // ── Popup finished a scan: cache result + update badge ───────────────────
    case 'SCAN_COMPLETE': {
      const { tabId, result } = message;

      // Tab-scoped session cache (for popup instant re-open)
      chrome.storage.session.set({ [`scan_${tabId}`]: result });

      // URL-scoped cache (for real-time protection dedup)
      if (result._url) setUrlCache(result._url, result);

      applyResultToBadge(tabId, result);
      sendResponse({ ok: true });
      break;
    }

    // ── Popup requesting cached result for its tab ───────────────────────────
    case 'GET_CACHED': {
      chrome.storage.session.get(`scan_${message.tabId}`, (data) => {
        sendResponse({ result: data[`scan_${message.tabId}`] ?? null });
      });
      return true; // ← keep channel open for async sendResponse
    }

    // ── Content script "Full Report" button → open web app dashboard ─────────
    case 'OPEN_DASHBOARD': {
      chrome.tabs.create({ url: DASHBOARD_URL });
      sendResponse({ ok: true });
      break;
    }

    default:
      break;
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  OVERLAY INJECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Uses chrome.tabs.sendMessage to tell the already-injected content.js to
 * render the warning overlay with the scan result data.
 *
 * If the content script isn't ready (e.g. page restricted the CSP or it
 * hadn't loaded yet), falls back to chrome.scripting.executeScript to inject
 * content.js programmatically.
 *
 * @param {number} tabId
 * @param {Object} result  Scan result from API
 */
async function injectOverlay(tabId, result) {
  try {
    // Try messaging the already-running content script first (fastest path)
    await chrome.tabs.sendMessage(tabId, { type: 'SHOW_OVERLAY', result });
  } catch (_err) {
    // Content script not yet present — inject it programmatically, then message
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files:  ['content.js'],
      });
      // Small delay to let the script initialise its listener
      await sleep(80);
      await chrome.tabs.sendMessage(tabId, { type: 'SHOW_OVERLAY', result });
    } catch (injectErr) {
      console.warn('[RealityCheck BG] Could not inject overlay into tab', tabId, injectErr.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  API HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calls POST /api/scan-url. Deduplicates concurrent calls for the same URL
 * using the inFlightScans map so parallel tab events don't flood the backend.
 *
 * @param {string} url
 * @returns {Promise<ScanResult>}
 */
async function scanUrl(url) {
  // If a scan for this URL is already in-flight, wait for it instead of
  // sending a duplicate request to the backend.
  if (inFlightScans.has(url)) {
    return inFlightScans.get(url);
  }

  const promise = fetch(`${API_BASE}/scan-url`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ url }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      // Embed the scanned URL so callers can use it for URL-keyed caching
      return { ...data, _url: url };
    })
    .finally(() => {
      inFlightScans.delete(url);
    });

  inFlightScans.set(url, promise);
  return promise;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CACHE  —  URL-keyed via chrome.storage.session
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds a storage key from a URL, normalised to strip fragments.
 * @param {string} url
 * @returns {string}
 */
function urlCacheKey(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return `url_${u.toString()}`;
  } catch {
    return `url_${url}`;
  }
}

/**
 * Retrieves a cached scan result for a URL, or null if not cached.
 * @param {string} url
 * @returns {Promise<ScanResult|null>}
 */
function getUrlCache(url) {
  return new Promise((resolve) => {
    const key = urlCacheKey(url);
    chrome.storage.session.get(key, (data) => {
      resolve(data[key] ?? null);
    });
  });
}

/**
 * Stores a scan result in the URL-keyed cache.
 * @param {string} url
 * @param {Object} result
 */
function setUrlCache(url, result) {
  return new Promise((resolve) => {
    chrome.storage.session.set({ [urlCacheKey(url)]: result }, resolve);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns true if the URL should be scanned and potentially have an overlay
 * injected. Skips internal Chrome pages, extension pages, localhost, etc.
 *
 * @param {string} url
 * @returns {boolean}
 */
function isScannable(url) {
  if (!url) return false;

  // Block by scheme prefix
  if (BLOCKLIST_PREFIXES.some((prefix) => url.startsWith(prefix))) return false;

  // Block by hostname
  try {
    const { hostname } = new URL(url);
    if (BLOCKLIST_HOSTNAMES.some((h) => hostname === h || hostname.endsWith(`.${h}`))) {
      return false;
    }
  } catch {
    return false; // unparseable URL
  }

  return true;
}

/**
 * Returns true when the score warrants showing the warning overlay.
 * @param {number} score
 * @returns {boolean}
 */
function shouldShowOverlay(score) {
  return score >= THRESHOLD_SUSPICIOUS;
}

/**
 * Updates the toolbar badge with the score and status colour.
 * @param {number} tabId
 * @param {Object} result
 */
function applyResultToBadge(tabId, result) {
  const colour = BADGE_COLOURS[result.status] ?? BADGE_COLOURS.default;
  const text   = result.score != null ? String(result.score) : '?';
  setBadge(tabId, text, colour);
}

/**
 * Sets badge text + background colour for a tab.
 * @param {number} tabId
 * @param {string} text    ≤4 chars
 * @param {string} colour  CSS hex
 */
function setBadge(tabId, text, colour) {
  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color: colour, tabId });
}

/**
 * Cancels an existing debounce timer for a tab (if any).
 * @param {number} tabId
 */
function clearDebounce(tabId) {
  if (debounceTimers.has(tabId)) {
    clearTimeout(debounceTimers.get(tabId));
    debounceTimers.delete(tabId);
  }
}

/**
 * Promise-based setTimeout.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
