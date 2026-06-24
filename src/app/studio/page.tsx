import { redirect } from "next/navigation";

// Studio has been folded into Home — the full mockup-generation workflow now
// lives on Home. Keep the route as a redirect so existing /studio links and
// prefill handoffs don't break.
export default function StudioPage() {
  redirect("/");
}
