# TRD — Technical Requirements Document
# RetailEye: Shelf Occupancy Intelligence System

**Version:** 1.0  
**Date:** 29 April 2026  
**Team:** 2 Engineers  
**Deadline:** 30 April 2026, 4:00 PM  

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    REACT FRONTEND                        │
│         Upload → Dashboard → Download                   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP (multipart upload / REST API)
┌────────────────────▼────────────────────────────────────┐
│                  FASTAPI BACKEND                         │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐   ┌─────────────┐ │
│  │  YOLOv8     │───▶│  Groq Vision │──▶│  Analysis   │ │
│  │  Detector   │    │  (Llama 4)   │   │  Engine     │ │
│  └─────────────┘    └──────────────┘   └──────┬──────┘ │
│                                               │         │
│  ┌────────────────────────────────────────────▼──────┐  │
│  │           Output Generator                        │  │
│  │   Visual Overlay | JSON Report | CSV | Video      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Project File Structure

```
retaileye/
│
├── backend/
│   ├── main.py                  ← FastAPI app entry point
│   ├── detector.py              ← YOLOv8 inference logic
│   ├── groq_vision.py           ← Groq API integration + retry logic
│   ├── analysis_engine.py       ← Occupancy, alerts, zone labeling
│   ├── report_generator.py      ← JSON + CSV generation
│   ├── video_processor.py       ← Frame-by-frame video handling
│   ├── overlay.py               ← OpenCV annotation drawing
│   ├── models/
│   │   └── shelf_model.pt       ← YOLOv8 pretrained weights (SKU110K)
│   ├── outputs/                 ← Generated reports + processed videos
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── UploadPanel.jsx
│   │   │   ├── VideoPlayer.jsx
│   │   │   ├── HealthCard.jsx
│   │   │   ├── RowBreakdownTable.jsx
│   │   │   ├── RestockList.jsx
│   │   │   ├── DownloadPanel.jsx
│   │   │   └── ThemeToggle.jsx
│   │   ├── hooks/
│   │   │   └── useAnalysis.js
│   │   └── index.css
│   ├── package.json
│   └── tailwind.config.js
│
├── samples/
│   ├── test_image.jpg           ← Sample shelf image for demo
│   └── test_video.mp4           ← Sample shelf video for demo
│
├── README.md
└── .env                         ← GROQ_API_KEY
```

---

## 3. Backend — Module Specifications

### 3.1 `main.py` — FastAPI Entry Point

**Endpoints:**

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/analyze/image` | Accept image upload, return full analysis JSON |
| POST | `/analyze/video` | Accept video upload, process frames, return analysis JSON |
| GET | `/download/json` | Download latest JSON report |
| GET | `/download/csv` | Download latest CSV report |
| GET | `/download/video` | Download processed annotated video |
| GET | `/health` | Health check |

**CORS:** Allow all origins (localhost React dev server).

---

### 3.2 `detector.py` — YOLOv8 Inference

**Model:** YOLOv8n or YOLOv8s — SKU110K pretrained weights.  
**Source:** Roboflow or HuggingFace SKU110K checkpoint.

**Input:** Single image frame (numpy array from OpenCV).

**Output per detection:**
```python
{
  "bbox": [x1, y1, x2, y2],   # pixel coordinates
  "confidence": 0.87,
  "class": "object",           # SKU110K is class-agnostic
  "is_empty": False            # True if detected as empty slot
}
```

**Row Detection Logic:**
- Sort all bounding boxes by Y coordinate (top to bottom)
- Cluster into rows using Y-centroid proximity (threshold: 50px gap = new row)
- Label rows 1, 2, 3... top to bottom

**Empty Slot Detection:**
- Gaps between detected objects on same row wider than average object width = empty slot
- Flag as `is_empty: True`

---

### 3.3 `groq_vision.py` — Product Identification

**Model:** `meta-llama/llama-4-scout-17b-16e-instruct`  
**API:** Groq (free tier — 1500 req/day)  
**Auth:** `GROQ_API_KEY` from `.env`

**Input:** Cropped product image (base64 encoded).

**Prompt sent to Groq:**
```
You are a retail product identifier. Look at this product image and respond ONLY with a JSON object:
{
  "product_name": "Lays Classic Salted",
  "category": "Snacks",
  "confidence": "high"
}
confidence must be: "high", "medium", or "low"
If you cannot identify the product, set product_name to "Unidentified Product" and confidence to "low".
Do not add any explanation. Only JSON.
```

**Retry Logic:**
```
Step 1: Send original crop to Groq
  → If confidence == "high" or "medium": use result
  → If confidence == "low":
Step 2: Zoom crop by 1.5x (center crop), send again
  → If confidence == "high" or "medium": use result
  → If still "low": label as "Unidentified Product"
```

**Rate limiting:** Add 0.1s delay between Groq calls to avoid hitting rate limits.

---

### 3.4 `analysis_engine.py` — Core Intelligence

**Input:** List of detections with product names + bounding boxes.

**Zone Auto-Labeling (per row):**
```python
# Count categories per row
# Majority category = row zone label
# Example: Row has 4 Snacks + 1 Beverage → "Snacks Zone"
# Tie → use first alphabetically
```

**Occupancy Calculation:**
```python
occupancy_percent = (filled_slots / total_slots) * 100
# total_slots = filled_slots + empty_slots
```

**Alert Assignment:**
```python
if occupancy_percent > 70:  alert = "OK"
elif occupancy_percent >= 40: alert = "Warning"
else: alert = "Critical"
```

**Restock Priority:**
```python
# Sort rows by occupancy ascending (lowest first)
# Output: ["Row 3 - Dairy Zone (18%)", "Row 2 - Beverages Zone (45%)"]
```

**Output JSON structure:** See PRD Section 10.

---

### 3.5 `overlay.py` — Visual Annotation (OpenCV)

**Color coding:**
```python
COLORS = {
  "filled": (0, 200, 0),    # Green (BGR)
  "empty": (0, 0, 220),     # Red
  "warning": (0, 165, 255)  # Orange
}
```

**Per bounding box:**
- Draw colored rectangle
- Above box: product name (white text, black background pill)
- Below box: occupancy % for that row (small text)

**Top-left corner overlay (per frame):**
```
RetailEye | Overall: 62% ⚠ Warning
Row 1: Snacks Zone — 75% ✓
Row 2: Beverages Zone — 45% ⚠
Row 3: Dairy Zone — 18% ✗ CRITICAL
```

---

### 3.6 `video_processor.py` — Video Handling

```python
# Algorithm:
cap = cv2.VideoCapture(video_path)
writer = cv2.VideoWriter(output_path, ...)

# Process every Nth frame for speed (N=3 recommended)
# For skipped frames: copy previous frame's annotations
# Write all frames to output video

# Aggregate results across all frames:
# - Use last frame's row structure as final state
# - Product names: most frequent name per slot across frames
```

**Output:** Annotated `.mp4` saved to `backend/outputs/processed_video.mp4`

---

### 3.7 `report_generator.py` — Reports

**JSON:** Full nested structure (see PRD Section 10). Save to `outputs/report.json`.

**CSV:** Flat table, one row per product detection. Save to `outputs/report.csv`.

**Columns for CSV:**
`timestamp, store_id, row_id, zone_label, occupancy_percent, alert, product_name, quantity, empty_slots`

---

## 4. Frontend — Component Specifications

### Tech Stack
- React 18 (Vite)
- Tailwind CSS
- Axios (API calls)
- Recharts (occupancy bar chart, optional)

### Theme System
```javascript
// Dark mode: dark background (#0f172a), light text, accent blue
// Light mode: white background, dark text, accent blue
// Toggle stored in localStorage
// Applied via Tailwind dark: classes
```

### `UploadPanel.jsx`
- Drag and drop zone
- Or click to select file
- Accepts: `.jpg`, `.png`, `.mp4`
- Shows file name + size preview
- "Analyze" button → POST to `/analyze/image` or `/analyze/video`
- Shows spinner while processing

### `VideoPlayer.jsx`
- If image: shows annotated image full width
- If video: HTML5 `<video>` player with controls
- Source: processed file URL from backend

### `HealthCard.jsx`
- Large occupancy % (color coded)
- 3 stat badges: Products Detected | Empty Slots | Alert Status

### `RowBreakdownTable.jsx`
- Table with columns: Row | Zone | Occupancy | Products | Empty Slots | Alert
- Occupancy column: colored progress bar
- Alert column: colored badge

### `RestockList.jsx`
- Numbered list, critical rows first
- Each item: row name + zone + occupancy % + "RESTOCK NOW" badge

### `DownloadPanel.jsx`
- 3 buttons: Download JSON | Download CSV | Download Video
- Each hits corresponding GET endpoint

### `ThemeToggle.jsx`
- Sun/Moon icon toggle
- Top-right corner of navbar

---

## 5. API Contract — Frontend ↔ Backend

### POST `/analyze/image`
**Request:** `multipart/form-data` — field: `file`  
**Response:**
```json
{
  "status": "success",
  "processed_image_url": "/outputs/annotated.jpg",
  "report": { ...full JSON report... }
}
```

### POST `/analyze/video`
**Request:** `multipart/form-data` — field: `file`  
**Response:**
```json
{
  "status": "success",
  "processed_video_url": "/outputs/processed_video.mp4",
  "report": { ...full JSON report... }
}
```

---

## 6. Environment Variables

```
# .env file
GROQ_API_KEY=your_groq_api_key_here
```

---

## 7. Dependencies

### Backend (`requirements.txt`)
```
fastapi
uvicorn
python-multipart
ultralytics          # YOLOv8
opencv-python
groq                 # Groq Python SDK
python-dotenv
Pillow
numpy
```

### Frontend (`package.json` key deps)
```
react, react-dom
vite
tailwindcss
axios
```

---

## 8. Model Download Instructions

```bash
# Option 1: Use YOLOv8 default (COCO pretrained) — fastest to start
from ultralytics import YOLO
model = YOLO('yolov8n.pt')  # auto-downloads

# Option 2: SKU110K fine-tuned checkpoint
# Download from: https://huggingface.co/nickmuchi/yolos-small-sku110k
# Place at: backend/models/shelf_model.pt
```

---

## 9. Task Split — 2 Engineers

### Engineer 1 — Backend / CV Core
- [ ] YOLOv8 setup + `detector.py`
- [ ] Row detection clustering logic
- [ ] `groq_vision.py` + retry logic
- [ ] `analysis_engine.py` (occupancy, alerts, zone labels, restock list)
- [ ] `video_processor.py`
- [ ] `main.py` FastAPI endpoints
- [ ] `.env` setup

### Engineer 2 — Frontend + Output + Submission
- [ ] React app setup (Vite + Tailwind)
- [ ] All dashboard components
- [ ] Light/Dark theme
- [ ] `overlay.py` (OpenCV annotations)
- [ ] `report_generator.py` (JSON + CSV)
- [ ] README.md
- [ ] 2–3 page project report (PDF)
- [ ] Demo video recording

---

## 10. Known Risks + Mitigations

| Risk | Mitigation |
|------|-----------|
| Groq rate limit hit | Add 0.1s delay + use retry only once |
| YOLOv8 misses products on cluttered shelf | Lower confidence threshold to 0.3 |
| Video processing too slow | Process every 3rd frame, copy annotations for skipped frames |
| Product name hallucination by Groq | Show confidence level in report; flag "low" results |
| React build issues | Use Vite (faster setup than CRA) |