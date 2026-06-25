import type { EntityStatus, ID, ImageAsset, Timestamps } from "./common";

export type LocationUsage = "indoor" | "outdoor";

export interface Location extends Timestamps {
  id: ID;
  name: string;
  /** Optional brand association for filtering; locations can be shared. */
  brandId?: ID;
  usage: LocationUsage;
  images: ImageAsset[];
  /** Id of the chosen main image among `images`. */
  mainImageId?: ID;
  description?: string;
  /** Architecture / scene preservation instructions. */
  preservationInstructions?: string;
  /** Whether this location was saved for reuse. */
  saved: boolean;
  /** active | archived. Archived locations are hidden from new-generation pickers
   *  but stay available to historical Gallery results. Defaults to active. */
  status?: EntityStatus;
}

export const LOCATION_USAGE_LABELS: Record<LocationUsage, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
};
