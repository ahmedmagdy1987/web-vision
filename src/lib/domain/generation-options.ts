import type {
  AspectRatio,
  BrandVisibility,
  CameraAngle,
  EnvironmentType,
  GenerationSettings,
  Lighting,
  PeopleInScene,
  Placement,
  ProductScale,
  VisualStyle,
  VisualizationType,
} from "./generation";

/** A selectable option for a generation control. */
export interface ControlOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export const VISUALIZATION_TYPE_OPTIONS: ControlOption<VisualizationType>[] = [
  { value: "product-placement", label: "Product placement", description: "Place products naturally in a real scene" },
  { value: "lifestyle-scene", label: "Lifestyle scene", description: "Products in an aspirational lifestyle context" },
  { value: "storefront-mockup", label: "Storefront mockup", description: "Retail / shopfront branding mockup" },
  { value: "billboard", label: "Billboard", description: "Large outdoor advertising format" },
  { value: "signage", label: "Signage", description: "Wall, window or directional signage" },
  { value: "packaging", label: "Packaging", description: "Product packaging in context" },
  { value: "social-ad", label: "Social ad", description: "Social-media-ready advertising creative" },
];

export const PLACEMENT_OPTIONS: ControlOption<Placement>[] = [
  { value: "auto", label: "Auto" },
  { value: "foreground", label: "Foreground" },
  { value: "background", label: "Background" },
  { value: "center", label: "Center" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "wall-mounted", label: "Wall mounted" },
  { value: "shelf", label: "On shelf" },
  { value: "floor-standing", label: "Floor standing" },
];

export const CAMERA_ANGLE_OPTIONS: ControlOption<CameraAngle>[] = [
  { value: "eye-level", label: "Eye level" },
  { value: "low-angle", label: "Low angle" },
  { value: "high-angle", label: "High angle" },
  { value: "top-down", label: "Top down" },
  { value: "wide-shot", label: "Wide shot" },
  { value: "close-up", label: "Close up" },
  { value: "three-quarter", label: "Three-quarter" },
];

export const ENVIRONMENT_TYPE_OPTIONS: ControlOption<EnvironmentType>[] = [
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "studio", label: "Studio" },
  { value: "urban", label: "Urban" },
  { value: "retail", label: "Retail" },
  { value: "office", label: "Office" },
  { value: "home", label: "Home" },
  { value: "event", label: "Event" },
];

export const LIGHTING_OPTIONS: ControlOption<Lighting>[] = [
  { value: "natural", label: "Natural" },
  { value: "golden-hour", label: "Golden hour" },
  { value: "studio-softbox", label: "Studio softbox" },
  { value: "dramatic", label: "Dramatic" },
  { value: "neon", label: "Neon" },
  { value: "overcast", label: "Overcast" },
  { value: "warm-ambient", label: "Warm ambient" },
  { value: "cool-daylight", label: "Cool daylight" },
];

export const VISUAL_STYLE_OPTIONS: ControlOption<VisualStyle>[] = [
  { value: "photorealistic", label: "Photorealistic" },
  { value: "cinematic", label: "Cinematic" },
  { value: "editorial", label: "Editorial" },
  { value: "minimal", label: "Minimal" },
  { value: "vibrant", label: "Vibrant" },
  { value: "luxury", label: "Luxury" },
  { value: "documentary", label: "Documentary" },
];

export const ASPECT_RATIO_OPTIONS: ControlOption<AspectRatio>[] = [
  { value: "1:1", label: "1:1", description: "Square" },
  { value: "4:5", label: "4:5", description: "Portrait" },
  { value: "9:16", label: "9:16", description: "Story" },
  { value: "2:3", label: "2:3", description: "Tall" },
  { value: "4:3", label: "4:3", description: "Classic" },
  { value: "3:2", label: "3:2", description: "Photo" },
  { value: "16:9", label: "16:9", description: "Wide" },
];

export const PRODUCT_SCALE_OPTIONS: ControlOption<ProductScale>[] = [
  { value: "subtle", label: "Subtle" },
  { value: "balanced", label: "Balanced" },
  { value: "prominent", label: "Prominent" },
  { value: "hero", label: "Hero" },
];

export const BRAND_VISIBILITY_OPTIONS: ControlOption<BrandVisibility>[] = [
  { value: "subtle", label: "Subtle" },
  { value: "balanced", label: "Balanced" },
  { value: "bold", label: "Bold" },
];

export const PEOPLE_IN_SCENE_OPTIONS: ControlOption<PeopleInScene>[] = [
  { value: "none", label: "None" },
  { value: "implied", label: "Implied" },
  { value: "one", label: "One person" },
  { value: "small-group", label: "Small group" },
  { value: "crowd", label: "Crowd" },
];

/** Map an aspect ratio to a numeric ratio for preview sizing. */
export const ASPECT_RATIO_VALUES: Record<AspectRatio, number> = {
  "1:1": 1,
  "4:5": 4 / 5,
  "9:16": 9 / 16,
  "2:3": 2 / 3,
  "4:3": 4 / 3,
  "3:2": 3 / 2,
  "16:9": 16 / 9,
};

export const MIN_OUTPUT_COUNT = 1;
export const MAX_OUTPUT_COUNT = 4;

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  visualizationType: "product-placement",
  placement: "auto",
  cameraAngle: "eye-level",
  environmentType: "retail",
  lighting: "natural",
  visualStyle: "photorealistic",
  aspectRatio: "4:5",
  outputCount: 2,
  productScale: "balanced",
  brandVisibility: "balanced",
  peopleInScene: "none",
  preserveArchitecture: true,
  removeExistingObjects: false,
  creativity: 40,
};

/** Human-readable label lookup for any control value (used in summaries). */
function toLabelMap<T extends string>(options: ControlOption<T>[]): Record<string, string> {
  return Object.fromEntries(options.map((o) => [o.value, o.label]));
}

export const CONTROL_LABELS = {
  visualizationType: toLabelMap(VISUALIZATION_TYPE_OPTIONS),
  placement: toLabelMap(PLACEMENT_OPTIONS),
  cameraAngle: toLabelMap(CAMERA_ANGLE_OPTIONS),
  environmentType: toLabelMap(ENVIRONMENT_TYPE_OPTIONS),
  lighting: toLabelMap(LIGHTING_OPTIONS),
  visualStyle: toLabelMap(VISUAL_STYLE_OPTIONS),
  productScale: toLabelMap(PRODUCT_SCALE_OPTIONS),
  brandVisibility: toLabelMap(BRAND_VISIBILITY_OPTIONS),
  peopleInScene: toLabelMap(PEOPLE_IN_SCENE_OPTIONS),
} as const;

/** Describe the creativity slider value in words. */
export function creativityLabel(value: number): string {
  if (value <= 20) return "Faithful";
  if (value <= 45) return "Balanced";
  if (value <= 70) return "Creative";
  return "Experimental";
}
