import { randomUUID } from "node:crypto";
import type { AspectRatio, GenerationSettings } from "@/lib/domain";
import {
  estimateImageCostUsd,
  finalSize,
  getMaxInputProducts,
  openAiNativeSize,
} from "./provider-config";
import {
  generateImageWithOpenAI,
  type OpenAIImagesClient,
  type OpenAIReferenceImage,
  type OpenAIServerConfig,
  type PostProcessedImage,
} from "./openai-server";

/**
 * Provider-agnostic, dependency-injected orchestrator for a hardened OpenAI
 * generation. All Supabase / OpenAI specifics are behind {@link GenerationGateway}
 * + the injected client, so the full security + lifecycle logic is unit-testable
 * with fakes (no network, no paid call).
 */

export type GenerationErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "PROVIDER_ERROR";

const STATUS_BY_CODE: Record<GenerationErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  PROVIDER_ERROR: 502,
};

export class GenerationError extends Error {
  readonly code: GenerationErrorCode;
  readonly status: number;
  constructor(code: GenerationErrorCode, message: string) {
    super(message);
    this.name = "GenerationError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}

/** Trusted, ID-only request — the client never sends image URLs. */
export interface GenerationRequestInput {
  organizationId: string;
  brandId: string;
  logoId: string;
  productIds: string[];
  locationId: string;
  settings: GenerationSettings;
  notes?: string;
  projectId?: string;
  idempotencyKey: string;
}

export interface GenerationContext {
  userId: string;
  orgId: string;
  role: string;
}

/** A server-resolved input image (signed URL fetched + converted server-side). */
export interface ResolvedRef {
  role: "location" | "product" | "logo";
  id: string;
  name: string;
  mimeType: string;
  /** Upload-ready file for the SDK (built server-side from the signed URL). */
  file: unknown;
}

export interface PersistResultInput {
  jobId: string;
  resultId: string;
  input: GenerationRequestInput;
  aspectRatio: AspectRatio;
  storagePath: string;
  mimeType: string;
  finalWidth: number;
  finalHeight: number;
  nativeWidth: number;
  nativeHeight: number;
  nativeSize: string;
  provider: string;
  model: string;
  quality: string;
  inputFidelity: string;
  requestId?: string;
  usage?: unknown;
  estimatedCostUsd: number;
}

/**
 * Everything the orchestrator needs from the outside world. The real
 * implementation is the Supabase + storage gateway; tests pass an in-memory fake.
 * `loadLogo/loadProduct/loadLocation` MUST return null for any asset that is
 * missing, archived, or belongs to another organization (the orchestrator then
 * 404s) — that is the org-ownership boundary.
 */
export interface GenerationGateway {
  authorize(orgId: string): Promise<GenerationContext>; // throws UNAUTHENTICATED / FORBIDDEN
  findJobByIdempotencyKey(ctx: GenerationContext, key: string): Promise<{ jobId: string; resultId: string | null } | null>;
  recentJobCount(ctx: GenerationContext): Promise<number>;
  loadLogo(ctx: GenerationContext, logoId: string, brandId: string): Promise<ResolvedRef | null>;
  loadProduct(ctx: GenerationContext, productId: string): Promise<ResolvedRef | null>;
  loadLocation(ctx: GenerationContext, locationId: string): Promise<ResolvedRef | null>;
  composePrompt(ctx: GenerationContext, input: GenerationRequestInput, refs: ResolvedRef[]): Promise<string>;
  createJob(ctx: GenerationContext, jobId: string, input: GenerationRequestInput): Promise<void>;
  uploadResult(ctx: GenerationContext, jobId: string, resultId: string, image: PostProcessedImage): Promise<string>;
  persistResult(ctx: GenerationContext, data: PersistResultInput): Promise<void>;
  completeJob(ctx: GenerationContext, jobId: string): Promise<void>;
  failJob(ctx: GenerationContext, jobId: string, code: string, message: string): Promise<void>;
}

export interface OrchestratorDeps {
  gateway: GenerationGateway;
  openai: OpenAIImagesClient;
  config: OpenAIServerConfig;
  /** Injected so tests can stub sharp; defaults to the real post-processor. */
  postProcess?: (bytes: Buffer, ratio: AspectRatio, format: OpenAIServerConfig["outputFormat"]) => Promise<PostProcessedImage>;
  maxProducts?: number;
  rateLimitPerWindow?: number;
  maxAttempts?: number;
  timeoutMs?: number;
}

export interface GenerationOutcome {
  jobId: string;
  resultId: string;
  reused: boolean;
}

/** Validate the ID-only input (required IDs + product cap). */
export function validateGenerationInput(input: GenerationRequestInput, maxProducts: number): void {
  if (!input.organizationId || !input.brandId || !input.logoId || !input.locationId) {
    throw new GenerationError("BAD_REQUEST", "Missing required asset selection.");
  }
  if (!Array.isArray(input.productIds) || input.productIds.length === 0) {
    throw new GenerationError("BAD_REQUEST", "Select at least one product.");
  }
  if (input.productIds.length > maxProducts) {
    throw new GenerationError("BAD_REQUEST", `Too many products selected (max ${maxProducts}).`);
  }
  if (!input.idempotencyKey) {
    throw new GenerationError("BAD_REQUEST", "Missing idempotency key.");
  }
}

/** Resolve + order references. Any missing/cross-org/archived asset → NOT_FOUND. */
export async function resolveReferences(
  gateway: GenerationGateway,
  ctx: GenerationContext,
  input: GenerationRequestInput,
): Promise<ResolvedRef[]> {
  const location = await gateway.loadLocation(ctx, input.locationId);
  if (!location) throw new GenerationError("NOT_FOUND", "Location not found or unavailable.");

  const products: ResolvedRef[] = [];
  for (const id of input.productIds) {
    const product = await gateway.loadProduct(ctx, id);
    if (!product) throw new GenerationError("NOT_FOUND", "A selected product was not found or unavailable.");
    products.push(product);
  }

  const logo = await gateway.loadLogo(ctx, input.logoId, input.brandId);
  if (!logo) throw new GenerationError("NOT_FOUND", "Logo not found or unavailable.");

  // Deterministic order: location (base) → products → logo.
  return [location, ...products, logo];
}

function toOpenAIRef(ref: ResolvedRef): OpenAIReferenceImage {
  return { role: ref.role, file: ref.file, name: ref.name, mimeType: ref.mimeType };
}

/**
 * Run the full hardened lifecycle. Throws {@link GenerationError} (mapped to an
 * HTTP status by the route). Never returns secrets or raw provider responses.
 */
export async function runOpenAIGeneration(
  deps: OrchestratorDeps,
  input: GenerationRequestInput,
): Promise<GenerationOutcome> {
  const maxProducts = deps.maxProducts ?? getMaxInputProducts();
  const rateLimit = deps.rateLimitPerWindow ?? 20;
  const postProcess = deps.postProcess ?? defaultPostProcess;

  // 1. Auth + active membership/role.
  const ctx = await deps.gateway.authorize(input.organizationId);

  // 2. Idempotency — never make a duplicate paid call for the same key.
  const existing = await deps.gateway.findJobByIdempotencyKey(ctx, input.idempotencyKey);
  if (existing?.resultId) {
    return { jobId: existing.jobId, resultId: existing.resultId, reused: true };
  }

  // 3. Rate limit (per user/org window).
  const recent = await deps.gateway.recentJobCount(ctx);
  if (recent >= rateLimit) {
    throw new GenerationError("RATE_LIMITED", "Too many generations recently. Please wait and retry.");
  }

  // 4. Validate the ID-only input + product cap.
  validateGenerationInput(input, maxProducts);

  // 5. Resolve + order references (org-ownership + archived checks inside).
  const refs = await resolveReferences(deps.gateway, ctx, input);

  // 6. Create the job (processing) BEFORE the paid call (idempotency anchor).
  const jobId = existing?.jobId ?? input.idempotencyKey;
  await deps.gateway.createJob(ctx, jobId, input);

  try {
    const prompt = await deps.gateway.composePrompt(ctx, input, refs);
    const native = await generateImageWithOpenAI(
      deps.openai,
      deps.config,
      { prompt, aspectRatio: input.settings.aspectRatio, references: refs.map(toOpenAIRef) },
      { maxAttempts: deps.maxAttempts, timeoutMs: deps.timeoutMs },
    );

    const final = await postProcess(Buffer.from(native.base64, "base64"), input.settings.aspectRatio, deps.config.outputFormat);

    const resultId = randomUUID();
    const storagePath = await deps.gateway.uploadResult(ctx, jobId, resultId, final);

    await deps.gateway.persistResult(ctx, {
      jobId,
      resultId,
      input,
      aspectRatio: input.settings.aspectRatio,
      storagePath,
      mimeType: final.mimeType,
      finalWidth: final.width,
      finalHeight: final.height,
      nativeWidth: native.nativeWidth,
      nativeHeight: native.nativeHeight,
      nativeSize: native.nativeSize,
      provider: "openai",
      model: native.model,
      quality: native.quality,
      inputFidelity: native.inputFidelity,
      requestId: native.requestId,
      usage: native.usage,
      estimatedCostUsd: estimateImageCostUsd(native.quality, 1),
    });

    await deps.gateway.completeJob(ctx, jobId);
    return { jobId, resultId, reused: false };
  } catch (err) {
    const code = err instanceof GenerationError ? err.code : "PROVIDER_ERROR";
    // Safe message only — never the key or the raw provider response.
    const message = err instanceof GenerationError ? err.message : "Image generation failed.";
    await deps.gateway.failJob(ctx, jobId, code, message);
    throw err instanceof GenerationError ? err : new GenerationError("PROVIDER_ERROR", message);
  }
}

// Lazy import so the orchestrator stays free of the server-only sharp dependency
// unless a caller actually needs the default post-processor.
async function defaultPostProcess(
  bytes: Buffer,
  ratio: AspectRatio,
  format: OpenAIServerConfig["outputFormat"],
): Promise<PostProcessedImage> {
  const { postProcessToFinal } = await import("./openai-server");
  return postProcessToFinal(bytes, ratio, format);
}

export { finalSize, openAiNativeSize };
