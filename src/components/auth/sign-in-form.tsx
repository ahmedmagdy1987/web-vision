"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import { safeNextPath } from "@/lib/auth/redirect";
import { AuthCard } from "./auth-card";
import { PasswordInput } from "./password-input";

export function SignInForm() {
  const { signInWithPassword, mode, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = safeNextPath(params.get("redirect"), "/");
  const errorCode = params.get("error_code") || params.get("error");
  const linkExpired = !!errorCode && /otp_expired|access_denied|expired|invalid/i.test(errorCode);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (ready && user) router.replace(redirectTo);
  }, [ready, user, redirectTo, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signInWithPassword(email.trim(), password);
    setLoading(false);
    // Generic, non-enumerating message.
    if (result.error) setError("Incorrect email or password.");
    else router.replace(redirectTo);
  }

  if (mode === "demo") {
    return (
      <AuthCard title="Sign in" description="Authentication is disabled in demo mode.">
        <p className="text-muted-foreground text-sm">
          Configure Supabase (see <code>.env.example</code>) to enable sign in.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Sign in"
      description="Sign in to your Malahi account."
      footer="Malahi is an internal, invite-only tool."
    >
      {linkExpired && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
        >
          <p className="font-medium">Your invitation or reset link has expired.</p>
          <p className="text-muted-foreground mt-1">
            No password was created.{" "}
            <Link
              href="/auth/invite-expired?reason=otp_expired"
              className="text-brand font-medium underline-offset-2 hover:underline"
            >
              Request a new setup link
            </Link>
            .
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" aria-label="Sign in">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@malahi.com"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/auth/forgot-password"
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
