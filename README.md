# RetailEye — Shelf Occupancy Intelligence System

RetailEye is an AI-powered shelf analysis tool that automates product detection and occupancy tracking for retail stores. Upload a shelf image or video, and RetailEye uses YOLOv8 + Groq Vision (Llama 4 Scout) to identify products, detect empty slots, and generate actionable restocking insights — all displayed on a sleek React dashboard.

---

## ✨ Features

- **Automated Product Detection** — YOLOv8 detects every item on the shelf
- **AI Product Identification** — Groq Vision identifies product names and categories
- **Smart Row Clustering** — Automatic shelf-row segmentation by Y-coordinate
- **Empty Slot Detection** — Finds gaps between products for restock alerts
- **Occupancy Analytics** — Per-row occupancy %, zone labels, and alert levels
- **Visual Overlay** — Annotated images/videos with bounding boxes and HUD
- **Restock Priorities** — Critical/Warning items sorted by urgency
- **Export Reports** — Download JSON, CSV, and annotated media
- **Dark/Light Theme** — Beautiful dashboard with theme toggle
- **Video Support** — Process MP4 shelf videos frame-by-frame

---

## 🛠️ Tech Stack

| Layer     | Technology                                  |
| --------- | ------------------------------------------- |
| Detection | YOLOv8 (Ultralytics)                        |
| Vision AI | Groq API — Llama 4 Scout 17B               |
| Backend   | Python, FastAPI, OpenCV, Pillow             |
| Frontend  | React 18, Vite, TailwindCSS                |
| Reports   | JSON + CSV generators                       |

---

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone <repo-url>
cd RetailEye
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Configure Environment

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get your API key from [https://console.groq.com](https://console.groq.com).

### 5. Run the Application

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

---

## 📖 How to Use

1. **Upload** — Drag & drop a shelf image (JPG/PNG) or video (MP4)
2. **Analyze** — Click "Analyze Shelf" and wait for AI processing
3. **View Results** — See annotated media, occupancy stats, row breakdown, and restock priorities
4. **Download** — Export JSON report, CSV report, or annotated media

---

## 📸 Screenshots

> _Screenshots will be added after first deployment._

---

## 🚨 Alert Thresholds

| Status   | Occupancy | Color  |
| -------- | --------- | ------ |
| OK       | > 70%     | Green  |
| Warning  | 40–70%    | Yellow |
| Critical | < 40%     | Red    |

---

## 📄 License

This project is for educational and demonstration purposes.
