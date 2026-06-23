# RealityCheck AI – Digital Risk Intelligence System

A full-stack cybersecurity platform for **scam, phishing, and threat detection** powered by local LLMs, external threat intelligence APIs, and a rule-based risk engine. Features a premium React + TailwindCSS frontend with rich visualisations and a Node.js/Express backend with MongoDB persistence.

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js (CommonJS) |
| Framework | Express 4 |
| Database | MongoDB + Mongoose |
| Local AI | Ollama (`llama3.1:8b`) |
| Threat Intel | Google Safe Browsing API, VirusTotal API |
| File Parsing | Multer, pdf-parse, mammoth, Tesseract.js (OCR) |
| Validation | Joi |
| Security | Helmet, express-rate-limit, CORS |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 5 |
| Styling | TailwindCSS 3 |
| Animations | Framer Motion 12 |
| Icons | Lucide React |
| Routing | React Router DOM 7 |
| HTTP | Axios |

---

## Project Structure

```
RealityCheckAI/
├── .env                        # Local environment variables (gitignored)
├── .env.example                # Environment variable template
├── package.json                # Backend dependencies & scripts
│
├── src/                        # Backend source
│   ├── server.js               # Entry point — starts HTTP server
│   ├── app.js                  # Express app setup (middleware, routes)
│   ├── config/
│   │   ├── db.js               # MongoDB connection
│   │   └── env.js              # Validated env config (via dotenv)
│   ├── controllers/
│   │   ├── scan.controller.js          # Handles URL, text, file scan requests
│   │   ├── history.controller.js       # Returns scan history
│   │   ├── status.controller.js        # API health / status endpoint
│   │   └── threatReport.controller.js  # Community threat report CRUD
│   ├── routes/
│   │   ├── scan.routes.js              # POST /api/scan-url, /scan-text, /scan-file
│   │   ├── history.routes.js           # GET /api/history
│   │   ├── status.routes.js            # GET /api/status
│   │   └── threatReport.routes.js      # POST/GET /api/report, /api/threats
│   ├── services/
│   │   ├── scan.service.js             # Orchestrates the full scan pipeline
│   │   ├── ruleEngine.service.js       # Heuristic / rule-based risk checks
│   │   ├── riskScoring.service.js      # Aggregates signals → risk score (0–100)
│   │   ├── threatIntel.service.js      # Google Safe Browsing + VirusTotal calls
│   │   ├── aiAnalyzer.service.js       # Ollama LLM-based content analysis
│   │   ├── explanation.service.js      # Generates human-readable explanations
│   │   ├── fileTextExtraction.service.js # PDF / DOCX / image OCR extraction
│   │   ├── history.service.js          # Scan log persistence
│   │   ├── status.service.js           # Ollama + DB health checks
│   │   └── threatReport.service.js     # Community report persistence & voting
│   ├── models/
│   │   ├── ScanLog.model.js            # Mongoose schema for scan results
│   │   └── ThreatReport.model.js       # Mongoose schema for community reports
│   ├── middlewares/
│   │   ├── error.middleware.js         # Global error handler
│   │   └── upload.middleware.js        # Multer config for file uploads
│   └── utils/
│       ├── appError.js                 # Custom error class
│       ├── url.utils.js                # URL parsing helpers
│       └── text.utils.js              # Text normalisation helpers
│
└── web/                        # Frontend source (React + Vite)
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json            # Frontend dependencies & scripts
    └── src/
        ├── main.jsx            # React entry point
        ├── App.jsx             # Router — defines all page routes
        ├── index.css           # Global styles / Tailwind base
        ├── lib/
        │   └── api.js          # Axios API client (base URL, helpers)
        └── components/
            ├── LandingPage.jsx         # Hero / marketing landing page
            ├── Dashboard.jsx           # Main scanner dashboard shell
            ├── Scanner.jsx             # Scan input form (URL / text / file tabs)
            ├── ResultDashboard.jsx     # Full scan result display
            ├── ReportPage.jsx          # Standalone full-page risk analysis report
            ├── Header.jsx              # Global navigation header
            ├── AdvancedRiskGauge.jsx   # Animated circular risk score gauge
            ├── HeatmapThreats.jsx      # Threat category heatmap visualisation
            ├── HistoryPanel.jsx        # Recent scan history list
            ├── HowItWorks.jsx          # Explainer section (steps)
            ├── LiveScanSteps.jsx       # Animated live scan progress steps
            ├── QuickTemplates.jsx      # Pre-built quick-scan example templates
            ├── RiskTimeline.jsx        # Timeline of risk signals
            ├── SignalRadar.jsx         # Radar chart of threat signal categories
            └── ThreatsPanel.jsx        # Detailed breakdown of detected threats
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
PORT=4000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/realitycheck_ai

# Threat intelligence
GOOGLE_SAFE_BROWSING_API_KEY=
VIRUSTOTAL_API_KEY=

# Local LLM via Ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_ENABLED=true
OLLAMA_TIMEOUT_MS=15000
```

---

## Setup & Running

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- [Ollama](https://ollama.com/) with `llama3.1:8b` pulled (`ollama pull llama3.1:8b`)

### 1. Backend

```bash
# From project root
cp .env.example .env       # fill in API keys and MONGO_URI
npm install
npm run dev                # starts with --watch (auto-restarts on save)
```

Backend runs on **http://localhost:4000** by default.

### 2. Frontend

```bash
cd web
npm install
npm run dev
```

Frontend runs on **http://localhost:5173** by default (proxied to backend).

---

## API Reference

### Scan Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/scan-url` | Scan a URL for phishing/malware |
| `POST` | `/api/scan-text` | Scan free-form text for scam signals |
| `POST` | `/api/scan-file` | Upload and scan a file (PDF, DOCX, image) |
| `GET`  | `/api/history` | Retrieve recent scan logs (`?limit=20`) |
| `GET`  | `/api/status`  | Health check — DB and Ollama status |

#### POST /api/scan-url
```json
// Request
{ "url": "https://suspicious-site.example.com" }

// Response
{
  "score": 84,
  "status": "Dangerous",
  "reasons": [
    "Flagged by VirusTotal (malicious: 4, suspicious: 2)",
    "Google Safe Browsing: MALWARE",
    "Unusual URL length with encoded characters"
  ],
  "aiAnalysis": "...",
  "explanation": "..."
}
```

#### POST /api/scan-text
```json
// Request
{ "text": "URGENT! Your account has been compromised. Verify now at bit.ly/xyz" }

// Response — same shape as /scan-url
```

#### POST /api/scan-file
- `multipart/form-data` with field name `file`
- Accepts: PDF, DOCX, PNG, JPG (OCR via Tesseract.js)
- Response — same shape as above

### Community Threat Reports

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/report` | Submit a community threat report |
| `GET`  | `/api/threats` | List all community-reported threats |
| `POST` | `/api/threats/:id/vote` | Upvote / downvote a threat report |

---

## Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `LandingPage` | Marketing landing page with feature highlights |
| `/app` | `Dashboard` | Interactive scanner dashboard |
| `/report` | `ReportPage` | Full-page detailed risk analysis report |
| `*` | Redirect → `/` | Catch-all redirect |

---

## Scan Pipeline (How It Works)

1. **Input received** — URL, text, or extracted file content
2. **Rule Engine** (`ruleEngine.service.js`) — Heuristic checks (URL patterns, suspicious keywords, entropy analysis, etc.)
3. **Threat Intelligence** (`threatIntel.service.js`) — Parallel calls to Google Safe Browsing + VirusTotal
4. **AI Analysis** (`aiAnalyzer.service.js`) — Ollama LLM analyses content for nuanced scam/phishing signals
5. **Risk Scoring** (`riskScoring.service.js`) — Aggregates all signals into a 0–100 risk score
6. **Explanation** (`explanation.service.js`) — Generates plain-English reasoning
7. **Persistence** (`history.service.js`) — Saves result to MongoDB `ScanLog` collection
8. **Response** — Full JSON result returned to frontend

---

## Additional Documentation

| File | Contents |
|------|----------|
| [`CHEATSHEET.md`](./CHEATSHEET.md) | Quick-reference commands and patterns |
| [`COMPONENT_MAP.md`](./COMPONENT_MAP.md) | Detailed frontend component relationships |
| [`FEATURE_SHOWCASE.md`](./FEATURE_SHOWCASE.md) | Feature descriptions for each UI component |
| [`DELIVERY_SUMMARY.md`](./DELIVERY_SUMMARY.md) | Project delivery summary and milestone log |
| [`PREMIUM_UI_UPGRADE.md`](./PREMIUM_UI_UPGRADE.md) | UI upgrade decisions and design notes |
| [`README_ADVANCED_UI.md`](./README_ADVANCED_UI.md) | Deep-dive on advanced UI components |
| [`INDEX.md`](./INDEX.md) | Master index of all project documentation |
