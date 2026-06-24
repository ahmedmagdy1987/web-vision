import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official Malahi application logo (public/malahi-logo.png). Rendered exactly as
 * supplied — never redrawn, recolored, distorted or stretched. Transparency and
 * aspect ratio are preserved via `object-contain`; delivery is optimized by
 * next/image. In dark mode the navy logo is placed on a neutral white container
 * for sufficient contrast (the logo itself is not recolored).
 *
 * NOTE: this is the permanent application identity — distinct from the client
 * logos employees select inside the Logo Library for mockup generation.
 */
export function MalahiLogo({ className, imgClassName }: { className?: string; imgClassName?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg p-1 dark:bg-white dark:p-1.5 dark:shadow-sm dark:ring-1 dark:ring-black/5",
        className,
      )}
    >
      <Image
        src="/malahi-logo.png"
        alt="Malahi"
        width={250}
        height={132}
        priority
        className={cn("w-auto object-contain", imgClassName ?? "h-7")}
      />
    </span>
  );
}

export function AppLogo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return <MalahiLogo className={className} imgClassName={collapsed ? "h-6 max-w-[44px]" : "h-7"} />;
}
