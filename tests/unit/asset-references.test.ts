import { describe, it, expect } from "vitest";
import {
  countLocationReferences,
  countLogoReferences,
  countProductReferences,
  isLocationReferenced,
  isLogoReferenced,
  isProductReferenced,
} from "@/lib/services/asset-references";
import type { GenerationResult } from "@/lib/domain";

function result(snapshot: Record<string, unknown>): GenerationResult {
  return {
    id: "r",
    jobId: "j",
    requestId: "req",
    image: { id: "i", url: "", name: "", mimeType: "image/webp", size: 0 },
    index: 0,
    review: "draft",
    favorite: false,
    createdAt: "",
    updatedAt: "",
    snapshot: {
      brandId: "b",
      brandName: "B",
      brandAccent: "#000000",
      productIds: [],
      productNames: [],
      settings: {},
      instructions: { sections: [], text: "" },
      ...snapshot,
    },
  } as unknown as GenerationResult;
}

describe("asset reference detection (archive-vs-delete safety)", () => {
  const results = [
    result({ productIds: ["p1", "p2"], locationId: "loc1", logoId: "logo1" }),
    result({ productIds: ["p3"], locationId: "loc2" }),
  ];

  it("detects referenced products", () => {
    expect(isProductReferenced(results, "p1")).toBe(true);
    expect(isProductReferenced(results, "p3")).toBe(true);
    expect(isProductReferenced(results, "pX")).toBe(false);
  });
  it("detects referenced locations", () => {
    expect(isLocationReferenced(results, "loc1")).toBe(true);
    expect(isLocationReferenced(results, "locX")).toBe(false);
  });
  it("detects referenced logos", () => {
    expect(isLogoReferenced(results, "logo1")).toBe(true);
    expect(isLogoReferenced(results, "logoX")).toBe(false);
  });
  it("returns false against an empty history (safe to delete)", () => {
    expect(isProductReferenced([], "p1")).toBe(false);
    expect(isLocationReferenced([], "loc1")).toBe(false);
    expect(isLogoReferenced([], "logo1")).toBe(false);
  });

  it("counts how many historical mockups reference an asset", () => {
    const multi = [
      result({ productIds: ["p1", "p2"], locationId: "loc1", logoId: "logo1" }),
      result({ productIds: ["p1"], locationId: "loc1", logoId: "logo1" }),
      result({ productIds: ["p3"], locationId: "loc2" }),
    ];
    expect(countProductReferences(multi, "p1")).toBe(2);
    expect(countProductReferences(multi, "p2")).toBe(1);
    expect(countProductReferences(multi, "pX")).toBe(0);
    expect(countLocationReferences(multi, "loc1")).toBe(2);
    expect(countLocationReferences(multi, "loc2")).toBe(1);
    expect(countLogoReferences(multi, "logo1")).toBe(2);
    expect(countLogoReferences(multi, "logoX")).toBe(0);
    expect(countProductReferences([], "p1")).toBe(0);
  });
});
