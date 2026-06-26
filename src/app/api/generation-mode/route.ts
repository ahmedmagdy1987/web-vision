import { NextResponse } from "next/server";
import { getImageProvider } from "@/lib/services/image-adapter/provider-config";

// Non-secret: reports ONLY which generation provider the server is configured for
// ("mock" | "openai"), so the client can pick the right flow. The API key and any
// other secret config never leave the server. Server-authoritative — there is no
// NEXT_PUBLIC mirror.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let provider: "mock" | "openai" = "mock";
  try {
    provider = getImageProvider();
  } catch {
    provider = "mock";
  }
  return NextResponse.json({ provider });
}
