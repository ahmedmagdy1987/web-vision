import type { GenerationSettings } from "@/lib/domain";

/**
 * Trusted, ID-only request to the server-side OpenAI generation endpoint. The
 * browser submits ONLY identifiers + settings + an idempotency key — never image
 * URLs. The server resolves the session, confirms org membership + asset
 * ownership, mints short-lived signed URLs and calls OpenAI. (Wiring this into
 * the Home flow in place of the mock is the owner-gated switch once the key is
 * configured.)
 */
export interface OpenAIGenerationRequest {
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

export interface OpenAIGenerationOutcome {
  jobId: string;
  resultId: string;
  reused: boolean;
}

export async function requestOpenAIGeneration(
  input: OpenAIGenerationRequest,
  signal?: AbortSignal,
): Promise<OpenAIGenerationOutcome> {
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Generation failed (${res.status}).`);
  }
  return (await res.json()) as OpenAIGenerationOutcome;
}
