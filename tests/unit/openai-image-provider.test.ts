import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  classifyProviderError,
  generateImageWithOpenAI,
  isRetryableProviderError,
  OpenAIProviderError,
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
  openAiSize,
  OPENAI_SIZE_VALUES,
  parseImageProvider,
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

describe("exact direct GPT Image 2 sizes (no native+crop)", () => {
  it("maps each primary ratio to the exact requested size", () => {
    expect(openAiSize("1:1").size).toBe("1024x1024");
    expect(openAiSize("4:5").size).toBe("1024x1280");
    expect(openAiSize("16:9").size).toBe("1536x864");
    expect(openAiSize("9:16").size).toBe("864x1536");
  });
  it("every size has edges that are multiples of 16", () => {
    for (const ratio of ["1:1", "4:5", "16:9", "9:16", "4:3", "3:2", "2:3"] as const) {
      const s = openAiSize(ratio);
      expect(s.width % 16).toBe(0);
      expect(s.height % 16).toBe(0);
      expect(OPENAI_SIZE_VALUES).toContain(s.size);
    }
  });
});

describe("postProcessToFinal (sharp) → no crop, exact dimensions preserved", () => {
  const sizes: Array<["1:1" | "4:5" | "16:9" | "9:16", number, number]> = [
    ["1:1", 1024, 1024],
    ["4:5", 1024, 1280],
    ["16:9", 1536, 864],
    ["9:16", 864, 1536],
  ];
  for (const [ratio, w, h] of sizes) {
    it(`keeps ${ratio} at ${w}x${h} (no crop / no stretch)`, async () => {
      const input = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 10, g: 120, b: 110 } } })
        .webp()
        .toBuffer();
      const out = await postProcessToFinal(input, ratio, "webp");
      expect({ width: out.width, height: out.height }).toEqual({ width: w, height: h });
      const meta = await sharp(out.buffer).metadata();
      expect({ width: meta.width, height: meta.height }).toEqual({ width: w, height: h });
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
  it("sends the exact size, omits input_fidelity + background, orders images", async () => {
    let body: Record<string, unknown> = {};
    const out = await generateImageWithOpenAI(okClient((b) => (body = b)), CONFIG, {
      prompt: "PROMPT",
      aspectRatio: "4:5",
      references: refs(),
    });
    expect(body.size).toBe("1024x1280");
    expect(OPENAI_SIZE_VALUES).toContain(body.size as string);
    expect("input_fidelity" in body).toBe(false);
    expect("background" in body).toBe(false);
    expect(body.quality).toBe("medium");
    expect(body.output_format).toBe("webp");
    expect(body.n).toBe(1);
    expect(body.image).toEqual(["loc-bytes", "prod-bytes", "logo-bytes"]);
    // No unsupported request properties — only documented edit fields.
    expect(Object.keys(body).sort()).toEqual(["image", "model", "n", "output_format", "prompt", "quality", "size"]);
    expect(out.nativeSize).toBe("1024x1280");
    expect(out.nativeWidth).toBe(1024);
    expect(out.inputFidelity).toBe("automatic-high");
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
    ).rejects.toBeInstanceOf(OpenAIProviderError);
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

describe("classifyProviderError (safe codes)", () => {
  const cases: Array<[Record<string, unknown>, string]> = [
    [{ status: 404, code: "model_not_found" }, "OPENAI_MODEL_ACCESS_DENIED"],
    [{ status: 401 }, "OPENAI_MODEL_ACCESS_DENIED"],
    [{ status: 429, code: "insufficient_quota" }, "OPENAI_BILLING_REQUIRED"],
    [{ status: 402 }, "OPENAI_BILLING_REQUIRED"],
    [{ status: 400, message: "rejected by the safety system" }, "OPENAI_CONTENT_POLICY"],
    [{ status: 400, param: "input_fidelity" }, "OPENAI_INVALID_PARAMETER"],
    [{ status: 400, message: "bad parameter" }, "OPENAI_INVALID_REQUEST"],
    [{ name: "AbortError" }, "OPENAI_TIMEOUT"],
    [{ status: 504 }, "OPENAI_TIMEOUT"],
    [{ status: 500 }, "PROVIDER_ERROR"],
    [{ status: 429 }, "PROVIDER_ERROR"],
  ];
  for (const [shape, expected] of cases) {
    it(`${JSON.stringify(shape)} → ${expected}`, () => {
      expect(classifyProviderError(Object.assign(new Error("e"), shape)).providerCode).toBe(expected);
    });
  }
  it("never leaks a key in the safe message", () => {
    const e = classifyProviderError(Object.assign(new Error("sk-secret-should-not-appear"), { status: 400 }));
    expect(e.safeMessage).not.toMatch(/sk-/);
  });
});

describe("config helpers", () => {
  it("caps are positive + cost is non-zero", () => {
    expect(getMaxInputProducts()).toBeGreaterThan(0);
    expect(getReferenceLimit()).toBeGreaterThan(0);
    expect(estimateImageCostUsd("medium", 1)).toBeGreaterThan(0);
  });
});
