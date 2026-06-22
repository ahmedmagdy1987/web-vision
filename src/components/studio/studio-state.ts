import type { GenerationSettings, ImageAsset, LocationUsage } from "@/lib/domain";
import { DEFAULT_GENERATION_SETTINGS } from "@/lib/domain";
import type { StudioPrefill } from "@/lib/store/studio-draft";

export interface NewLocationDraft {
  name: string;
  usage: LocationUsage;
  images: ImageAsset[];
  mainImageId: string | null;
  description: string;
  preservationInstructions: string;
  save: boolean;
}

export interface StudioState {
  brandId: string | null;
  logoId: string | null;
  productIds: string[];
  locationMode: "existing" | "new";
  locationId: string | null;
  /** Override for which image of the selected existing location is primary. */
  mainLocationImageId: string | null;
  newLocation: NewLocationDraft;
  settings: GenerationSettings;
  notes: string;
}

export const emptyNewLocation: NewLocationDraft = {
  name: "",
  usage: "indoor",
  images: [],
  mainImageId: null,
  description: "",
  preservationInstructions: "",
  save: true,
};

export function createInitialState(prefill: StudioPrefill | null): StudioState {
  const draft = prefill?.locationDraft;
  return {
    brandId: prefill?.brandId ?? null,
    logoId: prefill?.logoId ?? null,
    productIds: prefill?.productIds ?? [],
    // An unsaved-location handoff restores the new-location workflow.
    locationMode: draft ? "new" : "existing",
    locationId: draft ? null : prefill?.locationId ?? null,
    mainLocationImageId: prefill?.mainLocationImageId ?? null,
    newLocation: draft
      ? {
          name: draft.name,
          usage: draft.usage,
          images: draft.images,
          mainImageId: draft.mainImageId ?? draft.images[0]?.id ?? null,
          description: draft.description ?? "",
          preservationInstructions: draft.preservationInstructions ?? "",
          save: false,
        }
      : { ...emptyNewLocation },
    settings: { ...DEFAULT_GENERATION_SETTINGS, ...(prefill?.settings ?? {}) },
    notes: prefill?.notes ?? "",
  };
}

export type StudioAction =
  | { type: "set-brand"; brandId: string }
  | { type: "set-logo"; logoId: string | null }
  | { type: "toggle-product"; productId: string }
  | { type: "set-products"; productIds: string[] }
  | { type: "set-location-mode"; mode: "existing" | "new" }
  | { type: "set-location"; locationId: string | null }
  | { type: "set-main-location-image"; imageId: string }
  | { type: "update-new-location"; patch: Partial<NewLocationDraft> }
  | { type: "set-settings"; patch: Partial<GenerationSettings> }
  | { type: "set-notes"; notes: string }
  | { type: "reset" };

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case "set-brand":
      // Changing brand invalidates the logo and product selection.
      return { ...state, brandId: action.brandId, logoId: null, productIds: [] };
    case "set-logo":
      return { ...state, logoId: action.logoId };
    case "toggle-product": {
      const exists = state.productIds.includes(action.productId);
      return {
        ...state,
        productIds: exists
          ? state.productIds.filter((id) => id !== action.productId)
          : [...state.productIds, action.productId],
      };
    }
    case "set-products":
      return { ...state, productIds: action.productIds };
    case "set-location-mode":
      return { ...state, locationMode: action.mode };
    case "set-location":
      return { ...state, locationId: action.locationId, mainLocationImageId: null };
    case "set-main-location-image":
      return { ...state, mainLocationImageId: action.imageId };
    case "update-new-location": {
      const next = { ...state.newLocation, ...action.patch };
      if (!next.images.some((img) => img.id === next.mainImageId)) {
        next.mainImageId = next.images[0]?.id ?? null;
      }
      return { ...state, newLocation: next };
    }
    case "set-settings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "set-notes":
      return { ...state, notes: action.notes };
    case "reset":
      return createInitialState(null);
    default:
      return state;
  }
}
