"""
RetailEye — Visual Overlay Renderer
Draws bounding boxes, labels, empty-slot markers, and a HUD onto frames.
"""

import cv2
import numpy as np

# BGR colour palette
_COLOR_OK = (0, 200, 0)
_COLOR_WARNING = (0, 165, 255)
_COLOR_CRITICAL = (0, 0, 220)
_COLOR_EMPTY = (0, 0, 220)
_COLOR_TEXT_BG = (30, 30, 30)
_COLOR_TEXT = (255, 255, 255)
_COLOR_HUD_BG = (40, 40, 40)


def _alert_color(alert: str) -> tuple:
    return {"OK": _COLOR_OK, "Warning": _COLOR_WARNING, "Critical": _COLOR_CRITICAL}.get(alert, _COLOR_OK)


def _draw_dashed_line(img, pt1, pt2, color, thickness, dash_len):
    dist = ((pt2[0] - pt1[0]) ** 2 + (pt2[1] - pt1[1]) ** 2) ** 0.5
    if dist == 0:
        return
    num = int(dist / dash_len)
    for i in range(0, num, 2):
        s = i / num
        e = min((i + 1) / num, 1.0)
        sx = int(pt1[0] + s * (pt2[0] - pt1[0]))
        sy = int(pt1[1] + s * (pt2[1] - pt1[1]))
        ex = int(pt1[0] + e * (pt2[0] - pt1[0]))
        ey = int(pt1[1] + e * (pt2[1] - pt1[1]))
        cv2.line(img, (sx, sy), (ex, ey), color, thickness)


def _draw_dashed_rect(img, pt1, pt2, color, thickness=2, dash_len=10):
    x1, y1 = pt1
    x2, y2 = pt2
    for start, end in [((x1,y1),(x2,y1)),((x1,y2),(x2,y2)),((x1,y1),(x1,y2)),((x2,y1),(x2,y2))]:
        _draw_dashed_line(img, start, end, color, thickness, dash_len)


def _put_label(img, text, org, font_scale=0.5, color=_COLOR_TEXT, bg_color=_COLOR_TEXT_BG):
    font = cv2.FONT_HERSHEY_SIMPLEX
    (tw, th), baseline = cv2.getTextSize(text, font, font_scale, 1)
    x, y = org
    y = max(th + 4, y)
    cv2.rectangle(img, (x, y - th - 4), (x + tw + 4, y + baseline + 2), bg_color, -1)
    cv2.putText(img, text, (x + 2, y - 2), font, font_scale, color, 1, cv2.LINE_AA)


def draw_overlay(frame: np.ndarray, rows_analysis: dict) -> np.ndarray:
    """
    Draw annotated overlay on a copy of the frame.
    rows_analysis: full report dict from analysis_engine.analyze(),
    must also include '_raw_rows' with bbox data.
    """
    out = frame.copy()
    rows = rows_analysis.get("rows", [])
    raw_rows = rows_analysis.get("_raw_rows", [])

    # Draw product bounding boxes and empty slot markers
    for idx, row_report in enumerate(rows):
        alert = row_report.get("alert", "OK")
        color = _alert_color(alert)

        if idx < len(raw_rows):
            for det in raw_rows[idx].get("detections", []):
                bbox = det.get("bbox", [])
                if len(bbox) == 4:
                    x1, y1, x2, y2 = bbox
                    cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
                    label = det.get("product_name", "Product")
                    _put_label(out, label, (x1, y1 - 4), 0.4, _COLOR_TEXT, color)

            for ebbox in raw_rows[idx].get("empty_slot_bboxes", []):
                if len(ebbox) == 4:
                    ex1, ey1, ex2, ey2 = ebbox
                    _draw_dashed_rect(out, (ex1, ey1), (ex2, ey2), _COLOR_EMPTY, 2)
                    cx, cy = (ex1 + ex2) // 2 - 20, (ey1 + ey2) // 2
                    _put_label(out, "EMPTY", (cx, cy), 0.5, (255,255,255), _COLOR_EMPTY)

    # HUD overlay (top-left)
    overall_occ = rows_analysis.get("overall_occupancy", 0)
    overall_alert = rows_analysis.get("overall_alert", "OK")
    hud_lines = [f"RetailEye | Overall: {overall_occ}% | {overall_alert}"]
    for r in rows:
        rid = r.get("row_id", 0) + 1
        hud_lines.append(f"Row {rid}: {r.get('zone_label','')} - {r.get('occupancy_percent',0)}% [{r.get('alert','OK')}]")

    line_h = 22
    hud_h = line_h * len(hud_lines) + 16
    hud_w = min(400, out.shape[1])

    # Semi-transparent dark background
    sub = out[0:hud_h, 0:hud_w].copy()          # 1. copy original pixels first
    overlay = out.copy()                          # 2. draw on a separate overlay
    cv2.rectangle(overlay, (0, 0), (hud_w, hud_h), _COLOR_HUD_BG, -1)
    cv2.addWeighted(overlay[0:hud_h, 0:hud_w], 0.55, sub, 0.45, 0, out[0:hud_h, 0:hud_w])

    for i, line in enumerate(hud_lines):
        y = 18 + i * line_h
        if i == 0:
            col = (255, 255, 255)
        else:
            a = line.split("[")[-1].rstrip("]") if "[" in line else "OK"
            col = _alert_color(a)
        cv2.putText(out, line, (8, y), cv2.FONT_HERSHEY_SIMPLEX, 0.45, col, 1, cv2.LINE_AA)

    return out
