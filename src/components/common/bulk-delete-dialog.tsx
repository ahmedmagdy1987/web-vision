"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
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
  /** Used by history → can only be archived, never permanently deleted. */
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
  /** Receives ids that failed so the page can keep them selected for retry. */
  onResult: (failedIds: string[]) => void;
}

/**
 * One custom confirmation for a bulk archive/delete. Shows the total, a thumbnail
 * strip, and an accurate split of how many will be permanently deleted vs only
 * archived (because they're referenced by history). Processes every item safely,
 * never stops on a partial failure, and reports Deleted/Archived/Failed — keeping
 * failed items selected for retry.
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
  const [busy, setBusy] = React.useState(false);
  const deletable = items.filter((i) => !i.referenced);
  const archivable = items.filter((i) => i.referenced);

  const handleConfirm = async () => {
    setBusy(true);
    const deleted: string[] = [];
    const archived: string[] = [];
    const failed: string[] = [];
    for (const item of items) {
      try {
        if (item.referenced) {
          archive(item.id);
          archived.push(item.id);
        } else {
          await remove(item.id);
          deleted.push(item.id);
        }
      } catch {
        failed.push(item.id);
      }
    }
    await refresh();
    setBusy(false);
    onResult(failed);
    onOpenChange(false);

    const parts: string[] = [];
    if (deleted.length) parts.push(`${deleted.length} deleted`);
    if (archived.length) parts.push(`${archived.length} archived`);
    if (failed.length) parts.push(`${failed.length} failed`);
    const summary = parts.join(" · ") || "No changes";
    if (failed.length) toast.error(`${summary}. Failed items kept selected.`);
    else toast.success(summary);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent showClose={!busy} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Delete {items.length} selected {assetTypePlural}?
          </DialogTitle>
          <DialogDescription>
            {deletable.length > 0 && `${deletable.length} will be permanently deleted`}
            {deletable.length > 0 && archivable.length > 0 && " and "}
            {archivable.length > 0 &&
              `${archivable.length} will be removed from the active library because ${
                archivable.length === 1 ? "it is" : "they are"
              } used by existing mockups`}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {items.slice(0, 12).map((i) => (
            <span
              key={i.id}
              className="bg-muted size-12 overflow-hidden rounded-md"
              title={`${i.name}${i.referenced ? " — archived (used by mockups)" : ""}`}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={busy || items.length === 0}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
