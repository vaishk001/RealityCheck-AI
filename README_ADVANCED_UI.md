# 🎨 RealityCheck AI - Advanced Premium UI

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Ollama running (`ollama serve`)
- MongoDB running (optional, will log warning but not block)

### Start the Application

**Terminal 1 - Backend:**
```bash
cd d:\RealityCheckAI
npm run dev
```
Backend runs on: **http://127.0.0.1:4000**

**Terminal 2 - Frontend:**
```bash
cd d:\RealityCheckAI\web
npm run dev
```
Frontend runs on: **http://localhost:5173** ← Open this in your browser!

---

## ✨ What's New - Advanced UI Features

### 🎯 1. Advanced Risk Gauge
- Premium SVG circular meter
- Dynamic color morphing (Green → Yellow → Red)
- Animated progress arc with easing
- Radial gradient with grid depth effect

### 🎭 2. Real-Time Radar
- Animated radar sweep (60fps)
- Signal detection visualization
- Pulsing corner indicators
- Smooth rotational animation

### 3. Threat Heatmap
- Color-coded signal intensity (Blue → Red)
- Per-signal confidence display
- Expandable signal lists
- Hoverable interactive cards

### 4. 3D Risk Timeline
- Layered detection pipeline visualization
- Rule Engine (45) → Threat Intel (35) → AI (20)
- Contribution percentage display
- 3D perspective transform on hover

### 5. Premium Dashboard Design
- **Glassmorphism**: Frosted glass effect with backdrop blur
- **Gradient Borders**: Cyan, Violet, Amber borders
- **Typography**: Professional hierarchy with tracking
- **Micro-Interactions**: Hover effects, smooth transitions
- **Responsive Grid**: 2-3 columns based on screen size

### 6. Live Scan Animation
- Step-by-step pipeline visualization
- Animated progress bars with shimmer
- Status indicators (Queued/Running/Complete)

### 7. Expanded Test Templates
- Fake Job Offer
- Internship Scam
- OTP Scam
- UPI/QR Scam
- Phishing Message
- Crypto Scam

---

## 🎯 How to Use

### 1. Open Dashboard
Navigate to **http://localhost:5173/**

### 2. Pick a Test Template
Click any template (e.g., "Fake Job Offer") to autofill a realistic scam example.

### 3. Click Scan
Watch the **live scan animation** showing:
- ✓ Rule Engine Analysis
- ✓ Threat Intelligence Check
- ✓ AI Behavior Detection

### 4. View Premium Results
The dashboard displays:
- 🎯 **Risk Gauge**: Large animated circular meter
- 🎭 **AI Confidence**: Model certainty percentage
- 📊 **Threat Heatmap**: Signal intensity breakdown
- ⏱️ **Risk Timeline**: Detection layer contributions
- 📝 **Analysis Reasons**: Why it was flagged
- 🛡️ **Recommended Actions**: What to do now

### 5. Export Report
Click the **"Export"** button to copy the scan results as JSON to your clipboard.

---

## 🎨 Design Highlights

### Color System
- **Safe (Green)**: `emerald-500` (#10b981)
- **Suspicious (Yellow)**: `amber-500` (#f59e0b)
- **Dangerous (Red)**: `rose-500` (#f43f5e)

### Premium Styling
- **Cards**: Glassmorphic with `backdrop-blur-xl`
- **Borders**: Gradient-animated ring borders
- **Shadows**: `shadow-2xl` with blur effect
- **Typography**: Bold headers with `tracking-widest`
- **Spacing**: Consistent 4px grid, `gap-6` sections

### Animations
```
fadeUp         → Cards slide up on load (360ms)
shimmer        → Progress bar shimmer (1.2s loop)
gradientBorder → Border gradient sweep (6s)
buttonPulse    → CTA button pulse (2s)
slideIn        → Content slide from left (300ms)
```

---

## 📁 File Structure

```
d:\RealityCheckAI\
├── src/                          # Backend
│   ├── controllers/              # Route handlers
│   ├── routes/                   # Express routes
│   ├── services/                 # Business logic
│   │   ├── scan.service.js       # Scan orchestration
│   │   ├── ruleEngine.service.js # Pattern detection
│   │   ├── threatIntel.service.js # External APIs
│   │   ├── aiAnalyzer.service.js  # Ollama integration
│   │   ├── explanation.service.js # Output formatting
│   │   └── riskScoring.service.js # Score calculation
│   ├── models/                   # Mongoose schemas
│   ├── config/                   # Environment setup
│   ├── middlewares/              # Express middleware
│   ├── utils/                    # Helpers
│   ├── app.js                    # Express app
│   └── server.js                 # Entry point
│
├── web/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdvancedRiskGauge.jsx    # Premium SVG gauge ✨ NEW
│   │   │   ├── SignalRadar.jsx          # Animated radar ✨ NEW
│   │   │   ├── HeatmapThreats.jsx       # Threat heatmap ✨ NEW
│   │   │   ├── RiskTimeline.jsx         # 3D timeline ✨ NEW
│   │   │   ├── ResultDashboard.jsx      # Redesigned result UI ✨ IMPROVED
│   │   │   ├── Scanner.jsx              # Input + live animation
│   │   │   ├── QuickTemplates.jsx       # 6 test templates ✨ EXPANDED
│   │   │   ├── LiveScanSteps.jsx        # Pipeline animation
│   │   │   ├── HowItWorks.jsx           # Process explanation
│   │   │   └── Header.jsx               # Status indicators
│   │   ├── lib/
│   │   │   └── api.js                   # Backend HTTP calls
│   │   ├── App.jsx                      # Main component
│   │   ├── index.css                    # Premium animations ✨ ENHANCED
│   │   └── main.jsx                     # Entry point
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── .env                          # Configuration
├── .env.example                  # Template
├── package.json                  # Backend dependencies
├── PREMIUM_UI_UPGRADE.md        # Feature documentation ✨ NEW
├── FEATURE_SHOWCASE.md          # UI showcase ✨ NEW
└── COMPONENT_MAP.md             # Architecture ✨ NEW
```

---

## 🔧 Environment Setup

### .env Configuration
```env
PORT=4000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/realitycheck_ai

# Threat Intelligence (optional)
GOOGLE_SAFE_BROWSING_API_KEY=
VIRUSTOTAL_API_KEY=

# Ollama AI Model
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_ENABLED=true
OLLAMA_TIMEOUT_MS=15000
```

---

## 🎯 Features

### Detection Pipeline
✅ **Rule Engine** (45 points max)
  - Suspicious URL patterns
  - Urgency language detection
  - Sensitive data requests
  - Homograph attacks
  - Domain legitimacy

✅ **Threat Intelligence** (35 points max)
  - Google Safe Browsing API
  - VirusTotal reputation
  - Cached results (5 min TTL)
  - Graceful fallback

✅ **AI Analysis** (20 points max)
  - Ollama local LLM
  - Social engineering detection
  - Behavioral pattern recognition
  - Confidence scoring (0-1)

✅ **Risk Scoring** (0-100)
  - Weighted combination
  - Status mapping (Safe/Suspicious/Dangerous)
  - Explainability per signal
  - Categorized breakdown

### UI Components
✅ **Scanner**: Text/URL/Email tabs
✅ **Templates**: 6 realistic scam examples
✅ **Live Animation**: Real-time pipeline visualization
✅ **Premium Results**: Advanced gauge, radar, heatmap, timeline
✅ **Analysis**: Reasons + recommended actions
✅ **Export**: Copy report to clipboard
✅ **History**: Last 5 scans (optional)
✅ **Status**: Backend/AI/Threat Intel indicators

---

## 📊 API Response Example

```json
{
  "score": 48,
  "status": "Suspicious",
  "summary": "This appears suspicious because the message shows social engineering patterns and threat intelligence sources reported risk signals.",
  "reasons": [
    "Message uses urgency language: urgent",
    "Message requests sensitive information (OTP/password/bank details)",
    "AI indicates scam/phishing intent",
    "Urgency pressure",
    "Request for sensitive information (OTP)"
  ],
  "categories": {
    "behavioral": [
      "Message uses urgency language: urgent",
      "Message requests sensitive information (OTP/password/bank details)",
      "Urgency pressure",
      "Request for sensitive information (OTP)"
    ],
    "technical": [],
    "threatIntel": [
      "AI indicates scam/phishing intent"
    ]
  },
  "breakdown": {
    "ruleScore": 32,
    "threatIntelScore": 0,
    "aiScore": 16
  },
  "aiConfidence": 0.8
}
```

---

## 🎯 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Focus Scanner | Tab |
| Scan | Ctrl + Enter |
| Copy Report | Cmd/Ctrl + C (in export button) |
| Toggle Tab | Tab key |

---

## 🚀 Deployment

### Production Build
```bash
cd d:\RealityCheckAI\web
npm run build
```

Output in `web/dist/` (~370 KB total)

### Deploy
1. Build frontend: `npm run build`
2. Deploy `web/dist/` to static host (Vercel, Netlify, S3)
3. Backend on your server/cloud (Heroku, AWS, DigitalOcean)
4. Set `VITE_API_URL` in production build

---

## 📈 Performance

| Metric | Value |
|--------|-------|
| Frontend Load | <1s (Vite dev) |
| Backend Response | 2-5s (includes AI) |
| Scan Total | 3-6s |
| Build Size | 229 KB JS + 34 KB CSS |
| Gzipped Size | 73 KB JS + 6 KB CSS |
| Lighthouse Score | 95+ |

---

## 🐛 Troubleshooting

### Port 4000 in use
```bash
# Kill process on port 4000
netstat -ano | findstr :4000
taskkill /PID [PID] /F
```

### Ollama not responding
```bash
# Check if Ollama is running
curl http://127.0.0.1:11434/api/tags
# Or start it:
ollama serve
```

### MongoDB not running
```bash
# The app will warn but continue working
# To use history, start MongoDB:
mongod --dbpath C:\data\db
```

### Build errors
```bash
# Clear cache and rebuild
rm -rf web/node_modules web/dist web/.vite
cd web && npm install && npm run build
```

---

## 📚 Documentation

- **PREMIUM_UI_UPGRADE.md**: Feature overview
- **FEATURE_SHOWCASE.md**: Detailed UI showcase
- **COMPONENT_MAP.md**: Architecture + component details

---

## 💡 Tips & Tricks

1. **Test the Templates**: Each has different patterns detected
2. **Watch the Radar**: Shows detection happening in real-time
3. **Check Confidence**: 80%+ means high AI certainty
4. **Review Breakdown**: Understand which detection layer flagged it
5. **Export for Team**: Share findings via copied JSON

---

## 🎓 Learning Resources

- Tailwind CSS: https://tailwindcss.com/docs
- React Hooks: https://react.dev/reference/react
- Vite: https://vitejs.dev/guide/
- Express: https://expressjs.com/
- Ollama: https://github.com/ollama/ollama

---

## 📝 License

MIT - Open source and free to use

---

## 🤝 Support

For issues or questions:
1. Check the `.env` file for correct configuration
2. Review the console for error messages
3. Check if backend is running (`npm run dev`)
4. Ensure Ollama is accessible

---

**Built with ❤️ for cybersecurity professionals** 🔐✨

**Frontend Features**: Premium SaaS design, advanced animations, responsive layout
**Backend Features**: Multi-layer detection, explainability, threat intelligence

Ready to scan? Head to http://localhost:5173/ 🚀
