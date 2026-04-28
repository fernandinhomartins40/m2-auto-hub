import { ApiError } from '@shared/utils/error.util.js';
import { LicensePlateUtil } from '@shared/utils/license-plate.util.js';

interface RawAlprBoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface RawAlprCandidate {
  plate: string;
  confidence: number;
  detection_confidence: number;
  region?: string | null;
  region_confidence?: number | null;
  bounding_box: RawAlprBoundingBox;
}

interface RawAlprResponse {
  provider: string;
  detector_model: string;
  ocr_model: string;
  elapsed_ms: number;
  candidates: RawAlprCandidate[];
}

export interface RecognizedPlateCandidate {
  plate: string;
  confidence: number;
  detectionConfidence: number;
  region?: string | null;
  regionConfidence?: number | null;
  boundingBox: RawAlprBoundingBox;
}

export interface RecognizedPlateResponse {
  provider: string;
  detectorModel: string;
  ocrModel: string;
  elapsedMs: number;
  plate: string | null;
  candidates: RecognizedPlateCandidate[];
}

class AlprService {
  private readonly serviceUrl =
    process.env.ALPR_SERVICE_URL?.replace(/\/+$/, '') || 'http://127.0.0.1:3082';

  async recognizeVehiclePlateImage(file: {
    buffer: Buffer;
    filename: string;
    contentType?: string;
  }): Promise<RecognizedPlateResponse> {
    const formData = new FormData();
    const imageBlob = new Blob([new Uint8Array(file.buffer)], {
      type: file.contentType || 'image/jpeg',
    });

    formData.set('image', imageBlob, file.filename || 'plate-capture.jpg');

    let response: Response;
    try {
      response = await fetch(`${this.serviceUrl}/recognize`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(45000),
      });
    } catch (error) {
      throw new ApiError(503, 'Servico de leitura de placas indisponivel no momento.');
    }

    const payload = (await response.json().catch(() => null)) as
      | RawAlprResponse
      | { detail?: string; message?: string }
      | null;

    if (!response.ok || !payload || !('candidates' in payload)) {
      const message =
        payload && ('detail' in payload || 'message' in payload)
          ? payload.detail || payload.message
          : 'Falha ao reconhecer a placa no servico ALPR.';
      throw new ApiError(response.status || 502, message || 'Falha ao reconhecer a placa.');
    }

    const dedupedCandidates = new Map<string, RecognizedPlateCandidate>();

    for (const candidate of payload.candidates) {
      const normalizedPlates = LicensePlateUtil.toPossibleValidPlates(candidate.plate);
      if (normalizedPlates.length === 0) {
        continue;
      }

      for (const normalizedPlate of normalizedPlates) {
        const mappedCandidate: RecognizedPlateCandidate = {
          plate: normalizedPlate,
          confidence: Number(candidate.confidence || 0),
          detectionConfidence: Number(candidate.detection_confidence || 0),
          region: candidate.region || null,
          regionConfidence: candidate.region_confidence ?? null,
          boundingBox: candidate.bounding_box,
        };

        const existingCandidate = dedupedCandidates.get(normalizedPlate);
        if (!existingCandidate || mappedCandidate.confidence > existingCandidate.confidence) {
          dedupedCandidates.set(normalizedPlate, mappedCandidate);
        }
      }
    }

    const candidates = Array.from(dedupedCandidates.values()).sort((left, right) => {
      if (right.confidence !== left.confidence) {
        return right.confidence - left.confidence;
      }

      return right.detectionConfidence - left.detectionConfidence;
    });

    return {
      provider: payload.provider,
      detectorModel: payload.detector_model,
      ocrModel: payload.ocr_model,
      elapsedMs: payload.elapsed_ms,
      plate: candidates[0]?.plate || null,
      candidates,
    };
  }
}

export default new AlprService();
