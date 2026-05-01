"""
RetailEye — YOLOv8 Dual-Model Product & Shelf Detector
Two separate YOLO models run in parallel:
  - products.pt  → product detection   (class 0 = product)
  - empty.pt     → empty space detection (class 0 = empty_space)

Models are auto-downloaded from HuggingFace if not present locally:
  https://huggingface.co/Kushagra-Kataria/yolo-shelf-detector
"""

import os
import numpy as np
from ultralytics import YOLO

# ---------------------------------------------------------------------------
# HuggingFace model download
# ---------------------------------------------------------------------------
_HF_REPO = "Kushagra-Kataria/yolo-shelf-detector"
_MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(_MODEL_DIR, exist_ok=True)


def _ensure_model(filename: str) -> str:
    """
    Return local path to a YOLO .pt file.
    If the file doesn't exist locally, download it from HuggingFace.
    """
    local_path = os.path.join(_MODEL_DIR, filename)
    if os.path.isfile(local_path):
        return local_path

    print(f"[detector] ⬇️  Downloading {filename} from HuggingFace ({_HF_REPO})...")
    try:
        from huggingface_hub import hf_hub_download

        downloaded = hf_hub_download(
            repo_id=_HF_REPO,
            filename=filename,
            local_dir=_MODEL_DIR,
            local_dir_use_symlinks=False,
        )
        print(f"[detector] ✅ Downloaded {filename} → {downloaded}")
        return downloaded
    except Exception as e:
        print(f"[detector] ❌ Failed to download {filename}: {e}")
        raise RuntimeError(
            f"Model {filename} not found locally and could not be downloaded "
            f"from HuggingFace repo '{_HF_REPO}'. "
            f"Ensure the repo exists and is accessible."
        ) from e


# ---------------------------------------------------------------------------
# Model loading — Dual Model Architecture
# ---------------------------------------------------------------------------
_PRODUCT_MODEL_PATH = _ensure_model("products.pt")
_EMPTY_MODEL_PATH = _ensure_model("empty.pt")

_model_product = YOLO(_PRODUCT_MODEL_PATH)
print(f"[detector] ✅ Product model loaded: {_PRODUCT_MODEL_PATH}")
print(f"[detector]    Product model classes: {_model_product.names}")

_model_empty = YOLO(_EMPTY_MODEL_PATH)
print(f"[detector] ✅ Empty space model loaded: {_EMPTY_MODEL_PATH}")
print(f"[detector]    Empty model classes: {_model_empty.names}")


# ---------------------------------------------------------------------------
# Core detection — Dual Model Pipeline
# ---------------------------------------------------------------------------
def detect(frame: np.ndarray) -> list[dict]:
    """
    Dual-model YOLOv8 inference on a single BGR frame.

    Two separately trained models run on the same frame:

      Model 1 (products.pt)  — conf=0.25, detects products
      Model 2 (empty.pt)     — conf=0.15, detects empty spaces
                                (lower conf — empty spaces are subtle)

    Results from both models are merged into a single list.

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
          - class_name: str  ("product" or "empty_space")
          - is_empty: bool
    """
    detections: list[dict] = []

    # --- Model 1: Product Detection (products.pt) ---
    product_results = _model_product.predict(
        frame, conf=0.25, iou=0.45, verbose=False
    )
    n_prod = 0
    for result in product_results:
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            detections.append({
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "confidence": float(box.conf[0]),
                "class_name": "product",
                "is_empty": False,
            })
            n_prod += 1

    # --- Model 2: Empty Space Detection (empty.pt) ---
    empty_results = _model_empty.predict(
        frame, conf=0.15, iou=0.45, verbose=False
    )
    n_empty = 0
    for result in empty_results:
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            detections.append({
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "confidence": float(box.conf[0]),
                "class_name": "empty_space",
                "is_empty": True,
            })
            n_empty += 1

    print(f"[detector] Model 1: {n_prod} products | Model 2: {n_empty} empty spaces | Total: {len(detections)}")
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

    ROW_GAP_THRESHOLD = 60  # pixels - reduced for better row separation

    # Compute Y centroid and sort
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

        # Sparse rows are unreliable for gap-based empty-slot inference.
        if len(row) < 3:
            empty_counts.append(0)
            empty_bboxes.append([])
            continue

        # Sort detections left-to-right
        sorted_row = sorted(row, key=lambda d: d["bbox"][0])

        # Average bbox width in this row
        widths = [d["bbox"][2] - d["bbox"][0] for d in sorted_row]
        avg_width = sum(widths) / len(widths) if widths else 0
        gap_threshold = max(avg_width * 1.35, 90)

        # Compute row's vertical extent (for gap bbox height)
        y_tops = [d["bbox"][1] for d in sorted_row]
        y_bots = [d["bbox"][3] for d in sorted_row]
        row_y1 = min(y_tops)
        row_y2 = max(y_bots)

        row_empty: list[list[int]] = []

        # Check gaps between consecutive boxes only (not at shelf borders)
        for i in range(len(sorted_row) - 1):
            right_edge = sorted_row[i]["bbox"][2]
            next_left = sorted_row[i + 1]["bbox"][0]
            gap = next_left - right_edge
            if gap > gap_threshold:
                row_empty.append([right_edge, row_y1, next_left, row_y2])

        empty_counts.append(len(row_empty))
        empty_bboxes.append(row_empty)

    return empty_counts, empty_bboxes
