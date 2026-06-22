"use client";

import * as React from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";

/** Shown when a signed-in user has no organization membership yet. */
export function OrgOnboarding() {
  const { createOrganization, signOut } = useAuth();
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createOrganization(name.trim());
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-3 flex items-center gap-2">
          <Building2 className="text-brand size-5" />
          <h1 className="text-lg font-semibold">Create your workspace</h1>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          You&apos;re signed in but not a member of any organization yet. Create one to get
          started — you&apos;ll become its owner.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org">Organization name</Label>
            <Input
              id="org"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Malahi Entertainment"
            />
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating…" : "Create workspace"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
