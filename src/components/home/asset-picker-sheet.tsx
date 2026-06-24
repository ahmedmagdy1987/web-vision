"use client";

import * as React from "react";
import { Check, UploadCloud, type LucideIcon } from "lucide-react";
import { AssetImage } from "@/components/common/asset-image";
import { EmptyState } from "@/components/common/empty-state";
import { SearchInput } from "@/components/common/search-input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface PickerItem {
  id: string;
  name: string;
  thumbnailUrl?: string;
  subtitle?: string;
}

/**
 * Visual asset picker — a side sheet of thumbnail tiles with search, an upload
 * action, selected state and an empty state. Used for Logo/Product/Location
 * selection on Home (no plain-text dropdowns).
 */
export function AssetPickerSheet({
  open,
  onOpenChange,
  title,
  items,
  selectedIds,
  multi = false,
  onPick,
  onUpload,
  uploadLabel = "Upload",
  searchPlaceholder = "Search…",
  emptyIcon,
  emptyTitle,
  emptyHint,
  fit = "cover",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  items: PickerItem[];
  selectedIds: string[];
  multi?: boolean;
  onPick: (id: string) => void;
  onUpload?: () => void;
  uploadLabel?: string;
  searchPlaceholder?: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyHint: string;
  fit?: "cover" | "contain";
}) {
  const [q, setQ] = React.useState("");
  const term = q.trim().toLowerCase();
  const filtered = term ? items.filter((i) => i.name.toLowerCase().includes(term)) : items;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-3 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-2">
          <SearchInput value={q} onValueChange={setQ} placeholder={searchPlaceholder} containerClassName="flex-1" />
          {onUpload && (
            <Button size="sm" onClick={onUpload}>
              <UploadCloud className="size-4" />
              {uploadLabel}
            </Button>
          )}
        </div>

        <div className="scrollbar-thin -mx-1 flex-1 overflow-y-auto px-1">
          {items.length === 0 ? (
            <EmptyState
              icon={emptyIcon}
              title={emptyTitle}
              description={emptyHint}
              action={
                onUpload ? (
                  <Button onClick={onUpload}>
                    <UploadCloud className="size-4" />
                    {uploadLabel}
                  </Button>
                ) : undefined
              }
            />
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No matches for “{q}”.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filtered.map((item) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onPick(item.id);
                      if (!multi) onOpenChange(false);
                    }}
                    aria-pressed={selected}
                    className={cn(
                      "group relative overflow-hidden rounded-lg border text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                      selected ? "border-brand ring-2 ring-brand/30" : "border-border hover:border-brand-border",
                    )}
                  >
                    <span className="bg-muted block aspect-square w-full overflow-hidden">
                      <AssetImage
                        src={item.thumbnailUrl}
                        alt=""
                        className={cn("size-full", fit === "contain" ? "object-contain p-2" : "object-cover")}
                      />
                    </span>
                    <span className="block truncate px-2 py-1.5 text-xs font-medium">{item.name}</span>
                    {selected && (
                      <span className="bg-brand text-brand-foreground absolute right-1.5 top-1.5 rounded-full p-0.5">
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {multi && (
          <SheetFooter>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
