import type { ID, Location } from "@/lib/domain";
import { newId, nowIso } from "@/lib/ids";
import { buildSeed } from "@/lib/seed/seed-data";
import { ObservableCollection } from "./observable-store";
import type { LocationInput, LocationRepositoryApi } from "./types";

export type { LocationInput } from "./types";

export class LocationRepository extends ObservableCollection<Location> implements LocationRepositoryApi {
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
