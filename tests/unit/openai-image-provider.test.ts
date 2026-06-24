import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  generateImageWithOpenAI,
  isRetryableProviderError,
  orderReferences,
  postProcessToFinal,
  type OpenAIImagesClient,
  type OpenAIReferenceImage,
  type OpenAIServerConfig,
} from "@/lib/services/image-adapter/openai-server";
import {
  estimateImageCostUsd,
  getMaxInputProducts,
  getReferenceLimit,
  openAiNativeSize,
  parseImageProvider,
  VALID_OPENAI_NATIVE_SIZES,
} from "@/lib/services/image-adapter/provider-config";
import { getImageAdapter } from "@/lib/services/image-adapter";

const CONFIG: OpenAIServerConfig = { apiKey: "test-key-never-real", model: "gpt-image-2", quality: "medium", outputFormat: "webp" };

function refs(): OpenAIReferenceImage[] {
  return [
    { role: "logo", file: "logo-bytes", name: "logo", mimeType: "image/png" },
    { role: "location", file: "loc-bytes", name: "loc", mimeType: "image/png" },
    { role: "product", file: "prod-bytes", name: "prod", mimeType: "image/png" },
  ];
}

function okClient(capture?: (body: Record<string, unknown>) => void): OpenAIImagesClient {
  return {
    images: {
      edit: async (body) => {
        capture?.(body);
        return { data: [{ b64_json: "QUJD" }], usage: { total_tokens: 10 }, _request_id: "req_123" };
      },
    },
  };
}

describe("provider selection (server-authoritative, no silent fallback)", () => {
  it("parses mock/openai and rejects unknown values", () => {
    expect(parseImageProvider("mock")).toBe("mock");
    expect(parseImageProvider(" OpenAI ")).toBe("openai");
    expect(() => parseImageProvider("gemini")).toThrow();
  });
  it("the in-browser adapter is always mock (OpenAI runs server-side only)", () => {
    expect(getImageAdapter().name).toBe("mock");
  });
});

describe("native sizes are always valid Images Edit sizes", () => {
  it("maps each aspect to one of the supported native sizes", () => {
    for (const ratio of ["1:1", "4:5", "16:9", "9:16", "4:3", "3:2", "2:3"] as const) {
      expect(VALID_OPENAI_NATIVE_SIZES).toContain(openAiNativeSize(ratio).size);
    }
    expect(openAiNativeSize("1:1").size).toBe("1024x1024");
    expect(openAiNativeSize("4:5").size).toBe("1024x1536");
    expect(openAiNativeSize("16:9").size).toBe("1536x1024");
    expect(openAiNativeSize("9:16").size).toBe("1024x1536");
  });
});

describe("postProcessToFinal (sharp) → exact final dimensions", () => {
  async function native(ratio: "1:1" | "4:5" | "16:9" | "9:16") {
    const n = openAiNativeSize(ratio);
    return sharp({ create: { width: n.width, height: n.height, channels: 3, background: { r: 10, g: 120, b: 110 } } })
      .webp()
      .toBuffer();
  }
  const expected: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "4:5": { width: 1024, height: 1280 },
    "16:9": { width: 1536, height: 864 },
    "9:16": { width: 864, height: 1536 },
  };
  for (const ratio of ["1:1", "4:5", "16:9", "9:16"] as const) {
    it(`crops ${ratio} to ${expected[ratio].width}x${expected[ratio].height}`, async () => {
      const out = await postProcessToFinal(await native(ratio), ratio, "webp");
      expect({ width: out.width, height: out.height }).toEqual(expected[ratio]);
      const meta = await sharp(out.buffer).metadata();
      expect({ width: meta.width, height: meta.height }).toEqual(expected[ratio]);
      expect(out.mimeType).toBe("image/webp");
    });
  }
});

describe("input ordering + validation", () => {
  it("orders location → product → logo and validates required images", () => {
    expect(orderReferences(refs()).map((r) => r.role)).toEqual(["location", "product", "logo"]);
    expect(() => orderReferences([{ role: "logo", file: "x", name: "l", mimeType: "image/png" }])).toThrow(/location/i);
  });
});

describe("generateImageWithOpenAI (mocked client)", () => {
  it("sends a valid native size + input_fidelity high + ordered images", async () => {
    let body: Record<string, unknown> = {};
    const out = await generateImageWithOpenAI(okClient((b) => (body = b)), CONFIG, {
      prompt: "PROMPT",
      aspectRatio: "4:5",
      references: refs(),
    });
    expect(body.size).toBe("1024x1536");
    expect(VALID_OPENAI_NATIVE_SIZES).toContain(body.size as string);
    expect(body.input_fidelity).toBe("high");
    expect(body.quality).toBe("medium");
    expect(body.n).toBe(1);
    expect(body.image).toEqual(["loc-bytes", "prod-bytes", "logo-bytes"]);
    expect(out.nativeSize).toBe("1024x1536");
    expect(out.nativeWidth).toBe(1024);
    expect(out.inputFidelity).toBe("high");
    expect(out.requestId).toBe("req_123");
  });

  it("retries a transient error then succeeds", async () => {
    let calls = 0;
    const client: OpenAIImagesClient = {
      images: {
        edit: async () => {
          calls++;
          if (calls === 1) throw new Error("transient");
          return { data: [{ b64_json: "QUJD" }] };
        },
      },
    };
    const out = await generateImageWithOpenAI(client, CONFIG, { prompt: "P", aspectRatio: "1:1", references: refs() }, { maxAttempts: 2 });
    expect(calls).toBe(2);
    expect(out.base64).toBe("QUJD");
  });

  it("does NOT retry a 4xx (content-policy / invalid-request)", async () => {
    let calls = 0;
    const client: OpenAIImagesClient = {
      images: {
        edit: async () => {
          calls++;
          throw Object.assign(new Error("invalid"), { status: 400 });
        },
      },
    };
    await expect(
      generateImageWithOpenAI(client, CONFIG, { prompt: "P", aspectRatio: "1:1", references: refs() }, { maxAttempts: 3 }),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("retries a 5xx within the bound", async () => {
    expect(isRetryableProviderError(Object.assign(new Error("x"), { status: 503 }))).toBe(true);
    expect(isRetryableProviderError(Object.assign(new Error("x"), { status: 429 }))).toBe(true);
    expect(isRetryableProviderError(Object.assign(new Error("x"), { status: 400 }))).toBe(false);
  });

  it("aborts when the signal is already aborted", async () => {
    const c = new AbortController();
    c.abort();
    await expect(
      generateImageWithOpenAI(okClient(), CONFIG, { prompt: "P", aspectRatio: "1:1", references: refs() }, { signal: c.signal }),
    ).rejects.toThrow(/abort/i);
  });
});

describe("config helpers", () => {
  it("caps are positive + cost is non-zero", () => {
    expect(getMaxInputProducts()).toBeGreaterThan(0);
    expect(getReferenceLimit()).toBeGreaterThan(0);
    expect(estimateImageCostUsd("medium", 1)).toBeGreaterThan(0);
  });
});
