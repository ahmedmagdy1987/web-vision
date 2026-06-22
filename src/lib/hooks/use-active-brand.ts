"use client";

import { useMemo } from "react";
import type { Brand } from "@/lib/domain";
import { useAppState } from "./use-app-store";
import { useBrands } from "./use-collection";

/**
 * Resolve the active brand: the explicitly selected brand, falling back to the
 * first active brand so the UI always has an accent to adopt.
 */
export function useActiveBrand(): { brand: Brand | null; brands: Brand[] } {
  const brands = useBrands();
  const { selectedBrandId } = useAppState();

  const brand = useMemo(() => {
    const active = brands.filter((b) => b.status === "active");
    const selected = brands.find((b) => b.id === selectedBrandId);
    // Only honor the explicit selection while that brand is still active, so the
    // app never stays bound to an archived brand.
    const validSelected = selected && selected.status === "active" ? selected : undefined;
    return validSelected ?? active[0] ?? brands[0] ?? null;
  }, [brands, selectedBrandId]);

  return { brand, brands };
}
