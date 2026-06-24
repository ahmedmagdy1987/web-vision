import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official Malahi application logo (public/malahi-logo.png). Rendered exactly as
 * supplied — never redrawn, recolored, distorted or stretched. Transparency and
 * aspect ratio are preserved via `object-contain`; delivery is optimized by
 * next/image.
 *
 * The navy PNG is rendered as-is (no recolor / no CSS filter). For dark-mode
 * contrast the surrounding surface is lightened by the layout (an integrated
 * light brand-header band / panel), NOT a floating white pill around the logo.
 *
 * NOTE: this is the permanent application identity — distinct from the client
 * logos employees select inside the Logo Library for mockup generation.
 */
export function MalahiLogo({ className, imgClassName }: { className?: string; imgClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center justify-center", className)}>
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
