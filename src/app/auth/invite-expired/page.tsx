import { Suspense } from "react";
import { InviteExpired } from "@/components/auth/invite-expired";

export const metadata = { title: "Invitation link expired" };

export default function InviteExpiredPage() {
  return (
    <Suspense fallback={<div className="bg-background min-h-dvh" />}>
      <InviteExpired />
    </Suspense>
  );
}
