import { Suspense } from "react";
import { SetPasswordForm } from "@/components/auth/set-password-form";

export const metadata = { title: "Create your password" };

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="bg-background min-h-dvh" />}>
      <SetPasswordForm />
    </Suspense>
  );
}
