"""
RetailEye — FastAPI Backend (with MongoDB persistence)
"""

import os
import glob
import shutil
import tempfile
import traceback
import uuid
import time
import math

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone

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
app = FastAPI(title="RetailEye API", version="2.0.0")

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
# MongoDB setup
# ---------------------------------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "retaileye")

mongo_client: AsyncIOMotorClient = None
db = None

@app.on_event("startup")
async def startup_db():
    global mongo_client, db
    mongo_client = AsyncIOMotorClient(MONGO_URI)
    db = mongo_client[DB_NAME]
    _log(f"✅ [MongoDB] Connected to {MONGO_URI} / {DB_NAME}")

@app.on_event("shutdown")
async def shutdown_db():
    if mongo_client:
        mongo_client.close()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _log(msg: str):
    t = time.strftime("%H:%M:%S")
    print(f"[{t}] {msg}")

def _oid_to_str(doc: dict) -> dict:
    """Convert ObjectId to string for JSON serialization."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

def _build_empty_shelf_rows(frame_height: int, frame_width: int, row_count: int = 3) -> list[dict]:
    rows: list[dict] = []
    band_height = frame_height / max(row_count, 1)
    for row_idx in range(row_count):
        y1 = int(max(0, row_idx * band_height + band_height * 0.08))
        y2 = int(min(frame_height - 1, (row_idx + 1) * band_height - band_height * 0.08))
        rows.append({
            "row_id": row_idx,
            "detections": [],
            "empty_slots": 1,
            "empty_slot_bboxes": [[0, y1, max(1, frame_width - 1), y2]],
        })
    return rows

def _run_image_pipeline(frame: np.ndarray) -> tuple[np.ndarray, dict]:
    h, w = frame.shape[:2]
    _log(f"🖼️  Started image pipeline ({w}x{h})")

    detections = detect(frame)
    _log(f"🎯 [YOLOv8] Detected {len(detections)} total items")

    rows = detect_rows(detections, h)
    if not rows:
        _log("⚠️  No rows detected — using fallback.")
        raw_rows = _build_empty_shelf_rows(h, w)
        report = analyze(raw_rows)
        report["_raw_rows"] = raw_rows
        annotated = draw_overlay(frame, report)
        return annotated, report

    _log(f"📚 [Clustering] {len(rows)} shelf rows")
    empty_counts, empty_bboxes = detect_empty_slots(rows, w)

    raw_rows = []
    _log("🤖 [Groq] Starting AI identification...")
    for row_idx, row in enumerate(rows):
        row_dets = []
        for det in row:
            x1, y1, x2, y2 = det["bbox"]
            PAD = 10
            crop = frame[max(0, y1-PAD):min(h, y2+PAD), max(0, x1-PAD):min(w, x2+PAD)]
            if (y2 - y1) < 15 or (x2 - x1) < 15:
                det["product_name"] = "Small Item"
                det["category"] = "Other"
            else:
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
    _log("✅ [Groq] Identification complete")

    report = analyze(raw_rows)
    report["_raw_rows"] = raw_rows
    annotated = draw_overlay(frame, report)
    return annotated, report

def _compute_shelf_score(report: dict) -> int:
    """Convert overall occupancy + alert into a 0-100 shelf score."""
    occ = report.get("overall_occupancy", 0)
    alert = report.get("overall_alert", "OK")
    base = occ
    if alert == "Critical":
        base = max(0, base - 20)
    elif alert == "Warning":
        base = max(0, base - 10)
    return min(100, int(round(base)))

# ---------------------------------------------------------------------------
# Routes — Analysis
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze/image")
async def analyze_image(file: UploadFile = File(...)):
    _log(f"📥 Received image: {file.filename}")
    try:
        contents = await file.read()
        np_arr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Could not decode image")

        annotated, report = _run_image_pipeline(frame)

        uid = uuid.uuid4().hex[:8]
        out_name = f"processed_{uid}.jpg"
        json_name = f"report_{uid}.json"
        csv_name  = f"report_{uid}.csv"

        cv2.imwrite(os.path.join(OUTPUTS_DIR, out_name), annotated, [cv2.IMWRITE_JPEG_QUALITY, 92])
        clean_report = {k: v for k, v in report.items() if not k.startswith("_")}
        save_json(clean_report, os.path.join(OUTPUTS_DIR, json_name))
        save_csv(clean_report, os.path.join(OUTPUTS_DIR, csv_name))

        shelf_score = _compute_shelf_score(clean_report)

        # Persist to MongoDB
        doc = {
            "filename": file.filename,
            "file_type": "image",
            "processed_image_url": f"/outputs/{out_name}",
            "report_json_url": f"/outputs/{json_name}",
            "report_csv_url": f"/outputs/{csv_name}",
            "shelf_score": shelf_score,
            "report": clean_report,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        result = await db.analyses.insert_one(doc)
        doc["_id"] = str(result.inserted_id)

        _log(f"🚀 Done: {file.filename} → score {shelf_score}")
        return JSONResponse({
            "status": "success",
            "_id": doc["_id"],
            "id": doc["_id"],
            "filename": file.filename,
            "file_type": "image",
            "processed_image_url": f"/outputs/{out_name}",
            "report_json_url": f"/outputs/{json_name}",
            "report_csv_url": f"/outputs/{csv_name}",
            "shelf_score": shelf_score,
            "report": clean_report,
            "created_at": doc["created_at"],
        })

    except Exception as e:
        _log(f"❌ Image analysis failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/video")
async def analyze_video(file: UploadFile = File(...)):
    _log(f"🎬 Received video: {file.filename}")
    try:
        suffix = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        shutil.copyfileobj(file.file, tmp)
        tmp.close()

        uid = uuid.uuid4().hex[:8]
        out_name = f"processed_{uid}.mp4"
        json_name = f"report_{uid}.json"
        csv_name  = f"report_{uid}.csv"

        report = process_video(tmp.name, os.path.join(OUTPUTS_DIR, out_name))
        os.unlink(tmp.name)

        clean_report = {k: v for k, v in report.items() if not k.startswith("_")}
        save_json(clean_report, os.path.join(OUTPUTS_DIR, json_name))
        save_csv(clean_report, os.path.join(OUTPUTS_DIR, csv_name))

        shelf_score = _compute_shelf_score(clean_report)

        doc = {
            "filename": file.filename,
            "file_type": "video",
            "processed_video_url": f"/outputs/{out_name}",
            "report_json_url": f"/outputs/{json_name}",
            "report_csv_url": f"/outputs/{csv_name}",
            "shelf_score": shelf_score,
            "report": clean_report,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        result = await db.analyses.insert_one(doc)
        doc["_id"] = str(result.inserted_id)

        _log(f"🚀 Done video: {file.filename}")
        return JSONResponse({
            "status": "success",
            "_id": doc["_id"],
            "id": doc["_id"],
            "filename": file.filename,
            "file_type": "video",
            "processed_image_url": f"/outputs/{out_name}",
            "processed_video_url": f"/outputs/{out_name}",
            "report_json_url": f"/outputs/{json_name}",
            "report_csv_url": f"/outputs/{csv_name}",
            "shelf_score": shelf_score,
            "report": clean_report,
            "created_at": doc["created_at"],
        })

    except Exception as e:
        _log(f"❌ Video analysis failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Routes — History (MongoDB CRUD)
# ---------------------------------------------------------------------------
@app.get("/history")
async def get_history(limit: int = 50, skip: int = 0):
    cursor = db.analyses.find({}, {"report._raw_rows": 0}).sort("created_at", -1).skip(skip).limit(limit)
    docs = []
    async for doc in cursor:
        docs.append(_oid_to_str(doc))
    total = await db.analyses.count_documents({})
    return JSONResponse({"total": total, "items": docs})


@app.get("/history/{analysis_id}")
async def get_history_item(analysis_id: str):
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    doc = await db.analyses.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return JSONResponse(_oid_to_str(doc))


@app.delete("/history/{analysis_id}")
async def delete_history_item(analysis_id: str):
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.analyses.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return JSONResponse({"status": "deleted", "id": analysis_id})


@app.delete("/history")
async def clear_all_history():
    result = await db.analyses.delete_many({})
    return JSONResponse({"status": "cleared", "deleted_count": result.deleted_count})


# ---------------------------------------------------------------------------
# Routes — Stats (for Dashboard KPIs)
# ---------------------------------------------------------------------------
@app.get("/stats")
async def get_stats():
    total = await db.analyses.count_documents({})
    if total == 0:
        return JSONResponse({
            "total_scans": 0,
            "avg_shelf_score": 0,
            "avg_occupancy": 0,
            "total_empty_slots": 0,
            "total_products_found": 0,
            "recent_alert": "OK",
        })

    pipeline = [
        {"$group": {
            "_id": None,
            "avg_score": {"$avg": "$shelf_score"},
            "avg_occ": {"$avg": "$report.overall_occupancy"},
            "total_empty": {"$sum": "$report.total_empty_slots"},
            "total_products": {"$sum": "$report.total_products_detected"},
        }}
    ]
    agg = await db.analyses.aggregate(pipeline).to_list(1)
    agg = agg[0] if agg else {}

    # Most recent alert
    latest = await db.analyses.find_one({}, sort=[("created_at", -1)])
    recent_alert = latest.get("report", {}).get("overall_alert", "OK") if latest else "OK"

    return JSONResponse({
        "total_scans": total,
        "avg_shelf_score": round(agg.get("avg_score", 0), 1),
        "avg_occupancy": round(agg.get("avg_occ", 0), 1),
        "total_empty_slots": int(agg.get("total_empty", 0)),
        "total_products_found": int(agg.get("total_products", 0)),
        "recent_alert": recent_alert,
    })


# ---------------------------------------------------------------------------
# Routes — Downloads (legacy + by ID)
# ---------------------------------------------------------------------------
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
        raise HTTPException(status_code=404, detail="No video found.")
    return FileResponse(files[0], media_type="video/mp4", filename="processed_video.mp4")


@app.get("/download/{analysis_id}/json")
async def download_by_id_json(analysis_id: str):
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    doc = await db.analyses.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    url = doc.get("report_json_url", "")
    path = os.path.join(os.path.dirname(__file__), url.lstrip("/"))
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(path, media_type="application/json", filename=f"report_{analysis_id}.json")


@app.get("/download/{analysis_id}/csv")
async def download_by_id_csv(analysis_id: str):
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    doc = await db.analyses.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    url = doc.get("report_csv_url", "")
    path = os.path.join(os.path.dirname(__file__), url.lstrip("/"))
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(path, media_type="text/csv", filename=f"report_{analysis_id}.csv")
