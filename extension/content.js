/**
 * content.js — RealityCheck AI Content Script
 *
 * ═══════════════════════════════════════════════════════════════════
 *  Responsibilities:
 *   1. Listen for SHOW_OVERLAY from background.js
 *   2. Render a full-screen warning modal with risk data
 *   3. Render a persistent floating badge (top-right corner)
 *   4. Handle "Go Back" and "Continue Anyway" actions
 *
 *  This script is injected into every page (<all_urls> in manifest)
 *  but remains completely dormant until it receives a SHOW_OVERLAY
 *  message — so it has zero impact on safe pages.
 *
 *  Extensibility:
 *   - Gmail: listen for DOM mutations to scan email body links
 *   - WhatsApp Web: scan message links in real-time
 *   - Add chrome.runtime.sendMessage({ type: 'SCAN_TEXT', text }) to
 *     relay page text to the background for scanning.
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

// ─── Guard: prevent duplicate injection ───────────────────────────────────────
// chrome.scripting.executeScript can inject this file more than once if the
// background retries. The flag ensures we only wire up one listener.

if (!window.__rcaiContentScriptLoaded) {
  window.__rcaiContentScriptLoaded = true;

  // ─── Config ─────────────────────────────────────────────────────────────────

  const DASHBOARD_URL         = 'http://localhost:5173/app';
  const OVERLAY_ID            = 'rcai-overlay';
  const BADGE_ID              = 'rcai-float-badge';
  const THRESHOLD_DANGEROUS   = 70;

  // ─── Message Listener ───────────────────────────────────────────────────────

  /**
   * Receives SHOW_OVERLAY from background.js and renders the warning UI.
   * Only one overlay is ever shown per page load.
   */
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== 'SHOW_OVERLAY') return;

    const { result } = message;

    // Idempotent — don't stack overlays
    if (!document.getElementById(OVERLAY_ID)) {
      renderOverlay(result);
    }

    // Always update / re-render the floating badge
    renderFloatingBadge(result);

    sendResponse({ ok: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  OVERLAY — full-screen warning modal
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Renders the full-page overlay warning modal.
   * Injects all required CSS inline so we have no dependency on styles.css.
   *
   * @param {Object} result  Scan result from /api/scan-url
   */
  function renderOverlay(result) {
    const score    = result.score   ?? 0;
    const status   = normaliseStatus(result.status);
    const summary  = result.summary ?? result.aiSummary ?? result.explanation ?? '';
    const reasons  = (result.reasons ?? result.flags ?? []).slice(0, 3);
    const isDanger = score >= THRESHOLD_DANGEROUS;

    // ── Colour tokens based on threat level ───────────────────────────────────
    const glowColour    = isDanger ? '#ef4444' : '#f59e0b';
    const glowColourDim = isDanger ? 'rgba(239,68,68,0.15)'  : 'rgba(245,158,11,0.15)';
    const borderColour  = isDanger ? 'rgba(239,68,68,0.35)'  : 'rgba(245,158,11,0.35)';
    const scoreColour   = isDanger ? '#ef4444' : '#f59e0b';
    const emoji         = isDanger ? '🚨' : '⚠️';
    const titleText     = isDanger ? 'Dangerous Site Detected' : 'Suspicious Site Detected';

    // ── Reason list HTML ──────────────────────────────────────────────────────
    const reasonsHtml = reasons.length > 0
      ? reasons.map(r => `
          <li style="
            display: flex;
            align-items: flex-start;
            gap: 8px;
            font-size: 13px;
            color: #c9d1d9;
            line-height: 1.5;
            margin-bottom: 6px;
          ">
            <span style="
              flex-shrink: 0;
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: ${glowColour};
              margin-top: 7px;
            "></span>
            <span>${escapeHtml(r)}</span>
          </li>`).join('')
      : `<li style="color:#8b949e;font-size:13px;">No specific signals provided.</li>`;

    // ── Overlay root ──────────────────────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Security Warning');

    overlay.innerHTML = `
      <style>
        /* ── Keyframes ────────────────────────────────────── */
        @keyframes rcai-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes rcai-slide-up {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 24px)) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes rcai-pulse-glow {
          0%, 100% { box-shadow: 0 0 32px ${glowColour}40, 0 24px 64px rgba(0,0,0,0.8); }
          50%       { box-shadow: 0 0 64px ${glowColour}70, 0 24px 64px rgba(0,0,0,0.8); }
        }
        @keyframes rcai-score-pop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity: 1; }
        }

        /* ── Overlay backdrop ─────────────────────────────── */
        #${OVERLAY_ID} {
          all: initial;
          position: fixed !important;
          inset: 0 !important;
          z-index: 2147483647 !important;
          background: rgba(0, 0, 0, 0.82) !important;
          backdrop-filter: blur(6px) !important;
          -webkit-backdrop-filter: blur(6px) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          animation: rcai-fade-in 0.3s ease forwards !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
        }

        /* ── Modal card ───────────────────────────────────── */
        #rcai-card {
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: min(520px, calc(100vw - 40px)) !important;
          background: #0d1117 !important;
          border: 1px solid ${borderColour} !important;
          border-radius: 16px !important;
          padding: 32px 28px 28px !important;
          animation: rcai-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards,
                     rcai-pulse-glow 3s ease-in-out 0.4s infinite !important;
          box-sizing: border-box !important;
        }

        /* ── Top accent stripe ────────────────────────────── */
        #rcai-stripe {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: 4px !important;
          background: linear-gradient(90deg, ${glowColour}, transparent) !important;
          border-radius: 16px 16px 0 0 !important;
        }

        /* ── Score circle ─────────────────────────────────── */
        #rcai-score-wrap {
          display: flex !important;
          align-items: center !important;
          gap: 20px !important;
          margin-bottom: 20px !important;
        }
        #rcai-score-circle {
          width: 80px !important;
          height: 80px !important;
          border-radius: 50% !important;
          background: ${glowColourDim} !important;
          border: 3px solid ${glowColour} !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
          animation: rcai-score-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both !important;
          box-shadow: 0 0 20px ${glowColour}60 !important;
        }
        #rcai-score-num {
          font-size: 26px !important;
          font-weight: 800 !important;
          color: ${scoreColour} !important;
          line-height: 1 !important;
          letter-spacing: -1px !important;
        }
        #rcai-score-denom {
          font-size: 10px !important;
          color: #6e7681 !important;
          margin-top: 1px !important;
        }

        /* ── Title block ──────────────────────────────────── */
        #rcai-title-block {}
        #rcai-emoji {
          font-size: 22px !important;
          line-height: 1 !important;
          display: block !important;
          margin-bottom: 4px !important;
        }
        #rcai-title {
          font-size: 18px !important;
          font-weight: 700 !important;
          color: #f0f6fc !important;
          margin: 0 0 4px !important;
          letter-spacing: -0.3px !important;
        }
        #rcai-status-pill {
          display: inline-block !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.5px !important;
          text-transform: uppercase !important;
          color: ${glowColour} !important;
          background: ${glowColourDim} !important;
          border: 1px solid ${borderColour} !important;
          padding: 3px 10px !important;
          border-radius: 20px !important;
        }

        /* ── Divider ──────────────────────────────────────── */
        #rcai-divider {
          height: 1px !important;
          background: rgba(255,255,255,0.06) !important;
          margin: 18px 0 !important;
        }

        /* ── Summary ──────────────────────────────────────── */
        #rcai-summary-label {
          font-size: 10px !important;
          font-weight: 600 !important;
          letter-spacing: 0.8px !important;
          text-transform: uppercase !important;
          color: #6e7681 !important;
          margin-bottom: 6px !important;
        }
        #rcai-summary-text {
          font-size: 13px !important;
          color: #8b949e !important;
          line-height: 1.6 !important;
          margin: 0 0 16px !important;
        }

        /* ── Reasons list ─────────────────────────────────── */
        #rcai-reasons-label {
          font-size: 10px !important;
          font-weight: 600 !important;
          letter-spacing: 0.8px !important;
          text-transform: uppercase !important;
          color: #6e7681 !important;
          margin-bottom: 8px !important;
        }
        #rcai-reasons-list {
          list-style: none !important;
          padding: 0 !important;
          margin: 0 0 22px !important;
        }

        /* ── Buttons ──────────────────────────────────────── */
        #rcai-btn-row {
          display: flex !important;
          gap: 10px !important;
        }
        .rcai-btn {
          flex: 1 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          padding: 11px 16px !important;
          border-radius: 8px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          border: none !important;
          transition: transform 0.15s ease, box-shadow 0.15s ease !important;
          letter-spacing: 0.2px !important;
          font-family: inherit !important;
        }
        #rcai-btn-back {
          background: ${glowColour} !important;
          color: #fff !important;
          box-shadow: 0 0 16px ${glowColour}50 !important;
        }
        #rcai-btn-back:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 0 28px ${glowColour}80 !important;
        }
        #rcai-btn-continue {
          background: rgba(255,255,255,0.06) !important;
          color: #8b949e !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
        }
        #rcai-btn-continue:hover {
          background: rgba(255,255,255,0.10) !important;
          color: #c9d1d9 !important;
        }
        #rcai-btn-report {
          background: rgba(124,58,237,0.15) !important;
          color: #a78bfa !important;
          border: 1px solid rgba(124,58,237,0.3) !important;
        }
        #rcai-btn-report:hover {
          background: rgba(124,58,237,0.25) !important;
        }
        .rcai-btn:active {
          transform: translateY(0) !important;
        }

        /* ── Footer note ──────────────────────────────────── */
        #rcai-footer {
          margin-top: 16px !important;
          font-size: 10px !important;
          color: #3d444d !important;
          text-align: center !important;
        }
      </style>

      <div id="rcai-card">
        <div id="rcai-stripe"></div>

        <!-- Score + title ─────────────────────────────────────────── -->
        <div id="rcai-score-wrap">
          <div id="rcai-score-circle">
            <span id="rcai-score-num">${score}</span>
            <span id="rcai-score-denom">/ 100</span>
          </div>
          <div id="rcai-title-block">
            <span id="rcai-emoji">${emoji}</span>
            <p id="rcai-title">${titleText}</p>
            <span id="rcai-status-pill">${escapeHtml(result.status ?? 'Unknown')}</span>
          </div>
        </div>

        <div id="rcai-divider"></div>

        <!-- Summary ───────────────────────────────────────────────── -->
        ${summary ? `
          <p id="rcai-summary-label">AI Summary</p>
          <p id="rcai-summary-text">${escapeHtml(summary)}</p>
        ` : ''}

        <!-- Reasons ───────────────────────────────────────────────── -->
        ${reasons.length > 0 ? `
          <p id="rcai-reasons-label">Top Risk Signals</p>
          <ul id="rcai-reasons-list">${reasonsHtml}</ul>
        ` : ''}

        <!-- Action buttons ────────────────────────────────────────── -->
        <div id="rcai-btn-row">
          <button class="rcai-btn" id="rcai-btn-back">
            ← Go Back (Safe)
          </button>
          <button class="rcai-btn" id="rcai-btn-report">
            ↗ Full Report
          </button>
          <button class="rcai-btn" id="rcai-btn-continue">
            Continue Anyway
          </button>
        </div>

        <p id="rcai-footer">RealityCheck AI — Digital Risk Intelligence · Score powered by threat intel + AI analysis</p>
      </div>
    `;

    document.documentElement.appendChild(overlay);

    // ── Button handlers ───────────────────────────────────────────────────────

    document.getElementById('rcai-btn-back').addEventListener('click', () => {
      removeOverlay();
      window.history.back();
    });

    document.getElementById('rcai-btn-continue').addEventListener('click', () => {
      removeOverlay();
    });

    document.getElementById('rcai-btn-report').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
    });

    // ── Dismiss with Escape key ───────────────────────────────────────────────
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        removeOverlay();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  /**
   * Removes the overlay from the DOM with a fade-out transition.
   */
  function removeOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    overlay.style.animation = 'rcai-fade-in 0.2s ease reverse forwards';
    setTimeout(() => overlay.remove(), 200);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  FLOATING BADGE  —  persistent risk indicator (top-right corner)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Renders a small floating badge in the top-right corner showing the risk
   * score and status. Clicking it re-opens the overlay if dismissed.
   *
   * @param {Object} result  Scan result
   */
  function renderFloatingBadge(result) {
    // Remove existing badge before re-rendering
    document.getElementById(BADGE_ID)?.remove();

    const score    = result.score  ?? 0;
    const status   = normaliseStatus(result.status);
    const isDanger = score >= THRESHOLD_DANGEROUS;

    const colour    = isDanger ? '#ef4444' : '#f59e0b';
    const colourDim = isDanger ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)';
    const border    = isDanger ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)';
    const emoji     = isDanger ? '🚨' : '⚠️';

    const badge = document.createElement('div');
    badge.id    = BADGE_ID;

    badge.innerHTML = `
      <style>
        @keyframes rcai-badge-in {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        #${BADGE_ID} {
          all: initial;
          position: fixed !important;
          top: 16px !important;
          right: 16px !important;
          z-index: 2147483646 !important;
          display: flex !important;
          align-items: center !important;
          gap: 7px !important;
          padding: 7px 12px !important;
          background: #0d1117 !important;
          border: 1px solid ${border} !important;
          border-radius: 20px !important;
          box-shadow: 0 0 16px ${colour}40, 0 4px 16px rgba(0,0,0,0.5) !important;
          cursor: pointer !important;
          user-select: none !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
          animation: rcai-badge-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
          transition: box-shadow 0.2s ease !important;
        }
        #${BADGE_ID}:hover {
          box-shadow: 0 0 28px ${colour}70, 0 4px 16px rgba(0,0,0,0.5) !important;
        }
        #rcai-badge-dot {
          width: 8px !important;
          height: 8px !important;
          border-radius: 50% !important;
          background: ${colour} !important;
          box-shadow: 0 0 6px ${colour} !important;
          animation: rcai-dot-pulse 1.4s ease-in-out infinite alternate !important;
          flex-shrink: 0 !important;
        }
        @keyframes rcai-dot-pulse {
          from { opacity: 0.6; transform: scale(0.85); }
          to   { opacity: 1;   transform: scale(1.15); }
        }
        #rcai-badge-score {
          font-size: 13px !important;
          font-weight: 700 !important;
          color: ${colour} !important;
          line-height: 1 !important;
        }
        #rcai-badge-label {
          font-size: 11px !important;
          color: #8b949e !important;
          line-height: 1 !important;
        }
        #rcai-badge-close {
          margin-left: 4px !important;
          color: #3d444d !important;
          font-size: 13px !important;
          line-height: 1 !important;
          cursor: pointer !important;
          padding: 0 2px !important;
          transition: color 0.15s !important;
        }
        #rcai-badge-close:hover {
          color: #8b949e !important;
        }
      </style>

      <div id="rcai-badge-dot"></div>
      <div>
        <div id="rcai-badge-score">${emoji} ${score}/100</div>
        <div id="rcai-badge-label">${escapeHtml(result.status ?? 'Unknown')}</div>
      </div>
      <span id="rcai-badge-close" title="Dismiss" role="button" aria-label="Dismiss badge">✕</span>
    `;

    document.documentElement.appendChild(badge);

    // Click badge body → re-show overlay
    badge.addEventListener('click', (e) => {
      if (e.target.id === 'rcai-badge-close') {
        badge.remove();
        return;
      }
      if (!document.getElementById(OVERLAY_ID)) {
        renderOverlay(result);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Maps a status string to a normalised lowercase CSS class name.
   * @param {string} status
   * @returns {'safe'|'suspicious'|'dangerous'}
   */
  function normaliseStatus(status) {
    const s = (status ?? '').toLowerCase();
    if (s.includes('safe'))       return 'safe';
    if (s.includes('suspicious')) return 'suspicious';
    if (s.includes('danger'))     return 'dangerous';
    return 'suspicious';
  }

  /**
   * Minimal HTML escape to prevent XSS when injecting untrusted strings
   * into innerHTML (e.g. AI-generated summaries, reason strings).
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

} // end guard block
