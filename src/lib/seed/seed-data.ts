import type {
  Brand,
  GenerationJob,
  GenerationRequest,
  GenerationResult,
  GenerationSettings,
  ImageAsset,
  Location,
  LogoAsset,
  Product,
  ResultReview,
  ResultSnapshot,
} from "@/lib/domain";
import { DEFAULT_GENERATION_SETTINGS } from "@/lib/domain";
import { brandMarkDataUrl, scenePlaceholderDataUrl, type LogoVariant } from "@/lib/placeholders";
import { composeInstructions } from "@/lib/services/instruction-composer";

/*
 * Malahi is a family-entertainment operator. Web Vision is used by the Malahi
 * team to mock up how games/attractions (products) from each venue brand would
 * look installed in a prospective client location. This seed provides a
 * coherent demo dataset so every interface state is reviewable on first run.
 */

export const MALAHI_ORG = "Malahi Entertainment";

/* Fixed timestamps so seeded gallery items sort sensibly out of the box. */
const BASE = "2026-06-22T10:00:00.000Z";
const T = (daysAgo: number): string => {
  const d = new Date(BASE);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
};
const minsAgo = (mins: number): string => new Date(new Date(BASE).getTime() - mins * 60000).toISOString();

function asset(id: string, url: string, name: string, w = 1200, h = 900, createdAt = T(30)): ImageAsset {
  return { id, url, name, mimeType: "image/svg+xml", size: url.length, width: w, height: h, createdAt };
}

function logo(brandId: string, name: string, accent: string, kind: LogoAsset["kind"], createdAt: string): LogoAsset {
  return {
    id: `logo_${brandId}_${kind}`,
    brandId,
    asset: asset(
      `logoimg_${brandId}_${kind}`,
      brandMarkDataUrl(name, accent, kind as LogoVariant),
      `${name} ${kind} logo`,
      240,
      240,
      createdAt,
    ),
    kind,
    status: "active",
    instructions: kind === "icon" ? "Use as a compact app/avatar mark; keep generous clear space." : undefined,
    createdAt,
    updatedAt: createdAt,
  };
}

interface BrandSeed {
  id: string;
  name: string;
  accentColor: string;
  description: string;
  instructions: string;
  logoKinds: LogoAsset["kind"][];
  defaultKind: LogoAsset["kind"];
  createdAt: string;
}

const BRAND_SEEDS: BrandSeed[] = [
  {
    id: "brand_arcade",
    name: "Malahi Arcade",
    accentColor: "#7c3aed",
    description: "Arcade & redemption games for malls and family entertainment centers.",
    instructions:
      "Vivid, energetic arcade atmosphere. Emphasize glowing screens, LED marquees and a clean, family-friendly indoor mall setting. Keep cabinets bold, branded and legible.",
    logoKinds: ["primary", "icon", "dark", "light"],
    defaultKind: "primary",
    createdAt: T(70),
  },
  {
    id: "brand_aventura",
    name: "Aventura Parks",
    accentColor: "#0d9488",
    description: "Outdoor family rides and open-air attractions.",
    instructions:
      "Bright natural daylight with outdoor family-park energy. Place rides in safe, spacious open areas; imply happy families without rendering identifiable faces.",
    logoKinds: ["primary", "icon", "secondary"],
    defaultKind: "primary",
    createdAt: T(55),
  },
  {
    id: "brand_nova",
    name: "Nova Play",
    accentColor: "#f59e0b",
    description: "Soft play structures and kids entertainment zones.",
    instructions:
      "Playful, colorful and safe. Rounded shapes, padded surfaces and warm friendly lighting suited to young children.",
    logoKinds: ["primary", "icon", "dark"],
    defaultKind: "primary",
    createdAt: T(40),
  },
  {
    id: "brand_velocity",
    name: "Velocity VR",
    accentColor: "#2563eb",
    description: "Immersive VR pods and motion simulators.",
    instructions:
      "Sleek, futuristic and immersive. Dark ambient spaces with restrained neon accents, premium hardware and a high-tech feel.",
    logoKinds: ["primary", "icon", "dark"],
    defaultKind: "primary",
    createdAt: T(25),
  },
];

function buildBrands(): Brand[] {
  return BRAND_SEEDS.map((s) => ({
    id: s.id,
    name: s.name,
    accentColor: s.accentColor,
    description: s.description,
    instructions: s.instructions,
    logos: s.logoKinds.map((kind) => logo(s.id, s.name, s.accentColor, kind, s.createdAt)),
    defaultLogoId: `logo_${s.id}_${s.defaultKind}`,
    status: "active",
    createdAt: s.createdAt,
    updatedAt: s.createdAt,
  }));
}

interface ProductSeed {
  id: string;
  brandId: string;
  accent: string;
  name: string;
  category: string;
  tags: string[];
  description: string;
  usage: Product["usage"];
  dimensions?: Product["dimensions"];
  preservation: string;
  status?: Product["status"];
  createdAt: string;
}

const PRODUCT_SEEDS: ProductSeed[] = [
  {
    id: "prod_hyperdrive",
    brandId: "brand_arcade",
    accent: "#7c3aed",
    name: "Hyperdrive Racer",
    category: "Simulators",
    tags: ["racing", "seated", "twin"],
    description: "Twin-seat racing simulator with wraparound screens.",
    usage: "indoor",
    dimensions: { width: 200, height: 180, depth: 240, unit: "cm" },
    preservation: "Keep the twin-seat cabinet shape, wheel rigs and wraparound screen layout exactly.",
    createdAt: T(68),
  },
  {
    id: "prod_galaxy",
    brandId: "brand_arcade",
    accent: "#7c3aed",
    name: "Galaxy Shooter",
    category: "Arcade",
    tags: ["light-gun", "co-op", "led"],
    description: "Two-player light-gun arcade cabinet with LED marquee.",
    usage: "indoor",
    dimensions: { width: 150, height: 220, depth: 110, unit: "cm" },
    preservation: "Preserve the LED marquee artwork and the dual light-gun mounts.",
    createdAt: T(64),
  },
  {
    id: "prod_tickettower",
    brandId: "brand_arcade",
    accent: "#7c3aed",
    name: "Ticket Tower",
    category: "Redemption",
    tags: ["redemption", "tickets", "skill"],
    description: "Vertical skill-stop redemption game with ticket payout.",
    usage: "indoor",
    dimensions: { width: 90, height: 250, depth: 90, unit: "cm" },
    preservation: "Keep the tall tower silhouette, light columns and ticket dispenser.",
    createdAt: T(60),
  },
  {
    id: "prod_pixeldance",
    brandId: "brand_arcade",
    accent: "#7c3aed",
    name: "Pixel Dance",
    category: "Sports",
    tags: ["dance", "active", "music"],
    description: "Two-pad rhythm dance machine with overhead lighting rig.",
    usage: "indoor",
    dimensions: { width: 200, height: 260, depth: 150, unit: "cm" },
    preservation: "Preserve the dual dance pads and the overhead light rig.",
    createdAt: T(52),
  },
  {
    id: "prod_skyspinner",
    brandId: "brand_aventura",
    accent: "#0d9488",
    name: "Sky Spinner",
    category: "Rides",
    tags: ["spinning", "family", "outdoor"],
    description: "Family spinning ride with eight gondolas.",
    usage: "outdoor",
    dimensions: { width: 1200, height: 900, depth: 1200, unit: "cm" },
    preservation: "Keep the central tower, eight gondolas and canopy colors.",
    createdAt: T(46),
  },
  {
    id: "prod_aquasplash",
    brandId: "brand_aventura",
    accent: "#0d9488",
    name: "Aqua Splash",
    category: "Rides",
    tags: ["water", "splash", "outdoor"],
    description: "Compact water splash ride with a single drop.",
    usage: "outdoor",
    dimensions: { width: 1500, height: 700, depth: 900, unit: "cm" },
    preservation: "Preserve the flume drop geometry and splash pool footprint.",
    createdAt: T(43),
  },
  {
    id: "prod_juniorclimb",
    brandId: "brand_nova",
    accent: "#f59e0b",
    name: "Junior Climb",
    category: "Soft Play",
    tags: ["climb", "padded", "toddler"],
    description: "Three-level padded soft-play climbing structure.",
    usage: "indoor",
    dimensions: { width: 600, height: 350, depth: 500, unit: "cm" },
    preservation: "Keep the three padded levels, slide and netting in place.",
    createdAt: T(36),
  },
  {
    id: "prod_bouncearena",
    brandId: "brand_nova",
    accent: "#f59e0b",
    name: "Bounce Arena",
    category: "Sports",
    tags: ["trampoline", "active", "arena"],
    description: "Connected trampoline arena with padded walls.",
    usage: "indoor",
    dimensions: { width: 900, height: 300, depth: 700, unit: "cm" },
    preservation: "Preserve the trampoline grid layout and padded perimeter.",
    createdAt: T(33),
  },
  {
    id: "prod_orbitvr",
    brandId: "brand_velocity",
    accent: "#2563eb",
    name: "Orbit VR",
    category: "VR",
    tags: ["vr", "pod", "immersive"],
    description: "Single-rider enclosed VR pod with motion base.",
    usage: "indoor",
    dimensions: { width: 180, height: 230, depth: 180, unit: "cm" },
    preservation: "Keep the spherical pod shell and the entry hatch.",
    createdAt: T(22),
  },
  {
    id: "prod_missionsim",
    brandId: "brand_velocity",
    accent: "#2563eb",
    name: "Mission Sim",
    category: "Simulators",
    tags: ["motion", "group", "vr"],
    description: "Six-seat motion simulator capsule for group missions.",
    usage: "indoor",
    dimensions: { width: 360, height: 260, depth: 420, unit: "cm" },
    preservation: "Preserve the capsule hull, six-seat layout and access ramp.",
    createdAt: T(18),
  },
  {
    id: "prod_retrocade",
    brandId: "brand_arcade",
    accent: "#7c3aed",
    name: "Retro Cabinet (Legacy)",
    category: "Arcade",
    tags: ["retro", "upright", "legacy"],
    description: "Single-player upright retro cabinet — kept for archive demos.",
    usage: "indoor",
    dimensions: { width: 70, height: 175, depth: 80, unit: "cm" },
    preservation: "Preserve the upright cabinet form and side artwork.",
    status: "archived",
    createdAt: T(50),
  },
];

function buildProducts(): Product[] {
  return PRODUCT_SEEDS.map((s) => ({
    id: s.id,
    brandId: s.brandId,
    name: s.name,
    category: s.category,
    tags: s.tags,
    description: s.description,
    dimensions: s.dimensions,
    usage: s.usage,
    mainImage: asset(
      `prodimg_${s.id}_main`,
      scenePlaceholderDataUrl({ label: s.name, sublabel: s.category, accent: s.accent, width: 1000, height: 1000, seed: s.id.length }),
      `${s.name} main`,
      1000,
      1000,
      s.createdAt,
    ),
    referenceImages: [
      asset(
        `prodimg_${s.id}_ref1`,
        scenePlaceholderDataUrl({ label: "Detail", sublabel: s.name, accent: s.accent, width: 1000, height: 1000, seed: s.id.length + 3 }),
        `${s.name} detail`,
        1000,
        1000,
        s.createdAt,
      ),
      asset(
        `prodimg_${s.id}_ref2`,
        scenePlaceholderDataUrl({ label: "Angle", sublabel: s.name, accent: s.accent, width: 1000, height: 1000, seed: s.id.length + 9 }),
        `${s.name} angle`,
        1000,
        1000,
        s.createdAt,
      ),
    ],
    preservationInstructions: s.preservation,
    status: s.status ?? "active",
    createdAt: s.createdAt,
    updatedAt: s.createdAt,
  }));
}

interface LocationSeed {
  id: string;
  name: string;
  brandId?: string;
  accent: string;
  usage: Location["usage"];
  description: string;
  preservation: string;
  imageCount: number;
  createdAt: string;
}

const LOCATION_SEEDS: LocationSeed[] = [
  {
    id: "loc_mall_atrium",
    name: "Grand Mall Atrium",
    brandId: "brand_arcade",
    accent: "#7c3aed",
    usage: "indoor",
    description: "Double-height shopping-mall atrium with skylights and polished floors.",
    preservation: "Preserve the skylight structure, balconies and floor layout.",
    imageCount: 2,
    createdAt: T(38),
  },
  {
    id: "loc_boardwalk",
    name: "Seaside Boardwalk",
    brandId: "brand_aventura",
    accent: "#0d9488",
    usage: "outdoor",
    description: "Coastal boardwalk promenade overlooking the sea.",
    preservation: "Keep the timber boardwalk, railings and horizon line.",
    imageCount: 2,
    createdAt: T(30),
  },
  {
    id: "loc_fec_floor",
    name: "Family Entertainment Center",
    accent: "#f59e0b",
    usage: "indoor",
    description: "Open FEC floor with exposed ceiling and neutral flooring.",
    preservation: "Preserve the exposed ceiling services and floor grid.",
    imageCount: 1,
    createdAt: T(24),
  },
  {
    id: "loc_rooftop_plaza",
    name: "Rooftop Plaza",
    accent: "#2563eb",
    usage: "outdoor",
    description: "City rooftop plaza at dusk with a skyline backdrop.",
    preservation: "Keep the skyline silhouette, parapet wall and deck pattern.",
    imageCount: 2,
    createdAt: T(14),
  },
  {
    id: "loc_retail_unit",
    name: "Downtown Retail Unit",
    accent: "#7c3aed",
    usage: "indoor",
    description: "Vacant ground-floor retail unit with full-height glazing.",
    preservation: "Preserve the storefront glazing, columns and ceiling height.",
    imageCount: 1,
    createdAt: T(8),
  },
];

function buildLocations(): Location[] {
  return LOCATION_SEEDS.map((s) => {
    const images: ImageAsset[] = Array.from({ length: s.imageCount }, (_, i) =>
      asset(
        `locimg_${s.id}_${i}`,
        scenePlaceholderDataUrl({
          label: s.name,
          sublabel: i === 0 ? "Primary view" : `View ${i + 1}`,
          accent: s.accent,
          width: 1400,
          height: 1000,
          seed: s.id.length + i * 7,
        }),
        `${s.name} view ${i + 1}`,
        1400,
        1000,
        s.createdAt,
      ),
    );
    return {
      id: s.id,
      name: s.name,
      brandId: s.brandId,
      usage: s.usage,
      images,
      mainImageId: images[0]?.id,
      description: s.description,
      preservationInstructions: s.preservation,
      saved: true,
      createdAt: s.createdAt,
      updatedAt: s.createdAt,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Shared request/snapshot builder                                     */
/* ------------------------------------------------------------------ */

interface ComposeArgs {
  brands: Brand[];
  products: Product[];
  locations: Location[];
  brandId: string;
  productIds: string[];
  locationId: string;
  settings: Partial<GenerationSettings>;
  notes?: string;
  ts: string;
  key: string;
}

function buildRequestAndSnapshot(args: ComposeArgs): { request: GenerationRequest; snapshot: ResultSnapshot } | null {
  const brand = args.brands.find((b) => b.id === args.brandId);
  if (!brand) return null;
  const selectedProducts = args.products.filter((p) => args.productIds.includes(p.id));
  const location = args.locations.find((l) => l.id === args.locationId);
  const defaultLogo = brand.logos.find((l) => l.id === brand.defaultLogoId);
  const mainImage = location?.images.find((i) => i.id === location.mainImageId) ?? location?.images[0];
  const settings: GenerationSettings = { ...DEFAULT_GENERATION_SETTINGS, ...args.settings };

  const instructions = composeInstructions({
    brand,
    logo: defaultLogo,
    products: selectedProducts,
    location,
    mainLocationImage: mainImage,
    settings,
    notes: args.notes,
  });

  const snapshot: ResultSnapshot = {
    brandId: brand.id,
    brandName: brand.name,
    brandAccent: brand.accentColor,
    logoId: defaultLogo?.id,
    logoUrl: defaultLogo?.asset.url,
    productIds: selectedProducts.map((p) => p.id),
    productNames: selectedProducts.map((p) => p.name),
    locationId: location?.id,
    locationName: location?.name,
    locationImageUrl: mainImage?.url,
    settings,
    instructions,
    notes: args.notes,
  };

  const request: GenerationRequest = {
    id: `req_${args.key}`,
    brandId: brand.id,
    logoId: defaultLogo?.id,
    productIds: selectedProducts.map((p) => p.id),
    locationId: location?.id,
    mainLocationImageId: mainImage?.id,
    uploadedAssets: [],
    settings,
    instructions,
    notes: args.notes,
    createdAt: args.ts,
  };

  return { request, snapshot };
}

interface ResultSeed {
  key: string;
  brandId: string;
  productIds: string[];
  locationId: string;
  settings: Partial<GenerationSettings>;
  notes?: string;
  review: ResultReview;
  favorite: boolean;
  createdAt: string;
}

const RESULT_SEEDS: ResultSeed[] = [
  {
    key: "arcade_mall_hero",
    brandId: "brand_arcade",
    productIds: ["prod_galaxy", "prod_tickettower", "prod_pixeldance"],
    locationId: "loc_mall_atrium",
    settings: { visualizationType: "lifestyle-scene", aspectRatio: "16:9", visualStyle: "vibrant", lighting: "neon", peopleInScene: "small-group", brandVisibility: "bold" },
    notes: "Pitch hero for the Grand Mall arcade zone proposal.",
    review: "approved",
    favorite: true,
    createdAt: T(5),
  },
  {
    key: "aventura_boardwalk",
    brandId: "brand_aventura",
    productIds: ["prod_skyspinner"],
    locationId: "loc_boardwalk",
    settings: { visualizationType: "product-placement", aspectRatio: "4:5", visualStyle: "photorealistic", lighting: "golden-hour", peopleInScene: "implied" },
    notes: "Single-ride placement study for the seaside client.",
    review: "approved",
    favorite: false,
    createdAt: T(4),
  },
  {
    key: "velocity_rooftop",
    brandId: "brand_velocity",
    productIds: ["prod_orbitvr", "prod_missionsim"],
    locationId: "loc_rooftop_plaza",
    settings: { visualizationType: "lifestyle-scene", aspectRatio: "1:1", visualStyle: "cinematic", lighting: "dramatic", brandVisibility: "bold", creativity: 65 },
    notes: "Dusk concept for the rooftop pop-up.",
    review: "draft",
    favorite: true,
    createdAt: T(3),
  },
  {
    key: "nova_fec",
    brandId: "brand_nova",
    productIds: ["prod_juniorclimb", "prod_bouncearena"],
    locationId: "loc_fec_floor",
    settings: { visualizationType: "storefront-mockup", aspectRatio: "3:2", visualStyle: "editorial", lighting: "studio-softbox", productScale: "prominent" },
    review: "rejected",
    favorite: false,
    createdAt: T(2),
  },
  {
    key: "arcade_retail",
    brandId: "brand_arcade",
    productIds: ["prod_hyperdrive"],
    locationId: "loc_retail_unit",
    settings: { visualizationType: "storefront-mockup", aspectRatio: "16:9", visualStyle: "minimal", lighting: "cool-daylight" },
    notes: "Window concept for the downtown unit.",
    review: "draft",
    favorite: false,
    createdAt: T(1),
  },
  {
    key: "aventura_boardwalk_aqua",
    brandId: "brand_aventura",
    productIds: ["prod_aquasplash"],
    locationId: "loc_boardwalk",
    settings: { visualizationType: "billboard", aspectRatio: "16:9", visualStyle: "vibrant", lighting: "natural", peopleInScene: "crowd" },
    review: "approved",
    favorite: false,
    createdAt: T(1),
  },
];

function buildResults(
  brands: Brand[],
  products: Product[],
  locations: Location[],
): { jobs: GenerationJob[]; results: GenerationResult[] } {
  const jobs: GenerationJob[] = [];
  const results: GenerationResult[] = [];

  for (const seed of RESULT_SEEDS) {
    const built = buildRequestAndSnapshot({
      brands,
      products,
      locations,
      brandId: seed.brandId,
      productIds: seed.productIds,
      locationId: seed.locationId,
      settings: seed.settings,
      notes: seed.notes,
      ts: seed.createdAt,
      key: seed.key,
    });
    if (!built) continue;
    const { request, snapshot } = built;

    const jobId = `job_${seed.key}`;
    const resultId = `res_${seed.key}`;
    const image = asset(
      `resimg_${seed.key}`,
      scenePlaceholderDataUrl({
        label: snapshot.brandName,
        sublabel: snapshot.locationName ?? "Generated mockup",
        accent: snapshot.brandAccent,
        width: 1400,
        height: 1400,
        seed: seed.key.length * 5,
      }),
      `${snapshot.brandName} mockup`,
      1400,
      1400,
      seed.createdAt,
    );

    results.push({
      id: resultId,
      jobId,
      requestId: request.id,
      image,
      index: 0,
      seed: seed.key.length * 11,
      review: seed.review,
      favorite: seed.favorite,
      snapshot,
      createdAt: seed.createdAt,
      updatedAt: seed.createdAt,
    });

    jobs.push({
      id: jobId,
      request,
      status: "completed",
      progress: 100,
      resultIds: [resultId],
      createdAt: seed.createdAt,
      updatedAt: seed.createdAt,
      completedAt: seed.createdAt,
    });
  }

  return { jobs, results };
}

/** Build an in-flight and a failed job so those states are reviewable. */
function buildExtraJobs(brands: Brand[], products: Product[], locations: Location[]): GenerationJob[] {
  const jobs: GenerationJob[] = [];

  const processing = buildRequestAndSnapshot({
    brands,
    products,
    locations,
    brandId: "brand_velocity",
    productIds: ["prod_orbitvr"],
    locationId: "loc_fec_floor",
    settings: { visualizationType: "product-placement", aspectRatio: "4:5", outputCount: 3 },
    notes: "FEC trial layout.",
    ts: minsAgo(2),
    key: "processing_velocity",
  });
  if (processing) {
    jobs.push({
      id: "job_processing_velocity",
      request: processing.request,
      status: "processing",
      progress: 62,
      resultIds: [],
      createdAt: minsAgo(2),
      updatedAt: minsAgo(1),
    });
  }

  const failed = buildRequestAndSnapshot({
    brands,
    products,
    locations,
    brandId: "brand_nova",
    productIds: ["prod_juniorclimb"],
    locationId: "loc_mall_atrium",
    settings: { visualizationType: "lifestyle-scene", aspectRatio: "1:1" },
    notes: "Retry needed.",
    ts: minsAgo(40),
    key: "failed_nova",
  });
  if (failed) {
    jobs.push({
      id: "job_failed_nova",
      request: failed.request,
      status: "failed",
      progress: 35,
      error: "The generation provider failed to process this request. Please try again.",
      resultIds: [],
      createdAt: minsAgo(40),
      updatedAt: minsAgo(39),
      completedAt: minsAgo(39),
    });
  }

  return jobs;
}

export interface SeedBundle {
  brands: Brand[];
  products: Product[];
  locations: Location[];
  jobs: GenerationJob[];
  results: GenerationResult[];
}

let cached: SeedBundle | null = null;

/** Build (and memoize) the full, internally consistent seed bundle. */
export function buildSeed(): SeedBundle {
  if (cached) return cached;
  const brands = buildBrands();
  const products = buildProducts();
  const locations = buildLocations();
  const { jobs, results } = buildResults(brands, products, locations);
  const extraJobs = buildExtraJobs(brands, products, locations);
  // Newest activity first (processing/failed are most recent).
  cached = { brands, products, locations, jobs: [...extraJobs, ...jobs], results };
  return cached;
}
