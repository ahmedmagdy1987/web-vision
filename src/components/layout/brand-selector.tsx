"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Plus, SlidersHorizontal } from "lucide-react";
import { AssetImage } from "@/components/common/asset-image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appStore, useActiveBrand } from "@/lib/hooks";
import { type Brand, getDefaultLogo } from "@/lib/domain";
import { cn } from "@/lib/utils";

function BrandMark({ brand }: { brand: Brand }) {
  const logo = getDefaultLogo(brand);
  return (
    <span className="bg-card flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border">
      {logo ? (
        <AssetImage src={logo.asset.url} alt="" className="size-full object-cover" />
      ) : (
        <span className="size-3 rounded-full" style={{ backgroundColor: brand.accentColor }} />
      )}
    </span>
  );
}

function BrandRow({ brand, active }: { brand: Brand; active?: boolean }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <BrandMark brand={brand} />
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium">{brand.name}</span>
      </span>
      {active && <Check className="text-brand size-4 shrink-0" />}
    </span>
  );
}

export function BrandSelector({ className }: { className?: string }) {
  const { brand, brands } = useActiveBrand();
  const activeBrands = brands.filter((b) => b.status === "active");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-9 min-w-0 justify-between gap-2 px-2 sm:max-w-[220px] sm:px-2.5", className)}
          aria-label="Select brand"
        >
          <span className="flex min-w-0 items-center gap-2">
            {brand ? (
              <>
                <BrandMark brand={brand} />
                <span className="hidden min-w-0 truncate text-sm font-medium sm:block">{brand.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground text-sm">No brand</span>
            )}
          </span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel>Switch brand</DropdownMenuLabel>
        {activeBrands.length === 0 && (
          <p className="text-muted-foreground px-2 py-1.5 text-xs">No active brands yet.</p>
        )}
        {activeBrands.map((b) => (
          <DropdownMenuItem key={b.id} onSelect={() => appStore.setSelectedBrand(b.id)} className="gap-0">
            <BrandRow brand={b} active={b.id === brand?.id} />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/identity">
            <SlidersHorizontal className="size-4" />
            Manage brands
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/identity?new=1">
            <Plus className="size-4" />
            Add brand
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
