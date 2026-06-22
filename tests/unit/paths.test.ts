import { describe, it, expect } from "vitest";
import {
  brandAssetPath,
  extensionForMime,
  locationAssetPath,
  orgIdFromPath,
  productAssetPath,
  resultPath,
  sanitizeSegment,
} from "@/lib/storage/paths";

describe("extensionForMime", () => {
  it("maps known mimes and falls back to bin", () => {
    expect(extensionForMime("image/png")).toBe("png");
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("image/svg+xml")).toBe("svg");
    expect(extensionForMime("application/zip")).toBe("bin");
  });
});

describe("sanitizeSegment", () => {
  it("rejects traversal and empty segments", () => {
    expect(() => sanitizeSegment("..")).toThrow();
    expect(() => sanitizeSegment(".")).toThrow();
    expect(() => sanitizeSegment("")).toThrow();
  });
  it("neutralizes separators so no traversal is possible", () => {
    // '/' is stripped, collapsing the segment to a safe single token.
    expect(sanitizeSegment("a/b")).toBe("ab");
    expect(sanitizeSegment("../../etc")).toBe("....etc");
  });
  it("keeps a valid uuid-like segment", () => {
    expect(sanitizeSegment("123e4567-e89b-12d3-a456-426614174000")).toBe("123e4567-e89b-12d3-a456-426614174000");
  });
  it("strips disallowed characters", () => {
    expect(sanitizeSegment("a b!c")).toBe("abc");
  });
});

describe("asset paths", () => {
  it("builds org-scoped, extensioned paths", () => {
    expect(brandAssetPath("o1", "b1", "a1", "image/png")).toBe("organizations/o1/brands/b1/a1.png");
    expect(productAssetPath("o1", "p1", "a1", "image/jpeg")).toBe("organizations/o1/products/p1/a1.jpg");
    expect(locationAssetPath("o1", "l1", "a1", "image/webp")).toBe("organizations/o1/locations/l1/a1.webp");
    expect(resultPath("o1", "j1", "r1", "image/svg+xml")).toBe("organizations/o1/results/j1/r1.svg");
  });
});

describe("orgIdFromPath", () => {
  it("extracts the org id from an org-scoped path", () => {
    expect(orgIdFromPath("organizations/o1/brands/b1/a1.png")).toBe("o1");
  });
  it("returns null for non-org paths", () => {
    expect(orgIdFromPath("misc/x.png")).toBeNull();
    expect(orgIdFromPath("organizations")).toBeNull();
  });
});
