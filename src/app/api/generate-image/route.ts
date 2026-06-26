import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_GENERATION_SETTINGS, type GenerationSettings } from "@/lib/domain";
import { getImageProvider } from "@/lib/services/image-adapter/provider-config";
import { requireOpenAIConfig, type OpenAIImagesClient } from "@/lib/services/image-adapter/openai-server";
import { createSupabaseGenerationGateway } from "@/lib/services/image-adapter/supabase-generation-gateway";
import { GenerationError, runOpenAIGeneration } from "@/lib/services/image-adapter/generation-orchestrator";

// The OpenAI call + API key live ONLY here, on the server.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024; // IDs + settings only — the request is tiny.

/**
 * Strict, ID-ONLY request body. `.strict()` rejects any extra field (e.g. a
 * client-supplied `url` / `references`), so the browser cannot drive a server
 * fetch of arbitrary URLs (no SSRF surface).
 */
const BodySchema = z
  .object({
    organizationId: z.string().min(1),
    brandId: z.string().min(1),
    logoId: z.string().min(1),
    productIds: z.array(z.string().min(1)).min(1).max(8),
    locationId: z.string().min(1),
    settings: z
      .object({ aspectRatio: z.enum(["1:1", "4:5", "16:9", "9:16", "4:3", "3:2", "2:3"]) })
      .passthrough(),
    notes: z.string().max(2000).optional(),
    projectId: z.string().min(1).optional(),
    idempotencyKey: z.string().min(1).max(200),
  })
  .strict();

function err(status: number, message: string, code?: string, retryable = false) {
  return NextResponse.json({ error: message, code, retryable }, { status });
}

export async function POST(req: Request) {
  // 1. Provider is SERVER-authoritative — never trust the client / NEXT_PUBLIC.
  let provider;
  try {
    provider = getImageProvider();
  } catch (e) {
    return err(400, (e as Error).message);
  }
  if (provider !== "openai") return err(400, "Image provider is not configured for OpenAI.");

  // 2. Require the server-only key (no silent fallback to mock).
  let config;
  try {
    config = requireOpenAIConfig();
  } catch (e) {
    return err(503, (e as Error).message);
  }

  // 3. Body-size guard + strict ID-only validation.
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return err(413, "Request too large.");
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return err(400, "Invalid JSON body.");
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return err(400, "Invalid request — send asset IDs and settings only.");
  const data = parsed.data;

  const settings: GenerationSettings = {
    ...DEFAULT_GENERATION_SETTINGS,
    ...(data.settings as Partial<GenerationSettings>),
    aspectRatio: data.settings.aspectRatio,
    outputCount: 1,
  };

  try {
    // 4. Auth + org membership + asset resolution + signed URLs + lifecycle.
    const gateway = await createSupabaseGenerationGateway();
    const client = new OpenAI({ apiKey: config.apiKey });
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
