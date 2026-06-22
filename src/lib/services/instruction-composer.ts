import type {
  Brand,
  ComposedInstructions,
  GenerationRequest,
  GenerationSettings,
  ImageAsset,
  InstructionSection,
  Location,
  LogoAsset,
  Product,
  UploadedAssetRef,
} from "@/lib/domain";
import {
  CONTROL_LABELS,
  creativityLabel,
} from "@/lib/domain";
import { newId, nowIso } from "@/lib/ids";

/**
 * Global system instructions applied to every generation request. Centralized
 * here (not concatenated inside UI components) so behavior is consistent and
 * editable in one place.
 */
export const GLOBAL_SYSTEM_INSTRUCTIONS =
  "You are Web Vision, an internal visual generation engine producing realistic, " +
  "high-fidelity client mockups for the Malahi team. Render photographically plausible " +
  "scenes that respect the supplied brand identity, product geometry, and location " +
  "architecture. Never invent competing logos or brand marks. Keep product proportions, " +
  "materials, and colors faithful to the provided references.";

/** Inputs collected by Studio and passed to the composer. */
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
        logo.instructions ? logo.instructions : "Render the logo crisply with adequate clear space; do not distort it.",
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  sections.push({ key: "product", label: "Products", content: describeProducts(products) });
  sections.push({ key: "location", label: "Location", content: describeLocation(location, mainLocationImage) });
  sections.push({ key: "controls", label: "Generation controls", content: describeSettings(settings) });

  if (notes && notes.trim()) {
    sections.push({ key: "notes", label: "Notes", content: notes.trim() });
  }

  const text = sections.map((s) => `## ${s.label}\n${s.content}`).join("\n\n");
  return { sections, text };
}

/** Assemble a fully typed GenerationRequest from Studio inputs. */
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
