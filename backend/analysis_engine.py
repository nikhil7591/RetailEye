"""
RetailEye — Analysis Engine
Aggregates per-row shelf data into a structured report with zone labels,
occupancy percentages, alert levels, and restock priorities.
"""

from collections import Counter
from datetime import datetime, timezone


# Alert thresholds (occupancy %)
_ALERT_OK = 70
_ALERT_WARNING = 40


def _alert_for_occupancy(pct: float) -> str:
    """Return alert level string for a given occupancy percentage."""
    if pct > _ALERT_OK:
        return "OK"
    elif pct >= _ALERT_WARNING:
        return "Warning"
    else:
        return "Critical"


def _worst_alert(alerts: list[str]) -> str:
    """Return the most severe alert from a list."""
    severity = {"Critical": 0, "Warning": 1, "OK": 2}
    if not alerts:
        return "OK"
    return min(alerts, key=lambda a: severity.get(a, 2))


def analyze(rows_with_products: list[dict]) -> dict:
    """
    Build a full shelf-analysis report.

    Parameters
    ----------
    rows_with_products : list[dict]
        Each dict represents one row and must contain:
          - row_id          : int
          - detections      : list[dict]  (each with ``product_name``, ``category``)
          - empty_slots     : int
          - empty_slot_bboxes : list[list[int]]

    Returns
    -------
    dict
        Complete analysis report.
    """
    report_rows: list[dict] = []
    all_alerts: list[str] = []
    total_products = 0
    total_empty = 0

    for row_data in rows_with_products:
        row_id = row_data["row_id"]
        detections = row_data.get("detections", [])
        empty_count = row_data.get("empty_slots", 0)

        # --- Zone label (majority category) --------------------------------
        categories = [d.get("category", "Other") for d in detections]
        if categories:
            cat_counter = Counter(categories)
            top_category = cat_counter.most_common(1)[0][0]
        else:
            top_category = "Empty"
        zone_label = f"{top_category} Zone"

        # --- Occupancy ------------------------------------------------------
        num_products = len(detections)
        total_slots = num_products + empty_count
        occupancy_pct = round((num_products / total_slots) * 100, 1) if total_slots > 0 else 0.0

        # --- Alert ----------------------------------------------------------
        alert = _alert_for_occupancy(occupancy_pct)
        all_alerts.append(alert)

        # --- Product quantities ---------------------------------------------
        name_counter = Counter(d.get("product_name", "Unknown") for d in detections)
        products_list = [
            {"name": name, "quantity": qty}
            for name, qty in name_counter.most_common()
        ]

        report_rows.append({
            "row_id": row_id,
            "zone_label": zone_label,
            "occupancy_percent": occupancy_pct,
            "alert": alert,
            "products": products_list,
            "empty_slots": empty_count,
        })

        total_products += num_products
        total_empty += empty_count

    # --- Overall metrics ----------------------------------------------------
    if report_rows:
        overall_occ = round(
            sum(r["occupancy_percent"] for r in report_rows) / len(report_rows), 1
        )
    else:
        overall_occ = 0.0

    overall_alert = _worst_alert(all_alerts) if all_alerts else "OK"

    # --- Restock priority (ascending occupancy, Critical first) -------------
    sorted_rows = sorted(report_rows, key=lambda r: r["occupancy_percent"])
    restock_priority = [
        f"Row {r['row_id'] + 1} - {r['zone_label']} ({r['occupancy_percent']}%)"
        for r in sorted_rows
        if r["alert"] in ("Critical", "Warning")
    ]

    return {
        "store_id": "store_001",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "overall_occupancy": overall_occ,
        "overall_alert": overall_alert,
        "total_products_detected": total_products,
        "total_empty_slots": total_empty,
        "rows": report_rows,
        "restock_priority": restock_priority,
    }
