import type {
  Brand,
  ComposedInstructions,
  GenerationRequest,
  GenerationSettings,
  ImageAsset,
  InstructionSection,
  Location,
  LogoAsset,
  Placement,
  Product,
  UploadedAssetRef,
  VisualStyle,
} from "@/lib/domain";
import { CONTROL_LABELS, creativityLabel } from "@/lib/domain";
import { newId, nowIso } from "@/lib/ids";

/**
 * Global system instructions applied to every generation request. Centralized
 * here (not concatenated inside UI components) so behavior is consistent and
 * editable in one place. The employee picks a few simple options; the composer
 * expands them into the sophisticated, provider-ready instructions below.
 */
export const GLOBAL_SYSTEM_INSTRUCTIONS =
  "You are the Malahi mockup engine, an internal visual-generation system producing realistic, " +
  "high-fidelity product-placement mockups for the Malahi team. Render photographically plausible " +
  "scenes that respect the supplied logo, product geometry and location architecture. Never invent " +
  "competing logos or brand marks. Keep product proportions, materials and colors faithful to the " +
  "provided references.";

// ---- Permanent preservation & safety constraints (non-negotiable) ----------

const LOCATION_PRESERVATION =
  "Location: preserve the existing scene exactly — keep the architecture, walls, ceiling, flooring, " +
  "windows, doors, signage, structural features, fixed fixtures and the original camera position, " +
  "perspective and field of view. Do not redesign the location or replace it with a different " +
  "environment. Remove existing objects only when an option explicitly requests it.";

const PRODUCT_PRESERVATION =
  "Products: preserve each product's exact form, geometry, proportions, materials, colors, distinctive " +
  "parts and branding areas. Do not redesign or invent a substitute product, do not merge multiple " +
  "products into one object, and do not duplicate a product unless the requested quantity requires it. " +
  "Use all provided product reference images to maximize fidelity.";

const PLACEMENT_REALISM =
  "Placement: place products at a physically believable scale that respects the floor plane and scene " +
  "perspective. Produce realistic contact shadows, match the scene's lighting direction, intensity and " +
  "color temperature, and use natural occlusion. Prevent floating objects and prevent products from " +
  "intersecting walls, floors, furniture or one another. Keep walkways and architecture plausible.";

const LOGO_APPLICATION =
  "Logo: preserve the selected logo exactly — do not rewrite, translate, rotate, mirror, distort, crop " +
  "or hallucinate its lettering. Apply the logo only to suitable, visible product surfaces or display " +
  "panels with believable printing, engraving, signage or screen rendering. Never place the logo on " +
  "walls, ceilings or unrelated surfaces, and avoid duplicate or unnecessary logo applications.";

// ---- Employee control → detailed instruction translation -------------------

/** Auto/Center/Left/Right (and structural placements) → strong spatial guidance. */
const PLACEMENT_GUIDANCE: Record<Placement, string> = {
  auto: "Choose the most natural, physically plausible placement given the scene's layout, traffic flow and sightlines.",
  center: "Compose the hero product(s) around the central axis of the frame, balanced within the scene rather than pixel-centered.",
  left: "Weight the product(s) toward the left third of the composition while keeping the scene's perspective and balance intact.",
  right: "Weight the product(s) toward the right third of the composition while keeping the scene's perspective and balance intact.",
  foreground: "Bring the product(s) into the foreground as the focal subject, with the location reading clearly behind.",
  background: "Set the product(s) deeper in the scene as part of the environment, at a believable distance and scale.",
  "wall-mounted": "Mount the product(s) on a suitable wall surface at a realistic height, flush and properly supported.",
  shelf: "Position the product(s) on appropriate shelving or display units consistent with the scene.",
  "floor-standing": "Stand the product(s) on the floor plane with correct contact shadows and footprint.",
};

/** Each style preset → detailed internal visual instruction. */
const VISUAL_STYLE_GUIDANCE: Record<VisualStyle, string> = {
  photorealistic:
    "Photorealistic rendering with true-to-life materials, accurate optics and natural depth of field; no illustration or stylization.",
  cinematic:
    "Cinematic treatment: dramatic directional lighting, gentle filmic contrast and color grading, shallow depth of field and a widescreen sensibility.",
  editorial:
    "Polished editorial/advertising look: clean staging, balanced negative space, crisp focus and magazine-grade lighting.",
  minimal:
    "Minimal, uncluttered composition with a restrained palette, soft even light and generous breathing room around the subject.",
  vibrant:
    "Vibrant, energetic look with saturated yet believable colors, lively contrast and bright, punchy lighting.",
  luxury:
    "Premium, high-end feel: muted refined palette, rich materials, soft directional key light and elegant negative space.",
  documentary:
    "Candid documentary realism: natural available light, authentic textures and an unstaged, true-to-place atmosphere.",
};

/** Inputs collected by the generator and passed to the composer. */
export interface ComposeInput {
  brand: Brand;
  logo?: LogoAsset;
  products: Product[];
  location?: Location;
  mainLocationImage?: ImageAsset;
  uploadedAssets?: UploadedAssetRef[];
  settings: GenerationSettings;
  notes?: string;
}

/** Compact, machine-readable echo of the chosen settings (traceability). */
function describeSettings(settings: GenerationSettings): string {
  const parts = [
    `Visualization type: ${CONTROL_LABELS.visualizationType[settings.visualizationType]}`,
    `Placement: ${CONTROL_LABELS.placement[settings.placement]}`,
    `Camera angle: ${CONTROL_LABELS.cameraAngle[settings.cameraAngle]}`,
    `Environment: ${CONTROL_LABELS.environmentType[settings.environmentType]}`,
    `Lighting: ${CONTROL_LABELS.lighting[settings.lighting]}`,
    `Visual style: ${CONTROL_LABELS.visualStyle[settings.visualStyle]}`,
    `Aspect ratio: ${settings.aspectRatio}`,
    `Output count: ${settings.outputCount}`,
    `Product scale: ${CONTROL_LABELS.productScale[settings.productScale]}`,
    `Brand visibility: ${CONTROL_LABELS.brandVisibility[settings.brandVisibility]}`,
    `People in scene: ${CONTROL_LABELS.peopleInScene[settings.peopleInScene]}`,
    `Preserve architecture: ${settings.preserveArchitecture ? "yes" : "no"}`,
    `Remove existing objects: ${settings.removeExistingObjects ? "yes" : "no"}`,
    `Creativity: ${creativityLabel(settings.creativity)} (${settings.creativity}/100)`,
  ];
  return parts.join("\n");
}

/** Rich composition guidance translated from the employee's simple choices. */
function describeComposition(settings: GenerationSettings): string {
  const lines = [
    `Visual style — ${CONTROL_LABELS.visualStyle[settings.visualStyle]}: ${VISUAL_STYLE_GUIDANCE[settings.visualStyle]}`,
    `Placement — ${CONTROL_LABELS.placement[settings.placement]}: ${PLACEMENT_GUIDANCE[settings.placement]}`,
    `Lighting: render with ${CONTROL_LABELS.lighting[settings.lighting].toLowerCase()} lighting, matched to the scene.`,
    `Camera: ${CONTROL_LABELS.cameraAngle[settings.cameraAngle].toLowerCase()} angle; keep the source perspective and field of view.`,
    `Product scale: ${CONTROL_LABELS.productScale[settings.productScale].toLowerCase()} presence in the frame.`,
    `Brand visibility: ${CONTROL_LABELS.brandVisibility[settings.brandVisibility].toLowerCase()}.`,
    `People in scene: ${CONTROL_LABELS.peopleInScene[settings.peopleInScene].toLowerCase()}.`,
    `Output: ${settings.outputCount} image(s) at ${settings.aspectRatio}. Interpretation latitude: ${creativityLabel(
      settings.creativity,
    )} (${settings.creativity}/100) — never at the expense of the preservation rules.`,
  ];
  return lines.join("\n");
}

/** The permanent, non-negotiable preservation/safety rules. */
function describePreservation(settings: GenerationSettings): string {
  const lines = [LOCATION_PRESERVATION, PRODUCT_PRESERVATION, PLACEMENT_REALISM, LOGO_APPLICATION];
  if (settings.preserveArchitecture) {
    lines.push(
      "Architecture lock is ON: do not alter the building structure, walls, windows, doors or fixed fixtures from the reference image.",
    );
  }
  lines.push(
    settings.removeExistingObjects
      ? "Existing movable objects MAY be cleared where they directly conflict with the requested placement."
      : "Do NOT remove or rearrange existing objects in the scene unless a product placement strictly requires the space.",
  );
  return lines.join("\n");
}

function describeProducts(products: Product[]): string {
  if (products.length === 0) return "No specific products selected.";
  return products
    .map((p) => {
      const bits: string[] = [`• ${p.name}`];
      if (p.category) bits.push(`category: ${p.category}`);
      if (p.dimensions) {
        const { width, height, depth, unit } = p.dimensions;
        const dims = [width, height, depth].filter((v) => v != null).join(" × ");
        if (dims) bits.push(`dimensions: ${dims} ${unit}`);
      }
      if (p.usage) bits.push(`usage: ${p.usage}`);
      const header = bits.join(", ");
      const detail = [p.description, p.preservationInstructions ? `Preserve: ${p.preservationInstructions}` : ""]
        .filter(Boolean)
        .join(" ");
      return detail ? `${header}\n  ${detail}` : header;
    })
    .join("\n");
}

function describeLocation(location: Location | undefined, mainImage: ImageAsset | undefined): string {
  if (!location) return "No location selected.";
  const lines = [`Location: ${location.name} (${location.usage}).`];
  if (location.description) lines.push(location.description);
  if (location.preservationInstructions) lines.push(`Preserve: ${location.preservationInstructions}`);
  if (mainImage) lines.push(`Primary reference image: ${mainImage.name}.`);
  return lines.join(" ");
}

/** Build the ordered, structured instruction sections. */
export function composeInstructions(input: ComposeInput): ComposedInstructions {
  const { brand, logo, products, location, mainLocationImage, settings, notes } = input;

  const sections: InstructionSection[] = [
    { key: "system", label: "System", content: GLOBAL_SYSTEM_INSTRUCTIONS },
    {
      key: "brand",
      label: "Brand",
      content: [
        `Brand: ${brand.name}.`,
        brand.description ? brand.description : "",
        `Accent color: ${brand.accentColor}.`,
        brand.instructions ? brand.instructions : "",
      ]
        .filter(Boolean)
        .join(" "),
    },
  ];

  if (logo) {
    sections.push({
      key: "logo",
      label: "Logo",
      content: [
        `Use the ${logo.kind} logo "${logo.asset.name}".`,
        logo.instructions || "",
        LOGO_APPLICATION,
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  sections.push({ key: "product", label: "Products", content: describeProducts(products) });
  sections.push({ key: "location", label: "Location", content: describeLocation(location, mainLocationImage) });
  sections.push({ key: "controls", label: "Generation controls", content: describeSettings(settings) });
  sections.push({ key: "composition", label: "Composition & style", content: describeComposition(settings) });
  sections.push({ key: "preservation", label: "Preservation & safety", content: describePreservation(settings) });

  if (notes && notes.trim()) {
    sections.push({
      key: "notes",
      label: "Employee notes",
      content:
        `${notes.trim()}\n\n` +
        "(Apply these notes only where they do not conflict with the preservation, product-integrity, " +
        "logo and safety rules above.)",
    });
  }

  const text = sections.map((s) => `## ${s.label}\n${s.content}`).join("\n\n");
  return { sections, text };
}

/** Assemble a fully typed GenerationRequest from the generator inputs. */
export function buildGenerationRequest(input: ComposeInput): GenerationRequest {
  const instructions = composeInstructions(input);
  return {
    id: newId("req"),
    brandId: input.brand.id,
    logoId: input.logo?.id,
    productIds: input.products.map((p) => p.id),
    locationId: input.location?.id,
    mainLocationImageId: input.mainLocationImage?.id ?? input.location?.mainImageId,
    uploadedAssets: input.uploadedAssets ?? [],
    settings: input.settings,
    instructions,
    notes: input.notes?.trim() || undefined,
    createdAt: nowIso(),
  };
}
