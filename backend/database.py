"""
RetailEye — PostgreSQL Database Layer (Neon DB compatible)
Uses asyncpg for async PostgreSQL operations.
Stores analysis reports as JSONB for flexible nested data.
"""

import json
import os
import uuid
import asyncpg
from datetime import datetime, timezone

_pool: asyncpg.Pool = None


async def _setup_json_codec(conn):
    """Register JSON codec so asyncpg auto-decodes JSONB → dict."""
    await conn.set_type_codec(
        'jsonb', encoder=json.dumps, decoder=json.loads,
        schema='pg_catalog', format='text',
    )
    await conn.set_type_codec(
        'json', encoder=json.dumps, decoder=json.loads,
        schema='pg_catalog', format='text',
    )


async def init_db():
    """Initialize connection pool and create tables."""
    global _pool
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is not set")

    # Strip query params that asyncpg doesn't support (sslmode, channel_binding)
    # and use ssl=True explicitly for Neon DB
    clean_url = database_url.split("?")[0]
    _pool = await asyncpg.create_pool(
        clean_url, min_size=2, max_size=10, ssl="require",
        init=_setup_json_codec,
    )
    print(f"[db] ✅ Connected to PostgreSQL")

    async with _pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                user_id TEXT DEFAULT 'default',
                filename TEXT,
                file_type TEXT,
                store_id TEXT DEFAULT 'store_001',
                processed_image_url TEXT,
                processed_video_url TEXT,
                report_json_url TEXT,
                report_csv_url TEXT,
                shelf_score INTEGER DEFAULT 0,
                report JSONB DEFAULT '{}',
                alert_resolved BOOLEAN DEFAULT FALSE,
                resolved_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value JSONB DEFAULT '{}'
            );

            CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_analyses_store ON analyses(store_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_analyses_alert ON analyses((report->>'overall_alert'));
        """)
    print("[db] ✅ Tables and indexes ready")


async def close_db():
    global _pool
    if _pool:
        await _pool.close()


def _gen_id() -> str:
    return uuid.uuid4().hex[:24]


def _safe_report(val) -> dict:
    """Ensure report is a dict — handles both string and dict values."""
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return {}
    return {}


# ---------------------------------------------------------------------------
# Analyses CRUD
# ---------------------------------------------------------------------------

async def insert_analysis(doc: dict) -> str:
    """Insert an analysis record. Returns the generated ID."""
    aid = _gen_id()
    report_json = json.dumps(doc.get("report", {}))
    async with _pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO analyses (id, user_id, filename, file_type, store_id,
                processed_image_url, processed_video_url, report_json_url, report_csv_url,
                shelf_score, report, alert_resolved, resolved_at, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14)
        """,
            aid,
            doc.get("user_id", "default"),
            doc.get("filename"),
            doc.get("file_type"),
            doc.get("store_id", "store_001"),
            doc.get("processed_image_url"),
            doc.get("processed_video_url"),
            doc.get("report_json_url"),
            doc.get("report_csv_url"),
            doc.get("shelf_score", 0),
            report_json,
            doc.get("alert_resolved", False),
            doc.get("resolved_at"),
            doc.get("created_at", datetime.now(timezone.utc)),
        )
    return aid


def _row_to_dict(row: asyncpg.Record) -> dict:
    """Convert a DB row to a JSON-serializable dict."""
    d = dict(row)
    d["_id"] = d.pop("id", None)
    # Convert datetime to ISO string
    for key in ("created_at", "resolved_at"):
        if d.get(key) and hasattr(d[key], "isoformat"):
            d[key] = d[key].isoformat()
    # Ensure report is always a dict (old rows may be strings)
    d["report"] = _safe_report(d.get("report"))
    return d


async def find_analyses(user_id: str = "default", store_id: str = None,
                        limit: int = 50, skip: int = 0) -> tuple[list[dict], int]:
    """List analyses with pagination. Returns (items, total_count)."""
    async with _pool.acquire() as conn:
        where = "WHERE user_id = $1"
        params = [user_id]
        if store_id:
            where += " AND store_id = $2"
            params.append(store_id)

        total = await conn.fetchval(f"SELECT COUNT(*) FROM analyses {where}", *params)

        params.extend([limit, skip])
        n = len(params)
        rows = await conn.fetch(
            f"SELECT * FROM analyses {where} ORDER BY created_at DESC LIMIT ${n-1} OFFSET ${n}",
            *params
        )
    return [_row_to_dict(r) for r in rows], total


async def find_analysis_by_id(analysis_id: str, user_id: str = "default") -> dict | None:
    async with _pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM analyses WHERE id = $1 AND user_id = $2", analysis_id, user_id
        )
    return _row_to_dict(row) if row else None


async def resolve_alert(analysis_id: str, user_id: str = "default") -> bool:
    async with _pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE analyses SET alert_resolved = TRUE, resolved_at = NOW() WHERE id = $1 AND user_id = $2",
            analysis_id, user_id,
        )
    return result.split()[-1] != "0"  # "UPDATE 1" → matched


async def delete_analysis(analysis_id: str, user_id: str = "default") -> dict | None:
    """Delete and return the deleted doc (for file cleanup)."""
    async with _pool.acquire() as conn:
        row = await conn.fetchrow(
            "DELETE FROM analyses WHERE id = $1 AND user_id = $2 RETURNING *",
            analysis_id, user_id,
        )
    return _row_to_dict(row) if row else None


async def delete_all_analyses(user_id: str = "default") -> int:
    async with _pool.acquire() as conn:
        result = await conn.execute("DELETE FROM analyses WHERE user_id = $1", user_id)
    return int(result.split()[-1])


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

async def find_notifications(user_id: str = "default", limit: int = 10) -> list[dict]:
    async with _pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT id, filename, report, created_at
            FROM analyses
            WHERE user_id = $1
              AND (report->>'overall_alert') IN ('Critical', 'Warning')
              AND alert_resolved = FALSE
            ORDER BY created_at DESC
            LIMIT $2
        """, user_id, limit)

    items = []
    for row in rows:
        report = _safe_report(row["report"])
        alert = report.get("overall_alert", "Warning")
        occ = int(round(report.get("overall_occupancy", 0)))
        empty = int(report.get("total_empty_slots", 0))
        items.append({
            "id": row["id"],
            "analysis_id": row["id"],
            "filename": row["filename"],
            "alert": alert,
            "title": "Critical alert" if alert == "Critical" else "Warning alert",
            "body": f"Occupancy {occ}% | Empty slots {empty}",
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        })
    return items


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

async def get_stats() -> dict:
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT
                COUNT(*) as total,
                COALESCE(AVG(shelf_score), 0) as avg_score,
                COALESCE(AVG((report->>'overall_occupancy')::float), 0) as avg_occ,
                COALESCE(SUM((report->>'total_empty_slots')::int), 0) as total_empty,
                COALESCE(SUM((report->>'total_products_detected')::int), 0) as total_products
            FROM analyses
        """)
        latest = await conn.fetchrow(
            "SELECT report FROM analyses ORDER BY created_at DESC LIMIT 1"
        )

    recent_alert = "OK"
    if latest and latest["report"] is not None:
        recent_alert = _safe_report(latest["report"]).get("overall_alert", "OK")

    return {
        "total_scans": row["total"],
        "avg_shelf_score": round(float(row["avg_score"]), 1),
        "avg_occupancy": round(float(row["avg_occ"]), 1),
        "total_empty_slots": int(row["total_empty"]),
        "total_products_found": int(row["total_products"]),
        "recent_alert": recent_alert,
    }


async def get_heatmap(limit: int = 8) -> dict:
    async with _pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT report, created_at FROM analyses
            ORDER BY created_at DESC LIMIT $1
        """, limit)

    row_map: dict[int, dict] = {}
    for row in reversed(rows):
        report = _safe_report(row["report"])
        for r in report.get("rows", []):
            rid = r.get("row_id", 0)
            if rid not in row_map:
                row_map[rid] = {
                    "row_id": rid,
                    "row_display": r.get("row_display", rid + 1),
                    "zone_label": r.get("zone_label", f"Row {rid + 1}"),
                    "history": [],
                }
            row_map[rid]["history"].append(r.get("occupancy_percent", 0))

    result = []
    for rid in sorted(row_map.keys()):
        entry = row_map[rid]
        hist = entry["history"]
        entry["avg_occupancy"] = round(sum(hist) / len(hist), 1) if hist else 0
        result.append(entry)

    return {"rows": result, "scan_count": len(rows)}


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

async def get_settings() -> dict | None:
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT value FROM settings WHERE key = 'global'")
    return row["value"] if row else None


async def save_settings(settings: dict):
    settings_json = json.dumps(settings)
    async with _pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO settings (key, value) VALUES ('global', $1::jsonb)
            ON CONFLICT (key) DO UPDATE SET value = $1::jsonb
        """, settings_json)


# ---------------------------------------------------------------------------
# File cleanup check
# ---------------------------------------------------------------------------

async def is_file_in_use(rel_path: str) -> bool:
    async with _pool.acquire() as conn:
        row = await conn.fetchval("""
            SELECT 1 FROM analyses
            WHERE processed_image_url = $1
               OR processed_video_url = $1
               OR report_json_url = $1
               OR report_csv_url = $1
            LIMIT 1
        """, rel_path)
    return row is not None
