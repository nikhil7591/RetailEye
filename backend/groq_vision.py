"""
RetailEye — Groq Vision Product Identifier
Sends cropped product images to Groq's Llama-4-Scout model for identification.
Implements retry with upscaled zoom on low-confidence results.
"""

import base64
import io
import json
import os
import pathlib
import time
import traceback

import cv2
import numpy as np
from dotenv import load_dotenv
from PIL import Image

load_dotenv(pathlib.Path(__file__).parent.parent / ".env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

# System prompt sent to Groq
_IDENTIFICATION_PROMPT = (
    "You are analyzing a cropped image of a single product on a retail store shelf. "
    "The product is a physical item with visible packaging, label, or branding. "
    "Identify it as specifically as possible — include brand name if visible. "
    "Respond ONLY with valid JSON:\n"
    "{\n"
    '  "product_name": "Brand Name + Product Type (e.g. Lays Classic Salted Chips)",\n'
    '  "category": "Snacks | Beverages | Dairy | Personal Care | Household | Electronics | Clothing | Grocery | Other",\n'
    '  "confidence": "high | medium | low"\n'
    "}\n"
    "If the image is too blurry, too small, or shows an empty shelf section, "
    'set product_name to "Unidentified Product" and confidence to "low".'
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _numpy_to_base64_jpeg(img_np: np.ndarray) -> str:
    """Convert a BGR numpy array to a base64-encoded JPEG string."""
    # OpenCV stores images as BGR; Pillow expects RGB
    rgb = img_np[:, :, ::-1] if img_np.ndim == 3 else img_np
    pil_img = Image.fromarray(rgb)
    buffer = io.BytesIO()
    pil_img.save(buffer, format="JPEG", quality=85)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def _zoom_center(img_np: np.ndarray, factor: float = 1.5) -> np.ndarray:
    """Upscale the crop for better AI identification."""
    h, w = img_np.shape[:2]
    # Upscale to at least 224x224 (good minimum for vision models)
    target_size = max(224, int(max(h, w) * factor))
    # Maintain aspect ratio
    scale = target_size / max(h, w)
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))
    return cv2.resize(img_np, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)


def _parse_json_response(text: str) -> dict:
    """
    Attempt to extract and parse the first JSON object from the model's
    response text, tolerating markdown fences and preamble.
    """
    # Strip markdown code fences if present
    cleaned = text.strip()
    if cleaned.startswith("```"):
        # Remove opening fence (with optional language tag)
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned[: cleaned.rfind("```")]
    cleaned = cleaned.strip()

    # Try direct parse first
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Fallback: find first { … } block
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError:
            pass

    # Could not parse — treat as unidentified
    return {
        "product_name": "Unidentified Product",
        "category": "Other",
        "confidence": "low",
    }


# ---------------------------------------------------------------------------
# Groq API call
# ---------------------------------------------------------------------------

def _call_groq(base64_jpeg: str) -> dict:
    """
    Send a single base64-encoded JPEG to Groq Vision and return the
    parsed JSON dict.  Raises on HTTP / network errors.
    """
    from groq import Groq  # lazy import so module loads even without key

    client = Groq(api_key=GROQ_API_KEY)

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": _IDENTIFICATION_PROMPT,
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_jpeg}",
                        },
                    },
                ],
            }
        ],
        max_tokens=256,
        temperature=0.1,
    )

    raw_text = response.choices[0].message.content
    return _parse_json_response(raw_text)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def identify_product(crop_image_np: np.ndarray) -> dict:
    """
    Identify a single product from its cropped BGR image.

    Flow:
        1. Send crop to Groq Vision.
        2. If confidence == "low" → retry with 1.5× zoomed centre crop.
        3. If still low → return as "Unidentified Product".
        4. On any API failure → return graceful fallback.

    Parameters
    ----------
    crop_image_np : np.ndarray
        BGR crop of the product region.

    Returns
    -------
    dict  with keys: product_name, category, confidence
    """
    fallback = {
        "product_name": "Unidentified Product",
        "category": "Other",
        "confidence": "low",
    }

    # Guard: skip tiny / degenerate crops
    if crop_image_np.size == 0 or crop_image_np.shape[0] < 5 or crop_image_np.shape[1] < 5:
        return fallback

    # Guard: no API key configured
    if not GROQ_API_KEY:
        print("[groq_vision] GROQ_API_KEY not set — returning fallback")
        return fallback

    try:
        b64 = _numpy_to_base64_jpeg(crop_image_np)
        result = _call_groq(b64)
        time.sleep(0.1)  # polite rate-limit pause

        # Retry with zoom if confidence is low
        if result.get("confidence", "low") == "low":
            print("[groq_vision] Low confidence — retrying with 1.5× zoom")
            zoomed = _zoom_center(crop_image_np, factor=1.5)
            if zoomed.size > 0 and zoomed.shape[0] >= 5 and zoomed.shape[1] >= 5:
                b64_zoom = _numpy_to_base64_jpeg(zoomed)
                result = _call_groq(b64_zoom)
                time.sleep(0.1)

            # If still low after retry, force unidentified
            if result.get("confidence", "low") == "low":
                result = fallback

        return result

    except Exception:
        traceback.print_exc()
        print("[groq_vision] API call failed — returning fallback")
        return fallback
