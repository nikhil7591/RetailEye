"""
RetailEye — FastAPI Backend (with MongoDB persistence)
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
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone
from pydantic import BaseModel

from detector import detect, detect_rows, detect_empty_slots
from groq_vision import identify_product
from analysis_engine import analyze
from overlay import draw_overlay
from report_generator import save_json, save_csv
from video_processor import process_video
# Auth removed — open access mode

# ---------------------------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------------------------
_BACKEND_ENV = pathlib.Path(__file__).resolve().parent / ".env"
_ROOT_ENV = pathlib.Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_BACKEND_ENV)
load_dotenv(_ROOT_ENV)

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
# MongoDB setup
# ---------------------------------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "retaileye")

mongo_client: AsyncIOMotorClient = None
db = None

@app.on_event("startup")
async def startup_db():
    global mongo_client, db
    # Environment validation
    if not os.getenv("GROQ_API_KEY"):
        _log("⚠️  WARNING: GROQ_API_KEY is not set — product identification will return fallback results")
    if MONGO_URI == "mongodb://localhost:27017":
        _log("ℹ️  Using default local MongoDB URI. Set MONGO_URI for production.")
    mongo_client = AsyncIOMotorClient(MONGO_URI)
    db = mongo_client[DB_NAME]
    _log(f"✅ [MongoDB] Connected to {MONGO_URI} / {DB_NAME}")
    # Create indexes for query performance
    await db.users.create_index([("email", 1)], unique=True)
    await db.analyses.create_index([("created_at", -1)])
    await db.analyses.create_index([("report.overall_alert", 1)])
    await db.analyses.create_index([("store_id", 1), ("created_at", -1)])
    _log("✅ [MongoDB] Indexes ensured")
    asyncio.create_task(_ttl_cleanup_loop())

@app.on_event("shutdown")
async def shutdown_db():
    if mongo_client:
        mongo_client.close()

async def _ttl_cleanup_loop():
    """Background task to clean up old output files and orphaned files every 24h"""
    while True:
        try:
            now = time.time()
            thirty_days = 30 * 24 * 60 * 60
            deleted_count = 0
            
            for file in os.listdir(OUTPUTS_DIR):
                file_path = os.path.join(OUTPUTS_DIR, file)
                if os.path.isfile(file_path):
                    # Check age
                    if now - os.path.getmtime(file_path) > thirty_days:
                        # Check if file is still referenced in DB
                        rel_path = f"/outputs/{file}"
                        in_use = await db.analyses.find_one({
                            "$or": [
                                {"processed_image_url": rel_path},
                                {"report_json_url": rel_path},
                                {"report_csv_url": rel_path}
                            ]
                        })
                        if not in_use:
                            try:
                                os.remove(file_path)
                                deleted_count += 1
                            except OSError:
                                pass
            
            if deleted_count > 0:
                _log(f"🧹 [Cleanup] Removed {deleted_count} old orphaned files.")
        except Exception as e:
            _log(f"⚠️ [Cleanup] Error during file cleanup: {e}")
            
        await asyncio.sleep(86400) # Sleep for 24 hours

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
    doc = await db.settings.find_one({"_id": "global"})
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
                # Cell appears empty
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

    # --- Grid fallback (Step 5): if YOLO finds < 3 boxes total, use grid analysis ---
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

    # Gap-based empty detection needs ONLY product detections
    # (empty_space boxes would fill gaps and mask real empties)
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
            # --- Separate YOLO-detected empty spaces from products ---
            if det.get("class_name") == "empty_space":
                yolo_empty_count += 1
                yolo_empty_bboxes.append(det["bbox"])
                continue  # don't add to product detections

            # --- Product identification via Groq (Step 4) ---
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

        # Merge YOLO empties + gap-based empties (avoid duplicates)
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
# Default user (auth removed)
# ---------------------------------------------------------------------------
DEFAULT_USER_ID = "default"

# ---------------------------------------------------------------------------
# Routes — Settings
# ---------------------------------------------------------------------------
@app.get("/settings")
async def get_settings_route():
    return await _get_settings()

@app.post("/settings")
async def update_settings_route(settings: dict):
    await db.settings.replace_one({}, settings, upsert=True)
    return {"status": "saved"}


# ---------------------------------------------------------------------------
# Routes — Analysis
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze/image")
async def analyze_image(file: UploadFile = File(...), store_id: str = Query(None)):
    user_id = DEFAULT_USER_ID
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

        # Persist to MongoDB
        doc = {
            "user_id": user_id,
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
async def analyze_video(file: UploadFile = File(...), store_id: str = Query(None)):
    user_id = DEFAULT_USER_ID
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
            "user_id": user_id,
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
async def get_history(limit: int = 50, skip: int = 0, store_id: str = Query(None)):
    query = {"user_id": DEFAULT_USER_ID}
    if store_id:
        query["store_id"] = store_id
    cursor = db.analyses.find(query, {"report._raw_rows": 0}).sort("created_at", -1).skip(skip).limit(limit)
    docs = []
    async for doc in cursor:
        docs.append(_oid_to_str(doc))
    total = await db.analyses.count_documents(query)
    return JSONResponse({"total": total, "items": docs})


@app.get("/history/{analysis_id}")
async def get_history_item(analysis_id: str):
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    doc = await db.analyses.find_one({"_id": oid, "user_id": DEFAULT_USER_ID})
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return JSONResponse(_oid_to_str(doc))


@app.patch("/history/{analysis_id}/resolve")
async def resolve_history_alert(analysis_id: str):
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.analyses.update_one(
        {"_id": oid, "user_id": DEFAULT_USER_ID},
        {"$set": {"alert_resolved": True, "resolved_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return JSONResponse({"status": "resolved", "id": analysis_id})


@app.delete("/history/{analysis_id}")
async def delete_history_item(analysis_id: str):
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    # Fetch doc first to clean up output files
    doc = await db.analyses.find_one({"_id": oid, "user_id": DEFAULT_USER_ID})
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    # Delete associated output files from disk
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
    await db.analyses.delete_one({"_id": oid, "user_id": DEFAULT_USER_ID})
    return JSONResponse({"status": "deleted", "id": analysis_id})


@app.delete("/history")
async def clear_all_history():
    result = await db.analyses.delete_many({"user_id": DEFAULT_USER_ID})
    return JSONResponse({"status": "cleared", "deleted_count": result.deleted_count})


# ---------------------------------------------------------------------------
# Routes — Notifications
# ---------------------------------------------------------------------------
@app.get("/notifications")
async def get_notifications(limit: int = 10):
    query = {
        "user_id": DEFAULT_USER_ID,
        "report.overall_alert": {"$in": ["Critical", "Warning"]},
        "alert_resolved": {"$ne": True},
    }
    cursor = db.analyses.find(query, {"report._raw_rows": 0}).sort("created_at", -1).limit(limit)
    items = []
    async for doc in cursor:
        doc = _oid_to_str(doc)
        report = doc.get("report", {})
        alert = report.get("overall_alert", "Warning")
        occ = int(round(report.get("overall_occupancy", 0)))
        empty = int(report.get("total_empty_slots", 0))
        title = "Critical alert" if alert == "Critical" else "Warning alert"
        body = f"Occupancy {occ}% | Empty slots {empty}"
        items.append({
            "id": doc.get("_id"),
            "analysis_id": doc.get("_id"),
            "filename": doc.get("filename"),
            "alert": alert,
            "title": title,
            "body": body,
            "created_at": doc.get("created_at"),
        })
    return JSONResponse({"items": items})


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
# Routes — Heatmap Stats
# ---------------------------------------------------------------------------
@app.get("/stats/heatmap")
async def get_heatmap(limit: int = 8):
    """Per-row occupancy history across recent analyses for the heatmap widget."""
    cursor = db.analyses.find(
        {}, {"report.rows": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(limit)

    row_map: dict[int, dict] = {}
    for doc in reversed(docs):  # oldest first so history is chronological
        for row in doc.get("report", {}).get("rows", []):
            rid = row.get("row_id", 0)
            if rid not in row_map:
                row_map[rid] = {
                    "row_id": rid,
                    "row_display": row.get("row_display", rid + 1),
                    "zone_label": row.get("zone_label", f"Row {rid + 1}"),
                    "history": [],
                }
            row_map[rid]["history"].append(row.get("occupancy_percent", 0))

    result = []
    for rid in sorted(row_map.keys()):
        entry = row_map[rid]
        hist = entry["history"]
        entry["avg_occupancy"] = round(sum(hist) / len(hist), 1) if hist else 0
        result.append(entry)

    return JSONResponse({"rows": result, "scan_count": len(docs)})


# ---------------------------------------------------------------------------
# Routes — Downloads (by ID)
# ---------------------------------------------------------------------------


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
