"""
ChhadKrishi ML service — read-aloud and computer vision that the Next.js app calls server-side.
Sized for a 512 MB host (Render free): ~200 MB of RAM at runtime. Voice *input* is not here: the
browser's own speech recognition handles it, since a Whisper model needs ~2 GB.

  POST /tts             JSON {"text", "lang"}                 -> audio/mpeg
  POST /vision/analyze  multipart "image"                    -> photo quality, leaf detections, colour health
  GET  /health

Every route except /health needs "Authorization: Bearer $ML_SERVICE_TOKEN". The token is shared
with the Next.js server only; browsers never call this service directly.

Models (shipped in models/, paths overridable by env):
  TTS           Microsoft neural voices via edge-tts (no API key; needs outbound internet)
  Vision        foduucom/plant-leaf-detection-and-classification (YOLOv8s, exported to ONNX, 44 MB) + OpenCV
"""

from __future__ import annotations

import hmac
import json
import os
import threading
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path

import cv2
import edge_tts
import numpy as np
import onnxruntime as ort
from fastapi.concurrency import run_in_threadpool
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

MODELS_DIR = Path(os.environ.get("MODELS_DIR", Path(__file__).parent / "models"))
YOLO_MODEL = os.environ.get("YOLO_MODEL", str(MODELS_DIR / "plant-leaf.onnx"))
YOLO_CLASSES = os.environ.get("YOLO_CLASSES", str(MODELS_DIR / "plant-leaf.classes.json"))
CPU_THREADS = int(os.environ.get("CPU_THREADS", "1"))

MAX_IMAGE_BYTES = 5 * 1024 * 1024
VOICES = {"bn": "bn-BD-NabanitaNeural", "en": "en-IN-NeerjaNeural"}

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Load in the background so the port opens at once (hosts health-check it) and the first
    # photo doesn't pay the model load.
    def load() -> None:
        with _yolo_lock:
            _yolo()

    threading.Thread(target=load, daemon=True).start()
    yield


_yolo_lock = threading.Lock()

app = FastAPI(title="ChhadKrishi ML service", docs_url=None, redoc_url=None, lifespan=lifespan)


def require_token(authorization: str = Header(default="")) -> None:
    expected = os.environ.get("ML_SERVICE_TOKEN", "")
    given = authorization.removeprefix("Bearer ").strip()
    if not expected or not hmac.compare_digest(given.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


# --- Text to speech --------------------------------------------------------------------------


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=3000)
    lang: str = "bn"


@app.post("/tts", dependencies=[Depends(require_token)])
async def tts(body: TtsRequest) -> StreamingResponse:
    communicate = edge_tts.Communicate(body.text, VOICES.get(body.lang, VOICES["bn"]), rate="-5%")
    chunks = communicate.stream()

    # Wait for the first audio chunk so a voice-service failure is a 502, not an empty 200.
    try:
        first = None
        async for chunk in chunks:
            if chunk["type"] == "audio":
                first = chunk["data"]
                break
    except Exception as error:
        raise HTTPException(status_code=502, detail="speech service unavailable") from error
    if first is None:
        raise HTTPException(status_code=502, detail="no audio")

    async def audio():
        yield first
        async for chunk in chunks:
            if chunk["type"] == "audio":
                yield chunk["data"]

    return StreamingResponse(audio(), media_type="audio/mpeg", headers={"Cache-Control": "no-store"})


# --- Vision: OpenCV + YOLO -------------------------------------------------------------------

YOLO_SIZE = 640
YOLO_MIN_CONFIDENCE = 0.35


@lru_cache(maxsize=1)
def _yolo() -> tuple[ort.InferenceSession, list[str]]:
    options = ort.SessionOptions()
    options.intra_op_num_threads = CPU_THREADS
    session = ort.InferenceSession(YOLO_MODEL, options, providers=["CPUExecutionProvider"])
    classes = json.loads(Path(YOLO_CLASSES).read_text(encoding="utf-8"))
    return session, classes


def detect_leaves(bgr: np.ndarray) -> list[dict]:
    """YOLOv8 inference on a letterboxed 640x640 frame, then class-aware NMS."""
    session, classes = _yolo()
    h, w = bgr.shape[:2]
    scale = YOLO_SIZE / max(h, w)
    nh, nw = round(h * scale), round(w * scale)
    canvas = np.full((YOLO_SIZE, YOLO_SIZE, 3), 114, dtype=np.uint8)
    top, left = (YOLO_SIZE - nh) // 2, (YOLO_SIZE - nw) // 2
    canvas[top : top + nh, left : left + nw] = cv2.resize(bgr, (nw, nh), interpolation=cv2.INTER_LINEAR)
    blob = cv2.dnn.blobFromImage(canvas, 1 / 255.0, swapRB=True)

    output = session.run(None, {session.get_inputs()[0].name: blob})[0][0].T  # (8400, 4 + classes)
    scores = output[:, 4:]
    class_ids = scores.argmax(axis=1)
    confidences = scores.max(axis=1)
    keep = confidences >= YOLO_MIN_CONFIDENCE
    if not keep.any():
        return []
    boxes_cxcywh, class_ids, confidences = output[keep, :4], class_ids[keep], confidences[keep]

    # Back to original-image pixels.
    boxes = []
    for cx, cy, bw, bh in boxes_cxcywh.astype(float):
        x = (cx - bw / 2 - left) / scale
        y = (cy - bh / 2 - top) / scale
        boxes.append([max(0.0, x), max(0.0, y), min(bw / scale, w - max(0.0, x)), min(bh / scale, h - max(0.0, y))])

    picked = cv2.dnn.NMSBoxesBatched(boxes, confidences.tolist(), class_ids.tolist(), YOLO_MIN_CONFIDENCE, 0.45)
    detections = []
    for i in np.array(picked).flatten()[:20]:
        x, y, bw, bh = boxes[i]
        detections.append(
            {
                "label": classes[int(class_ids[i])] if int(class_ids[i]) < len(classes) else str(int(class_ids[i])),
                "confidence": round(float(confidences[i]), 3),
                # Normalised 0..1 so the UI can draw boxes at any display size.
                "box": [round(float(v), 4) for v in (x / w, y / h, bw / w, bh / h)],
            }
        )
    return sorted(detections, key=lambda d: -d["confidence"])


def photo_quality(bgr: np.ndarray) -> dict:
    """Sharpness (variance of the Laplacian) and exposure on a 1024 px working copy."""
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(gray.mean())
    clipped = float(((gray < 8) | (gray > 247)).mean())
    issues = []
    if sharpness < 60:
        issues.append("blurry")
    if brightness < 55:
        issues.append("too_dark")
    elif brightness > 215:
        issues.append("too_bright")
    if clipped > 0.25:
        issues.append("harsh_light")
    return {"sharpness": round(sharpness, 1), "brightness": round(brightness, 1), "issues": issues, "ok": not issues}


def foliage_colour(bgr: np.ndarray, detections: list[dict]) -> dict | None:
    """
    Shares of foliage pixels by colour band, inside the detected leaves (or the whole frame when
    nothing was detected). Grey/white soil, pots and sky are excluded by saturation, so the
    numbers describe the plant tissue. These are measurements, not a diagnosis.
    """
    h, w = bgr.shape[:2]
    region = np.zeros((h, w), dtype=np.uint8)
    if detections:
        for d in detections:
            x, y, bw, bh = d["box"]
            region[int(y * h) : int((y + bh) * h), int(x * w) : int((x + bw) * w)] = 255
    else:
        region[:] = 255

    hsv = cv2.cvtColor(cv2.GaussianBlur(bgr, (5, 5), 0), cv2.COLOR_BGR2HSV)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    in_region = region > 0
    green = in_region & (hue >= 35) & (hue <= 85) & (sat >= 50) & (val >= 40)
    yellow = in_region & (hue >= 20) & (hue < 35) & (sat >= 70) & (val >= 90)
    brown = in_region & (hue >= 5) & (hue < 20) & (sat >= 60) & (val >= 30) & (val < 200)
    # Pale, low-saturation patches surrounded by leaf: powdery mildew, mealybug wax or sun scald.
    leafy = cv2.dilate((green | yellow).astype(np.uint8), np.ones((15, 15), np.uint8)) > 0
    pale = in_region & leafy & (sat < 35) & (val > 185)

    foliage = int(green.sum() + yellow.sum() + brown.sum() + pale.sum())
    if foliage < 0.02 * in_region.sum():
        return None  # too little plant tissue to measure

    # Brown/dark spots enclosed by green tissue: count blobs of a plausible lesion size.
    leaf_mask = cv2.morphologyEx(green.astype(np.uint8) * 255, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    spots_mask = (brown | (in_region & (val < 60) & (sat >= 40))) & (leaf_mask > 0)
    contours, _ = cv2.findContours(spots_mask.astype(np.uint8) * 255, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_area, max_area = h * w * 0.00005, h * w * 0.02
    spots = sum(1 for c in contours if min_area <= cv2.contourArea(c) <= max_area)

    def share(mask: np.ndarray) -> float:
        return round(float(mask.sum()) / foliage, 3)

    return {
        "green": share(green),
        "yellow": share(yellow),
        "brown": share(brown),
        "pale": share(pale),
        "spots": spots,
        # "leaves" = measured inside detected leaves; "frame" = whole photo, so soil and pots count too.
        "scope": "leaves" if detections else "frame",
    }


@app.post("/vision/analyze", dependencies=[Depends(require_token)])
async def vision_analyze(image: UploadFile = File(...)) -> dict:
    data = await image.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="image too large")
    # In a worker thread: on a fractional-CPU host this takes seconds, and must not block /health.
    report = await run_in_threadpool(_analyze, data)
    if report is None:
        raise HTTPException(status_code=400, detail="unreadable image")
    return report


def _analyze(data: bytes) -> dict | None:
    bgr = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if bgr is None:
        return None
    h, w = bgr.shape[:2]
    if max(h, w) > 1024:
        f = 1024 / max(h, w)
        bgr = cv2.resize(bgr, (round(w * f), round(h * f)), interpolation=cv2.INTER_AREA)

    with _yolo_lock:  # one detection at a time keeps peak memory flat on a small host
        detections = detect_leaves(bgr)
    return {
        "quality": photo_quality(bgr),
        "detections": detections,
        "colour": foliage_colour(bgr, detections),
        "model": "yolov8s-plant-leaf+opencv",
    }


# Lets `python app.py` work locally; production uses the uvicorn command in the Dockerfile.
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", "8000")))
