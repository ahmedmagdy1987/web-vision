import { describe, it, expect, vi } from "vitest";
import { DEFAULT_GENERATION_SETTINGS, type GenerationSettings } from "@/lib/domain";
import {
  GenerationError,
  resolveReferences,
  runOpenAIGeneration,
  validateGenerationInput,
  type GenerationGateway,
  type GenerationRequestInput,
  type ResolvedRef,
} from "@/lib/services/image-adapter/generation-orchestrator";
import { openAiSize, OPENAI_SIZE_VALUES } from "@/lib/services/image-adapter/provider-config";
import type { OpenAIImagesClient, OpenAIServerConfig, PostProcessedImage } from "@/lib/services/image-adapter/openai-server";

const CONFIG: OpenAIServerConfig = { apiKey: "k", model: "gpt-image-2", quality: "medium", outputFormat: "webp" };

function settings(aspect: GenerationSettings["aspectRatio"]): GenerationSettings {
  return { ...DEFAULT_GENERATION_SETTINGS, aspectRatio: aspect };
}

function input(over: Partial<GenerationRequestInput> = {}): GenerationRequestInput {
  return {
    organizationId: "org1",
    brandId: "brand1",
    logoId: "logo1",
    productIds: ["prod1"],
    locationId: "loc1",
    settings: settings("4:5"),
    idempotencyKey: "idem-1",
    ...over,
  };
}

const locationRef: ResolvedRef = { role: "location", id: "loc1", name: "Loc", mimeType: "image/png", file: "loc-bytes" };
const productRef: ResolvedRef = { role: "product", id: "prod1", name: "Prod", mimeType: "image/png", file: "prod-bytes" };
const logoRef: ResolvedRef = { role: "logo", id: "logo1", name: "Logo", mimeType: "image/png", file: "logo-bytes" };

function gateway(over: Partial<GenerationGateway> = {}): GenerationGateway {
  return {
    authorize: vi.fn(async () => ({ userId: "u1", orgId: "org1", role: "editor" })),
    findJobByIdempotencyKey: vi.fn(async () => null),
    recentJobCount: vi.fn(async () => 0),
    loadLocation: vi.fn(async () => locationRef),
    loadProduct: vi.fn(async () => productRef),
    loadLogo: vi.fn(async () => logoRef),
    composePrompt: vi.fn(async () => "HIDDEN PROMPT"),
    createJob: vi.fn(async () => undefined),
    uploadResult: vi.fn(async () => "organizations/org1/results/j/r.webp"),
    persistResult: vi.fn(async () => undefined),
    completeJob: vi.fn(async () => undefined),
    failJob: vi.fn(async () => undefined),
    ...over,
  };
}

function okClient(capture?: (body: Record<string, unknown>) => void): OpenAIImagesClient {
  return {
    images: {
      edit: async (body) => {
        capture?.(body);
        return { data: [{ b64_json: "QUJD" }], usage: { total_tokens: 5 }, _request_id: "req_1" };
      },
    },
  };
}

const fakePostProcess = async (
  _bytes: Buffer,
  ratio: GenerationSettings["aspectRatio"],
  format: OpenAIServerConfig["outputFormat"],
): Promise<PostProcessedImage> => {
  const f = openAiSize(ratio);
  return {
    buffer: Buffer.from("x"),
    base64: "eA==",
    dataUrl: "data:image/webp;base64,eA==",
    width: f.width,
    height: f.height,
    mimeType: format === "png" ? "image/png" : "image/webp",
  };
};

function deps(gw: GenerationGateway, openai: OpenAIImagesClient, over = {}) {
  return { gateway: gw, openai, config: CONFIG, postProcess: fakePostProcess, maxProducts: 3, rateLimitPerWindow: 20, ...over };
}

describe("validateGenerationInput", () => {
  it("rejects missing IDs, empty products, and over-cap product counts", () => {
    expect(() => validateGenerationInput(input({ logoId: "" }), 3)).toThrow(GenerationError);
    expect(() => validateGenerationInput(input({ productIds: [] }), 3)).toThrow(/at least one/i);
    expect(() => validateGenerationInput(input({ productIds: ["a", "b", "c", "d"] }), 3)).toThrow(/max 3/i);
  });
});

describe("exact direct sizes are sent to OpenAI (no native+crop)", () => {
  it("maps each primary ratio to its exact requested size", () => {
    expect(openAiSize("1:1").size).toBe("1024x1024");
    expect(openAiSize("4:5").size).toBe("1024x1280");
    expect(openAiSize("16:9").size).toBe("1536x864");
    expect(openAiSize("9:16").size).toBe("864x1536");
    for (const ratio of ["1:1", "4:5", "16:9", "9:16", "4:3", "3:2", "2:3"] as const) {
      expect(OPENAI_SIZE_VALUES).toContain(openAiSize(ratio).size);
    }
  });
});

describe("resolveReferences (org-ownership boundary)", () => {
  it("orders location → product → logo", async () => {
    const ctx = { userId: "u1", orgId: "org1", role: "editor" };
    const refs = await resolveReferences(gateway(), ctx, input());
    expect(refs.map((r) => r.role)).toEqual(["location", "product", "logo"]);
  });
  it("404s when an asset is missing / cross-org / archived (gateway returns null)", async () => {
    const ctx = { userId: "u1", orgId: "org1", role: "editor" };
    await expect(resolveReferences(gateway({ loadProduct: vi.fn(async () => null) }), ctx, input())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(resolveReferences(gateway({ loadLogo: vi.fn(async () => null) }), ctx, input())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("runOpenAIGeneration", () => {
  it("runs the full lifecycle and persists final metadata", async () => {
    let body: Record<string, unknown> = {};
    const gw = gateway();
    const out = await runOpenAIGeneration(deps(gw, okClient((b) => (body = b))), input());

    expect(out.reused).toBe(false);
    expect(gw.createJob).toHaveBeenCalledOnce();
    expect(gw.uploadResult).toHaveBeenCalledOnce();
    expect(gw.completeJob).toHaveBeenCalledOnce();
    expect(gw.failJob).not.toHaveBeenCalled();

    // input ordering + valid native size + high fidelity to OpenAI
    expect(body.image).toEqual(["loc-bytes", "prod-bytes", "logo-bytes"]);
    expect(body.size).toBe("1024x1280");
    expect(OPENAI_SIZE_VALUES).toContain(body.size as string);
    expect("input_fidelity" in body).toBe(false);

    const persisted = (gw.persistResult as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(persisted).toMatchObject({
      provider: "openai",
      model: "gpt-image-2",
      quality: "medium",
      inputFidelity: "automatic-high",
      nativeSize: "1024x1280",
      finalWidth: 1024,
      finalHeight: 1280,
      aspectRatio: "4:5",
    });
    expect(persisted.estimatedCostUsd).toBeGreaterThan(0);
  });

  it("rejects unauthenticated requests (401) before any paid call", async () => {
    const edit = vi.fn();
    const gw = gateway({ authorize: vi.fn(async () => { throw new GenerationError("UNAUTHENTICATED", "no session"); }) });
    await expect(runOpenAIGeneration(deps(gw, { images: { edit } }), input())).rejects.toMatchObject({ status: 401 });
    expect(edit).not.toHaveBeenCalled();
  });

  it("rejects without an active org role (403)", async () => {
    const gw = gateway({ authorize: vi.fn(async () => { throw new GenerationError("FORBIDDEN", "not a member"); }) });
    await expect(runOpenAIGeneration(deps(gw, okClient()), input())).rejects.toMatchObject({ status: 403 });
  });

  it("rejects unknown / cross-org / archived assets (404), no job created", async () => {
    const gw = gateway({ loadProduct: vi.fn(async () => null) });
    await expect(runOpenAIGeneration(deps(gw, okClient()), input())).rejects.toMatchObject({ status: 404 });
    expect(gw.createJob).not.toHaveBeenCalled();
  });

  it("rejects over the product cap (400)", async () => {
    const gw = gateway();
    await expect(
      runOpenAIGeneration(deps(gw, okClient()), input({ productIds: ["a", "b", "c", "d"] })),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("is idempotent — reuses an existing result, no duplicate paid call", async () => {
    const edit = vi.fn();
    const gw = gateway({ findJobByIdempotencyKey: vi.fn(async () => ({ jobId: "j9", resultId: "r9" })) });
    const out = await runOpenAIGeneration(deps(gw, { images: { edit } }), input());
    expect(out).toMatchObject({ jobId: "j9", resultId: "r9", reused: true });
    expect(edit).not.toHaveBeenCalled();
    expect(gw.createJob).not.toHaveBeenCalled();
  });

  it("rate-limits (429) without a paid call", async () => {
    const edit = vi.fn();
    const gw = gateway({ recentJobCount: vi.fn(async () => 20) });
    await expect(runOpenAIGeneration(deps(gw, { images: { edit } }), input())).rejects.toMatchObject({ status: 429 });
    expect(edit).not.toHaveBeenCalled();
  });

  it("marks the job failed on a provider error and does not persist a result", async () => {
    const gw = gateway();
    const failing: OpenAIImagesClient = { images: { edit: async () => { throw new Error("boom"); } } };
    await expect(runOpenAIGeneration(deps(gw, failing, { maxAttempts: 1 }), input())).rejects.toBeInstanceOf(GenerationError);
    expect(gw.failJob).toHaveBeenCalledOnce();
    expect(gw.persistResult).not.toHaveBeenCalled();
    expect(gw.completeJob).not.toHaveBeenCalled();
    const failArgs = (gw.failJob as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(failArgs[3])).not.toMatch(/sk-|api[_-]?key/i); // safe message only
  });

  it("classifies a provider model-access failure (502 OPENAI_MODEL_ACCESS_DENIED, not retryable)", async () => {
    const gw = gateway();
    const failing: OpenAIImagesClient = {
      images: { edit: async () => { throw Object.assign(new Error("no access"), { status: 404, code: "model_not_found" }); } },
    };
    await expect(runOpenAIGeneration(deps(gw, failing, { maxAttempts: 1 }), input())).rejects.toMatchObject({
      code: "OPENAI_MODEL_ACCESS_DENIED",
      status: 502,
      retryable: false,
    });
    expect((gw.failJob as ReturnType<typeof vi.fn>).mock.calls[0][2]).toBe("OPENAI_MODEL_ACCESS_DENIED");
  });

  it("classifies a parameter-validation failure (OPENAI_INVALID_PARAMETER, not retryable, no retry)", async () => {
    let calls = 0;
    const gw = gateway();
    const failing: OpenAIImagesClient = {
      images: {
        edit: async () => {
          calls++;
          throw Object.assign(new Error("Unknown parameter: 'input_fidelity'."), { status: 400, param: "input_fidelity" });
        },
      },
    };
    await expect(runOpenAIGeneration(deps(gw, failing), input())).rejects.toMatchObject({
      code: "OPENAI_INVALID_PARAMETER",
      retryable: false,
    });
    expect(calls).toBe(1); // 4xx validation → no retry
    expect((gw.failJob as ReturnType<typeof vi.fn>).mock.calls[0][2]).toBe("OPENAI_INVALID_PARAMETER");
  });

  it("classifies a post-processing failure (IMAGE_POST_PROCESSING_FAILED) and skips upload", async () => {
    const gw = gateway();
    const badPostProcess = async () => {
      throw new Error("sharp boom");
    };
    await expect(runOpenAIGeneration(deps(gw, okClient(), { postProcess: badPostProcess }), input())).rejects.toMatchObject({
      code: "IMAGE_POST_PROCESSING_FAILED",
    });
    expect(gw.uploadResult).not.toHaveBeenCalled();
  });

  it("classifies a storage upload failure (RESULT_STORAGE_FAILED) and skips persistence", async () => {
    const gw = gateway({ uploadResult: vi.fn(async () => { throw new Error("upload boom"); }) });
    await expect(runOpenAIGeneration(deps(gw, okClient()), input())).rejects.toMatchObject({ code: "RESULT_STORAGE_FAILED" });
    expect(gw.persistResult).not.toHaveBeenCalled();
  });

  it("classifies a persistence failure (RESULT_PERSISTENCE_FAILED) and does not complete", async () => {
    const gw = gateway({ persistResult: vi.fn(async () => { throw new Error("db boom"); }) });
    await expect(runOpenAIGeneration(deps(gw, okClient()), input())).rejects.toMatchObject({ code: "RESULT_PERSISTENCE_FAILED" });
    expect(gw.completeJob).not.toHaveBeenCalled();
  });

  it("propagates an asset-image-unavailable error (422) before any paid call or job", async () => {
    const edit = vi.fn();
    const gw = gateway({
      loadLocation: vi.fn(async () => {
        throw new GenerationError("ASSET_IMAGE_UNAVAILABLE", "The location image could not be prepared.");
      }),
    });
    await expect(runOpenAIGeneration(deps(gw, { images: { edit } }), input())).rejects.toMatchObject({
      status: 422,
      code: "ASSET_IMAGE_UNAVAILABLE",
    });
    expect(edit).not.toHaveBeenCalled();
    expect(gw.createJob).not.toHaveBeenCalled();
  });
});
