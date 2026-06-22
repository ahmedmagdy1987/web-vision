import type {
  Brand,
  GenerationJob,
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

/* Fixed timestamps so seeded gallery items sort sensibly out of the box. */
const T = (daysAgo: number): string => {
  const d = new Date("2026-06-22T10:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
};

function asset(id: string, url: string, name: string, w = 1200, h = 900, createdAt = T(30)): ImageAsset {
  return { id, url, name, mimeType: "image/svg+xml", size: url.length, width: w, height: h, createdAt };
}

function logo(brandId: string, name: string, accent: string, kind: LogoAsset["kind"], createdAt: string): LogoAsset {
  const variant = kind as LogoVariant;
  return {
    id: `logo_${brandId}_${kind}`,
    brandId,
    asset: asset(`logoimg_${brandId}_${kind}`, brandMarkDataUrl(name, accent, variant), `${name} ${kind} logo`, 240, 240, createdAt),
    kind,
    status: "active",
    instructions:
      kind === "icon"
        ? "Use as a compact app/avatar mark; keep generous clear space."
        : undefined,
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
    id: "brand_aurora",
    name: "Aurora Living",
    accentColor: "#6366f1",
    description: "Considered furniture for calm, modern homes.",
    instructions:
      "Warm, minimal, Scandinavian-inspired. Favor natural daylight, wood and linen textures, and uncluttered compositions with plenty of negative space.",
    logoKinds: ["primary", "icon", "dark"],
    defaultKind: "primary",
    createdAt: T(60),
  },
  {
    id: "brand_verde",
    name: "Verde Outdoors",
    accentColor: "#15803d",
    description: "Durable gear and furniture for life outside.",
    instructions:
      "Rugged and adventurous. Place products in authentic outdoor environments, emphasize durability, and use real natural light.",
    logoKinds: ["primary", "icon", "light"],
    defaultKind: "primary",
    createdAt: T(45),
  },
  {
    id: "brand_lumen",
    name: "Lumen Studio",
    accentColor: "#d97706",
    description: "Sculptural lighting and decor objects.",
    instructions:
      "Premium and editorial. Showcase warm glow, dramatic shadows, and fine material craftsmanship against refined interiors.",
    logoKinds: ["primary", "secondary", "icon"],
    defaultKind: "primary",
    createdAt: T(20),
  },
];

function buildBrands(): Brand[] {
  return BRAND_SEEDS.map((s) => {
    const logos = s.logoKinds.map((kind) => logo(s.id, s.name, s.accentColor, kind, s.createdAt));
    return {
      id: s.id,
      name: s.name,
      accentColor: s.accentColor,
      description: s.description,
      instructions: s.instructions,
      logos,
      defaultLogoId: `logo_${s.id}_${s.defaultKind}`,
      status: "active",
      createdAt: s.createdAt,
      updatedAt: s.createdAt,
    };
  });
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
  createdAt: string;
}

const PRODUCT_SEEDS: ProductSeed[] = [
  {
    id: "prod_halsa_chair",
    brandId: "brand_aurora",
    accent: "#6366f1",
    name: "Hälsa Lounge Chair",
    category: "Seating",
    tags: ["lounge", "oak", "linen"],
    description: "Sculpted oak lounge chair with natural linen upholstery.",
    usage: "indoor",
    dimensions: { width: 74, height: 82, depth: 80, unit: "cm" },
    preservation: "Keep the oak frame grain and the linen cushion color exactly as shown.",
    createdAt: T(58),
  },
  {
    id: "prod_nord_sofa",
    brandId: "brand_aurora",
    accent: "#6366f1",
    name: "Nord Modular Sofa",
    category: "Seating",
    tags: ["modular", "sofa", "wool"],
    description: "Three-seat modular sofa in heather wool.",
    usage: "indoor",
    dimensions: { width: 240, height: 78, depth: 95, unit: "cm" },
    preservation: "Preserve modular segment seams and the heather wool texture.",
    createdAt: T(55),
  },
  {
    id: "prod_lyse_lamp",
    brandId: "brand_aurora",
    accent: "#6366f1",
    name: "Lyse Floor Lamp",
    category: "Lighting",
    tags: ["floor", "brass", "ambient"],
    description: "Slim brass floor lamp with a fabric diffuser.",
    usage: "both",
    dimensions: { width: 30, height: 150, depth: 30, unit: "cm" },
    preservation: "Keep the brushed brass stem and warm diffuser glow.",
    createdAt: T(50),
  },
  {
    id: "prod_trail_table",
    brandId: "brand_verde",
    accent: "#15803d",
    name: "Trail Camp Table",
    category: "Furniture",
    tags: ["foldable", "aluminum", "camp"],
    description: "Foldable anodized-aluminum camp table.",
    usage: "outdoor",
    dimensions: { width: 70, height: 50, depth: 70, unit: "cm" },
    preservation: "Maintain the anodized green frame and slatted tabletop.",
    createdAt: T(40),
  },
  {
    id: "prod_summit_lantern",
    brandId: "brand_verde",
    accent: "#15803d",
    name: "Summit Lantern",
    category: "Lighting",
    tags: ["rechargeable", "rugged", "lantern"],
    description: "Rugged rechargeable lantern with a silicone grip.",
    usage: "outdoor",
    dimensions: { width: 12, height: 18, depth: 12, unit: "cm" },
    preservation: "Keep the warm LED glow and the textured silicone body.",
    createdAt: T(38),
  },
  {
    id: "prod_orb_pendant",
    brandId: "brand_lumen",
    accent: "#d97706",
    name: "Orb Pendant",
    category: "Lighting",
    tags: ["pendant", "glass", "statement"],
    description: "Hand-blown amber glass pendant light.",
    usage: "indoor",
    dimensions: { width: 35, height: 35, depth: 35, unit: "cm" },
    preservation: "Preserve the amber glass tint and the warm filament glow.",
    createdAt: T(18),
  },
  {
    id: "prod_facet_lamp",
    brandId: "brand_lumen",
    accent: "#d97706",
    name: "Facet Table Lamp",
    category: "Lighting",
    tags: ["table", "ceramic", "sculptural"],
    description: "Faceted ceramic table lamp with linen shade.",
    usage: "indoor",
    dimensions: { width: 28, height: 46, depth: 28, unit: "cm" },
    preservation: "Keep the faceted ceramic base form and the linen shade.",
    createdAt: T(16),
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
    ],
    preservationInstructions: s.preservation,
    status: "active",
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
    id: "loc_loft",
    name: "Modern Loft Living Room",
    brandId: "brand_aurora",
    accent: "#6366f1",
    usage: "indoor",
    description: "Open-plan loft with large windows and oak flooring.",
    preservation: "Preserve the window frames, ceiling beams and floor layout.",
    imageCount: 2,
    createdAt: T(35),
  },
  {
    id: "loc_patio",
    name: "Coastal Patio",
    brandId: "brand_verde",
    accent: "#15803d",
    usage: "outdoor",
    description: "Seaside timber patio overlooking the coast.",
    preservation: "Keep the timber decking, railing and horizon line.",
    imageCount: 1,
    createdAt: T(28),
  },
  {
    id: "loc_retail",
    name: "Boutique Retail Floor",
    accent: "#0ea5e9",
    usage: "indoor",
    description: "Minimal boutique retail floor with track lighting.",
    preservation: "Preserve the display plinths and track-lighting positions.",
    imageCount: 1,
    createdAt: T(22),
  },
  {
    id: "loc_rooftop",
    name: "Urban Rooftop",
    accent: "#d97706",
    usage: "outdoor",
    description: "City rooftop terrace at dusk with skyline backdrop.",
    preservation: "Keep the skyline silhouette and parapet wall.",
    imageCount: 2,
    createdAt: T(12),
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

interface ResultSeed {
  id: string;
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
    id: "aurora_loft_1",
    brandId: "brand_aurora",
    productIds: ["prod_halsa_chair", "prod_lyse_lamp"],
    locationId: "loc_loft",
    settings: { visualizationType: "lifestyle-scene", aspectRatio: "4:5", visualStyle: "editorial", lighting: "natural" },
    notes: "Hero shot for the spring catalog landing page.",
    review: "approved",
    favorite: true,
    createdAt: T(6),
  },
  {
    id: "verde_patio_1",
    brandId: "brand_verde",
    productIds: ["prod_trail_table", "prod_summit_lantern"],
    locationId: "loc_patio",
    settings: { visualizationType: "lifestyle-scene", aspectRatio: "16:9", visualStyle: "documentary", lighting: "golden-hour", peopleInScene: "implied" },
    review: "draft",
    favorite: false,
    createdAt: T(3),
  },
  {
    id: "lumen_rooftop_1",
    brandId: "brand_lumen",
    productIds: ["prod_orb_pendant"],
    locationId: "loc_rooftop",
    settings: { visualizationType: "product-placement", aspectRatio: "1:1", visualStyle: "cinematic", lighting: "dramatic", brandVisibility: "bold" },
    notes: "Test dramatic dusk lighting.",
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
    const brand = brands.find((b) => b.id === seed.brandId);
    if (!brand) continue;
    const selectedProducts = products.filter((p) => seed.productIds.includes(p.id));
    const location = locations.find((l) => l.id === seed.locationId);
    const defaultLogo = brand.logos.find((l) => l.id === brand.defaultLogoId);
    const mainImage = location?.images.find((i) => i.id === location.mainImageId) ?? location?.images[0];
    const settings: GenerationSettings = { ...DEFAULT_GENERATION_SETTINGS, ...seed.settings };

    const instructions = composeInstructions({
      brand,
      logo: defaultLogo,
      products: selectedProducts,
      location,
      mainLocationImage: mainImage,
      settings,
      notes: seed.notes,
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
      notes: seed.notes,
    };

    const jobId = `job_${seed.id}`;
    const requestId = `req_${seed.id}`;
    const resultId = `res_${seed.id}`;
    const image = asset(
      `resimg_${seed.id}`,
      scenePlaceholderDataUrl({
        label: brand.name,
        sublabel: location?.name ?? "Generated mockup",
        accent: brand.accentColor,
        width: 1400,
        height: 1400,
        seed: seed.id.length * 5,
      }),
      `${brand.name} mockup`,
      1400,
      1400,
      seed.createdAt,
    );

    results.push({
      id: resultId,
      jobId,
      requestId,
      image,
      index: 0,
      seed: seed.id.length * 11,
      review: seed.review,
      favorite: seed.favorite,
      snapshot,
      createdAt: seed.createdAt,
      updatedAt: seed.createdAt,
    });

    jobs.push({
      id: jobId,
      request: {
        id: requestId,
        brandId: brand.id,
        logoId: defaultLogo?.id,
        productIds: selectedProducts.map((p) => p.id),
        locationId: location?.id,
        mainLocationImageId: mainImage?.id,
        uploadedAssets: [],
        settings,
        instructions,
        notes: seed.notes,
        createdAt: seed.createdAt,
      },
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
  cached = { brands, products, locations, jobs, results };
  return cached;
}
