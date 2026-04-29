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


def _process_single_frame(frame: np.ndarray) -> tuple[np.ndarray, dict]:
    """
    Run the full pipeline on one frame: detect → identify → analyze → overlay.
    Returns (annotated_frame, report_dict).
    """
    h, w = frame.shape[:2]

    # 1. YOLO detection
    detections = detect(frame)

    # 2. Cluster into rows
    rows = detect_rows(detections, h)
    if not rows:
        # No detections — return frame as-is with empty report
        empty_report = analyze([])
        return frame, empty_report

    # 3. Detect empty slots per row
    empty_counts, empty_bboxes = detect_empty_slots(rows, w)

    # 4. Identify each product via Groq Vision
    raw_rows = []
    for row_idx, row in enumerate(rows):
        row_dets = []
        for det in row:
            x1, y1, x2, y2 = det["bbox"]
            # Clamp to frame bounds
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            crop = frame[y1:y2, x1:x2]

            product_info = identify_product(crop)
            det["product_name"] = product_info.get("product_name", "Unidentified Product")
            det["category"] = product_info.get("category", "Other")
            det["groq_confidence"] = product_info.get("confidence", "low")
            row_dets.append(det)

        raw_rows.append({
            "row_id": row_idx,
            "detections": row_dets,
            "empty_slots": empty_counts[row_idx] if row_idx < len(empty_counts) else 0,
            "empty_slot_bboxes": empty_bboxes[row_idx] if row_idx < len(empty_bboxes) else [],
        })

    # 5. Analyze
    report = analyze(raw_rows)
    report["_raw_rows"] = raw_rows  # attach for overlay drawing

    # 6. Draw overlay
    annotated = draw_overlay(frame, report)

    return annotated, report


def process_video(input_path: str, output_path: str) -> dict:
    """
    Process a video file through the RetailEye pipeline.

    - Reads every frame but only runs detection on every 3rd frame.
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

    print(f"[video_processor] Processing {total_frames} frames at {fps} FPS …")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % 3 == 0:
            # Process this frame
            annotated, report = _process_single_frame(frame)
            last_annotated = annotated
            last_report = report
            print(f"  frame {frame_idx}/{total_frames} — processed")
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
