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
  /** Already archived → can't be "removed from active library" again. */
  archived?: boolean;
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

type Busy = null | "delete" | "archive" | "deleteAll";

/**
 * Bulk confirmation that NEVER silently converts Delete into Archive. It
 * pre-calculates the exact outcome — eligible (unreferenced), referenced, and
 * already-archived — and offers each as a separate, explicit action:
 *   • Delete N eligible items (permanent)
 *   • Remove M referenced items from active library (archive)
 *   • Permanently delete selected anyway (force, behind its own 2nd confirmation)
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
  const [busy, setBusy] = React.useState<Busy>(null);
  const [confirmAll, setConfirmAll] = React.useState(false);

  const eligible = items.filter((i) => !i.referenced); // safe to permanently delete
  const referenced = items.filter((i) => i.referenced);
  const referencedActive = referenced.filter((i) => !i.archived); // can be archived
  const archivedCount = items.filter((i) => i.archived).length;
  const plural = (n: number, word = "item") => `${n} ${word}${n === 1 ? "" : "s"}`;

  const close = (next: boolean) => {
    if (busy) return;
    if (!next) setConfirmAll(false);
    onOpenChange(next);
  };

  const process = async (
    subset: BulkDeleteItem[],
    useRemove: boolean,
    verb: string,
    busyKey: Busy,
  ) => {
    if (subset.length === 0) return;
    setBusy(busyKey);
    const succeeded: string[] = [];
    const failed: string[] = [];
    for (const item of subset) {
      try {
        if (useRemove) await remove(item.id);
        else archive(item.id);
        succeeded.push(item.id);
      } catch {
        failed.push(item.id);
      }
    }
    await refresh();
    setBusy(null);
    setConfirmAll(false);
    // Keep everything not successfully acted on selected (the other categories +
    // any failures), so nothing disappears without an explicit action.
    onResult(items.map((i) => i.id).filter((id) => !succeeded.includes(id)));
    onOpenChange(false);

    const parts: string[] = [];
    if (succeeded.length) parts.push(`${succeeded.length} ${verb}`);
    if (failed.length) parts.push(`${failed.length} failed`);
    const summary = parts.join(" · ") || "No changes";
    if (failed.length) toast.error(`${summary}. Failed items kept selected.`);
    else toast.success(summary);
  };

  // ---- Second, destructive confirmation for "permanently delete selected anyway"
  if (confirmAll) {
    return (
      <Dialog open={open} onOpenChange={close}>
        <DialogContent showClose={!busy} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Permanently delete {plural(items.length, assetTypePlural.replace(/s$/, ""))}?</DialogTitle>
            <DialogDescription>
              This permanently deletes all {plural(items.length, assetTypePlural.replace(/s$/, ""))} and their
              uploaded files, including any used by previous mockups. Existing Gallery results keep their generated
              images and names. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmAll(false)} disabled={!!busy}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => void process(items, true, "permanently deleted", "deleteAll")}
              disabled={!!busy}
            >
              {busy === "deleteAll" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Permanently delete {items.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const title =
    referenced.length === 0
      ? `Delete ${plural(items.length, assetTypePlural.replace(/s$/, ""))}?`
      : eligible.length === 0
        ? `These ${assetTypePlural} are used by previous mockups`
        : `Delete ${items.length} selected ${assetTypePlural}?`;

  const clauses: string[] = [];
  if (eligible.length) clauses.push(`${plural(eligible.length)} eligible for permanent deletion`);
  if (referencedActive.length)
    clauses.push(`${plural(referencedActive.length)} referenced (removable from the active library)`);
  if (archivedCount) clauses.push(`${plural(archivedCount)} already archived`);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent showClose={!busy} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{clauses.join(" · ") || `${plural(items.length)} selected`}.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {items.slice(0, 12).map((i) => (
            <span
              key={i.id}
              className="bg-muted relative size-12 overflow-hidden rounded-md"
              title={`${i.name}${i.archived ? " — archived" : ""}${i.referenced ? " — used by mockups" : " — eligible for permanent delete"}`}
            >
              <AssetImage src={i.thumbnailUrl} alt={i.name} className="size-full object-cover" />
              {i.archived && <span className="bg-foreground/70 absolute inset-x-0 bottom-0 text-center text-[8px] font-medium text-background">Archived</span>}
            </span>
          ))}
          {items.length > 12 && (
            <span className="text-muted-foreground flex size-12 items-center justify-center text-xs">
              +{items.length - 12}
            </span>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {referenced.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive sm:mr-auto"
              onClick={() => setConfirmAll(true)}
              disabled={!!busy}
            >
              Permanently delete selected anyway
            </Button>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!busy}>
              Cancel
            </Button>
            {referencedActive.length > 0 && (
              <Button
                onClick={() => void process(referencedActive, false, "removed from active library", "archive")}
                disabled={!!busy}
              >
                {busy === "archive" ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />}
                Remove {plural(referencedActive.length)} from active library
              </Button>
            )}
            {eligible.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => void process(eligible, true, "permanently deleted", "delete")}
                disabled={!!busy}
              >
                {busy === "delete" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Delete {plural(eligible.length)}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
