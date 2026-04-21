import logging
import os
import time
from statistics import mean
from typing import Any

import cv2
import numpy as np
from fast_alpr import ALPR
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel


logging.basicConfig(level=os.getenv("ALPR_LOG_LEVEL", "INFO"))
logger = logging.getLogger("moria-alpr")

DETECTOR_MODEL = os.getenv("ALPR_DETECTOR_MODEL", "yolo-v9-t-384-license-plate-end2end")
OCR_MODEL = os.getenv("ALPR_OCR_MODEL", "cct-s-v2-global-model")
OCR_DEVICE = os.getenv("ALPR_OCR_DEVICE", "auto")
DETECTOR_CONFIDENCE = float(os.getenv("ALPR_DETECTOR_CONFIDENCE", "0.35"))


class BoundingBoxResponse(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int


class RecognitionCandidateResponse(BaseModel):
    plate: str
    confidence: float
    detection_confidence: float
    region: str | None = None
    region_confidence: float | None = None
    bounding_box: BoundingBoxResponse


class RecognitionResponse(BaseModel):
    provider: str
    detector_model: str
    ocr_model: str
    elapsed_ms: float
    candidates: list[RecognitionCandidateResponse]


app = FastAPI(title="Moria ALPR Service", version="1.0.0")
alpr_engine: ALPR | None = None


def get_alpr_engine() -> ALPR:
    global alpr_engine  # noqa: PLW0603

    if alpr_engine is None:
        logger.info("Initializing FastALPR", extra={"detector_model": DETECTOR_MODEL, "ocr_model": OCR_MODEL})
        alpr_engine = ALPR(
            detector_model=DETECTOR_MODEL,
            detector_conf_thresh=DETECTOR_CONFIDENCE,
            ocr_model=OCR_MODEL,
            ocr_device=OCR_DEVICE,  # auto lets ONNX choose the best available provider.
        )

    return alpr_engine


def to_float_confidence(value: Any) -> float:
    if isinstance(value, list):
        numeric = [float(item) for item in value]
        return float(mean(numeric)) if numeric else 0.0

    if value is None:
        return 0.0

    return float(value)


def serialize_result(result: Any) -> RecognitionCandidateResponse | None:
    ocr_result = getattr(result, "ocr", None)
    detection = getattr(result, "detection", None)
    if ocr_result is None or detection is None:
        return None

    plate_text = str(getattr(ocr_result, "text", "") or "").strip().upper()
    if not plate_text:
        return None

    bbox = getattr(detection, "bounding_box", None)
    if bbox is None:
        return None

    return RecognitionCandidateResponse(
        plate=plate_text,
        confidence=to_float_confidence(getattr(ocr_result, "confidence", None)),
        detection_confidence=float(getattr(detection, "confidence", 0.0) or 0.0),
        region=getattr(ocr_result, "region", None),
        region_confidence=(
            float(getattr(ocr_result, "region_confidence", 0.0))
            if getattr(ocr_result, "region_confidence", None) is not None
            else None
        ),
        bounding_box=BoundingBoxResponse(
            x1=int(getattr(bbox, "x1", 0)),
            y1=int(getattr(bbox, "y1", 0)),
            x2=int(getattr(bbox, "x2", 0)),
            y2=int(getattr(bbox, "y2", 0)),
        ),
    )


@app.on_event("startup")
def warmup_models() -> None:
    get_alpr_engine()


@app.get("/health")
def health() -> dict[str, Any]:
    get_alpr_engine()
    return {
        "success": True,
        "provider": "fast-alpr",
        "detector_model": DETECTOR_MODEL,
        "ocr_model": OCR_MODEL,
    }


@app.post("/recognize", response_model=RecognitionResponse)
async def recognize(image: UploadFile = File(...)) -> RecognitionResponse:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported.")

    payload = await image.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Image payload is empty.")

    nparr = np.frombuffer(payload, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Failed to decode uploaded image.")

    started_at = time.perf_counter()
    results = get_alpr_engine().predict(frame)
    elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)

    candidates = [serialized for result in results if (serialized := serialize_result(result)) is not None]
    candidates.sort(key=lambda item: (item.confidence, item.detection_confidence), reverse=True)

    logger.info(
        "ALPR recognition completed",
        extra={
            "upload_filename": image.filename,
            "upload_content_type": image.content_type,
            "candidate_count": len(candidates),
            "elapsed_ms": elapsed_ms,
        },
    )

    return RecognitionResponse(
        provider="fast-alpr",
        detector_model=DETECTOR_MODEL,
        ocr_model=OCR_MODEL,
        elapsed_ms=elapsed_ms,
        candidates=candidates,
    )
