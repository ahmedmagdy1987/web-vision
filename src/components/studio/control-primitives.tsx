"use client";

import * as React from "react";
import type { ControlOption } from "@/lib/domain";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export function ControlField({
  label,
  description,
  valueLabel,
  htmlFor,
  children,
  className,
}: {
  label: string;
  description?: string;
  valueLabel?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-sm">
          {label}
        </Label>
        {valueLabel && <span className="text-muted-foreground text-xs font-medium">{valueLabel}</span>}
      </div>
      {children}
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "sm",
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ControlOption<T>[];
  size?: "sm" | "default";
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      size={size}
      className={cn("flex w-full flex-wrap", className)}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label} className="flex-1">
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function SettingSelect<T extends string>({
  value,
  onChange,
  options,
  id,
  placeholder = "Select…",
}: {
  value: T;
  onChange: (value: T) => void;
  options: ControlOption<T>[];
  id?: string;
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Stable id generator for control fields (avoids hydration mismatch concerns).
export function useFieldId(prefix: string): string {
  const reactId = React.useId();
  return `${prefix}-${reactId}`;
}
