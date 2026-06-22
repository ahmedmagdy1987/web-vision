"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import type { Product } from "@/lib/domain";
import { AssetImage } from "@/components/common/asset-image";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ProductPicker({
  products,
  selectedIds,
  onToggle,
}: {
  products: Product[];
  selectedIds: string[];
  onToggle: (productId: string) => void;
}) {
  const active = products.filter((p) => p.status === "active");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Products</Label>
        {selectedIds.length > 0 && (
          <span className="text-muted-foreground text-xs">{selectedIds.length} selected</span>
        )}
      </div>

      {active.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-center text-sm">
          <Package className="size-5" />
          <span>
            No active products for this brand.{" "}
            <Link href="/products" className="text-brand underline-offset-2 hover:underline">
              Add products
            </Link>
            .
          </span>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {active.map((product) => {
            const selected = selectedIds.includes(product.id);
            return (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => onToggle(product.id)}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                    selected ? "border-brand bg-brand-subtle" : "border-border hover:border-brand-border hover:bg-accent/40",
                  )}
                >
                  <Checkbox checked={selected} tabIndex={-1} aria-hidden className="pointer-events-none" />
                  <span className="bg-card size-10 shrink-0 overflow-hidden rounded-md border">
                    <AssetImage src={product.mainImage?.url} alt="" className="size-full object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{product.name}</span>
                    <span className="text-muted-foreground block truncate text-xs">{product.category}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
