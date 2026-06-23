/**
 * Repository backend selection.
 *
 * Exposes the same singleton names the app already imports. The concrete
 * implementation is chosen once, at module load, by getDataBackend():
 *  - "supabase" → Supabase Postgres + Storage (optimistic write-through)
 *  - "local"    → in-browser localStorage demo backend (Phase 1/2 behaviour)
 *
 * There is no silent fallback: when Supabase is configured it is used; choosing
 * the demo backend requires an explicit NEXT_PUBLIC_DATA_BACKEND=local.
 */
import { getDataBackend } from "@/lib/config/backend";

import { brandRepository as localBrandRepository } from "./brand-repository";
import { productRepository as localProductRepository } from "./product-repository";
import { locationRepository as localLocationRepository } from "./location-repository";
import { jobRepository as localJobRepository } from "./job-repository";
import { resultRepository as localResultRepository } from "./result-repository";
import { projectRepository as localProjectRepository } from "./project-repository";

import { SupabaseBrandRepository } from "./supabase/brand-repository";
import { SupabaseProductRepository } from "./supabase/product-repository";
import { SupabaseLocationRepository } from "./supabase/location-repository";
import { SupabaseJobRepository } from "./supabase/job-repository";
import { SupabaseResultRepository } from "./supabase/result-repository";
import { SupabaseProjectRepository } from "./supabase/project-repository";

import type {
  BrandRepositoryApi,
  JobRepositoryApi,
  LocationRepositoryApi,
  ProductRepositoryApi,
  ProjectRepositoryApi,
  ResultRepositoryApi,
} from "./types";

const useSupabase = getDataBackend() === "supabase";

export const brandRepository: BrandRepositoryApi = useSupabase
  ? new SupabaseBrandRepository()
  : localBrandRepository;
export const productRepository: ProductRepositoryApi = useSupabase
  ? new SupabaseProductRepository()
  : localProductRepository;
export const locationRepository: LocationRepositoryApi = useSupabase
  ? new SupabaseLocationRepository()
  : localLocationRepository;
export const jobRepository: JobRepositoryApi = useSupabase
  ? new SupabaseJobRepository()
  : localJobRepository;
export const resultRepository: ResultRepositoryApi = useSupabase
  ? new SupabaseResultRepository()
  : localResultRepository;
export const projectRepository: ProjectRepositoryApi = useSupabase
  ? new SupabaseProjectRepository()
  : localProjectRepository;

/* ----------------------------- re-exports ------------------------------ */
export { storage } from "./storage";
export { ObservableCollection } from "./observable-store";

export { BrandRepository } from "./brand-repository";
export { ProductRepository } from "./product-repository";
export { LocationRepository } from "./location-repository";
export { JobRepository } from "./job-repository";
export { ResultRepository } from "./result-repository";
export { ProjectRepository } from "./project-repository";

export { organizationRepository } from "./supabase/organization-repository";
export type { Organization, OrgMembership } from "./supabase/organization-repository";

export type {
  ReadableStore,
  BrandRepositoryApi,
  ProductRepositoryApi,
  LocationRepositoryApi,
  JobRepositoryApi,
  ResultRepositoryApi,
  CreateBrandInput,
  CreateLogoInput,
  ProductInput,
  LocationInput,
  ProjectInput,
  ProjectRepositoryApi,
} from "./types";
