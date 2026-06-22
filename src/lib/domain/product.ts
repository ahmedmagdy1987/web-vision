import type { EntityStatus, ID, ImageAsset, Timestamps } from "./common";

export type DimensionUnit = "mm" | "cm" | "m" | "in" | "ft";

export interface ProductDimensions {
  width?: number;
  height?: number;
  depth?: number;
  unit: DimensionUnit;
}

export type ProductUsage = "indoor" | "outdoor" | "both";

export interface Product extends Timestamps {
  id: ID;
  brandId: ID;
  name: string;
  category: string;
  tags: string[];
  description?: string;
  dimensions?: ProductDimensions;
  usage: ProductUsage;
  mainImage?: ImageAsset;
  referenceImages: ImageAsset[];
  /** What must be preserved about the product in any generated image. */
  preservationInstructions?: string;
  status: EntityStatus;
}

export const PRODUCT_USAGE_LABELS: Record<ProductUsage, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  both: "Indoor & Outdoor",
};

export const DIMENSION_UNITS: DimensionUnit[] = ["mm", "cm", "m", "in", "ft"];
