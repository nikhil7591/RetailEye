# PRD — Product Requirements Document
# RetailEye: Shelf Occupancy Intelligence System

**Version:** 1.0  
**Date:** 29 April 2026  
**Team:** 2 Engineers  
**Deadline:** 30 April 2026, 4:00 PM  

---

## 1. Problem Statement

Retail store owners manually walk the floor to check which shelves are empty or understocked. This process is:
- Time-consuming and error-prone
- Not real-time — problems are discovered late
- Unscalable — no data, no history, no reports

**RetailEye solves this** by analyzing shelf images or videos using computer vision + AI to automatically detect products, identify them by name, calculate occupancy per shelf row, and generate actionable restock reports.

---

## 2. Goals

- Detect products on retail shelves from image or video input
- Identify product names using AI vision (Groq)
- Detect empty shelf slots
- Calculate per-row occupancy percentage
- Auto-assign shelf zone category (Snacks, Beverages, Dairy, etc.)
- Generate alerts: Critical / Warning / OK
- Produce restock priority list
- Export reports as JSON and CSV
- Display all results on a React dashboard (light + dark theme)
- Support processed video download with annotations

---

## 3. Non-Goals (Out of Scope)

- No IoT or hardware integration
- No RFID or barcode scanning
- No multi-store support (future roadmap only)
- No user authentication system
- No cloud deployment (runs locally)
- No live webcam/CCTV streaming (future roadmap)
- No custom model training

---

## 4. Target User

**Primary:** Small to mid-size retail store owner or store manager.

**Their need:** Know which shelves need restocking RIGHT NOW without walking the floor manually.

---

## 5. Features — P0 (Must Have)

| Feature | Description |
|--------|-------------|
| Image Upload | User uploads a shelf image (JPG/PNG) |
| Video Upload | User uploads a shelf video (MP4) |
| YOLOv8 Detection | Detect all products + empty slots in frame |
| Groq Vision ID | Identify product name + category per detected item |
| Retry Logic | If Groq confidence is low, retry with zoomed crop |
| Row Auto-Detection | Automatically detect shelf rows from image geometry |
| Zone Auto-Label | Assign category label to each row based on majority product type |
| Occupancy % | Calculate filled vs empty slots per row |
| Alert Engine | Assign Critical (<40%) / Warning (40–70%) / OK (>70%) per row |
| Restock Priority | Generate ordered list of rows/products needing restock |
| Visual Overlay | Draw colored bounding boxes + labels on output frame |
| JSON Export | Save full report as structured JSON |
| CSV Export | Save tabular report as CSV |
| Processed Video Download | Annotated output video available for download |
| React Dashboard | Display all results, video player, charts, downloads |
| Light/Dark Theme | Toggle between themes on dashboard |

---

## 6. Features — P1 (Nice to Have, If Time Permits)

| Feature | Description |
|--------|-------------|
| store_id field in JSON | Future multi-store scalability hook |
| Heatmap overlay | Visual representation of empty zones |
| Frame-by-frame progress bar | Show video processing progress |

---

## 7. User Flow

```
User opens dashboard
  → Uploads image or video file
  → Clicks "Analyze"
  → Sees processing indicator
  → Results appear:
      - Annotated image/video player
      - Overall shelf health %
      - Row-wise breakdown table
      - Product list with names + quantities
      - Restock priority list
      - Alert badges per row
  → Downloads JSON / CSV / processed video
```

---

## 8. Dashboard Sections

### Section 1 — Upload Panel
- Drag and drop or file picker
- Accepts: JPG, PNG, MP4
- Shows file name + size after upload

### Section 2 — Video/Image Player
- Displays processed output with bounding boxes
- Color coding: Green = filled, Red = empty, Yellow = low stock
- For video: playback controls (play/pause/seek)

### Section 3 — Overall Health Card
- Big % number (overall occupancy)
- Total products detected
- Total empty slots
- Global alert status badge

### Section 4 — Row-wise Breakdown Table
- Row number + auto-assigned zone name
- Occupancy % with color bar
- Product names detected in that row
- Quantity per product
- Empty slot count
- Alert badge (Critical / Warning / OK)

### Section 5 — Restock Priority List
- Ordered list: most critical rows first
- Shows which product is missing and from which row

### Section 6 — Download Panel
- Download JSON button
- Download CSV button
- Download Processed Video button

---

## 9. Alert Thresholds

| Alert Level | Occupancy % | Color |
|-------------|-------------|-------|
| OK | > 70% | Green |
| Warning | 40% – 70% | Yellow |
| Critical | < 40% | Red |

---

## 10. Report Format

### JSON Structure
```json
{
  "store_id": "store_001",
  "timestamp": "2026-04-30T10:00:00Z",
  "overall_occupancy": 62.5,
  "alert_status": "Warning",
  "total_products_detected": 34,
  "total_empty_slots": 12,
  "rows": [
    {
      "row_id": 1,
      "zone_label": "Snacks Zone",
      "occupancy_percent": 75.0,
      "alert": "OK",
      "products": [
        { "name": "Lays Classic", "quantity": 4, "status": "filled" },
        { "name": "Kurkure", "quantity": 2, "status": "filled" }
      ],
      "empty_slots": 2
    }
  ],
  "restock_priority": ["Row 3 - Dairy Zone", "Row 2 - Beverages Zone"]
}
```

### CSV Structure
```
row_id, zone_label, occupancy_percent, alert, product_name, quantity, empty_slots
1, Snacks Zone, 75.0, OK, Lays Classic, 4, 2
1, Snacks Zone, 75.0, OK, Kurkure, 2, 2
```

---

## 11. Success Criteria

- System correctly detects products and empty slots on a test shelf image
- Groq correctly identifies at least 70% of visible product names
- Dashboard loads and displays results within 30 seconds for a 30-second video
- JSON and CSV export correctly reflects all detected data
- Demo video is clear and shows end-to-end working system

---

## 12. Tech Stack (High Level)

| Layer | Technology |
|-------|-----------|
| Object Detection | YOLOv8 (Ultralytics) — SKU110K pretrained weights |
| AI Vision / Product ID | Groq API — Llama 4 Scout Vision |
| Backend | FastAPI (Python) |
| Frontend | React + Tailwind CSS |
| Report Generation | Python (json, csv modules) |
| Video Processing | OpenCV |
| Model Weights | Downloaded from Roboflow / HuggingFace |