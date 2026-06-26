import OpenAI from "openai";
import { NextResponse } from "next/server";
import { DEFAULT_GENERATION_SETTINGS, type GenerationSettings } from "@/lib/domain";
import { getImageProvider } from "@/lib/services/image-adapter/provider-config";
import { requireOpenAIConfig, type OpenAIImagesClient } from "@/lib/services/image-adapter/openai-server";
import { createSupabaseGenerationGateway } from "@/lib/services/image-adapter/supabase-generation-gateway";
import { GenerationError, runOpenAIGeneration } from "@/lib/services/image-adapter/generation-orchestrator";
import { GenerateImageBodySchema } from "./validation";

// The OpenAI call + API key live ONLY here, on the server.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024; // IDs + settings only — the request is tiny.

function err(status: number, message: string, code?: string, retryable = false) {
  return NextResponse.json({ error: message, code, retryable }, { status });
}

/**
 * Read the request body with a HARD byte ceiling enforced on the actual bytes
 * read (not the spoofable/absent `content-length` header), so a chunked or
 * mislabeled oversized body cannot be buffered into memory before validation.
 */
async function readJsonCapped(req: Request, maxBytes: number): Promise<unknown> {
  const reader = req.body?.getReader();
  if (!reader) {
    const text = await req.text();
    if (Buffer.byteLength(text) > maxBytes) throw new RangeError("BODY_TOO_LARGE");
    return text ? JSON.parse(text) : {};
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        throw new RangeError("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  }
  return JSON.parse(Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8"));
}

export async function POST(req: Request) {
  // 1. Provider is SERVER-authoritative — never trust the client / NEXT_PUBLIC.
  //    Config-state errors are logged server-side and returned as a STATIC client
  //    message (never echo server env/config detail to the browser).
  let provider;
  try {
    provider = getImageProvider();
  } catch (e) {
    console.warn("[generate-image] provider config error:", (e as Error).message);
    return err(400, "Image generation is not available.");
  }
  if (provider !== "openai") return err(400, "Image generation is not available.");

  // 2. Require the server-only key (no silent fallback to mock).
  let config;
  try {
    config = requireOpenAIConfig();
  } catch (e) {
    console.warn("[generate-image] OpenAI config error:", (e as Error).message);
    return err(503, "Image generation is temporarily unavailable.");
  }

  // 3. Body read with a HARD byte cap + strict ID-only validation.
  let raw: unknown;
  try {
    raw = await readJsonCapped(req, MAX_BODY_BYTES);
  } catch (e) {
    if (e instanceof RangeError) return err(413, "Request too large.");
    return err(400, "Invalid JSON body.");
  }
  const parsed = GenerateImageBodySchema.safeParse(raw);
  if (!parsed.success) return err(400, "Invalid request — send asset IDs and settings only.");
  const data = parsed.data;

  // Build settings from server defaults + ONLY the whitelisted, enum-validated
  // fields that influence the prompt. No arbitrary client field flows through.
  const settings: GenerationSettings = {
    ...DEFAULT_GENERATION_SETTINGS,
    aspectRatio: data.settings.aspectRatio,
    ...(data.settings.visualStyle ? { visualStyle: data.settings.visualStyle } : {}),
    ...(data.settings.placement ? { placement: data.settings.placement } : {}),
    outputCount: 1,
  };

  try {
    // 4. Auth + org membership + asset resolution + signed URLs + lifecycle.
    const gateway = await createSupabaseGenerationGateway();
    // Retry/timeout authority lives solely in generateImageWithOpenAI — disable
    // the SDK's own retries so they don't stack with the orchestrator loop.
    const client = new OpenAI({ apiKey: config.apiKey, maxRetries: 0 });
    const outcome = await runOpenAIGeneration(
      { gateway, openai: client as unknown as OpenAIImagesClient, config },
      {
        organizationId: data.organizationId,
        brandId: data.brandId,
        logoId: data.logoId,
        productIds: data.productIds,
        locationId: data.locationId,
        settings,
        notes: data.notes,
        projectId: data.projectId,
        idempotencyKey: data.idempotencyKey,
      },
    );
    return NextResponse.json(outcome);
  } catch (e) {
    // Specific, safe error code + message (sensitive detail stays server-side).
    if (e instanceof GenerationError) return err(e.status, e.message, e.code, e.retryable);
    return err(502, "Image generation failed.", "PROVIDER_ERROR", true);
  }
}
