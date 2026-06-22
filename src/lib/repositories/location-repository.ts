import type { ID, ImageAsset, Location, LocationUsage } from "@/lib/domain";
import { newId, nowIso } from "@/lib/ids";
import { buildSeed } from "@/lib/seed/seed-data";
import { ObservableCollection } from "./observable-store";

export interface LocationInput {
  name: string;
  brandId?: ID;
  usage: LocationUsage;
  images: ImageAsset[];
  mainImageId?: ID;
  description?: string;
  preservationInstructions?: string;
  saved?: boolean;
}

export class LocationRepository extends ObservableCollection<Location> {
  constructor() {
    super("locations", () => buildSeed().locations);
  }

  addLocation(input: LocationInput): Location {
    const ts = nowIso();
    return this.create({
      id: newId("loc"),
      name: input.name.trim(),
      brandId: input.brandId,
      usage: input.usage,
      images: input.images,
      mainImageId: input.mainImageId ?? input.images[0]?.id,
      description: input.description?.trim() || undefined,
      preservationInstructions: input.preservationInstructions?.trim() || undefined,
      saved: input.saved ?? true,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  updateLocation(id: ID, input: Partial<LocationInput>): Location | undefined {
    return this.update(id, (l) => ({
      ...l,
      ...input,
      name: input.name?.trim() ?? l.name,
      updatedAt: nowIso(),
    }));
  }

  setMainImage(id: ID, imageId: ID): Location | undefined {
    return this.update(id, (l) => ({ ...l, mainImageId: imageId, updatedAt: nowIso() }));
  }
}

export const locationRepository = new LocationRepository();
