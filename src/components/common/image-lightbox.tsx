"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, ChevronRight, Download, Minus, Plus, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LightboxImage {
  url: string;
  alt: string;
}

interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: LightboxImage[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Optional download action shown in the toolbar (e.g. for generated results). */
  onDownload?: () => void;
  downloadBusy?: boolean;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function ToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-9 items-center justify-center rounded-md text-white/90 outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/**
 * Reusable image lightbox. Opens by clicking an image; shows it at its natural
 * aspect ratio with object-fit: contain (never cropped/stretched). Dark backdrop,
 * Escape to close, focus trapped + restored (Radix Dialog), optional next/prev
 * for multi-image sets, and zoom in/out/reset/fit. Does not select assets.
 */
export function ImageLightbox({
  open,
  onOpenChange,
  images,
  index,
  onIndexChange,
  onDownload,
  downloadBusy,
}: ImageLightboxProps) {
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const drag = React.useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const count = images.length;
  const current = images[index];

  const resetView = React.useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Reset zoom/pan on navigation and on close, so each opened image starts fit.
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) resetView();
      onOpenChange(next);
    },
    [onOpenChange, resetView],
  );

  const go = React.useCallback(
    (delta: number) => {
      if (count < 2) return;
      resetView();
      onIndexChange((index + delta + count) % count);
    },
    [count, index, onIndexChange, resetView],
  );

  const zoom = React.useCallback((delta: number) => {
    setScale((s) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((s + delta) * 10) / 10));
      if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoom(0.5);
      } else if (e.key === "-") {
        e.preventDefault();
        zoom(-0.5);
      } else if (e.key === "0") {
        e.preventDefault();
        resetView();
      }
    },
    [go, zoom, resetView],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    drag.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };

  if (!current) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label={current.alt}
          onKeyDown={onKeyDown}
          className="fixed inset-0 z-50 flex max-w-[100vw] flex-col overflow-hidden outline-none"
        >
          <DialogPrimitive.Title className="sr-only">{current.alt}</DialogPrimitive.Title>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 p-3 text-white">
            <span className="min-w-16 text-xs font-medium tabular-nums">
              {count > 1 ? `${index + 1} of ${count}` : ""}
            </span>
            <div className="flex items-center gap-0.5 rounded-lg bg-black/40 p-1">
              <ToolbarButton label="Zoom out" onClick={() => zoom(-0.5)} disabled={scale <= MIN_SCALE}>
                <Minus className="size-4" />
              </ToolbarButton>
              <span className="w-12 text-center text-xs tabular-nums">{Math.round(scale * 100)}%</span>
              <ToolbarButton label="Zoom in" onClick={() => zoom(0.5)} disabled={scale >= MAX_SCALE}>
                <Plus className="size-4" />
              </ToolbarButton>
              <ToolbarButton label="Fit to screen" onClick={resetView} disabled={scale === MIN_SCALE}>
                <RotateCcw className="size-4" />
              </ToolbarButton>
              {onDownload && (
                <ToolbarButton label="Download" onClick={onDownload} disabled={downloadBusy}>
                  <Download className="size-4" />
                </ToolbarButton>
              )}
              <DialogPrimitive.Close asChild>
                <ToolbarButton label="Close">
                  <X className="size-5" />
                </ToolbarButton>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Image stage */}
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pb-4 sm:px-12"
            onWheel={(e) => zoom(e.deltaY < 0 ? 0.25 : -0.25)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={current.alt}
              draggable={false}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
              className={cn(
                "max-h-full max-w-full touch-none select-none object-contain transition-transform",
                scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
              )}
              onDoubleClick={() => (scale > 1 ? resetView() : zoom(1))}
            />

            {count > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() => go(-1)}
                  className="absolute left-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white outline-none transition-colors hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white/70 sm:left-3"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() => go(1)}
                  className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white outline-none transition-colors hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white/70 sm:right-3"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
