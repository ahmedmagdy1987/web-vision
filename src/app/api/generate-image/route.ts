import OpenAI, { toFile } from "openai";
import { NextResponse } from "next/server";
import { ASPECT_RATIO_VALUES, type AspectRatio } from "@/lib/domain";
import { estimateImageCostUsd, getImageProvider } from "@/lib/services/image-adapter/provider-config";
import {
  generateImageWithOpenAI,
  requireOpenAIConfig,
  type OpenAIReferenceImage,
  type ReferenceRole,
} from "@/lib/services/image-adapter/openai-server";

// The OpenAI call (and the API key) live only here, on the server.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RefInput {
  role: ReferenceRole;
  url: string;
  mimeType?: string;
  name?: string;
}

export async function POST(req: Request) {
  // Provider must be explicitly "openai" — never silently fall back to mock.
  let provider;
  try {
    provider = getImageProvider();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (provider !== "openai") {
    return NextResponse.json({ error: "Image provider is not configured for OpenAI." }, { status: 400 });
  }

  let config;
  try {
    config = requireOpenAIConfig();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }

  let body: { prompt?: string; aspectRatio?: string; references?: RefInput[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { prompt, aspectRatio, references } = body;
  if (
    !prompt ||
    !aspectRatio ||
    !(aspectRatio in ASPECT_RATIO_VALUES) ||
    !Array.isArray(references) ||
    references.length === 0
  ) {
    return NextResponse.json(
      { error: "Missing or invalid prompt, aspect ratio, or reference images." },
      { status: 400 },
    );
  }

  try {
    // Load reference image bytes and convert to upload files (server-side only).
    const refs: OpenAIReferenceImage[] = [];
    for (const r of references) {
      const res = await fetch(r.url);
      if (!res.ok) throw new Error(`Could not load a ${r.role} reference image.`);
      const bytes = Buffer.from(await res.arrayBuffer());
      const mimeType = r.mimeType || res.headers.get("content-type") || "image/png";
      const file = await toFile(bytes, r.name || `${r.role}.png`, { type: mimeType });
      refs.push({ role: r.role, file, name: r.name || r.role, mimeType });
    }

    const client = new OpenAI({ apiKey: config.apiKey });
    // The official SDK's images.edit is structurally compatible with our minimal
    // injectable client interface (the difference is only param typing).
    const result = await generateImageWithOpenAI(client as never, config, {
      prompt,
      aspectRatio: aspectRatio as AspectRatio,
      references: refs,
    });

    return NextResponse.json({
      dataUrl: result.dataUrl,
      width: result.width,
      height: result.height,
      mimeType: result.mimeType,
      provider: "openai",
      model: result.model,
      quality: result.quality,
      size: result.size,
      requestId: result.requestId,
      usage: result.usage,
      estimatedCostUsd: estimateImageCostUsd(result.quality, 1),
    });
  } catch (err) {
    // Safe error only — never includes the API key or raw sensitive response.
    return NextResponse.json({ error: (err as Error).message || "Image generation failed." }, { status: 502 });
  }
}
