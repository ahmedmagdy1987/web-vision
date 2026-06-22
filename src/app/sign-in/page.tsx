import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="bg-background min-h-dvh" />}>
      <SignInForm />
    </Suspense>
  );
}
