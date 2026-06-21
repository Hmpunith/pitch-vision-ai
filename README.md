# ⚽ Pitch-Vision AI — Tactical Intelligence & Explainable VAR Platform

> **IBM SkillsBuild AI Builders Challenge — June 2026**
> Built with IBM Granite · watsonx.ai · FastAPI · Canvas 2.5D Engine

---

## The Problem

Soccer fans watch 90+ minutes of complex tactical chess — but most can't answer *why* a goal happened, *how* momentum shifted, or *what the VAR referee actually checked*. Broadcast commentary gives surface-level reactions. Teams have million-dollar analytics suites. **Fans have nothing.**

**Pitch-Vision AI bridges that gap.**

---

## What It Does

Pitch-Vision AI is a full-stack, broadcaster-grade soccer intelligence platform that lets anyone **understand**, **analyze**, and **interact** with match tactics using real-time explainable AI.

Built around the **2022 FIFA World Cup Final** (Argentina 3–3 France, ARG wins 4–2 on penalties) — one of the greatest matches in history.

### Five Core Features

**1. 🎯 Command Center — Real-Time Match Intelligence**
Live tactical metrics dashboard showing Expected Threat (xT) gaps, pressing intensity (PPDA), field tilt, and momentum flow. An **IBM Granite AI Oracle** answers tactical questions in natural language with data-grounded analysis.

**2. 🖊️ 2.5D Tactical Telestrator — Draw Your Own Plays**
An interactive, isometric pitch canvas where you can draw attacking runs, passing lanes, and gap measurements — then click **"Analyze Sketched Play"** and IBM Granite interprets your tactical drawing and provides a strategic assessment. Three camera angles: Tactical (75°), Broadcast (45°), VAR Pitch Horizon (15°).

**3. 📺 VAR Calibration Lab — Challenge the Referee**
Interactive sliders let you calibrate offside lines, rotate arm angles for handball checks, and adjust tackle force vectors. IBM Granite explains each decision by citing **exact IFAB Law sections** (Law 11: Offside, Law 12: Handball/Fouls). Features a Hawk-Eye sub-pixel zoom lens for precision.

**4. 💓 Player Biometrics HUD — Inside the Athlete**
Real-time ECG heart rate stream, sprint acceleration G-force dial, stamina depletion gauge, and an animated hydration flask. Toggle between **Messi** and **Mbappé** to compare their physical output at any match moment.

**5. 🤖 Agent Network Topology — See the AI Architecture**
A live visualization of the distributed multi-agent system powering Pitch-Vision AI. Shows each specialized agent (Spatial Tracking, Biometric Analysis, VAR Rules Engine, Broadcast HUD) with CPU load, latency metrics, and real-time console output.

---

## Why It Matters

- The 2022 World Cup Final had **1.5 billion viewers** who saw tactical genius unfold but couldn't fully understand *why*
- VAR decisions remain the most controversial aspect of modern football — fans deserve transparency
- Mbappé scored twice in **97 seconds** (80'–81') — what caused Argentina's defensive collapse? Our platform explains it layer by layer
- We make complex analytics **accessible, interactive, and beautiful** for every fan

---

## AI & Technical Approach

### IBM Tools Used

| Tool | How We Use It |
|------|---------------|
| **IBM Granite 3.0** (`ibm/granite-3-3-8b-instruct`) via watsonx.ai | Core reasoning engine for tactical analysis, VAR law interpretation, and biometric assessment |
| **watsonx.ai API** | Cloud inference endpoint for Granite model access |
| **Docling** | Data ingestion parser used to convert the official IFAB Law PDF into structured Markdown rule chunks |
| **IBM Bob** | AI development partner used throughout the SDLC — planning, code generation, debugging, testing |

### Architecture

```
┌─────────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   FRONTEND          │    │  BACKEND (FastAPI)│    │  IBM WATSONX.AI  │
│   HTML/CSS/JS       │◄──►│                  │◄──►│                  │
│                     │    │  /api/chat        │    │  Granite 3.0     │
│ • 2.5D Canvas Engine│    │  /api/analyze-play│    │  8B-Instruct     │
│ • Telestrator Draw  │    │  /api/var-explain │    │                  │
│ • VAR Calibrator    │    │  /api/player-     │    │  System Prompts: │
│ • ECG Stream        │    │    compare        │    │  • Tactical      │
│ • Agent Topology    │    │  /api/momentum    │    │  • VAR/IFAB      │
│                     │    │  /api/health      │    │  • Biometric     │
└─────────────────────┘    └──────────────────┘    └──────────────────┘
```

### Key Design Decisions

1. **Dual-mode operation**: The platform works fully standalone (demo mode with pre-built tactical responses) AND with live IBM Granite API. This ensures judges can always demo it, and the AI integration is genuine.

2. **2.5D isometric projection**: We built a custom Canvas renderer that maps 2D field coordinates onto an isometric perspective grid with three camera angles — making it feel like a real broadcast production tool.

3. **IFAB Law grounding**: VAR explanations cite specific law sections (Law 11 §1, Law 12 §1), ensuring the AI never hallucinates — a critical trust requirement for officiating tools.

---

## Quick Start

### Frontend Only (No API Key Required)
```bash
# Just open the HTML file
cd pitch-vision-ai
open index.html  # or double-click in file explorer
```

### Full Stack (With IBM Granite)
```bash
# 1. Set up environment
cd pitch-vision-ai/backend
cp ../.env.example .env
# Edit .env with your IBM Cloud API key and watsonx.ai project ID

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start the backend
python server.py
# Server runs on http://localhost:8000
# API docs at http://localhost:8000/docs

# 4. Open the frontend
# Open index.html in your browser
# It auto-detects the backend and switches to live AI mode
```

### Getting IBM Cloud Credentials
1. Create an account at [cloud.ibm.com](https://cloud.ibm.com)
2. Provision **watsonx.ai** from the IBM Cloud Catalog
3. Create a project in watsonx.ai → copy your **Project ID**
4. Go to Manage → Access (IAM) → API keys → Create → copy your **API Key**

---

## Project Structure

```
pitch-vision-ai/
├── index.html              # Cinematic dashboard UI (840+ lines)
├── styles.css              # Premium broadcast theme (1500+ lines)
├── app.js                  # Frontend engine: Canvas, VAR, biometrics (1700+ lines)
├── backend/
│   ├── server.py           # FastAPI server with 6 API endpoints
│   ├── granite_client.py   # IBM Granite wrapper (dual-mode)
│   └── requirements.txt    # Python dependencies
├── .env.example            # API key template
└── README.md               # This file
```

---

## Demo Video

🎬 [Watch the Demo](https://your-demo-link-here) *(3 min)*

---

## Team

- **Punith** — Full-stack development, UI/UX design, AI integration

---

## Built With

- **AI**: IBM Granite 3.0 (8B-Instruct) via watsonx.ai
- **Backend**: Python, FastAPI, Uvicorn
- **Frontend**: Vanilla HTML/CSS/JS, Canvas 2D API
- **Design**: Glassmorphism, broadcast-grade dark theme
- **Fonts**: Outfit, Inter (Google Fonts)

---

*Built for the IBM SkillsBuild AI Builders Challenge — June 2026*
*Theme: Soccer, AI, and the World Cup*
