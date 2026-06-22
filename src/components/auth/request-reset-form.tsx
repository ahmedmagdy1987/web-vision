"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Shared "email me a setup/reset link" form (used by forgot-password and the
 * expired-invitation recovery state). Uses generic success messaging so account
 * existence is never disclosed.
 */
export function RequestResetForm({
  submitLabel = "Send link",
  successText,
}: {
  submitLabel?: string;
  successText: string;
}) {
  const { sendPasswordReset, mode } = useAuth();
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await sendPasswordReset(email.trim());
    setLoading(false);
    // Only surface genuine transport/rate-limit failures — never whether the
    // email is registered (no user enumeration).
    if (result.error && /rate|network|too many|timeout/i.test(result.error)) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  if (mode === "demo") {
    return <p className="text-muted-foreground text-sm">Authentication is disabled in demo mode.</p>;
  }
  if (sent) {
    return (
      <div className="space-y-4">
        <p className="text-sm">{successText}</p>
        <Link href="/sign-in" className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Request link">
      <div className="space-y-1.5">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@malahi.com"
        />
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending…" : submitLabel}
      </Button>
      <div className="text-center">
        <Link href="/sign-in" className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
