"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";

export function SignInForm() {
  const { signInWithPassword, mode, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/";

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
    if (result.error) setError(result.error);
    else router.replace(redirectTo);
  }

  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex items-center gap-2">
          <span className="bg-brand text-brand-foreground flex size-9 items-center justify-center rounded-xl">
            <Wand2 className="size-5" />
          </span>
          <div>
            <p className="text-base font-semibold leading-tight">Web Vision</p>
            <p className="text-muted-foreground text-xs">Malahi Studio · internal sign in</p>
          </div>
        </div>

        {mode === "demo" ? (
          <p className="text-muted-foreground text-sm">
            Authentication is disabled in <strong>demo mode</strong>. Configure Supabase
            (see <code>.env.example</code>) to enable sign in.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" aria-label="Sign in">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@malahi.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
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
        )}
      </Card>
    </div>
  );
}
