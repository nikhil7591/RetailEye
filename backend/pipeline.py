"""
RetailEye — Standalone Dual-Model Shelf Analysis Pipeline
==========================================================
Usage:
    python pipeline.py <image_path>
    python pipeline.py shelf.jpg --output results.json

Two separately trained YOLO models run on the same image:
  - products.pt  → product detection   (class 0 = product)
  - empty.pt     → empty space detection (class 0 = empty_space)

Results are merged, products are identified via Groq Vision,
and a structured JSON report is generated.
"""

import argparse
import base64
import json
import os
import sys

import cv2
import numpy as np
from dotenv import load_dotenv
from ultralytics import YOLO

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------
_MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

model_product = YOLO(os.path.join(_MODEL_DIR, "products.pt"))
model_empty = YOLO(os.path.join(_MODEL_DIR, "empty.pt"))

print(f"[pipeline] ✅ Product model classes: {model_product.names}")
print(f"[pipeline] ✅ Empty model classes:   {model_empty.names}")

# ---------------------------------------------------------------------------
# Groq Vision — Product Identification
# ---------------------------------------------------------------------------

def crop_to_base64(image: np.ndarray, box) -> str:
    """Crop a bounding box region from image and convert to base64 JPEG."""
    x1, y1, x2, y2 = map(int, box.xyxy[0])
    h, w = image.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    crop = image[y1:y2, x1:x2]
    if crop.size == 0:
        return ""
    _, buffer = cv2.imencode('.jpg', crop)
    return base64.b64encode(buffer).decode('utf-8')


def identify_product(base64_img: str) -> str:
    """Send a base64 product crop to Groq Vision for identification."""
    if not GROQ_API_KEY or not base64_img:
        return "Unknown"

    try:
        from groq import Groq

        client = Groq(api_key=GROQ_API_KEY)
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_img}"
                        }
                    },
                    {
                        "type": "text",
                        "text": (
                            "This is a product on an Indian retail shelf. "
                            "Identify the product name and brand in 1-2 words only. "
                            "If unclear, say Unknown."
                        )
                    }
                ]
            }],
            max_tokens=50,
            temperature=0.1,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[pipeline] Groq API error: {e}")
        return "Unknown"


# ---------------------------------------------------------------------------
# Grid Fallback (Step 5)
# ---------------------------------------------------------------------------

def grid_fallback(image: np.ndarray, grid_size: int = 4) -> tuple[list[dict], list[dict]]:
    """
    When total detections < 3, divide image into a grid and
    re-run detection on each cell, then merge results.
    """
    h, w = image.shape[:2]
    cell_h = h // grid_size
    cell_w = w // grid_size
    print(f"[pipeline] 🔲 Grid fallback: {grid_size}x{grid_size} = {grid_size**2} cells")

    all_products = []
    all_empty = []

    for row in range(grid_size):
        for col in range(grid_size):
            y1 = row * cell_h
            y2 = min((row + 1) * cell_h, h)
            x1 = col * cell_w
            x2 = min((col + 1) * cell_w, w)

            cell = image[y1:y2, x1:x2]
            if cell.size == 0:
                continue

            # Run both models on cell
            prod_res = model_product.predict(cell, conf=0.20, iou=0.45, verbose=False)
            emp_res = model_empty.predict(cell, conf=0.10, iou=0.45, verbose=False)

            for result in prod_res:
                for box in result.boxes:
                    bx1, by1, bx2, by2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])

                    # Translate cell coords back to full image coords
                    abs_bbox = [int(bx1 + x1), int(by1 + y1), int(bx2 + x1), int(by2 + y1)]

                    if conf >= 0.80:
                        name = "Product"
                    else:
                        b64 = crop_to_base64(image, box)
                        name = identify_product(b64) if b64 else "Unknown"

                    all_products.append({
                        "name": name,
                        "confidence": round(conf, 2),
                        "bbox": abs_bbox,
                    })

            for result in emp_res:
                for box in result.boxes:
                    bx1, by1, bx2, by2 = box.xyxy[0].tolist()
                    all_empty.append({
                        "confidence": round(float(box.conf[0]), 2),
                        "bbox": [int(bx1 + x1), int(by1 + y1), int(bx2 + x1), int(by2 + y1)],
                    })

    return all_products, all_empty


# ---------------------------------------------------------------------------
# Main Analysis Pipeline
# ---------------------------------------------------------------------------

def analyze_shelf(image_path: str) -> dict:
    """
    Full dual-model shelf analysis pipeline.

    Steps:
        1. Load image
        2. Run products.pt (conf=0.25)
        3. Run empty.pt (conf=0.15)
        4. Identify products via Groq Vision (skip if conf >= 0.80)
        5. Grid fallback if total detections < 3
        6. Return structured JSON report
    """
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")

    h, w = image.shape[:2]
    print(f"[pipeline] 🖼️  Image loaded: {w}x{h} — {image_path}")

    # --- Step 2: Product Detection ---
    product_results = model_product.predict(
        image, conf=0.25, iou=0.45, verbose=False
    )

    # --- Step 3: Empty Space Detection ---
    empty_results = model_empty.predict(
        image, conf=0.15, iou=0.45, verbose=False
    )

    products = []
    empty_spaces = []

    # --- Process product detections ---
    for result in product_results:
        for box in result.boxes:
            conf = float(box.conf[0])

            # Step 4: Groq Vision optimization
            if conf >= 0.80:
                name = "Product"
                print(f"   ⏩ High confidence ({conf:.2f}) — skipping Groq")
            else:
                b64 = crop_to_base64(image, box)
                name = identify_product(b64) if b64 else "Unknown"
                print(f"   🤖 Groq identified: {name} (conf={conf:.2f})")

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            products.append({
                "name": name,
                "confidence": round(conf, 2),
                "bbox": [x1, y1, x2, y2],
            })

    # --- Process empty space detections ---
    for result in empty_results:
        for box in result.boxes:
            conf = float(box.conf[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            empty_spaces.append({
                "confidence": round(conf, 2),
                "bbox": [x1, y1, x2, y2],
            })

    print(f"[pipeline] 🎯 Detected: {len(products)} products + {len(empty_spaces)} empty spaces")

    # --- Step 5: Grid Fallback ---
    total_detections = len(products) + len(empty_spaces)
    if total_detections < 3:
        print(f"[pipeline] ⚠️  Only {total_detections} detections — triggering grid fallback")
        grid_products, grid_empty = grid_fallback(image, grid_size=4)
        products.extend(grid_products)
        empty_spaces.extend(grid_empty)
        print(f"[pipeline] ✅ After grid: {len(products)} products + {len(empty_spaces)} empty spaces")

    # --- Step 6: Build final JSON ---
    total_slots = len(products) + len(empty_spaces)
    fill_pct = int((len(products) / total_slots * 100)) if total_slots > 0 else 0

    report = {
        "total_slots": total_slots,
        "shelf_fill_percentage": fill_pct,
        "products": products,
        "empty_spaces": empty_spaces,
        "summary": {
            "total_products": len(products),
            "total_empty": len(empty_spaces),
        }
    }

    return report


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="RetailEye — Dual Model Shelf Analysis Pipeline"
    )
    parser.add_argument("image", help="Path to shelf image (jpg/png)")
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output JSON file path (default: print to stdout)",
    )
    args = parser.parse_args()

    if not os.path.isfile(args.image):
        print(f"❌ File not found: {args.image}")
        sys.exit(1)

    result = analyze_shelf(args.image)

    output_json = json.dumps(result, indent=2, ensure_ascii=False)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output_json)
        print(f"\n✅ Report saved to: {args.output}")
    else:
        print("\n" + "=" * 60)
        print("SHELF ANALYSIS REPORT")
        print("=" * 60)
        print(output_json)

    # Quick summary
    print(f"\n📊 Fill: {result['shelf_fill_percentage']}% | "
          f"Products: {result['summary']['total_products']} | "
          f"Empty: {result['summary']['total_empty']}")
