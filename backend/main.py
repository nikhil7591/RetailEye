"""
RetailEye — FastAPI Backend (with PostgreSQL/Neon DB persistence)
"""

import asyncio
import os
import glob
import shutil
import tempfile
import traceback
import uuid
import time
import math
import pathlib

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime, timezone

from detector import detect, detect_rows, detect_empty_slots
from groq_vision import identify_product
from analysis_engine import analyze
from overlay import draw_overlay
from report_generator import save_json, save_csv
from video_processor import process_video
import database as db

# ---------------------------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------------------------
_BACKEND_ENV = pathlib.Path(__file__).resolve().parent / ".env"
load_dotenv(_BACKEND_ENV)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(title="RetailEye API", version="2.0.0")

CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
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
# Database lifecycle
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    if not os.getenv("GROQ_API_KEY"):
        _log("⚠️  WARNING: GROQ_API_KEY is not set — product identification will return fallback results")
    await db.init_db()
    asyncio.create_task(_ttl_cleanup_loop())

@app.on_event("shutdown")
async def shutdown():
    await db.close_db()

async def _ttl_cleanup_loop():
    """Background task to clean up old output files every 24h"""
    while True:
        try:
            now = time.time()
            thirty_days = 30 * 24 * 60 * 60
            deleted_count = 0

            for file in os.listdir(OUTPUTS_DIR):
                file_path = os.path.join(OUTPUTS_DIR, file)
                if os.path.isfile(file_path):
                    if now - os.path.getmtime(file_path) > thirty_days:
                        rel_path = f"/outputs/{file}"
                        if not await db.is_file_in_use(rel_path):
                            try:
                                os.remove(file_path)
                                deleted_count += 1
                            except OSError:
                                pass

            if deleted_count > 0:
                _log(f"🧹 [Cleanup] Removed {deleted_count} old orphaned files.")
        except Exception as e:
            _log(f"⚠️ [Cleanup] Error during file cleanup: {e}")

        await asyncio.sleep(86400)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _log(msg: str):
    t = time.strftime("%H:%M:%S")
    print(f"[{t}] {msg}")

DEFAULT_SETTINGS = {
    "store_name": "RetailEye Store 001",
    "store_id": "store_001",
    "warn_threshold": 70,
    "crit_threshold": 40,
}

def _normalize_settings(doc: dict | None) -> dict:
    if not doc:
        return dict(DEFAULT_SETTINGS)
    clean = dict(DEFAULT_SETTINGS)
    for key in DEFAULT_SETTINGS:
        if key in doc and doc[key] is not None:
            clean[key] = doc[key]
    return clean

async def _get_settings() -> dict:
    doc = await db.get_settings()
    return _normalize_settings(doc)

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


def _grid_fallback(frame: np.ndarray, grid_size: int = 4) -> list[dict]:
    """
    Grid fallback (Step 3 of pipeline spec).
    When YOLO detects fewer than 3 boxes, divide the image into a grid
    and analyze each cell individually via Groq Vision.
    """
    h, w = frame.shape[:2]
    _log(f"🔲 [Grid Fallback] Dividing image into {grid_size}x{grid_size} grid")
    cell_h = h // grid_size
    cell_w = w // grid_size

    raw_rows: list[dict] = []

    for row_idx in range(grid_size):
        row_dets = []
        empty_count = 0
        empty_bboxes = []

        for col_idx in range(grid_size):
            y1 = row_idx * cell_h
            y2 = min((row_idx + 1) * cell_h, h)
            x1 = col_idx * cell_w
            x2 = min((col_idx + 1) * cell_w, w)

            cell_crop = frame[y1:y2, x1:x2]
            if cell_crop.size == 0:
                continue

            product_info = identify_product(cell_crop)
            name = product_info.get("product_name", "Unidentified Product")

            if name in ("Unidentified Product", "Empty", "empty", ""):
                empty_count += 1
                empty_bboxes.append([x1, y1, x2, y2])
            else:
                row_dets.append({
                    "bbox": [x1, y1, x2, y2],
                    "confidence": 0.5,
                    "class_name": "product",
                    "is_empty": False,
                    "product_name": name,
                    "category": product_info.get("category", "Other"),
                })

        raw_rows.append({
            "row_id": row_idx,
            "detections": row_dets,
            "empty_slots": empty_count,
            "empty_slot_bboxes": empty_bboxes,
        })

    _log(f"✅ [Grid Fallback] Analyzed {grid_size * grid_size} cells")
    return raw_rows

def _run_image_pipeline(frame: np.ndarray, settings: dict) -> tuple[np.ndarray, dict]:
    h, w = frame.shape[:2]
    _log(f"🖼️  Started image pipeline ({w}x{h})")

    warn_threshold = settings.get("warn_threshold", DEFAULT_SETTINGS["warn_threshold"])
    crit_threshold = settings.get("crit_threshold", DEFAULT_SETTINGS["crit_threshold"])
    store_id = settings.get("store_id", DEFAULT_SETTINGS["store_id"])

    detections = detect(frame)
    n_products = sum(1 for d in detections if d["class_name"] == "product")
    n_empties  = sum(1 for d in detections if d["class_name"] == "empty_space")
    _log(f"🎯 [YOLOv8 Dual Run] {n_products} products + {n_empties} empty spaces = {len(detections)} total")

    if len(detections) < 3:
        _log(f"⚠️  Only {len(detections)} detections — triggering grid fallback")
        raw_rows = _grid_fallback(frame, grid_size=4)
        report = analyze(raw_rows, warn_threshold, crit_threshold, store_id)
        report["_raw_rows"] = raw_rows
        annotated = draw_overlay(frame, report)
        return annotated, report

    rows = detect_rows(detections, h)
    if not rows:
        _log("⚠️  No rows detected — using empty shelf fallback.")
        raw_rows = _build_empty_shelf_rows(h, w)
        report = analyze(raw_rows, warn_threshold, crit_threshold, store_id)
        report["_raw_rows"] = raw_rows
        annotated = draw_overlay(frame, report)
        return annotated, report

    _log(f"📚 [Clustering] {len(rows)} shelf rows")

    product_only_rows = [
        [d for d in row if d.get("class_name") != "empty_space"]
        for row in rows
    ]
    gap_counts, gap_bboxes = detect_empty_slots(product_only_rows, w)

    raw_rows = []
    _log("🤖 [Groq] Starting AI identification...")
    for row_idx, row in enumerate(rows):
        product_dets = []
        yolo_empty_count = 0
        yolo_empty_bboxes = []

        for det in row:
            if det.get("class_name") == "empty_space":
                yolo_empty_count += 1
                yolo_empty_bboxes.append(det["bbox"])
                continue

            x1, y1, x2, y2 = det["bbox"]
            if (y2 - y1) < 15 or (x2 - x1) < 15:
                det["product_name"] = "Small Item"
                det["category"] = "Other"
            elif det.get("confidence", 0) >= 0.80:
                det["product_name"] = "Product"
                det["category"] = "Other"
                _log(f"   ⏩ Skipping Groq for high-confidence detection ({det['confidence']:.2f})")
            else:
                PAD = 10
                crop = frame[max(0, y1-PAD):min(h, y2+PAD), max(0, x1-PAD):min(w, x2+PAD)]
                product_info = identify_product(crop)
                det["product_name"] = product_info.get("product_name", "Unidentified")
                det["category"] = product_info.get("category", "Other")
            product_dets.append(det)

        gc = gap_counts[row_idx] if row_idx < len(gap_counts) else 0
        gb = gap_bboxes[row_idx] if row_idx < len(gap_bboxes) else []
        total_empty = yolo_empty_count + gc
        all_empty_bboxes = yolo_empty_bboxes + gb

        raw_rows.append({
            "row_id": row_idx,
            "detections": product_dets,
            "empty_slots": total_empty,
            "empty_slot_bboxes": all_empty_bboxes,
        })
    _log("✅ [Groq] Identification complete")

    report = analyze(raw_rows, warn_threshold, crit_threshold, store_id)
    report["_raw_rows"] = raw_rows
    annotated = draw_overlay(frame, report)
    return annotated, report

def _compute_shelf_score(report: dict) -> int:
    occ = report.get("overall_occupancy", 0)
    alert = report.get("overall_alert", "OK")
    base = occ
    if alert == "Critical":
        base = max(0, base - 20)
    elif alert == "Warning":
        base = max(0, base - 10)
    return min(100, int(round(base)))

DEFAULT_USER_ID = "default"

# ---------------------------------------------------------------------------
# Routes — Settings
# ---------------------------------------------------------------------------
@app.get("/settings")
async def get_settings_route():
    return await _get_settings()

@app.post("/settings")
async def update_settings_route(settings: dict):
    await db.save_settings(settings)
    return {"status": "saved"}


# ---------------------------------------------------------------------------
# Routes — Analysis
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze/image")
async def analyze_image(file: UploadFile = File(...), store_id: str = Query(None)):
    _log(f"📥 Received image: {file.filename}")
    try:
        contents = await file.read()
        np_arr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Could not decode image")

        settings = await _get_settings()
        if store_id:
            settings["store_id"] = store_id
        annotated, report = _run_image_pipeline(frame, settings)

        uid = uuid.uuid4().hex[:8]
        out_name = f"processed_{uid}.jpg"
        json_name = f"report_{uid}.json"
        csv_name  = f"report_{uid}.csv"

        cv2.imwrite(os.path.join(OUTPUTS_DIR, out_name), annotated, [cv2.IMWRITE_JPEG_QUALITY, 92])
        clean_report = {k: v for k, v in report.items() if not k.startswith("_")}
        save_json(clean_report, os.path.join(OUTPUTS_DIR, json_name))
        save_csv(clean_report, os.path.join(OUTPUTS_DIR, csv_name))

        shelf_score = _compute_shelf_score(clean_report)

        doc = {
            "user_id": DEFAULT_USER_ID,
            "filename": file.filename,
            "file_type": "image",
            "store_id": clean_report.get("store_id", settings.get("store_id", "store_001")),
            "processed_image_url": f"/outputs/{out_name}",
            "report_json_url": f"/outputs/{json_name}",
            "report_csv_url": f"/outputs/{csv_name}",
            "shelf_score": shelf_score,
            "report": clean_report,
            "alert_resolved": False,
            "resolved_at": None,
            "created_at": datetime.now(timezone.utc),
        }
        aid = await db.insert_analysis(doc)

        _log(f"🚀 Done: {file.filename} → score {shelf_score}")
        return JSONResponse({
            "status": "success",
            "_id": aid,
            "id": aid,
            "filename": file.filename,
            "file_type": "image",
            "processed_image_url": f"/outputs/{out_name}",
            "report_json_url": f"/outputs/{json_name}",
            "report_csv_url": f"/outputs/{csv_name}",
            "shelf_score": shelf_score,
            "report": clean_report,
            "created_at": doc["created_at"].isoformat(),
        })

    except Exception as e:
        _log(f"❌ Image analysis failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/video")
async def analyze_video(file: UploadFile = File(...), store_id: str = Query(None)):
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

        settings = await _get_settings()
        if store_id:
            settings["store_id"] = store_id
        report = await asyncio.to_thread(process_video, tmp.name, os.path.join(OUTPUTS_DIR, out_name), settings)
        os.unlink(tmp.name)

        clean_report = {k: v for k, v in report.items() if not k.startswith("_")}
        save_json(clean_report, os.path.join(OUTPUTS_DIR, json_name))
        save_csv(clean_report, os.path.join(OUTPUTS_DIR, csv_name))

        shelf_score = _compute_shelf_score(clean_report)

        doc = {
            "user_id": DEFAULT_USER_ID,
            "filename": file.filename,
            "file_type": "video",
            "store_id": clean_report.get("store_id", settings.get("store_id", "store_001")),
            "processed_video_url": f"/outputs/{out_name}",
            "report_json_url": f"/outputs/{json_name}",
            "report_csv_url": f"/outputs/{csv_name}",
            "shelf_score": shelf_score,
            "report": clean_report,
            "alert_resolved": False,
            "resolved_at": None,
            "created_at": datetime.now(timezone.utc),
        }
        aid = await db.insert_analysis(doc)

        _log(f"🚀 Done video: {file.filename}")
        return JSONResponse({
            "status": "success",
            "_id": aid,
            "id": aid,
            "filename": file.filename,
            "file_type": "video",
            "processed_image_url": f"/outputs/{out_name}",
            "processed_video_url": f"/outputs/{out_name}",
            "report_json_url": f"/outputs/{json_name}",
            "report_csv_url": f"/outputs/{csv_name}",
            "shelf_score": shelf_score,
            "report": clean_report,
            "created_at": doc["created_at"].isoformat(),
        })

    except Exception as e:
        _log(f"❌ Video analysis failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Routes — History
# ---------------------------------------------------------------------------
@app.get("/history")
async def get_history(limit: int = 50, skip: int = 0, store_id: str = Query(None)):
    items, total = await db.find_analyses(DEFAULT_USER_ID, store_id, limit, skip)
    return JSONResponse({"total": total, "items": items})


@app.get("/history/{analysis_id}")
async def get_history_item(analysis_id: str):
    doc = await db.find_analysis_by_id(analysis_id, DEFAULT_USER_ID)
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return JSONResponse(doc)


@app.patch("/history/{analysis_id}/resolve")
async def resolve_history_alert(analysis_id: str):
    matched = await db.resolve_alert(analysis_id, DEFAULT_USER_ID)
    if not matched:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return JSONResponse({"status": "resolved", "id": analysis_id})


@app.delete("/history/{analysis_id}")
async def delete_history_item(analysis_id: str):
    doc = await db.delete_analysis(analysis_id, DEFAULT_USER_ID)
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    # Clean up output files
    for url_key in ("processed_image_url", "processed_video_url", "report_json_url", "report_csv_url"):
        rel_path = doc.get(url_key, "")
        if rel_path:
            abs_path = os.path.join(os.path.dirname(__file__), rel_path.lstrip("/"))
            if os.path.isfile(abs_path):
                try:
                    os.remove(abs_path)
                    _log(f"🗑️  Deleted file: {abs_path}")
                except OSError:
                    pass
    return JSONResponse({"status": "deleted", "id": analysis_id})


@app.delete("/history")
async def clear_all_history():
    count = await db.delete_all_analyses(DEFAULT_USER_ID)
    return JSONResponse({"status": "cleared", "deleted_count": count})


# ---------------------------------------------------------------------------
# Routes — Notifications
# ---------------------------------------------------------------------------
@app.get("/notifications")
async def get_notifications(limit: int = 10):
    items = await db.find_notifications(DEFAULT_USER_ID, limit)
    return JSONResponse({"items": items})


# ---------------------------------------------------------------------------
# Routes — Stats
# ---------------------------------------------------------------------------
@app.get("/stats")
async def get_stats_route():
    return JSONResponse(await db.get_stats())


@app.get("/stats/heatmap")
async def get_heatmap(limit: int = 8):
    return JSONResponse(await db.get_heatmap(limit))


# ---------------------------------------------------------------------------
# Routes — Downloads
# ---------------------------------------------------------------------------
@app.get("/download/{analysis_id}/json")
async def download_by_id_json(analysis_id: str):
    doc = await db.find_analysis_by_id(analysis_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    url = doc.get("report_json_url", "")
    path = os.path.join(os.path.dirname(__file__), url.lstrip("/"))
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(path, media_type="application/json", filename=f"report_{analysis_id}.json")


@app.get("/download/{analysis_id}/csv")
async def download_by_id_csv(analysis_id: str):
    doc = await db.find_analysis_by_id(analysis_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    url = doc.get("report_csv_url", "")
    path = os.path.join(os.path.dirname(__file__), url.lstrip("/"))
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(path, media_type="text/csv", filename=f"report_{analysis_id}.csv")
