"use client";

import { useSyncExternalStore } from "react";
import type { Brand, GenerationJob, GenerationResult, Location, Product } from "@/lib/domain";
import {
  brandRepository,
  jobRepository,
  locationRepository,
  ObservableCollection,
  productRepository,
  resultRepository,
} from "@/lib/repositories";

/** Subscribe a component to any observable collection. */
export function useCollection<T extends { id: string }>(collection: ObservableCollection<T>): T[] {
  return useSyncExternalStore(collection.subscribe, collection.getSnapshot, collection.getServerSnapshot);
}

export function useBrands(): Brand[] {
  return useCollection(brandRepository);
}

export function useProducts(): Product[] {
  return useCollection(productRepository);
}

export function useLocations(): Location[] {
  return useCollection(locationRepository);
}

export function useJobs(): GenerationJob[] {
  return useCollection(jobRepository);
}

export function useResults(): GenerationResult[] {
  return useCollection(resultRepository);
}
