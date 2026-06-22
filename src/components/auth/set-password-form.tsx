"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import { safeNextPath } from "@/lib/auth/redirect";
import { AuthCard } from "./auth-card";
import { PasswordInput } from "./password-input";

const MIN_LENGTH = 8;

export function SetPasswordForm() {
  const { ready, user, mode, updatePassword } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"), "/");

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don’t match.");
      return;
    }
    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace(next), 900);
  }

  if (mode === "demo") {
    return (
      <AuthCard title="Create your password" description="Authentication is disabled in demo mode.">
        <p className="text-muted-foreground text-sm">Configure Supabase to enable onboarding.</p>
      </AuthCard>
    );
  }
  if (!ready) {
    return (
      <AuthCard title="Create your password">
        <p className="text-muted-foreground text-sm">Verifying your link…</p>
      </AuthCard>
    );
  }
  if (!user) {
    return (
      <AuthCard
        title="This link can’t be used"
        description="Your setup link is invalid or has expired, and no password was created."
      >
        <Button asChild className="w-full">
          <Link href="/auth/invite-expired?reason=no_session">Request a new setup link</Link>
        </Button>
      </AuthCard>
    );
  }
  if (done) {
    return (
      <AuthCard title="Password created" description="Redirecting you to Web Vision…">
        <Button asChild className="w-full">
          <Link href={next}>Continue</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your password"
      description="Set a password to finish joining your Web Vision workspace."
    >
      <form onSubmit={onSubmit} className="space-y-4" aria-label="Create password">
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <p className="text-muted-foreground text-xs">Use at least {MIN_LENGTH} characters.</p>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Create password"}
        </Button>
      </form>
    </AuthCard>
  );
}
