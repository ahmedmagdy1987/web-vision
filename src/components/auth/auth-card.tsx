import { Card } from "@/components/ui/card";
import { MalahiLogo } from "@/components/layout/app-logo";

/**
 * Shared branded wrapper for the authentication screens. Uses the official
 * Malahi logo, matching the app shell.
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-start gap-2">
          <MalahiLogo imgClassName="h-9" />
          <p className="text-muted-foreground text-xs">Mockup Generator · internal tool</p>
        </div>
        <Card className="p-6">
          {title && <h1 className="text-lg font-semibold tracking-tight">{title}</h1>}
          {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
          <div className={title || description ? "mt-5" : ""}>{children}</div>
        </Card>
        {footer && <div className="text-muted-foreground mt-4 text-center text-xs">{footer}</div>}
      </div>
    </div>
  );
}
