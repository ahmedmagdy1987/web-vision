"use client";

import { Aperture } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Shown when an authenticated user has no active Malahi membership. Web Vision is
 * an invite-only internal tool — there is no self-service workspace creation.
 */
export function PendingAccess() {
  const { signOut } = useAuth();
  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md p-6 text-center">
        <div className="bg-brand text-brand-foreground mx-auto mb-4 flex size-12 items-center justify-center rounded-xl shadow-sm">
          <Aperture className="size-6" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Access pending</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Your Web Vision account is active, but it hasn&apos;t been assigned to the Malahi
          workspace yet. Contact your administrator to receive access.
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
