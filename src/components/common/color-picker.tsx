"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { isValidHexColor } from "@/lib/theme/brand-accent";
import { cn } from "@/lib/utils";

const PRESETS = [
  "#0d9488",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#22c55e",
  "#10b981",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#8b5cf6",
  "#64748b",
  "#18181b",
];

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  id?: string;
  className?: string;
}

export function ColorPicker({ value, onChange, id, className }: ColorPickerProps) {
  const [draft, setDraft] = React.useState(value);
  const [lastValue, setLastValue] = React.useState(value);

  // Adjust the editable draft when the controlled value changes externally
  // (React's recommended "adjust state during render" pattern).
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  const valid = isValidHexColor(draft);

  const commit = (next: string) => {
    setDraft(next);
    if (isValidHexColor(next)) onChange(next.startsWith("#") ? next : `#${next}`);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <label
          className="border-input relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-sm"
          style={{ backgroundColor: valid ? draft : "transparent" }}
        >
          <input
            type="color"
            value={valid ? draft : "#000000"}
            onChange={(e) => commit(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Pick accent color"
          />
        </label>
        <Input
          id={id}
          value={draft}
          onChange={(e) => commit(e.target.value)}
          placeholder="#6366f1"
          aria-invalid={!valid}
          className="font-mono uppercase"
          maxLength={7}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const selected = value.toLowerCase() === preset.toLowerCase();
          return (
            <button
              key={preset}
              type="button"
              onClick={() => commit(preset)}
              aria-label={`Use ${preset}`}
              aria-pressed={selected}
              className="relative size-6 rounded-full ring-offset-background transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 outline-none"
              style={{ backgroundColor: preset }}
            >
              {selected && <Check className="absolute inset-0 m-auto size-3.5 text-white drop-shadow" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
