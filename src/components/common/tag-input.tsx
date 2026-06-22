"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function TagInput({ value, onChange, placeholder = "Add tag and press Enter", id, className }: TagInputProps) {
  const [draft, setDraft] = React.useState("");

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };

  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div
      className={cn(
        "border-input bg-background flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 shadow-sm focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40",
        className,
      )}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={`Remove ${tag}`}
            className="hover:text-foreground -mr-0.5 rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft && addTag(draft)}
        placeholder={value.length === 0 ? placeholder : ""}
        className="placeholder:text-muted-foreground min-w-24 flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}
