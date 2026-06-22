"use client";

import * as React from "react";
import { ImagePlus, Loader2, Star, Trash2, UploadCloud } from "lucide-react";
import type { ImageAsset } from "@/lib/domain";
import { ACCEPTED_IMAGE_EXTENSIONS, filesToImageAssets, formatBytes } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { AssetImage } from "./asset-image";
import { toast } from "@/components/ui/sonner";

interface ImageDropzoneProps {
  value: ImageAsset[];
  onChange: (assets: ImageAsset[]) => void;
  multiple?: boolean;
  max?: number;
  mainImageId?: string;
  onSetMain?: (id: string) => void;
  label?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
}

export function ImageDropzone({
  value,
  onChange,
  multiple = true,
  max,
  mainImageId,
  onSetMain,
  label = "Drop images or click to upload",
  hint = "PNG, JPG, WEBP, SVG · up to 8MB each",
  className,
  disabled = false,
}: ImageDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const atCapacity = max != null && value.length >= max;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setLoading(true);
    try {
      const incoming = Array.from(fileList);
      const { assets, errors } = await filesToImageAssets(incoming);
      errors.forEach((err) => toast.error(err));
      if (assets.length === 0) return;

      if (!multiple) {
        onChange([assets[0]]);
        return;
      }
      let next = [...value, ...assets];
      if (max != null && next.length > max) {
        next = next.slice(0, max);
        toast.warning(`Only the first ${max} images were kept.`);
      }
      onChange(next);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    void handleFiles(e.dataTransfer.files);
  };

  const removeAsset = (id: string) => onChange(value.filter((a) => a.id !== id));

  return (
    <div className={cn("space-y-3", className)}>
      {!atCapacity && (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !disabled) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring/50",
            dragging ? "border-brand bg-brand-subtle" : "border-input hover:border-brand-border hover:bg-accent/40",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          {loading ? (
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          ) : (
            <UploadCloud className={cn("size-6", dragging ? "text-brand" : "text-muted-foreground")} />
          )}
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-muted-foreground text-xs">{hint}</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_EXTENSIONS}
            multiple={multiple}
            className="sr-only"
            disabled={disabled}
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </div>
      )}

      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((asset) => {
            const isMain = onSetMain != null && mainImageId === asset.id;
            return (
              <li key={asset.id} className="group border-border bg-card relative overflow-hidden rounded-lg border">
                <AssetImage src={asset.url} alt={asset.name} className="aspect-square w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                  <span className="truncate text-[11px] text-white/90" title={asset.name}>
                    {formatBytes(asset.size)}
                  </span>
                  <div className="flex items-center gap-1">
                    {onSetMain && (
                      <button
                        type="button"
                        onClick={() => onSetMain(asset.id)}
                        aria-label={isMain ? "Main image" : "Set as main image"}
                        aria-pressed={isMain}
                        className="rounded-sm bg-white/15 p-1 text-white backdrop-blur transition hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white/70 outline-none"
                      >
                        <Star className={cn("size-3.5", isMain && "fill-current")} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAsset(asset.id)}
                      aria-label={`Remove ${asset.name}`}
                      className="rounded-sm bg-white/15 p-1 text-white backdrop-blur transition hover:bg-destructive focus-visible:ring-2 focus-visible:ring-white/70 outline-none"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                {isMain && (
                  <span className="bg-brand text-brand-foreground absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium">
                    Main
                  </span>
                )}
              </li>
            );
          })}
          {atCapacity && multiple && (
            <li className="text-muted-foreground flex items-center justify-center rounded-lg border border-dashed p-3 text-center text-xs">
              <span className="flex flex-col items-center gap-1">
                <ImagePlus className="size-4" />
                Max {max} reached
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
