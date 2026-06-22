"use client";

import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toggleItemVariants = cva(
  "inline-flex items-center justify-center gap-1.5 text-sm font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:pointer-events-none data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm text-muted-foreground hover:text-foreground",
  {
    variants: {
      size: {
        default: "h-8 px-3 rounded-md",
        sm: "h-7 px-2 rounded-sm text-xs",
        lg: "h-10 px-4 rounded-md",
      },
    },
    defaultVariants: { size: "default" },
  },
);

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleItemVariants>>({ size: "default" });

function ToggleGroup({
  className,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleItemVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn("inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-1", className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ size }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleItemVariants>) {
  const context = React.useContext(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(toggleItemVariants({ size: size ?? context.size }), className)}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
