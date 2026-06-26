import { redirect } from "next/navigation";

// The Identity page is now the employee-facing Logo Library at /logos. Keep this
// route as a redirect for backward compatibility with old links.
export default function IdentityPage() {
  redirect("/logos");
}
