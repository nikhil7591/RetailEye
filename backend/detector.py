"""
RetailEye — Remote YOLO Detector (via HuggingFace Space API)

Instead of loading heavy PyTorch models locally, this module
calls a HuggingFace Space that runs both YOLO models and returns
detection results via API.

This eliminates ~400MB of RAM usage on the Render server.
"""

import os
import json
import cv2
import numpy as np
from gradio_client import Client

# ---------------------------------------------------------------------------
# HuggingFace Space connection
# ---------------------------------------------------------------------------
_HF_SPACE_URL = os.getenv("HF_SPACE_URL", "Kushagra-Kataria/retaileye-detector")
_client = None


def _get_client():
    """Lazy-init the Gradio client."""
    global _client
    if _client is None:
        print(f"[detector] 🔗 Connecting to HF Space: {_HF_SPACE_URL}")
        hf_token = os.getenv("HF_TOKEN")
        if hf_token:
            _client = Client(_HF_SPACE_URL, hf_token=hf_token)
        else:
            _client = Client(_HF_SPACE_URL)
        print(f"[detector] ✅ Connected to HF Space")
    return _client


# ---------------------------------------------------------------------------
# Core detection — Remote API call
# ---------------------------------------------------------------------------
def detect(frame: np.ndarray) -> list[dict]:
    """
    Send frame to HuggingFace Space for dual-model YOLO inference.

    Parameters
    ----------
    frame : np.ndarray
        BGR image (OpenCV format).

    Returns
    -------
    list[dict]
        Each dict: bbox, confidence, class_name, is_empty
    """
    import tempfile

    from gradio_client import handle_file

    # Save frame as temp jpg for API upload
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    cv2.imwrite(tmp.name, frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
    tmp.close()

    try:
        client = _get_client()
        # In Gradio 4+, we must wrap local file paths in handle_file()
        result = client.predict(handle_file(tmp.name), api_name="/detect")
        print(f"[detector] API Raw Result type: {type(result)} | value snippet: {str(result)[:200]}")

        # Gradio can return a string, a dict, or a file path
        data = {}
        if isinstance(result, str):
            try:
                # Try to parse it directly as JSON first
                data = json.loads(result)
            except json.JSONDecodeError:
                # If it's not JSON, check if it's a file path saved by Gradio
                if os.path.exists(result):
                    with open(result, "r", encoding="utf-8") as f:
                        data = json.load(f)
        elif isinstance(result, dict):
            data = result

        detections = data.get("detections", [])
        n_prod = sum(1 for d in detections if d.get("class_name") == "product")
        n_empty = sum(1 for d in detections if d.get("class_name") == "empty_space")
        print(f"[detector] 🎯 Remote API: {n_prod} products + {n_empty} empty spaces = {len(detections)} total")
        return detections

    except Exception as e:
        import traceback
        print(f"[detector] ❌ HF Space API error: {e}")
        traceback.print_exc()
        # Return empty list — pipeline will fall back to grid analysis
        return []
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Row clustering
# ---------------------------------------------------------------------------
def detect_rows(detections: list[dict], frame_height: int) -> list[list[dict]]:
    """
    Cluster detections into shelf rows based on Y-centroid proximity.
    """
    if not detections:
        return []

    ROW_GAP_THRESHOLD = 60

    for d in detections:
        x1, y1, x2, y2 = d["bbox"]
        d["_y_center"] = (y1 + y2) / 2.0
    sorted_dets = sorted(detections, key=lambda d: d["_y_center"])

    rows: list[list[dict]] = []
    current_row: list[dict] = [sorted_dets[0]]

    for det in sorted_dets[1:]:
        row_mean_y = sum(d["_y_center"] for d in current_row) / len(current_row)
        if det["_y_center"] - row_mean_y > ROW_GAP_THRESHOLD:
            rows.append(current_row)
            current_row = [det]
        else:
            current_row.append(det)
    rows.append(current_row)

    for row_id, row in enumerate(rows):
        for d in row:
            d["row_id"] = row_id
            d.pop("_y_center", None)

    return rows


# ---------------------------------------------------------------------------
# Empty-slot detection (gap-based)
# ---------------------------------------------------------------------------
def detect_empty_slots(
    row_detections: list[list[dict]],
    frame_width: int,
) -> tuple[list[int], list[list[list[int]]]]:
    """
    Identify empty slots by looking for horizontal gaps between boxes.
    """
    empty_counts: list[int] = []
    empty_bboxes: list[list[list[int]]] = []

    for row in row_detections:
        if not row:
            empty_counts.append(0)
            empty_bboxes.append([])
            continue

        if len(row) < 3:
            empty_counts.append(0)
            empty_bboxes.append([])
            continue

        sorted_row = sorted(row, key=lambda d: d["bbox"][0])

        widths = [d["bbox"][2] - d["bbox"][0] for d in sorted_row]
        avg_width = sum(widths) / len(widths) if widths else 0
        gap_threshold = max(avg_width * 1.35, 90)

        y_tops = [d["bbox"][1] for d in sorted_row]
        y_bots = [d["bbox"][3] for d in sorted_row]
        row_y1 = min(y_tops)
        row_y2 = max(y_bots)

        row_empty: list[list[int]] = []

        for i in range(len(sorted_row) - 1):
            right_edge = sorted_row[i]["bbox"][2]
            next_left = sorted_row[i + 1]["bbox"][0]
            gap = next_left - right_edge
            if gap > gap_threshold:
                row_empty.append([right_edge, row_y1, next_left, row_y2])

        empty_counts.append(len(row_empty))
        empty_bboxes.append(row_empty)

    return empty_counts, empty_bboxes
