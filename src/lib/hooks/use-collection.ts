"use client";

import { useSyncExternalStore } from "react";
import type { Brand, GenerationJob, GenerationResult, Location, Product, Project } from "@/lib/domain";
import {
  brandRepository,
  jobRepository,
  locationRepository,
  productRepository,
  projectRepository,
  resultRepository,
} from "@/lib/repositories";
import type { ReadableStore } from "@/lib/repositories/types";

/** Subscribe a component to any observable collection (either backend). */
export function useCollection<T extends { id: string }>(store: ReadableStore<T>): T[] {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
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

export function useProjects(): Project[] {
  return useCollection(projectRepository);
}
