"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
  containerClassName?: string;
}

export function SearchInput({
  value,
  onValueChange,
  placeholder = "Search…",
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={cn("pl-9", value && "pr-9", className)}
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onValueChange("")}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
