import type { ID, ImageAsset } from "./common";
import type { LocationUsage } from "./location";

/* ------------------------------------------------------------------ */
/* Structured generation controls                                      */
/* ------------------------------------------------------------------ */

export type VisualizationType =
  | "product-placement"
  | "lifestyle-scene"
  | "storefront-mockup"
  | "billboard"
  | "signage"
  | "packaging"
  | "social-ad";

export type Placement =
  | "auto"
  | "foreground"
  | "background"
  | "center"
  | "left"
  | "right"
  | "wall-mounted"
  | "shelf"
  | "floor-standing";

export type CameraAngle =
  | "eye-level"
  | "low-angle"
  | "high-angle"
  | "top-down"
  | "wide-shot"
  | "close-up"
  | "three-quarter";

export type EnvironmentType =
  | "indoor"
  | "outdoor"
  | "studio"
  | "urban"
  | "retail"
  | "office"
  | "home"
  | "event";

export type Lighting =
  | "natural"
  | "golden-hour"
  | "studio-softbox"
  | "dramatic"
  | "neon"
  | "overcast"
  | "warm-ambient"
  | "cool-daylight";

export type VisualStyle =
  | "photorealistic"
  | "cinematic"
  | "editorial"
  | "minimal"
  | "vibrant"
  | "luxury"
  | "documentary";

export type AspectRatio = "1:1" | "4:3" | "3:2" | "16:9" | "9:16" | "4:5" | "2:3";

export type ProductScale = "subtle" | "balanced" | "prominent" | "hero";

export type BrandVisibility = "subtle" | "balanced" | "bold";

export type PeopleInScene = "none" | "implied" | "one" | "small-group" | "crowd";

export interface GenerationSettings {
  visualizationType: VisualizationType;
  placement: Placement;
  cameraAngle: CameraAngle;
  environmentType: EnvironmentType;
  lighting: Lighting;
  visualStyle: VisualStyle;
  aspectRatio: AspectRatio;
  /** Number of outputs to generate (1–4). */
  outputCount: number;
  productScale: ProductScale;
  brandVisibility: BrandVisibility;
  peopleInScene: PeopleInScene;
  preserveArchitecture: boolean;
  removeExistingObjects: boolean;
  /** 0 (faithful) – 100 (experimental). */
  creativity: number;
}

/* ------------------------------------------------------------------ */
/* Composed instructions                                               */
/* ------------------------------------------------------------------ */

export type InstructionSectionKey =
  | "system"
  | "brand"
  | "logo"
  | "product"
  | "location"
  | "controls"
  | "notes";

export interface InstructionSection {
  key: InstructionSectionKey;
  label: string;
  content: string;
}

export interface ComposedInstructions {
  /** Ordered, structured sections that make up the request. */
  sections: InstructionSection[];
  /** Flattened prompt text built from the sections. */
  text: string;
}

/* ------------------------------------------------------------------ */
/* Request / Job / Result                                              */
/* ------------------------------------------------------------------ */

export type UploadedAssetRole = "location" | "logo" | "product-reference";

/** Metadata for an uploaded asset referenced by a request. */
export interface UploadedAssetRef {
  id: ID;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  role: UploadedAssetRole;
}

export interface GenerationRequest {
  id: ID;
  // selected asset IDs
  brandId: ID;
  logoId?: ID;
  productIds: ID[];
  locationId?: ID;
  mainLocationImageId?: ID;
  // uploaded asset metadata
  uploadedAssets: UploadedAssetRef[];
  // structured settings
  settings: GenerationSettings;
  // composed instruction text
  instructions: ComposedInstructions;
  // optional notes
  notes?: string;
  // timestamps
  createdAt: string;
}

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface GenerationJob {
  id: ID;
  request: GenerationRequest;
  status: JobStatus;
  /** 0–100 progress for the processing state. */
  progress: number;
  error?: string;
  resultIds: ID[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type ResultReview = "draft" | "approved" | "rejected";

/**
 * An unsaved location captured on a result so its setup can be fully restored
 * in Studio even though it was never persisted as a reusable Location.
 */
export interface LocationDraftSnapshot {
  name: string;
  usage: LocationUsage;
  images: ImageAsset[];
  mainImageId?: ID;
  description?: string;
  preservationInstructions?: string;
}

/**
 * A denormalized snapshot stored on each result so a gallery item remains
 * fully self-describing even if the source brand/product is later edited.
 */
export interface ResultSnapshot {
  brandId: ID;
  brandName: string;
  brandAccent: string;
  logoId?: ID;
  logoUrl?: string;
  productIds: ID[];
  productNames: string[];
  locationId?: ID;
  locationName?: string;
  locationImageUrl?: string;
  /** Present only when the location was not saved for reuse. */
  locationDraft?: LocationDraftSnapshot;
  settings: GenerationSettings;
  instructions: ComposedInstructions;
  notes?: string;
}

export interface GenerationResult {
  id: ID;
  jobId: ID;
  requestId: ID;
  /** Preview image (mock implementation generates an SVG data URL). */
  image: ImageAsset;
  /** Index within the job for output counts > 1. */
  index: number;
  seed: number;
  review: ResultReview;
  favorite: boolean;
  snapshot: ResultSnapshot;
  createdAt: string;
  updatedAt: string;
}
