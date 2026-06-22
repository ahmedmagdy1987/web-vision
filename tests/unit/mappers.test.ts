import { describe, it, expect } from "vitest";
import {
  brandFromRow,
  filenameFromPath,
  jobStatusFromDb,
  productFromRow,
  resultFromRow,
  slugify,
  type SignUrl,
} from "@/lib/repositories/supabase/mappers";
import type {
  BrandAssetRow,
  BrandRow,
  GenerationResultRow,
  Json,
  ProductAssetRow,
  ProductRow,
} from "@/lib/supabase/database.types";

const sign: SignUrl = (p) => `signed:${p}`;

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Malahi Arcade")).toBe("malahi-arcade");
  });
  it("strips punctuation and collapses separators", () => {
    expect(slugify("  Hyper!! Drive  ")).toBe("hyper-drive");
  });
  it("falls back to 'item' for empty/punctuation-only input", () => {
    expect(slugify("   ")).toBe("item");
    expect(slugify("!!!")).toBe("item");
  });
});

describe("jobStatusFromDb", () => {
  it("maps the DB superset to the 4 domain statuses", () => {
    expect(jobStatusFromDb("draft")).toBe("queued");
    expect(jobStatusFromDb("cancelled")).toBe("failed");
    expect(jobStatusFromDb("queued")).toBe("queued");
    expect(jobStatusFromDb("processing")).toBe("processing");
    expect(jobStatusFromDb("completed")).toBe("completed");
    expect(jobStatusFromDb("failed")).toBe("failed");
  });
});

describe("filenameFromPath", () => {
  it("returns the last path segment", () => {
    expect(filenameFromPath("organizations/o/brands/b/x.png")).toBe("x.png");
    expect(filenameFromPath("single")).toBe("single");
  });
});

describe("brandFromRow", () => {
  const brand: BrandRow = {
    id: "b1",
    organization_id: "o1",
    name: "Acme",
    slug: "acme",
    description: null,
    accent_color: "#6d28d9",
    instructions: "be bold",
    status: "active",
    default_logo_id: "a1",
    created_by: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
  };
  const asset: BrandAssetRow = {
    id: "a1",
    brand_id: "b1",
    asset_type: "primary",
    name: "logo.png",
    storage_bucket: "web-vision",
    storage_path: "organizations/o1/brands/b1/a1.png",
    mime_type: "image/png",
    width: 100,
    height: 100,
    size_bytes: 1234,
    is_default: true,
    status: "active",
    instructions: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("maps columns and signs logo asset urls", () => {
    const result = brandFromRow(brand, [asset], sign);
    expect(result.id).toBe("b1");
    expect(result.accentColor).toBe("#6d28d9");
    expect(result.instructions).toBe("be bold");
    expect(result.description).toBeUndefined();
    expect(result.defaultLogoId).toBe("a1");
    expect(result.logos).toHaveLength(1);
    expect(result.logos[0].kind).toBe("primary");
    expect(result.logos[0].asset.url).toBe("signed:organizations/o1/brands/b1/a1.png");
    expect(result.logos[0].asset.width).toBe(100);
  });
});

describe("productFromRow", () => {
  const product: ProductRow = {
    id: "p1",
    organization_id: "o1",
    brand_id: "b1",
    category_id: "c1",
    name: "Hyperdrive",
    slug: "hyperdrive",
    description: null,
    dimensions: null,
    usage: "both",
    tags: ["arcade"],
    preservation_instructions: null,
    status: "active",
    created_by: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const main: ProductAssetRow = {
    id: "pa1",
    product_id: "p1",
    asset_role: "main",
    storage_bucket: "web-vision",
    storage_path: "organizations/o1/products/p1/pa1.png",
    mime_type: "image/png",
    width: null,
    height: null,
    size_bytes: null,
    sort_order: 0,
    is_primary: true,
    created_by: null,
    created_at: "2026-01-01T00:00:00.000Z",
  };
  const ref: ProductAssetRow = { ...main, id: "pa2", storage_path: "organizations/o1/products/p1/pa2.png", is_primary: false, asset_role: "reference", sort_order: 1 };

  it("applies the category name and splits main/reference images", () => {
    const result = productFromRow(product, [ref, main], "Arcade", sign);
    expect(result.category).toBe("Arcade");
    expect(result.tags).toEqual(["arcade"]);
    expect(result.mainImage?.url).toBe("signed:organizations/o1/products/p1/pa1.png");
    expect(result.referenceImages).toHaveLength(1);
    expect(result.referenceImages[0].id).toBe("pa2");
  });

  it("defaults category to empty string when unknown", () => {
    const result = productFromRow(product, [], undefined, sign);
    expect(result.category).toBe("");
    expect(result.mainImage).toBeUndefined();
  });
});

describe("resultFromRow", () => {
  const snapshot = {
    brandId: "b1",
    brandName: "Acme",
    brandAccent: "#fff",
    productIds: [],
    productNames: [],
    settings: {},
    instructions: { sections: [], text: "" },
  } as unknown as Json;

  const row: GenerationResultRow = {
    id: "r1",
    job_id: "j1",
    organization_id: "o1",
    storage_bucket: "web-vision",
    storage_path: "organizations/o1/results/j1/r1.svg",
    mime_type: "image/svg+xml",
    width: 1280,
    height: 720,
    aspect_ratio: "16:9",
    seed: 175,
    result_index: 0,
    review_status: "approved",
    is_favorite: true,
    snapshot,
    provider_metadata: { requestId: "req1" },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("maps the result and signs the image url", () => {
    const result = resultFromRow(row, sign);
    expect(result.id).toBe("r1");
    expect(result.jobId).toBe("j1");
    expect(result.requestId).toBe("req1");
    expect(result.review).toBe("approved");
    expect(result.favorite).toBe(true);
    expect(result.seed).toBe(175);
    expect(result.image.url).toBe("signed:organizations/o1/results/j1/r1.svg");
    expect(result.image.name).toContain("Acme");
  });
});
