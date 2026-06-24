import { describe, it, expect } from "vitest";
import {
  generateImageWithOpenAI,
  orderReferences,
  type OpenAIImagesClient,
  type OpenAIReferenceImage,
  type OpenAIServerConfig,
} from "@/lib/services/image-adapter/openai-server";
import {
  estimateImageCostUsd,
  getReferenceLimit,
  openAiSizeForAspect,
  parseImageProvider,
} from "@/lib/services/image-adapter/provider-config";
import { getImageAdapter } from "@/lib/services/image-adapter";

const CONFIG: OpenAIServerConfig = {
  apiKey: "test-key-never-real",
  model: "gpt-image-2",
  quality: "medium",
  outputFormat: "webp",
};

function refs(): OpenAIReferenceImage[] {
  // Intentionally out of order to prove deterministic ordering.
  return [
    { role: "logo", file: "logo-bytes", name: "logo", mimeType: "image/png" },
    { role: "location", file: "loc-bytes", name: "loc", mimeType: "image/png" },
    { role: "product", file: "prod-bytes", name: "prod", mimeType: "image/png" },
  ];
}

function okClient(capture?: (args: Record<string, unknown>) => void): OpenAIImagesClient {
  return {
    images: {
      edit: async (args) => {
        capture?.(args);
        return { data: [{ b64_json: "QUJD" }], usage: { total_tokens: 10 }, _request_id: "req_123" };
      },
    },
  };
}

describe("provider selection (no silent fallback)", () => {
  it("parses mock and openai, rejects unknown values", () => {
    expect(parseImageProvider("mock")).toBe("mock");
    expect(parseImageProvider(" OpenAI ")).toBe("openai");
    expect(() => parseImageProvider("gemini")).toThrow();
  });

  it("getImageAdapter returns the matching adapter and never silently mocks", () => {
    expect(getImageAdapter("mock").name).toBe("mock");
    expect(getImageAdapter("openai").name).toBe("openai");
  });
});

describe("GPT Image 2 size mapping", () => {
  it("maps the four primary ratios to the documented sizes", () => {
    expect(openAiSizeForAspect("1:1").size).toBe("1024x1024");
    expect(openAiSizeForAspect("4:5").size).toBe("1024x1280");
    expect(openAiSizeForAspect("16:9").size).toBe("1536x864");
    expect(openAiSizeForAspect("9:16").size).toBe("864x1536");
  });
});

describe("input ordering + validation", () => {
  it("orders location (base) first, then products, then logo", () => {
    expect(orderReferences(refs()).map((r) => r.role)).toEqual(["location", "product", "logo"]);
  });
  it("requires a base location image", () => {
    expect(() => orderReferences([{ role: "logo", file: "x", name: "l", mimeType: "image/png" }])).toThrow(/location/i);
  });
  it("requires at least one product or logo", () => {
    expect(() =>
      orderReferences([{ role: "location", file: "x", name: "loc", mimeType: "image/png" }]),
    ).toThrow(/product|logo/i);
  });
});

describe("generateImageWithOpenAI (mocked client)", () => {
  it("sends ordered images, mapped size, quality and format; returns a data URL", async () => {
    let sent: Record<string, unknown> = {};
    const out = await generateImageWithOpenAI(okClient((a) => (sent = a)), CONFIG, {
      prompt: "PROMPT",
      aspectRatio: "4:5",
      references: refs(),
    });
    expect(sent.size).toBe("1024x1280");
    expect(sent.quality).toBe("medium");
    expect(sent.output_format).toBe("webp");
    expect(sent.n).toBe(1);
    expect(sent.prompt).toBe("PROMPT");
    expect(sent.image).toEqual(["loc-bytes", "prod-bytes", "logo-bytes"]);
    expect(out.dataUrl).toBe("data:image/webp;base64,QUJD");
    expect(out.width).toBe(1024);
    expect(out.height).toBe(1280);
    expect(out.model).toBe("gpt-image-2");
    expect(out.requestId).toBe("req_123");
  });

  it("throws when the provider returns no image", async () => {
    const client: OpenAIImagesClient = { images: { edit: async () => ({ data: [] }) } };
    await expect(
      generateImageWithOpenAI(client, CONFIG, { prompt: "P", aspectRatio: "1:1", references: refs() }, { maxAttempts: 1 }),
    ).rejects.toThrow();
  });

  it("surfaces OpenAI errors", async () => {
    const client: OpenAIImagesClient = {
      images: {
        edit: async () => {
          throw new Error("rate limit");
        },
      },
    };
    await expect(
      generateImageWithOpenAI(client, CONFIG, { prompt: "P", aspectRatio: "1:1", references: refs() }, { maxAttempts: 1 }),
    ).rejects.toThrow(/failed/i);
  });

  it("retries a transient failure within the bound, then succeeds", async () => {
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
    const out = await generateImageWithOpenAI(
      client,
      CONFIG,
      { prompt: "P", aspectRatio: "1:1", references: refs() },
      { maxAttempts: 2 },
    );
    expect(calls).toBe(2);
    expect(out.base64).toBe("QUJD");
  });

  it("stops at the retry bound", async () => {
    let calls = 0;
    const client: OpenAIImagesClient = {
      images: {
        edit: async () => {
          calls++;
          throw new Error("always");
        },
      },
    };
    await expect(
      generateImageWithOpenAI(client, CONFIG, { prompt: "P", aspectRatio: "1:1", references: refs() }, { maxAttempts: 2 }),
    ).rejects.toThrow();
    expect(calls).toBe(2);
  });

  it("aborts immediately when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      generateImageWithOpenAI(
        okClient(),
        CONFIG,
        { prompt: "P", aspectRatio: "1:1", references: refs() },
        { signal: controller.signal },
      ),
    ).rejects.toThrow(/abort/i);
  });
});

describe("config helpers", () => {
  it("reference limit defaults to a positive bound", () => {
    expect(getReferenceLimit()).toBeGreaterThan(0);
  });
  it("estimates a non-zero cost for medium quality", () => {
    expect(estimateImageCostUsd("medium", 1)).toBeGreaterThan(0);
  });
});
