// ── Evidence attached to an extracted place ──────────────────────────
export interface FrameEvidence {
  source: "frame";
  index: number;
}

export interface AudioEvidence {
  source: "audio";
  timestamp_s: number;
}

export type Evidence = FrameEvidence | AudioEvidence;

// ── A place extracted (or mocked) from a clip ────────────────────────
export interface ExtractedPlace {
  id: string;
  name: string;
  city_guess: string;
  confidence: number;
  evidence: Evidence;
}

// ── POST /clips/ingest ───────────────────────────────────────────────
export interface IngestRequest {
  tiktok_url: string;
  // files are sent as multipart form-data
}

export interface IngestResponse {
  clip_id: string;
  places: ExtractedPlace[];
}

// ── Collections ──────────────────────────────────────────────────────
export interface SavePlacesRequest {
  name: string;
  places: ExtractedPlace[];
}

export interface Collection {
  id: string;
  name: string;
  places: ExtractedPlace[];
  created_at: string;
}

export interface SavePlacesResponse {
  collection: Collection;
}

// ── Generic API error ────────────────────────────────────────────────
export interface ApiError {
  error: string;
}
