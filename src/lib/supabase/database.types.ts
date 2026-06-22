/**
 * Hand-authored Database type for the Web Vision Phase 3 schema.
 *
 * Mirrors supabase/migrations/20260622120000_init_schema.sql. Regenerate from a
 * linked project with:  `supabase gen types typescript --linked > src/lib/supabase/database.types.ts`
 * Until a remote project is linked this hand-authored version keeps the Supabase
 * query layer fully typed. jsonb columns are typed as `Json`; the repository
 * mappers cast them to/from the domain shapes.
 *
 * NOTE: row/insert/update shapes are `type` aliases (not interfaces) so they
 * satisfy supabase-js's `Record<string, unknown>` table constraint.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MembershipRole = "owner" | "admin" | "editor" | "viewer";
export type MembershipStatus = "active" | "invited" | "suspended";
export type EntityStatusDb = "active" | "archived";
export type BrandAssetType = "primary" | "secondary" | "icon" | "light" | "dark";
export type JobStatusDb = "draft" | "queued" | "processing" | "completed" | "failed" | "cancelled";
export type ReviewStatusDb = "draft" | "approved" | "rejected";

type Stamps = {
  created_at: string;
  updated_at: string;
};

export type OrganizationRow = Stamps & {
  id: string;
  name: string;
  slug: string;
};
export type ProfileRow = Stamps & {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};
export type MemberRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  created_at: string;
};
export type BrandRow = Stamps & {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  accent_color: string;
  instructions: string | null;
  status: EntityStatusDb;
  default_logo_id: string | null;
  created_by: string | null;
};
export type BrandAssetRow = Stamps & {
  id: string;
  brand_id: string;
  asset_type: BrandAssetType;
  name: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  is_default: boolean;
  status: EntityStatusDb;
  instructions: string | null;
  created_by: string | null;
};
export type ProductCategoryRow = Stamps & {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  status: EntityStatusDb;
};
export type ProductRow = Stamps & {
  id: string;
  organization_id: string;
  brand_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  dimensions: Json | null;
  usage: "indoor" | "outdoor" | "both";
  tags: string[];
  preservation_instructions: string | null;
  status: EntityStatusDb;
  created_by: string | null;
};
export type ProductAssetRow = {
  id: string;
  product_id: string;
  asset_role: "main" | "reference";
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  sort_order: number;
  is_primary: boolean;
  created_by: string | null;
  created_at: string;
};
export type LocationRow = Stamps & {
  id: string;
  organization_id: string;
  brand_id: string | null;
  name: string;
  description: string | null;
  environment_type: "indoor" | "outdoor";
  dimensions: Json | null;
  preservation_instructions: string | null;
  status: EntityStatusDb;
  main_image_id: string | null;
  created_by: string | null;
};
export type LocationAssetRow = {
  id: string;
  location_id: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  sort_order: number;
  is_primary: boolean;
  created_by: string | null;
  created_at: string;
};
export type GenerationPresetRow = Stamps & {
  id: string;
  organization_id: string;
  brand_id: string | null;
  name: string;
  settings: Json;
  status: EntityStatusDb;
  created_by: string | null;
};
export type GenerationJobRow = Stamps & {
  id: string;
  organization_id: string;
  brand_id: string | null;
  location_id: string | null;
  status: JobStatusDb;
  progress: number;
  request: Json;
  instructions: Json | null;
  provider: string;
  provider_job_id: string | null;
  error_code: string | null;
  error_message: string | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
};
export type GenerationJobProductRow = {
  job_id: string;
  product_id: string;
};
export type GenerationResultRow = Stamps & {
  id: string;
  job_id: string;
  organization_id: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  aspect_ratio: string | null;
  seed: number | null;
  result_index: number;
  review_status: ReviewStatusDb;
  is_favorite: boolean;
  snapshot: Json;
  provider_metadata: Json | null;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Insertable<Row, Required extends keyof Row> = Partial<Row> & Pick<Row, Required>;

export type Database = {
  public: {
    Tables: {
      organizations: Table<OrganizationRow, Insertable<OrganizationRow, "name" | "slug">, Partial<OrganizationRow>>;
      profiles: Table<ProfileRow, Insertable<ProfileRow, "id">, Partial<ProfileRow>>;
      organization_members: Table<MemberRow, Insertable<MemberRow, "organization_id" | "user_id">, Partial<MemberRow>>;
      brands: Table<BrandRow, Insertable<BrandRow, "organization_id" | "name" | "slug">, Partial<BrandRow>>;
      brand_assets: Table<BrandAssetRow, Insertable<BrandAssetRow, "brand_id" | "asset_type" | "name" | "storage_path" | "mime_type">, Partial<BrandAssetRow>>;
      product_categories: Table<ProductCategoryRow, Insertable<ProductCategoryRow, "organization_id" | "name" | "slug">, Partial<ProductCategoryRow>>;
      products: Table<ProductRow, Insertable<ProductRow, "organization_id" | "brand_id" | "name" | "slug">, Partial<ProductRow>>;
      product_assets: Table<ProductAssetRow, Insertable<ProductAssetRow, "product_id" | "storage_path" | "mime_type">, Partial<ProductAssetRow>>;
      locations: Table<LocationRow, Insertable<LocationRow, "organization_id" | "name">, Partial<LocationRow>>;
      location_assets: Table<LocationAssetRow, Insertable<LocationAssetRow, "location_id" | "storage_path" | "mime_type">, Partial<LocationAssetRow>>;
      generation_presets: Table<GenerationPresetRow, Insertable<GenerationPresetRow, "organization_id" | "name" | "settings">, Partial<GenerationPresetRow>>;
      generation_jobs: Table<GenerationJobRow, Insertable<GenerationJobRow, "organization_id" | "request">, Partial<GenerationJobRow>>;
      generation_job_products: Table<GenerationJobProductRow, GenerationJobProductRow, Partial<GenerationJobProductRow>>;
      generation_results: Table<GenerationResultRow, Insertable<GenerationResultRow, "job_id" | "organization_id" | "storage_path" | "mime_type" | "snapshot">, Partial<GenerationResultRow>>;
    };
    Views: Record<string, never>;
    Functions: {
      create_organization: {
        Args: { p_name: string; p_slug: string };
        Returns: OrganizationRow;
      };
      is_org_member: { Args: { p_org: string }; Returns: boolean };
      org_role: { Args: { p_org: string }; Returns: MembershipRole };
      has_min_role: { Args: { p_org: string; p_roles: MembershipRole[] }; Returns: boolean };
    };
    Enums: {
      membership_role: MembershipRole;
      membership_status: MembershipStatus;
      entity_status: EntityStatusDb;
      brand_asset_type: BrandAssetType;
      job_status: JobStatusDb;
      review_status: ReviewStatusDb;
    };
    CompositeTypes: Record<string, never>;
  };
};
