"""RetailEye — Groq Vision Product Identifier
Sends cropped product images to Groq's Llama-4-Scout model for identification.
Implements retry with upscaled zoom on low-confidence results.
Includes circuit-breaker to stop hammering the API after a 429 rate limit.
"""

import base64
import io
import json
import os
import pathlib
import re
import time
import random
import traceback

import cv2
import numpy as np
from dotenv import load_dotenv
from PIL import Image

load_dotenv(pathlib.Path(__file__).parent / ".env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

# ---------------------------------------------------------------------------
# Rate limiting configuration
# ---------------------------------------------------------------------------
MAX_RETRIES = 4

# System prompt sent to Groq
_IDENTIFICATION_PROMPT = (
    "You are a product identification expert for Indian retail stores. "
    "You are given a cropped image of a SINGLE product sitting on a store shelf.\n\n"
    "Your task:\n"
    "1. READ any visible text, logo, or brand name on the packaging.\n"
    "2. Identify the product as specifically as possible (brand + variant).\n"
    "3. Common Indian brands include: Maggi, Parle-G, Lays, Kurkure, Amul, Haldiram, "
    "Britannia, Tata, Dabur, Colgate, Surf Excel, Vim, Dettol, Bisleri, Pepsi, "
    "Coca-Cola, Thums Up, Cadbury, Nestle, ITC, Patanjali, Mother Dairy, MTR, "
    "Saffola, Fortune, Sunfeast, Good Day, Hide & Seek, Oreo, KitKat, "
    "Clinic Plus, Head & Shoulders, Dove, Lifebuoy, Lux.\n\n"
    "Respond ONLY with valid JSON (no extra text):\n"
    "{\n"
    '  "product_name": "<Brand> <Product> (e.g. Maggi 2-Minute Noodles)",\n'
    '  "category": "Snacks | Beverages | Dairy | Personal Care | Household | Grocery | Other",\n'
    '  "confidence": "high | medium | low"\n'
    "}\n\n"
    "Rules:\n"
    "- If you can read the brand name clearly, confidence = high.\n"
    "- If you can partially read it or guess from colors/shape, confidence = medium.\n"
    "- ONLY say Unidentified Product if the image is completely unreadable.\n"
    "- NEVER leave product_name as just 'Product' — always attempt a specific name."
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
    pil_img.save(buffer, format="JPEG", quality=95)  # high quality to preserve label text
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def _enhance_crop(img_np: np.ndarray, min_size: int = 512) -> np.ndarray:
    """
    Preprocess a product crop to maximize readability for the vision model:
    1. Upscale small crops to at least min_size px on longest side.
    2. Apply sharpening to make text/logos crisper.
    3. Boost contrast slightly to separate text from background.
    """
    h, w = img_np.shape[:2]

    # 1. Upscale if too small
    if max(h, w) < min_size:
        scale = min_size / max(h, w)
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))
        img_np = cv2.resize(img_np, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    # 2. Sharpen (unsharp mask)
    gaussian = cv2.GaussianBlur(img_np, (0, 0), sigmaX=2.0)
    img_np = cv2.addWeighted(img_np, 1.5, gaussian, -0.5, 0)

    # 3. Slight contrast boost via CLAHE on L channel
    lab = cv2.cvtColor(img_np, cv2.COLOR_BGR2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_ch = clahe.apply(l_ch)
    img_np = cv2.cvtColor(cv2.merge([l_ch, a_ch, b_ch]), cv2.COLOR_LAB2BGR)

    return img_np


def _zoom_center(img_np: np.ndarray, factor: float = 2.0) -> np.ndarray:
    """Upscale the crop for better AI identification."""
    h, w = img_np.shape[:2]
    target_size = max(512, int(max(h, w) * factor))
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

def _parse_retry_seconds(error_msg: str) -> float:
    """Extract 'try again in XmY.Zs' from a Groq 429 error message."""
    match = re.search(r"try again in (?:(\d+)m)?([\d.]+)s", error_msg, re.IGNORECASE)
    if match:
        minutes = int(match.group(1) or 0)
        seconds = float(match.group(2) or 0)
        return minutes * 60 + seconds
    return 60.0  # conservative default


def _call_groq(base64_jpeg: str) -> dict:
    """
    Send a single base64-encoded JPEG to Groq Vision and return the
    parsed JSON dict. Implements exponential backoff with jitter on 429.
    """
    from groq import Groq, RateLimitError  # lazy import

    client = Groq(api_key=GROQ_API_KEY)

    for attempt in range(MAX_RETRIES):
        try:
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

        except RateLimitError as e:
            if attempt == MAX_RETRIES - 1:
                print(f"[groq_vision] ⛔ Rate limit exceeded after {MAX_RETRIES} attempts.")
                raise
            
            # Exponential backoff: 2^attempt seconds + up to 1s jitter
            base_delay = min(_parse_retry_seconds(str(e)), 2 ** attempt)
            sleep_time = base_delay + random.uniform(0.1, 1.0)
            print(f"[groq_vision] ⏳ Rate limited — backoff {sleep_time:.2f}s (attempt {attempt+1}/{MAX_RETRIES})")
            time.sleep(sleep_time)


# Circuit breaker state
_CIRCUIT_BREAKER_UNTIL = 0.0

def identify_product(crop_image_np: np.ndarray) -> dict:
    """
    Identify a single product from its cropped BGR image.
    Includes circuit-breaker to stop hammering the API after a 429 rate limit.
    """
    global _CIRCUIT_BREAKER_UNTIL

    fallback = {
        "product_name": "Unidentified Product",
        "category": "Other",
        "confidence": "low",
    }

    # Circuit breaker check
    if time.time() < _CIRCUIT_BREAKER_UNTIL:
        return fallback

    # Guard: skip tiny / degenerate crops
    if crop_image_np.size == 0 or crop_image_np.shape[0] < 5 or crop_image_np.shape[1] < 5:
        return fallback

    # Guard: no API key configured
    if not GROQ_API_KEY:
        print("[groq_vision] GROQ_API_KEY not set — returning fallback")
        return fallback

    try:
        from groq import RateLimitError  # lazy import

        # Always enhance the crop before sending
        enhanced = _enhance_crop(crop_image_np)
        b64 = _numpy_to_base64_jpeg(enhanced)
        result = _call_groq(b64)
        time.sleep(0.15)  # polite rate-limit pause

        # Retry with stronger zoom if confidence is low
        if result.get("confidence", "low") == "low":
            print("[groq_vision] Low confidence — retrying with 2× enhanced zoom")
            zoomed = _zoom_center(crop_image_np, factor=2.0)
            zoomed = _enhance_crop(zoomed, min_size=768)
            if zoomed.size > 0 and zoomed.shape[0] >= 5 and zoomed.shape[1] >= 5:
                b64_zoom = _numpy_to_base64_jpeg(zoomed)
                result = _call_groq(b64_zoom)
                time.sleep(0.15)

            # If still low after retry, force unidentified
            if result.get("confidence", "low") == "low":
                result = fallback

        return result

    except RateLimitError:
        # Trip circuit breaker for 60 seconds
        print("[groq_vision] 💥 429 Rate Limit hit. Tripping circuit breaker for 60 seconds.")
        _CIRCUIT_BREAKER_UNTIL = time.time() + 60.0
        return fallback

    except Exception:
        traceback.print_exc()
        print("[groq_vision] API call failed — returning fallback")
        return fallback
