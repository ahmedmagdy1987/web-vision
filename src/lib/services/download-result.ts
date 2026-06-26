/**
 * Download a generated result via the authenticated same-origin route, keeping
 * the employee on the current page (no new tab, no exposed Storage URL). Streams
 * the bytes into a Blob, triggers a download from a temporary object URL, then
 * revokes it.
 */
export async function downloadResultFile(resultId: string): Promise<void> {
  const res = await fetch(`/api/results/${encodeURIComponent(resultId)}/download`, { method: "GET" });
  if (!res.ok) {
    let message = "Download failed. Please try again.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // non-JSON error body — keep the default message
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  const filename = match?.[1] ?? `mockup-${resultId}`;

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Revoke after the click has been dispatched.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
