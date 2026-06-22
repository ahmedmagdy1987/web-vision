/**
 * Repository contracts shared by both backends.
 *
 *  - `ReadableStore<T>` is the `useSyncExternalStore` read surface; both the
 *    localStorage `ObservableCollection` and the Supabase collection satisfy it.
 *  - The `*RepositoryApi` interfaces capture the exact (synchronous) public
 *    surface the UI already depends on, so a Supabase implementation can be
 *    swapped in behind the same contract (Supabase repos use optimistic local
 *    updates + async write-through to keep these signatures synchronous).
 */
import type {
  Brand,
  GenerationJob,
  GenerationResult,
  ID,
  ImageAsset,
  Location,
  LocationUsage,
  LogoAsset,
  LogoKind,
  LogoStatus,
  Product,
  ProductDimensions,
  ProductUsage,
  ResultReview,
  JobStatus,
} from "@/lib/domain";

/* ----------------------------- read surface ----------------------------- */
export interface ReadableStore<T> {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T[];
  getServerSnapshot: () => T[];
}

/* ------------------------------ input types ----------------------------- */
export interface CreateBrandInput {
  name: string;
  accentColor: string;
  description?: string;
  instructions?: string;
}

export interface CreateLogoInput {
  asset: ImageAsset;
  kind: LogoKind;
  instructions?: string;
}

export interface ProductInput {
  brandId: ID;
  name: string;
  category: string;
  tags: string[];
  description?: string;
  dimensions?: ProductDimensions;
  usage: ProductUsage;
  mainImage?: ImageAsset;
  referenceImages: ImageAsset[];
  preservationInstructions?: string;
}

export interface LocationInput {
  name: string;
  brandId?: ID;
  usage: LocationUsage;
  images: ImageAsset[];
  mainImageId?: ID;
  description?: string;
  preservationInstructions?: string;
  saved?: boolean;
}

/* --------------------------- repository APIs ---------------------------- */
export interface BrandRepositoryApi extends ReadableStore<Brand> {
  list(): Brand[];
  getById(id: ID): Brand | undefined;
  addBrand(input: CreateBrandInput): Brand;
  updateBrand(
    id: ID,
    patch: Partial<Pick<Brand, "name" | "accentColor" | "description" | "instructions">>,
  ): Brand | undefined;
  setStatus(id: ID, status: Brand["status"]): Brand | undefined;
  addLogo(brandId: ID, input: CreateLogoInput): LogoAsset | undefined;
  updateLogo(brandId: ID, logoId: ID, patch: Partial<Pick<LogoAsset, "kind" | "instructions">>): void;
  replaceLogoAsset(brandId: ID, logoId: ID, asset: ImageAsset): void;
  setLogoStatus(brandId: ID, logoId: ID, status: LogoStatus): void;
  setDefaultLogo(brandId: ID, logoId: ID): void;
  removeLogo(brandId: ID, logoId: ID): void;
}

export interface ProductRepositoryApi extends ReadableStore<Product> {
  list(): Product[];
  getById(id: ID): Product | undefined;
  addProduct(input: ProductInput): Product;
  updateProduct(id: ID, input: Partial<ProductInput>): Product | undefined;
  setStatus(id: ID, status: Product["status"]): Product | undefined;
}

export interface LocationRepositoryApi extends ReadableStore<Location> {
  list(): Location[];
  getById(id: ID): Location | undefined;
  addLocation(input: LocationInput): Location;
  updateLocation(id: ID, input: Partial<LocationInput>): Location | undefined;
  setMainImage(id: ID, imageId: ID): Location | undefined;
}

export interface JobRepositoryApi extends ReadableStore<GenerationJob> {
  list(): GenerationJob[];
  getById(id: ID): GenerationJob | undefined;
  createJob(job: GenerationJob): GenerationJob;
  setStatus(id: ID, status: JobStatus, patch?: Partial<GenerationJob>): GenerationJob | undefined;
  setProgress(id: ID, progress: number): GenerationJob | undefined;
  attachResults(id: ID, resultIds: ID[]): GenerationJob | undefined;
  fail(id: ID, error: string): GenerationJob | undefined;
}

export interface ResultRepositoryApi extends ReadableStore<GenerationResult> {
  list(): GenerationResult[];
  getById(id: ID): GenerationResult | undefined;
  addResult(result: GenerationResult): GenerationResult;
  byJob(jobId: ID): GenerationResult[];
  setReview(id: ID, review: ResultReview): GenerationResult | undefined;
  setFavorite(id: ID, favorite: boolean): GenerationResult | undefined;
  toggleFavorite(id: ID): GenerationResult | undefined;
}
