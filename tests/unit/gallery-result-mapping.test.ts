import { describe, it, expect } from "vitest";
import {
  DEFAULT_ACCENT,
  hexToRgb,
  isValidHexColor,
  readableForeground,
  safeAccent,
} from "@/lib/theme/brand-accent";
import { normalizeResultSnapshot, resultFromRow } from "@/lib/repositories/supabase/mappers";
import type { GenerationResultRow } from "@/lib/supabase/database.types";

describe("theme color utilities are null-safe", () => {
  it("hexToRgb never throws on absent/invalid input", () => {
    expect(hexToRgb(undefined)).toBeNull();
    expect(hexToRgb(null)).toBeNull();
    expect(hexToRgb("")).toBeNull();
    expect(hexToRgb("   ")).toBeNull();
    expect(hexToRgb("not-a-color")).toBeNull();
    expect(hexToRgb("#zzzzzz")).toBeNull();
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#0d9488")).toEqual({ r: 13, g: 148, b: 136 });
  });
  it("readableForeground tolerates absent/invalid colors", () => {
    expect(readableForeground(undefined)).toBe("#ffffff");
    expect(readableForeground(null)).toBe("#ffffff");
    expect(readableForeground("garbage")).toBe("#ffffff");
    expect(readableForeground("#ffffff")).toBe("#18181b");
  });
  it("safeAccent falls back to the Malahi default", () => {
    expect(safeAccent(undefined)).toBe(DEFAULT_ACCENT);
    expect(safeAccent(null)).toBe(DEFAULT_ACCENT);
    expect(safeAccent("")).toBe(DEFAULT_ACCENT);
    expect(safeAccent("garbage")).toBe(DEFAULT_ACCENT);
    expect(safeAccent("#7c3aed")).toBe("#7c3aed");
    expect(isValidHexColor(undefined)).toBe(false);
  });
});

describe("normalizeResultSnapshot", () => {
  it("fills safe defaults for an incomplete (OpenAI) snapshot", () => {
    const s = normalizeResultSnapshot({
      brandId: "b1",
      logoId: "l1",
      productIds: ["p1"],
      locationId: "loc1",
      settings: { aspectRatio: "4:5" },
    });
    expect(s.brandAccent).toBe(DEFAULT_ACCENT);
    expect(s.brandName).toBe("Mockup");
    expect(s.productNames).toEqual([]);
    expect(s.productIds).toEqual(["p1"]);
    expect(s.instructions).toEqual({ sections: [], text: "" });
  });
  it("never throws on null/garbage and still yields a valid accent", () => {
    expect(() => normalizeResultSnapshot(null)).not.toThrow();
    expect(() => normalizeResultSnapshot(undefined)).not.toThrow();
    expect(() => normalizeResultSnapshot(42)).not.toThrow();
    expect(normalizeResultSnapshot(null).brandAccent).toBe(DEFAULT_ACCENT);
    expect(normalizeResultSnapshot(null).productNames).toEqual([]);
  });
  it("preserves a complete (mock) snapshot", () => {
    const s = normalizeResultSnapshot({
      brandId: "b",
      brandName: "Malahi Arcade",
      brandAccent: "#7c3aed",
      productIds: ["p"],
      productNames: ["Galaxy Shooter"],
      locationName: "Grand Mall Atrium",
      settings: { aspectRatio: "1:1" },
    });
    expect(s.brandName).toBe("Malahi Arcade");
    expect(s.brandAccent).toBe("#7c3aed");
    expect(s.productNames).toEqual(["Galaxy Shooter"]);
    expect(s.locationName).toBe("Grand Mall Atrium");
  });
});

describe("resultFromRow — OpenAI + mock results both map safely", () => {
  const sign = (p: string) => `https://signed/${p}`;
  function row(over: Partial<GenerationResultRow>): GenerationResultRow {
    return {
      id: "r1",
      job_id: "j1",
      organization_id: "o",
      storage_bucket: "web-vision",
      storage_path: "path",
      mime_type: "image/webp",
      width: 1024,
      height: 1280,
      aspect_ratio: "4:5",
      seed: 0,
      result_index: 0,
      review_status: "draft",
      is_favorite: false,
      snapshot: {},
      provider_metadata: null,
      project_id: null,
      created_at: "2026-06-25T00:00:00Z",
      updated_at: "2026-06-25T00:00:00Z",
      ...over,
    } as GenerationResultRow;
  }

  it("maps an OpenAI result (minimal snapshot) without crashing the card path", () => {
    const r = resultFromRow(
      row({ snapshot: { brandId: "b", logoId: "l", productIds: ["p"], locationId: "loc", settings: { aspectRatio: "4:5" } } as never }),
      sign,
    );
    expect(r.snapshot.brandAccent).toBe(DEFAULT_ACCENT);
    expect(r.snapshot.brandName).toBe("Mockup");
    expect(r.snapshot.productNames).toEqual([]);
    expect(r.image.mimeType).toBe("image/webp");
    expect(r.image.width).toBe(1024);
    expect(r.image.height).toBe(1280);
    // The two operations that crashed the Gallery must now be safe.
    expect(() => readableForeground(r.snapshot.brandAccent)).not.toThrow();
    expect(() => r.snapshot.brandName.slice(0, 1)).not.toThrow();
  });

  it("maps a mock result (full snapshot) preserving its values", () => {
    const r = resultFromRow(
      row({
        mime_type: "image/svg+xml",
        snapshot: {
          brandId: "b",
          brandName: "Malahi Arcade",
          brandAccent: "#7c3aed",
          productIds: ["p"],
          productNames: ["Galaxy Shooter"],
          locationName: "Grand Mall Atrium",
          settings: { aspectRatio: "1:1" },
        } as never,
      }),
      sign,
    );
    expect(r.snapshot.brandName).toBe("Malahi Arcade");
    expect(r.snapshot.brandAccent).toBe("#7c3aed");
    expect(r.image.mimeType).toBe("image/svg+xml"); // mock → SVG → Mock badge
  });
});
