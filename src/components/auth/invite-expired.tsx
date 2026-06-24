"use client";

import { useSearchParams } from "next/navigation";
import { AuthCard } from "./auth-card";
import { RequestResetForm } from "./request-reset-form";

export function InviteExpired() {
  const params = useSearchParams();
  const reason = params.get("reason") || "invalid";
  const expired = /otp_expired|expired/i.test(reason);

  return (
    <AuthCard
      title={expired ? "Your invitation link has expired" : "This link can’t be used"}
      description="The link is no longer valid and no password was created from this attempt. Request a fresh setup link below — you don’t need to know any temporary password. If self-service is disabled, contact your administrator."
    >
      <RequestResetForm
        submitLabel="Request a new setup link"
        successText="If an account exists for that email, we’ve sent a new setup link. Check your inbox, and contact your administrator if it doesn’t arrive."
      />
    </AuthCard>
  );
}
