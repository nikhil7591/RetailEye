"""
RetailEye — YOLOv8 Product & Shelf Detector
Handles object detection, row clustering, and empty-slot identification.
"""

import os
import numpy as np
from ultralytics import YOLO

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------
_MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
_CUSTOM_MODEL = os.path.join(_MODEL_DIR, "shelf_model.pt")

# Prefer a fine-tuned shelf model if present; otherwise fall back to the
# general-purpose YOLOv8-nano that Ultralytics auto-downloads.
if os.path.isfile(_CUSTOM_MODEL):
    _model = YOLO(_CUSTOM_MODEL)
    print(f"[detector] Loaded custom model from {_CUSTOM_MODEL}")
else:
    _model = YOLO("yolov8n.pt")
    print("[detector] Custom model not found — using default yolov8n.pt")


# ---------------------------------------------------------------------------
# Core detection
# ---------------------------------------------------------------------------
def detect(frame: np.ndarray) -> list[dict]:
    """
    Run YOLOv8 inference on a single BGR frame.

    Parameters
    ----------
    frame : np.ndarray
        BGR image (OpenCV format).

    Returns
    -------
    list[dict]
        Each dict contains:
          - bbox: [x1, y1, x2, y2]  (pixel coords, ints)
          - confidence: float
          - class_name: str
          - is_empty: False  (empty-slot logic lives in analysis)
    """
    results = _model.predict(frame, conf=0.3, verbose=False)
    detections: list[dict] = []

    for result in results:
        boxes = result.boxes
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            cls_id = int(box.cls[0])
            cls_name = _model.names.get(cls_id, f"class_{cls_id}")

            detections.append({
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "confidence": conf,
                "class_name": cls_name,
                "is_empty": False,
            })

    return detections


# ---------------------------------------------------------------------------
# Row clustering
# ---------------------------------------------------------------------------
def detect_rows(detections: list[dict], frame_height: int) -> list[list[dict]]:
    """
    Cluster detections into shelf rows based on Y-centroid proximity.

    Algorithm:
        1. Sort detections by vertical centroid.
        2. Walk through sorted list; whenever the Y gap exceeds 60 px,
           start a new row.
        3. Assign ``row_id`` (0-based) to every detection dict.

    Parameters
    ----------
    detections : list[dict]
        Output of ``detect()``.
    frame_height : int
        Height of the source frame (used only for future scaling).

    Returns
    -------
    list[list[dict]]
        Outer list = rows (sorted top → bottom).
        Inner list = detections belonging to that row (with ``row_id`` added).
    """
    if not detections:
        return []

    ROW_GAP_THRESHOLD = 60  # pixels

    # Compute Y centroid and sort
    for d in detections:
        x1, y1, x2, y2 = d["bbox"]
        d["_y_center"] = (y1 + y2) / 2.0
    sorted_dets = sorted(detections, key=lambda d: d["_y_center"])

    rows: list[list[dict]] = []
    current_row: list[dict] = [sorted_dets[0]]

    for det in sorted_dets[1:]:
        if det["_y_center"] - current_row[-1]["_y_center"] > ROW_GAP_THRESHOLD:
            rows.append(current_row)
            current_row = [det]
        else:
            current_row.append(det)
    rows.append(current_row)

    # Tag each detection with its row_id and clean up temp key
    for row_id, row in enumerate(rows):
        for d in row:
            d["row_id"] = row_id
            d.pop("_y_center", None)

    return rows


# ---------------------------------------------------------------------------
# Empty-slot detection
# ---------------------------------------------------------------------------
def detect_empty_slots(
    row_detections: list[list[dict]],
    frame_width: int,
) -> tuple[list[int], list[list[list[int]]]]:
    """
    Identify empty (unoccupied) slots on each shelf row by looking for
    horizontal gaps between neighbouring bounding boxes.

    A gap counts as "empty" if it is wider than 80 % of the average
    bounding-box width in that row.

    Parameters
    ----------
    row_detections : list[list[dict]]
        Output of ``detect_rows()``.
    frame_width : int
        Width of the source frame.

    Returns
    -------
    empty_counts : list[int]
        Number of empty slots per row.
    empty_bboxes : list[list[list[int]]]
        For each row, a list of [x1, y1, x2, y2] bboxes representing gaps.
    """
    empty_counts: list[int] = []
    empty_bboxes: list[list[list[int]]] = []

    for row in row_detections:
        if not row:
            empty_counts.append(0)
            empty_bboxes.append([])
            continue

        # Sort detections left-to-right
        sorted_row = sorted(row, key=lambda d: d["bbox"][0])

        # Average bbox width in this row
        widths = [d["bbox"][2] - d["bbox"][0] for d in sorted_row]
        avg_width = sum(widths) / len(widths) if widths else 0
        gap_threshold = avg_width * 0.8

        # Compute row's vertical extent (for gap bbox height)
        y_tops = [d["bbox"][1] for d in sorted_row]
        y_bots = [d["bbox"][3] for d in sorted_row]
        row_y1 = min(y_tops)
        row_y2 = max(y_bots)

        row_empty: list[list[int]] = []

        # Check gap between left edge and first box
        first_x1 = sorted_row[0]["bbox"][0]
        if first_x1 > gap_threshold:
            row_empty.append([0, row_y1, first_x1, row_y2])

        # Check gaps between consecutive boxes
        for i in range(len(sorted_row) - 1):
            right_edge = sorted_row[i]["bbox"][2]
            next_left = sorted_row[i + 1]["bbox"][0]
            gap = next_left - right_edge
            if gap > gap_threshold:
                row_empty.append([right_edge, row_y1, next_left, row_y2])

        # Check gap between last box and right edge
        last_x2 = sorted_row[-1]["bbox"][2]
        if (frame_width - last_x2) > gap_threshold:
            row_empty.append([last_x2, row_y1, frame_width, row_y2])

        empty_counts.append(len(row_empty))
        empty_bboxes.append(row_empty)

    return empty_counts, empty_bboxes
