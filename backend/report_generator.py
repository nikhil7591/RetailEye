"""
RetailEye — Report Generator
Saves analysis reports as JSON and CSV files.
"""

import csv
import json
import os


def save_json(report_dict: dict, path: str) -> str:
    """
    Save the analysis report as a formatted JSON file.

    Parameters
    ----------
    report_dict : dict
        Full report from analysis_engine.analyze().
    path : str
        Output file path (e.g. outputs/report.json).

    Returns
    -------
    str
        Absolute path to the saved file.
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)

    # Remove internal keys before saving
    clean = {k: v for k, v in report_dict.items() if not k.startswith("_")}

    with open(path, "w", encoding="utf-8") as f:
        json.dump(clean, f, indent=2, ensure_ascii=False)

    print(f"[report] JSON saved → {path}")
    return os.path.abspath(path)


def save_csv(report_dict: dict, path: str) -> str:
    """
    Save the analysis report as a CSV file.

    Columns: timestamp, store_id, row_id, zone_label,
             occupancy_percent, alert, product_name, quantity, empty_slots

    One row per product per shelf row.
    If a row has no products, a single line is still written with
    product_name = "(none)".

    Parameters
    ----------
    report_dict : dict
        Full report from analysis_engine.analyze().
    path : str
        Output file path (e.g. outputs/report.csv).

    Returns
    -------
    str
        Absolute path to the saved file.
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)

    fieldnames = [
        "timestamp",
        "store_id",
        "row_id",
        "zone_label",
        "occupancy_percent",
        "alert",
        "product_name",
        "quantity",
        "empty_slots",
    ]

    timestamp = report_dict.get("timestamp", "")
    store_id = report_dict.get("store_id", "")

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for row in report_dict.get("rows", []):
            products = row.get("products", [])
            if not products:
                writer.writerow({
                    "timestamp": timestamp,
                    "store_id": store_id,
                    "row_id": row.get("row_id", ""),
                    "zone_label": row.get("zone_label", ""),
                    "occupancy_percent": row.get("occupancy_percent", 0),
                    "alert": row.get("alert", ""),
                    "product_name": "(none)",
                    "quantity": 0,
                    "empty_slots": row.get("empty_slots", 0),
                })
            else:
                for prod in products:
                    writer.writerow({
                        "timestamp": timestamp,
                        "store_id": store_id,
                        "row_id": row.get("row_id", ""),
                        "zone_label": row.get("zone_label", ""),
                        "occupancy_percent": row.get("occupancy_percent", 0),
                        "alert": row.get("alert", ""),
                        "product_name": prod.get("name", ""),
                        "quantity": prod.get("quantity", 0),
                        "empty_slots": row.get("empty_slots", 0),
                    })

    print(f"[report] CSV saved → {path}")
    return os.path.abspath(path)
