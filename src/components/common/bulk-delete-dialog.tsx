"use client";

import * as React from "react";
import { Archive, Loader2, Trash2 } from "lucide-react";
import { AssetImage } from "@/components/common/asset-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";

export interface BulkDeleteItem {
  id: string;
  name: string;
  thumbnailUrl?: string;
  /** Used by history → permanent deletion needs an explicit, separate choice. */
  referenced: boolean;
}

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plural lowercase type, e.g. "products". */
  assetTypePlural: string;
  items: BulkDeleteItem[];
  archive: (id: string) => void;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  /** Receives the ids that should STAY selected (un-acted + failed). */
  onResult: (remainingSelectedIds: string[]) => void;
}

/**
 * Bulk confirmation that NEVER combines deletion and archival behind one button.
 * It pre-calculates the exact outcome (how many are eligible for permanent delete
 * vs used by previous mockups) and offers each as a separate, explicit action.
 * Each action processes only its subset, reports Permanently deleted / Removed
 * from active library / Failed, and keeps every un-acted or failed item selected.
 */
export function BulkDeleteDialog({
  open,
  onOpenChange,
  assetTypePlural,
  items,
  archive,
  remove,
  refresh,
  onResult,
}: BulkDeleteDialogProps) {
  const [busy, setBusy] = React.useState<null | "delete" | "archive">(null);
  const eligible = items.filter((i) => !i.referenced);
  const referenced = items.filter((i) => i.referenced);
  const plural = (n: number, word = "item") => `${n} ${word}${n === 1 ? "" : "s"}`;

  const runAction = async (kind: "delete" | "archive") => {
    const subset = kind === "delete" ? eligible : referenced;
    if (subset.length === 0) return;
    setBusy(kind);
    const succeeded: string[] = [];
    const failed: string[] = [];
    for (const item of subset) {
      try {
        if (kind === "delete") await remove(item.id);
        else archive(item.id);
        succeeded.push(item.id);
      } catch {
        failed.push(item.id);
      }
    }
    await refresh();
    setBusy(null);
    // Keep everything that wasn't successfully acted on selected (the other
    // category + any failures), so nothing disappears without an explicit action.
    const remaining = items.map((i) => i.id).filter((id) => !succeeded.includes(id));
    onResult(remaining);
    onOpenChange(false);

    const verb = kind === "delete" ? "permanently deleted" : "removed from active library";
    const parts: string[] = [];
    if (succeeded.length) parts.push(`${succeeded.length} ${verb}`);
    if (failed.length) parts.push(`${failed.length} failed`);
    const summary = parts.join(" · ") || "No changes";
    if (failed.length) toast.error(`${summary}. Failed items kept selected.`);
    else toast.success(summary);
  };

  const title =
    referenced.length === 0
      ? `Delete ${plural(items.length, assetTypePlural.replace(/s$/, ""))}?`
      : eligible.length === 0
        ? `These ${assetTypePlural} are used by previous mockups`
        : `Delete ${items.length} selected ${assetTypePlural}?`;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent showClose={!busy} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {eligible.length > 0 && `${plural(eligible.length)} can be permanently deleted`}
            {eligible.length > 0 && referenced.length > 0 && "; "}
            {referenced.length > 0 &&
              `${plural(referenced.length)} ${referenced.length === 1 ? "is" : "are"} used by previous mockups and can only be removed from the active library`}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {items.slice(0, 12).map((i) => (
            <span
              key={i.id}
              className="bg-muted size-12 overflow-hidden rounded-md"
              title={`${i.name}${i.referenced ? " — used by mockups (archive only)" : " — eligible for permanent delete"}`}
            >
              <AssetImage src={i.thumbnailUrl} alt={i.name} className="size-full object-cover" />
            </span>
          ))}
          {items.length > 12 && (
            <span className="text-muted-foreground flex size-12 items-center justify-center text-xs">
              +{items.length - 12}
            </span>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!busy}>
            Cancel
          </Button>
          {referenced.length > 0 && (
            <Button onClick={() => void runAction("archive")} disabled={!!busy}>
              {busy === "archive" ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />}
              Remove {plural(referenced.length)} from active library
            </Button>
          )}
          {eligible.length > 0 && (
            <Button variant="destructive" onClick={() => void runAction("delete")} disabled={!!busy}>
              {busy === "delete" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete {plural(eligible.length)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
