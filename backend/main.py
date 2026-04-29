"""
RetailEye — FastAPI Backend
Main application entry point with image/video analysis endpoints.
"""

import os
import glob
import shutil
import tempfile
import traceback
import uuid
import time

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from detector import detect, detect_rows, detect_empty_slots
from groq_vision import identify_product
from analysis_engine import analyze
from overlay import draw_overlay
from report_generator import save_json, save_csv
from video_processor import process_video

# ---------------------------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------------------------
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(title="RetailEye API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUTS_DIR = os.path.join(os.path.dirname(__file__), "outputs")
os.makedirs(OUTPUTS_DIR, exist_ok=True)
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _log(msg: str):
    """Simple terminal logger with timestamp"""
    t = time.strftime("%H:%M:%S")
    print(f"[{t}] {msg}")

def _run_image_pipeline(frame: np.ndarray) -> tuple[np.ndarray, dict]:
    h, w = frame.shape[:2]
    _log(f"🖼️  Started image pipeline (Resolution: {w}x{h})")

    # 1. YOLO detection
    detections = detect(frame)
    _log(f"🎯 [YOLOv8] Detected {len(detections)} total items")

    # 2. Cluster into rows
    rows = detect_rows(detections, h)
    if not rows:
        _log("⚠️  [YOLOv8] No rows detected. Returning empty report.")
        return frame, analyze([])

    _log(f"📚 [Clustering] Formed {len(rows)} shelf rows")

    # 3. Detect empty slots per row
    empty_counts, empty_bboxes = detect_empty_slots(rows, w)
    _log(f"🕳️  [Gaps] Found empty slots per row: {empty_counts}")

    # 4. Identify each product via Groq Vision
    raw_rows = []
    _log("🤖 [Groq Vision] Starting AI product identification...")
    for row_idx, row in enumerate(rows):
        row_dets = []
        for det in row:
            x1, y1, x2, y2 = det["bbox"]
            # Add 10px padding so label edges aren't cut off
            PAD = 10
            x1_p = max(0, x1 - PAD)
            y1_p = max(0, y1 - PAD)
            x2_p = min(w, x2 + PAD)
            y2_p = min(h, y2 + PAD)
            crop = frame[y1_p:y2_p, x1_p:x2_p]

            # Skip Groq for tiny detections (likely noise)
            crop_h = y2 - y1
            crop_w = x2 - x1
            if crop_h < 20 or crop_w < 20:
                det["product_name"] = "Small Item"
                det["category"] = "Other"
                row_dets.append(det)
                continue

            product_info = identify_product(crop)
            det["product_name"] = product_info.get("product_name", "Unidentified")
            det["category"] = product_info.get("category", "Other")
            row_dets.append(det)

        ec = empty_counts[row_idx] if row_idx < len(empty_counts) else 0
        eb = empty_bboxes[row_idx] if row_idx < len(empty_bboxes) else []
        raw_rows.append({
            "row_id": row_idx,
            "detections": row_dets,
            "empty_slots": ec,
            "empty_slot_bboxes": eb,
        })
    _log("✅ [Groq Vision] Identification complete")

    # 5. Analyze
    report = analyze(raw_rows)
    report["_raw_rows"] = raw_rows
    _log(f"📊 [Analysis] Overall Occupancy: {report['overall_occupancy']}% | Alert: {report['overall_alert']}")

    # 6. Draw overlay
    annotated = draw_overlay(frame, report)
    _log("🎨 [Overlay] Bounding boxes and HUD rendered")

    return annotated, report

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/analyze/image")
async def analyze_image(file: UploadFile = File(...)):
    _log(f"📥 [API] Received image upload: {file.filename}")
    try:
        contents = await file.read()
        np_arr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            raise ValueError("Could not decode image bytes")

        annotated, report = _run_image_pipeline(frame)

        unique_id = uuid.uuid4().hex[:8]
        out_name = f"processed_{unique_id}.jpg"
        json_name = f"report_{unique_id}.json"
        csv_name = f"report_{unique_id}.csv"
        
        cv2.imwrite(os.path.join(OUTPUTS_DIR, out_name), annotated, [cv2.IMWRITE_JPEG_QUALITY, 92])

        clean_report = {k: v for k, v in report.items() if not k.startswith("_")}
        save_json(clean_report, os.path.join(OUTPUTS_DIR, json_name))
        save_csv(clean_report, os.path.join(OUTPUTS_DIR, csv_name))

        _log(f"🚀 [API] Successfully processed {file.filename}. Returning results.")
        return JSONResponse({
            "status": "success",
            "processed_image_url": f"/outputs/{out_name}",
            "report_json_url": f"/outputs/{json_name}",
            "report_csv_url": f"/outputs/{csv_name}",
            "report": clean_report,
        })

    except Exception as e:
        _log(f"❌ [ERROR] Image analysis failed: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {str(e)}")

@app.post("/analyze/video")
async def analyze_video(file: UploadFile = File(...)):
    _log(f"🎬 [API] Received video upload: {file.filename}")
    try:
        suffix = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        shutil.copyfileobj(file.file, tmp)
        tmp.close()
        
        unique_id = uuid.uuid4().hex[:8]
        out_name = f"processed_{unique_id}.mp4"
        json_name = f"report_{unique_id}.json"
        csv_name = f"report_{unique_id}.csv"
        
        report = process_video(tmp.name, os.path.join(OUTPUTS_DIR, out_name))
        
        os.unlink(tmp.name)
        
        clean_report = {k: v for k, v in report.items() if not k.startswith("_")}
        save_json(clean_report, os.path.join(OUTPUTS_DIR, json_name))
        save_csv(clean_report, os.path.join(OUTPUTS_DIR, csv_name))

        _log(f"🚀 [API] Successfully processed video {file.filename}")
        return JSONResponse({
            "status": "success",
            "processed_video_url": f"/outputs/{out_name}",
            "report_json_url": f"/outputs/{json_name}",
            "report_csv_url": f"/outputs/{csv_name}",
            "report": clean_report,
        })

    except Exception as e:
        _log(f"❌ [ERROR] Video analysis failed: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Video analysis failed: {str(e)}")

@app.get("/download/json")
async def download_json():
    files = sorted(glob.glob(os.path.join(OUTPUTS_DIR, "report_*.json")), key=os.path.getmtime, reverse=True)
    if not files:
        raise HTTPException(status_code=404, detail="No report found.")
    return FileResponse(files[0], media_type="application/json", filename="report.json")

@app.get("/download/csv")
async def download_csv():
    files = sorted(glob.glob(os.path.join(OUTPUTS_DIR, "report_*.csv")), key=os.path.getmtime, reverse=True)
    if not files:
        raise HTTPException(status_code=404, detail="No report found.")
    return FileResponse(files[0], media_type="text/csv", filename="report.csv")

@app.get("/download/video")
async def download_video():
    files = sorted(glob.glob(os.path.join(OUTPUTS_DIR, "processed_*.mp4")), key=os.path.getmtime, reverse=True)
    if not files:
        raise HTTPException(status_code=404, detail="No processed video found.")
    return FileResponse(files[0], media_type="video/mp4", filename="processed_video.mp4")
