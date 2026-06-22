import type { GenerationSettings, ID, LocationDraftSnapshot } from "@/lib/domain";

/**
 * One-shot prefill payload handed to Studio when opening it from elsewhere
 * (Home quick-start, Gallery "Duplicate setup" / "Regenerate" / "Create
 * variation"). Stored in sessionStorage so it survives the navigation but not a
 * long-term refresh; Studio consumes and clears it on mount.
 */
export interface StudioPrefill {
  brandId?: ID;
  logoId?: ID;
  productIds?: ID[];
  locationId?: ID;
  mainLocationImageId?: ID;
  /** An unsaved location to restore as a new-location draft in Studio. */
  locationDraft?: LocationDraftSnapshot;
  settings?: Partial<GenerationSettings>;
  notes?: string;
  /** Free-form origin label for analytics/debugging. */
  source?: string;
}

const KEY = "web-vision:v1:studio-prefill";

export const studioPrefill = {
  set(prefill: StudioPrefill): void {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(prefill));
    } catch {
      /* ignore */
    }
  },

  /** Read and clear the pending prefill, if any. */
  consume(): StudioPrefill | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(KEY);
      if (!raw) return null;
      window.sessionStorage.removeItem(KEY);
      return JSON.parse(raw) as StudioPrefill;
    } catch {
      return null;
    }
  },
};
