"""
RetailEye — Video Processor
Processes MP4 videos frame-by-frame through the detection/identification pipeline.
"""

import cv2
import numpy as np

from detector import detect, detect_rows, detect_empty_slots
from groq_vision import identify_product
from analysis_engine import analyze
from overlay import draw_overlay


def _build_empty_shelf_rows(frame_height: int, frame_width: int, row_count: int = 3) -> list[dict]:
    """Create conservative fallback shelf rows when YOLO finds nothing."""
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


def _process_single_frame(frame: np.ndarray) -> tuple[np.ndarray, dict]:
    """
    Run the full dual-run pipeline on one frame:
    detect (2 runs) → identify → analyze → overlay.
    Returns (annotated_frame, report_dict).
    """
    h, w = frame.shape[:2]

    # 1. YOLO dual-run detection
    detections = detect(frame)

    # 2. Cluster into rows
    rows = detect_rows(detections, h)
    if not rows:
        raw_rows = _build_empty_shelf_rows(h, w)
        report = analyze(raw_rows)
        report["_raw_rows"] = raw_rows
        annotated = draw_overlay(frame, report)
        return annotated, report

    # 3. Gap-based empty detection needs ONLY product detections
    product_only_rows = [
        [d for d in row if d.get("class_name") != "empty_space"]
        for row in rows
    ]
    gap_counts, gap_bboxes = detect_empty_slots(product_only_rows, w)

    # 4. Identify products via Groq Vision + separate YOLO empties
    raw_rows = []
    for row_idx, row in enumerate(rows):
        product_dets = []
        yolo_empty_count = 0
        yolo_empty_bboxes = []

        for det in row:
            # Separate YOLO-detected empty spaces from products
            if det.get("class_name") == "empty_space":
                yolo_empty_count += 1
                yolo_empty_bboxes.append(det["bbox"])
                continue

            x1, y1, x2, y2 = det["bbox"]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)

            if (y2 - y1) < 15 or (x2 - x1) < 15:
                det["product_name"] = "Small Item"
                det["category"] = "Other"
            elif det.get("confidence", 0) >= 0.80:
                det["product_name"] = "Product"
                det["category"] = "Other"
            else:
                crop = frame[y1:y2, x1:x2]
                product_info = identify_product(crop)
                det["product_name"] = product_info.get("product_name", "Unidentified Product")
                det["category"] = product_info.get("category", "Other")
                det["groq_confidence"] = product_info.get("confidence", "low")
            product_dets.append(det)

        # Merge YOLO empties + gap-based empties
        gc = gap_counts[row_idx] if row_idx < len(gap_counts) else 0
        gb = gap_bboxes[row_idx] if row_idx < len(gap_bboxes) else []

        raw_rows.append({
            "row_id": row_idx,
            "detections": product_dets,
            "empty_slots": yolo_empty_count + gc,
            "empty_slot_bboxes": yolo_empty_bboxes + gb,
        })

    # 5. Analyze
    report = analyze(raw_rows)
    report["_raw_rows"] = raw_rows  # attach for overlay drawing

    # 6. Draw overlay
    annotated = draw_overlay(frame, report)

    return annotated, report


def _process_frame_yolo_only(frame: np.ndarray, existing_report: dict) -> np.ndarray:
    """Run YOLO + overlay only — skip Groq, reuse existing report for overlay."""
    h, w = frame.shape[:2]
    detections = detect(frame)
    rows = detect_rows(detections, h)
    if not rows:
        return draw_overlay(frame, existing_report)

    empty_counts, empty_bboxes = detect_empty_slots(rows, w)

    # Build raw_rows using existing product names from report (no Groq call)
    raw_rows = []
    report_rows = existing_report.get("rows", [])

    for row_idx, row in enumerate(rows):
        row_report = report_rows[row_idx] if row_idx < len(report_rows) else {}
        products = row_report.get("products", [])

        row_dets = []
        for det_idx, det in enumerate(row):
            # Reuse product name from existing report if available
            if det_idx < len(products):
                det["product_name"] = products[det_idx]["name"]
                det["category"] = row_report.get("zone_label", "Other Zone").replace(" Zone", "")
            else:
                det["product_name"] = "Product"
                det["category"] = "Other"
            row_dets.append(det)

        raw_rows.append({
            "row_id": row_idx,
            "detections": row_dets,
            "empty_slots": empty_counts[row_idx] if row_idx < len(empty_counts) else 0,
            "empty_slot_bboxes": empty_bboxes[row_idx] if row_idx < len(empty_bboxes) else [],
        })

    # Use existing report but update _raw_rows for overlay
    overlay_report = dict(existing_report)
    overlay_report["_raw_rows"] = raw_rows
    return draw_overlay(frame, overlay_report)


def process_video(input_path: str, output_path: str) -> dict:
    """
    Process a video file through the RetailEye pipeline.

    - Reads every frame but only runs detection on every 3rd frame.
    - Runs Groq (full pipeline) only on the FIRST processed frame to avoid
      rate-limit issues. Subsequent frames use YOLO + overlay only.
    - Skipped frames receive the previous annotated overlay.
    - Returns the aggregated report from the last processed frame.

    Parameters
    ----------
    input_path : str
        Path to the source MP4 file.
    output_path : str
        Path for the annotated output MP4.

    Returns
    -------
    dict
        Analysis report from the last processed frame.
    """
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {input_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    last_annotated = None
    last_report = analyze([])  # empty default
    frame_idx = 0
    groq_done = False          # only run Groq once

    print(f"[video_processor] Processing {total_frames} frames at {fps} FPS ...")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % 3 == 0:
            if not groq_done:
                # Full pipeline with Groq on first processed frame only
                annotated, report = _process_single_frame(frame)
                last_report = report
                groq_done = True
                print(f"  frame {frame_idx}/{total_frames} — full pipeline (Groq included)")
            else:
                # YOLO + overlay only — reuse last report's product names
                annotated = _process_frame_yolo_only(frame, last_report)
                print(f"  frame {frame_idx}/{total_frames} — YOLO only (Groq skipped)")
            last_annotated = annotated
        else:
            # Use previous annotated frame (or original if first frame was skipped)
            annotated = last_annotated if last_annotated is not None else frame

        writer.write(annotated)
        frame_idx += 1

    cap.release()
    writer.release()
    print(f"[video_processor] Done — wrote {frame_idx} frames to {output_path}")

    # Remove internal helper key before returning
    last_report.pop("_raw_rows", None)
    return last_report
