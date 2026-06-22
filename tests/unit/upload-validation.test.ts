import { describe, it, expect } from "vitest";
import { MAX_IMAGE_BYTES, validateImageFile } from "@/lib/upload";
import { dataUrlToBlob, validateUploadFile } from "@/lib/storage/storage-service";

function makeFile(bytes: number, name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("validateImageFile", () => {
  it("accepts a small png", () => {
    expect(validateImageFile(makeFile(16, "logo.png", "image/png")).ok).toBe(true);
  });
  it("rejects an unsupported type", () => {
    const result = validateImageFile(makeFile(16, "doc.pdf", "application/pdf"));
    expect(result.ok).toBe(false);
    expect(result.error).toContain("unsupported");
  });
  it("rejects a file over the size cap", () => {
    const result = validateImageFile(makeFile(MAX_IMAGE_BYTES + 1, "big.png", "image/png"));
    expect(result.ok).toBe(false);
    expect(result.error).toContain("too large");
  });
});

describe("validateUploadFile (defense-in-depth)", () => {
  it("accepts matching extension + mime", () => {
    expect(validateUploadFile(makeFile(16, "logo.png", "image/png")).ok).toBe(true);
    expect(validateUploadFile(makeFile(16, "photo.jpeg", "image/jpeg")).ok).toBe(true);
  });
  it("rejects an extension/mime mismatch", () => {
    const result = validateUploadFile(makeFile(16, "logo.png", "image/jpeg"));
    expect(result.ok).toBe(false);
    expect(result.error).toContain("does not match");
  });
});

describe("dataUrlToBlob", () => {
  it("decodes a base64 png data url to a Blob of the right type", () => {
    // 1x1 transparent png
    const dataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    const { blob, mimeType } = dataUrlToBlob(dataUrl);
    expect(mimeType).toBe("image/png");
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });
  it("throws on a non-data url", () => {
    expect(() => dataUrlToBlob("https://example.com/x.png")).toThrow();
  });
});
