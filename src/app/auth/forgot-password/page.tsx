import { AuthCard } from "@/components/auth/auth-card";
import { RequestResetForm } from "@/components/auth/request-reset-form";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we’ll send a secure link to set a new password."
    >
      <RequestResetForm
        submitLabel="Send reset link"
        successText="If an account exists for that email, we’ve sent a link to set a new password. Check your inbox."
      />
    </AuthCard>
  );
}
