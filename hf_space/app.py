"""
RetailEye — YOLO Inference API (HuggingFace Space)
Loads both products.pt and empty.pt models and exposes
a Gradio API endpoint for object detection.
"""

import gradio as gr
import numpy as np
import json
import cv2
from huggingface_hub import hf_hub_download
from ultralytics import YOLO
import os

# ── Download & load models ──────────────────────────────
HF_REPO = "Kushagra-Kataria/yolo-shelf-detector"
MODEL_DIR = "/tmp/models"
os.makedirs(MODEL_DIR, exist_ok=True)

def load_model(filename):
    path = hf_hub_download(repo_id=HF_REPO, filename=filename, local_dir=MODEL_DIR)
    return YOLO(path)

print("Loading product model...")
model_product = load_model("products.pt")
print(f"✅ Product model classes: {model_product.names}")

print("Loading empty space model...")
model_empty = load_model("empty.pt")
print(f"✅ Empty model classes: {model_empty.names}")


# ── Detection function ──────────────────────────────────
def detect(image):
    """
    Run dual-model detection on an uploaded image.
    Returns JSON with all detections.
    """
    if image is None:
        return json.dumps({"error": "No image provided", "detections": []})

    # Convert RGB (Gradio) to BGR (OpenCV/YOLO)
    frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

    detections = []

    # Model 1: Product Detection
    product_results = model_product.predict(frame, conf=0.25, iou=0.45, verbose=False)
    for result in product_results:
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            detections.append({
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "confidence": round(float(box.conf[0]), 4),
                "class_name": "product",
                "is_empty": False,
            })

    # Model 2: Empty Space Detection
    empty_results = model_empty.predict(frame, conf=0.15, iou=0.45, verbose=False)
    for result in empty_results:
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            detections.append({
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "confidence": round(float(box.conf[0]), 4),
                "class_name": "empty_space",
                "is_empty": True,
            })

    n_prod = sum(1 for d in detections if d["class_name"] == "product")
    n_empty = sum(1 for d in detections if d["class_name"] == "empty_space")
    print(f"[detect] {n_prod} products + {n_empty} empty spaces = {len(detections)} total")

    return json.dumps({"detections": detections, "count": len(detections)})


# ── Gradio Interface ────────────────────────────────────
demo = gr.Interface(
    fn=detect,
    inputs=gr.Image(type="numpy", label="Shelf Image"),
    outputs=gr.Textbox(label="Detection Results (JSON)"),
    title="RetailEye YOLO Detector",
    description="Upload a shelf image to detect products and empty spaces.",
    api_name="detect",
)

demo.launch()
