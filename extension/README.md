# RealityCheck AI — Chrome Extension

A **Manifest V3** Chrome Extension that scans the current tab URL for phishing, scam, and malware threats using the RealityCheck AI backend.

---

## 📁 File Structure

```
extension/
├── manifest.json      # MV3 extension manifest
├── background.js      # Service worker — badge updates + result cache
├── content.js         # Content script (minimal; extensible for Gmail, WhatsApp)
├── popup.html         # Popup UI markup
├── popup.js           # Popup logic — scan, render, error handling
├── styles.css         # Dark premium theme (380px wide)
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## 🚀 Loading in Chrome (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the `extension/` folder from this project
5. The RealityCheck AI icon will appear in your toolbar

> **Tip:** Pin the extension by clicking the puzzle-piece icon → pin icon next to RealityCheck AI.

---

## ⚙️ Prerequisites

The extension talks to the local backend. Make sure it's running:

```bash
# From the project root
npm run dev
# Backend starts at http://localhost:4000
```

---

## 🔄 How It Works

```
User opens popup
       │
       ▼
chrome.tabs.query → get active tab URL
       │
       ▼
Check session cache (background.js)
  ├── Cache HIT  → render result instantly (no API call)
  └── Cache MISS → POST /api/scan-url
                        │
                        ▼
                  Render result + update badge
```

### Message Flow (popup ↔ background)

| Message type      | Payload             | Direction       | Purpose                        |
|-------------------|---------------------|-----------------|--------------------------------|
| `SCAN_START`      | `{ tabId }`         | popup → bg      | Show `…` badge while scanning  |
| `SCAN_COMPLETE`   | `{ tabId, result }` | popup → bg      | Cache result + update badge    |
| `GET_CACHED`      | `{ tabId }`         | popup → bg      | Retrieve cached result         |

---

## 🎨 UI States

| State    | When shown                          |
|----------|-------------------------------------|
| Loading  | Scan is in progress (radar animation) |
| Result   | Scan succeeded — shows score, badge, summary, reasons |
| Error    | Backend unreachable or API failure  |

### Status Colours

| Status      | Colour  | Condition          |
|-------------|---------|--------------------|
| ✅ Safe      | Green   | score < 40         |
| ⚠️ Suspicious | Yellow | 40 ≤ score < 75   |
| 🚨 Dangerous | Red    | score ≥ 75         |

---

## 🧩 Extending to Gmail / WhatsApp

`content.js` is pre-wired but currently a no-op. To add page-level scanning:

```js
// content.js — example: scan all links on the page
document.querySelectorAll('a[href]').forEach(link => {
  chrome.runtime.sendMessage({ type: 'SCAN_LINK', url: link.href });
});
```

Then handle `SCAN_LINK` in `background.js` or relay to the popup.

---

## 🐛 Bugs Fixed in This Version

| File            | Bug                                                                 | Fix                                  |
|-----------------|---------------------------------------------------------------------|--------------------------------------|
| `background.js` | `GET_CACHED` used comma operator → always ran regardless of type    | Refactored to `switch/case`          |
| `background.js` | `export const API_BASE` — unnecessary export, popup defines its own | Removed `export` keyword             |
| `manifest.json` | `"type": "module"` on service worker — unnecessary after fix above  | Removed; classic service worker used |

---

## 🔒 Permissions Explained

| Permission      | Reason                                           |
|-----------------|--------------------------------------------------|
| `activeTab`     | Read the URL of the currently focused tab        |
| `scripting`     | Reserved for future content script injection     |
| `storage`       | Session cache for scan results per tab           |
| `localhost:4000`| Host permission to call the local backend API    |
