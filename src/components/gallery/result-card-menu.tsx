"use client";

import * as React from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import type { GenerationResult } from "@/lib/domain";
import { resultRepository } from "@/lib/repositories";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteResultDialog } from "./delete-result-dialog";

/** Reusable per-result actions (⋮) with a Delete entry + the custom confirmation.
 *  `onDeleted` lets callers react (e.g. navigate back from Result Detail). */
export function ResultCardMenu({
  result,
  onDeleted,
  className,
  triggerLabel,
}: {
  result: GenerationResult;
  onDeleted?: () => void;
  className?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={triggerLabel ?? `Actions for ${result.snapshot.brandName} mockup`}
            className={className}
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onSelect={() => setOpen(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteResultDialog
        open={open}
        onOpenChange={setOpen}
        result={result}
        onDelete={async () => {
          await resultRepository.deleteResult(result.id);
          toast.success("Mockup deleted");
          onDeleted?.();
        }}
      />
    </>
  );
}
