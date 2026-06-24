"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Shown when an authenticated user has no active Malahi membership. Malahi is an
 * invite-only internal tool — there is no self-service access creation.
 */
export function PendingAccess() {
  const { signOut } = useAuth();
  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md p-6 text-center">
        <p className="text-brand mb-4 text-2xl font-bold tracking-tight">Malahi</p>
        <h1 className="text-lg font-semibold tracking-tight">Access pending</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Your Malahi account is active, but it hasn&apos;t been granted access yet.
          Contact your administrator to receive access.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
          <Button onClick={() => void signOut()}>Sign out</Button>
        </div>
      </Card>
    </div>
  );
}
