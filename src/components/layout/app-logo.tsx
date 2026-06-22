import { Aperture } from "lucide-react";
import { cn } from "@/lib/utils";

/** Web Vision product wordmark; the mark adopts the active brand accent. */
export function AppLogo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="bg-brand text-brand-foreground flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm">
        <Aperture className="size-5" />
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">Web Vision</p>
          <p className="text-muted-foreground truncate text-[11px]">Malahi Studio</p>
        </div>
      )}
    </div>
  );
}
