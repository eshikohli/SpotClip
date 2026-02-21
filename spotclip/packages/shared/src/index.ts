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
  /** Set when stored in a collection; default false */
  isFavorite?: boolean;
  /** Set when stored in a collection; default false */
  isVisited?: boolean;
  /** Set when stored in a collection */
  created_at?: string;
  /** 0–3 category tags from allowed set (set on save or edit) */
  tags?: string[];
  /** Optional user note */
  note?: string | null;
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

// ── GET /collections ─────────────────────────────────────────────────
export interface CollectionsListResponse {
  collections: Collection[];
}

// ── GET /favorites ───────────────────────────────────────────────────
export interface FavoriteItem extends ExtractedPlace {
  collectionId: string;
  collectionName: string;
}

export interface FavoritesResponse {
  favorites: FavoriteItem[];
}

// ── Spot tags (fixed allowed set) ─────────────────────────────────────
export const SPOT_TAGS = [
  "cafe/bakery",
  "food truck",
  "coffee",
  "bar",
  "club",
  "activity location",
  "viewpoint",
  "restaurant",
] as const;
export type SpotTag = (typeof SPOT_TAGS)[number];

// ── Generic API error ────────────────────────────────────────────────
export interface ApiError {
  error: string;
}
