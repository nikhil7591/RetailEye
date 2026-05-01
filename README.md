<div align="center">

# 👁️ RetailEye

### AI-Powered Shelf Occupancy Intelligence System

**"Upload a shelf image. Get occupancy analytics, product identification, and restock alerts — in under 60 seconds."**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![YOLOv8](https://img.shields.io/badge/Detection-YOLOv8-FF6F00?style=for-the-badge)](https://ultralytics.com)
[![Groq](https://img.shields.io/badge/Vision%20AI-Groq%2FLlama4-F55036?style=for-the-badge)](https://groq.com)
[![PostgreSQL](https://img.shields.io/badge/DB-Neon%20PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

🌐 **[Live Demo](https://retaileye-demo.vercel.app)** &nbsp;·&nbsp; 🎥 **[Watch Demo](https://youtu.be/PiymjG6xOXM)** &nbsp;·&nbsp; 💼 **[LinkedIn](https://www.linkedin.com/in/nikhil-kumar-2974292a9/)**

</div>

---

## 🚀 What is RetailEye?

RetailEye is a **full-stack AI shelf monitoring system** that automates retail inventory visibility. Upload a shelf photo or video — RetailEye runs two specialized YOLOv8 models in parallel, identifies every product via Groq's Llama 4 Scout vision model, clusters detections into shelf rows, and delivers a complete occupancy report with actionable restock priorities — **zero manual counting required.**

```
Upload shelf image / video
        │
        ▼
YOLOv8 Dual-Model Detection  →  products.pt (conf=0.25)
                             →  empty.pt    (conf=0.15)
        │
        ▼
Row Clustering by Y-coordinate  →  shelf rows auto-detected
        │
        ▼
Groq Vision Identification  →  Llama 4 Scout → product name + category
        │
        ▼
Analysis Engine  →  occupancy % · alert level · zone label · shelf score
        │
        ▼
Overlay Renderer + Report Generator  →  annotated image · JSON · CSV
        │
        ▼
Neon PostgreSQL  →  persisted report · history · stats · notifications
        │
        ▼
React Dashboard  →  live results · heatmap · restock priority list
```

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🤖 **Dual-Model YOLO** | Two separately trained YOLOv8 models run on every frame — one detects products, one detects empty spaces |
| 🔍 **Groq Vision ID** | Llama 4 Scout 17B identifies product name + category from cropped shelf regions |
| 📐 **Smart Row Clustering** | Detections auto-grouped by Y-coordinate into distinct physical shelf rows |
| 🔲 **Grid Fallback** | If YOLO finds < 3 detections, image splits into 4×4 grid — each cell re-analyzed individually |
| 📊 **Occupancy Analytics** | Per-row occupancy %, zone label, alert level (OK / Warning / Critical), and shelf score 0–100 |
| 🖼️ **Visual Overlay** | Annotated output with color-coded bboxes, empty-slot dashed markers, and a HUD panel |
| 🎬 **Video Support** | MP4 videos processed frame-by-frame through the same full pipeline |
| 📥 **Report Export** | Download JSON, CSV, or annotated media per analysis |
| 🗃️ **History & Stats** | All analyses persisted in PostgreSQL with JSONB reports, timestamps, heatmap, and alert resolution |
| ⚡ **Token Optimization** | Detections with confidence ≥ 0.80 skip Groq entirely — ~40% fewer API calls |
| 🔔 **Alert System** | Critical / Warning alerts surfaced in notifications panel with resolve workflow |
| 🌗 **Dark / Light Theme** | Full theme toggle across the React dashboard |

---

## 🏗️ System Architecture

<div align="center">

![System Architecture](docs/system_architecture.png)

</div>

---

## 🔁 9-Step Workflow

<div align="center">

![Workflow Diagram](docs/workflow.png)

</div>

```
Step 1  →  Ingest           FastAPI reads file bytes → OpenCV BGR frame
Step 2  →  Dual Detection   products.pt (conf=0.25) + empty.pt (conf=0.15) in parallel
Step 3  →  Grid Fallback    If detections < 3 → 4×4 grid re-analysis via Groq Vision
Step 4  →  Row Clustering   detect_rows() groups detections by Y-coordinate
Step 5  →  Groq Vision ID   Crop each detection → Llama 4 Scout → name + category
Step 6  →  Analysis Engine  Occupancy %, alerts, zone labels, restock priority, shelf score
Step 7  →  Overlay + Export overlay.py annotated image · report_generator JSON + CSV
Step 8  →  DB Persist       Neon PostgreSQL insert — JSONB report + shelf score + URLs
Step 9  →  Dashboard        JSON response → React frontend live render
```

> ⚡ **Token Optimization:** Detections with confidence ≥ 0.80 skip Groq Vision entirely, saving ~40% in API calls on high-confidence shelves.

---

## 🚦 Alert Thresholds

| Status | Occupancy | Color | Action |
|---|---|---|---|
| ✅ OK | > 70% | Green | No action needed |
| ⚠️ Warning | 40–70% | Yellow | Schedule restock soon |
| 🔴 Critical | < 40% | Red | Immediate restock required |

Thresholds are configurable per-store via `POST /settings`.

---

## 📊 Shelf Scoring Model

```
Shelf Score (0–100) = Occupancy %
                      − 20 pts  if overall_alert == "Critical"
                      − 10 pts  if overall_alert == "Warning"
                      (floored at 0, capped at 100)

Per-row Occupancy % = products_detected / (products + empty_slots) × 100
```

---

## 📁 Project Structure

```
RetailEye/
├── backend/
│   ├── main.py               ← FastAPI app, all routes, pipeline orchestration
│   ├── detector.py           ← YOLOv8 dual-model loader + inference (HF auto-download)
│   ├── groq_vision.py        ← Groq API client — crop → product name + category + retry
│   ├── analysis_engine.py    ← Row aggregation, occupancy %, alerts, restock priority
│   ├── overlay.py            ← OpenCV overlay — bboxes, HUD, empty-slot markers
│   ├── pipeline.py           ← Standalone CLI entry point for direct image analysis
│   ├── video_processor.py    ← Frame-by-frame MP4 pipeline
│   ├── report_generator.py   ← JSON + CSV export utilities
│   ├── database.py           ← asyncpg PostgreSQL layer (Neon DB compatible)
│   ├── auth.py               ← JWT / session authentication
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── App.jsx           ← Root component, routing
│       ├── pages/            ← Dashboard, History, Settings pages
│       ├── components/       ← Reusable UI components
│       ├── services/         ← API client wrappers
│       ├── hooks/            ← Custom React hooks
│       ├── contexts/         ← Theme, auth contexts
│       └── lib/              ← Utility helpers
├── docs/
│   ├── retaileye_system_architecture.png   ← Architecture diagram
│   └── retaileye_workflow_diagram.png      ← Workflow diagram
├── samples/                  ← Sample shelf images for testing
├── render.yaml               ← Render deployment config
└── README.md
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.11+, Node.js 18+
- [Groq API key](https://console.groq.com)
- [Neon DB](https://neon.tech) PostgreSQL connection string

### 1. Clone the repository
```bash
git clone https://github.com/nikhil7591/RetailEye.git
cd RetailEye
```

### 2. Backend setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

> **First run:** YOLOv8 models (`products.pt` + `empty.pt`) auto-download from HuggingFace Hub into `backend/models/` — no manual setup needed.

### 3. Frontend setup
```bash
cd frontend
npm install
```

### 4. Environment variables

Create `backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
DATABASE_URL=postgresql://user:password@host/dbname
CORS_ORIGINS=http://localhost:5173
```

### 5. Run locally

**Terminal 1 — Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

### 6. CLI usage (no server needed)
```bash
cd backend
python pipeline.py samples/retail.jpg
python pipeline.py samples/retail.jpg --output results.json
```

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | Groq API key from [console.groq.com](https://console.groq.com) |
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string (Neon DB format) |
| `CORS_ORIGINS` | ✅ Yes | Comma-separated allowed frontend origins |

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/analyze/image` | Upload and analyze a shelf image |
| `POST` | `/analyze/video` | Upload and analyze an MP4 shelf video |
| `GET` | `/history` | List all analyses (paginated, filterable by `store_id`) |
| `GET` | `/history/{id}` | Get single analysis by ID |
| `PATCH` | `/history/{id}/resolve` | Mark alert as resolved |
| `DELETE` | `/history/{id}` | Delete analysis and associated files |
| `DELETE` | `/history` | Clear all history |
| `GET` | `/stats` | Aggregate stats across all analyses |
| `GET` | `/stats/heatmap` | Heatmap data for last N analyses |
| `GET` | `/settings` | Get current store settings |
| `POST` | `/settings` | Update store name, ID, alert thresholds |
| `GET` | `/download/{id}/json` | Download JSON report by analysis ID |
| `GET` | `/download/{id}/csv` | Download CSV report by analysis ID |
| `GET` | `/health` | Health check |

---

## 🚀 Deployment

### Backend — Render.com (Docker)

`render.yaml` is pre-configured for one-click deploy:

```yaml
services:
  - type: web
    name: retaileye-backend
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    plan: starter        # 512MB RAM — required for YOLO model loading
```

Set in Render dashboard:
- `GROQ_API_KEY`
- `DATABASE_URL` (Neon DB connection string)
- `CORS_ORIGINS` (your Vercel frontend URL)

### Frontend — Vercel

```bash
cd frontend
npm run build
# Deploy /frontend/dist — auto-detected as Vite project
```

Set in Vercel dashboard:
- `VITE_API_URL` — your Render backend URL

---

## 🔮 Future Scope

- 📷 **Live Camera Feed** — Real-time RTSP / webcam stream processing
- 📅 **Restock Scheduling** — Auto-generate restocking schedules from alert history
- 🔗 **ERP Integration** — Push low-stock alerts to SAP / Shopify inventory systems
- 📈 **Trend Analytics** — Occupancy trends over time per row, per zone, per store
- 🗺️ **Multi-Store Dashboard** — Aggregate view across multiple store locations
- 📱 **Mobile App** — React Native companion for on-floor staff alerts

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python, FastAPI, Uvicorn |
| Object Detection | YOLOv8 (Ultralytics) — dual-model: `products.pt` + `empty.pt` |
| Vision AI | Groq Cloud — `meta-llama/llama-4-scout-17b-16e-instruct` |
| Model Registry | HuggingFace Hub — `Kushagra-Kataria/yolo-shelf-detector` |
| Image Processing | OpenCV, Pillow, NumPy |
| Frontend | React 18, Vite, TailwindCSS, Recharts, Framer Motion |
| Database | PostgreSQL via Neon DB — asyncpg, JSONB |
| Deployment (backend) | Render.com — Docker container |
| Deployment (frontend) | Vercel — static SPA |

---

## 👨‍💻 Author

<div align="center">

**Nikhil Kumar**
CSE-AI Student | Chitkara University

📧 nikhil759100@gmail.com 

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/nikhil-kumar-2974292a9/)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat&logo=github&logoColor=white)](https://github.com/nikhil7591)

*"Built to explore how computer vision and LLM agents can eliminate manual shelf auditing in retail — from image to insight, zero human counting."*

</div>

---

<div align="center">

**RetailEye** — Academic Project | Chitkara University | CSE-AI

⭐ Star this repo if you found it useful!

</div>
