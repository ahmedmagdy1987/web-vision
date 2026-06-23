import type { ID, Project, ProjectStatus } from "@/lib/domain";
import { newId, nowIso } from "@/lib/ids";
import type { ProjectRow } from "@/lib/supabase/database.types";
import { SupabaseCollection } from "./collection";
import { db, getActiveOrgId, getActiveUserId, requireActiveOrgId } from "./context";
import { slugify } from "./mappers";
import type { ProjectInput, ProjectRepositoryApi } from "../types";

function projectFromRow(row: ProjectRow, brandIds: ID[], productIds: ID[], locationIds: ID[]): Project {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    clientName: row.client_name ?? undefined,
    description: row.description ?? undefined,
    status: row.status,
    startDate: row.start_date ?? undefined,
    notes: row.notes ?? undefined,
    brandIds,
    productIds,
    locationIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseProjectRepository extends SupabaseCollection<Project> implements ProjectRepositoryApi {
  protected label() {
    return "projects";
  }

  protected async fetchAll(): Promise<Project[]> {
    const orgId = getActiveOrgId();
    if (!orgId) return [];
    const supabase = db();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as ProjectRow[];
    if (!rows.length) return [];
    const ids = rows.map((p) => p.id);
    const [pb, pp, pl] = await Promise.all([
      supabase.from("project_brands").select("project_id, brand_id").in("project_id", ids),
      supabase.from("project_products").select("project_id, product_id").in("project_id", ids),
      supabase.from("project_locations").select("project_id, location_id").in("project_id", ids),
    ]);
    if (pb.error) throw pb.error;
    if (pp.error) throw pp.error;
    if (pl.error) throw pl.error;
    const brandMap = new Map<string, ID[]>();
    for (const r of pb.data ?? []) brandMap.set(r.project_id, [...(brandMap.get(r.project_id) ?? []), r.brand_id]);
    const prodMap = new Map<string, ID[]>();
    for (const r of pp.data ?? []) prodMap.set(r.project_id, [...(prodMap.get(r.project_id) ?? []), r.product_id]);
    const locMap = new Map<string, ID[]>();
    for (const r of pl.data ?? []) locMap.set(r.project_id, [...(locMap.get(r.project_id) ?? []), r.location_id]);
    return rows.map((p) => projectFromRow(p, brandMap.get(p.id) ?? [], prodMap.get(p.id) ?? [], locMap.get(p.id) ?? []));
  }

  addProject(input: ProjectInput): Project {
    const orgId = requireActiveOrgId();
    const id = newId();
    const ts = nowIso();
    const project: Project = {
      id,
      name: input.name.trim(),
      slug: slugify(input.name),
      clientName: input.clientName?.trim() || undefined,
      description: input.description?.trim() || undefined,
      status: input.status ?? "active",
      startDate: input.startDate || undefined,
      notes: input.notes?.trim() || undefined,
      brandIds: [],
      productIds: [],
      locationIds: [],
      createdAt: ts,
      updatedAt: ts,
    };
    return this.optimistic({
      apply: () => {
        this.cacheAppend(project);
        return project;
      },
      persist: async () => {
        const { error } = await db().from("projects").insert({
          id,
          organization_id: orgId,
          name: project.name,
          slug: project.slug,
          client_name: project.clientName ?? null,
          description: project.description ?? null,
          status: project.status,
          start_date: project.startDate ?? null,
          notes: project.notes ?? null,
          created_by: getActiveUserId(),
        });
        if (error) throw error;
      },
      rollback: () => this.cacheRemove(id),
      context: "create project",
    });
  }

  updateProject(id: ID, input: Partial<ProjectInput>): Project | undefined {
    const prev = this.getById(id);
    if (!prev) return undefined;
    return this.optimistic({
      apply: () =>
        this.cacheUpdate(id, (p) => ({ ...p, ...input, name: input.name?.trim() ?? p.name, updatedAt: nowIso() })),
      persist: async () => {
        const { error } = await db()
          .from("projects")
          .update({
            name: input.name?.trim(),
            ...(input.name ? { slug: slugify(input.name) } : {}),
            client_name: input.clientName?.trim() || null,
            description: input.description?.trim() || null,
            status: input.status,
            start_date: input.startDate || null,
            notes: input.notes?.trim() || null,
          })
          .eq("id", id);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(id, prev),
      context: "update project",
    });
  }

  setStatus(id: ID, status: ProjectStatus): Project | undefined {
    const prev = this.getById(id);
    if (!prev) return undefined;
    return this.optimistic({
      apply: () => this.cacheUpdate(id, (p) => ({ ...p, status, updatedAt: nowIso() })),
      persist: async () => {
        const { error } = await db().from("projects").update({ status }).eq("id", id);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(id, prev),
      context: "update project status",
    });
  }

  assignBrand(projectId: ID, brandId: ID, assigned: boolean): void {
    const prev = this.getById(projectId);
    if (!prev) return;
    this.optimistic({
      apply: () =>
        this.cacheUpdate(projectId, (p) => ({
          ...p,
          brandIds: assigned ? (p.brandIds.includes(brandId) ? p.brandIds : [...p.brandIds, brandId]) : p.brandIds.filter((x) => x !== brandId),
          updatedAt: nowIso(),
        })),
      persist: async () => {
        const s = db();
        const { error } = assigned
          ? await s.from("project_brands").upsert({ project_id: projectId, brand_id: brandId })
          : await s.from("project_brands").delete().eq("project_id", projectId).eq("brand_id", brandId);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(projectId, prev),
      context: "assign brand",
    });
  }

  assignProduct(projectId: ID, productId: ID, assigned: boolean): void {
    const prev = this.getById(projectId);
    if (!prev) return;
    this.optimistic({
      apply: () =>
        this.cacheUpdate(projectId, (p) => ({
          ...p,
          productIds: assigned ? (p.productIds.includes(productId) ? p.productIds : [...p.productIds, productId]) : p.productIds.filter((x) => x !== productId),
          updatedAt: nowIso(),
        })),
      persist: async () => {
        const s = db();
        const { error } = assigned
          ? await s.from("project_products").upsert({ project_id: projectId, product_id: productId })
          : await s.from("project_products").delete().eq("project_id", projectId).eq("product_id", productId);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(projectId, prev),
      context: "assign product",
    });
  }

  assignLocation(projectId: ID, locationId: ID, assigned: boolean): void {
    const prev = this.getById(projectId);
    if (!prev) return;
    this.optimistic({
      apply: () =>
        this.cacheUpdate(projectId, (p) => ({
          ...p,
          locationIds: assigned ? (p.locationIds.includes(locationId) ? p.locationIds : [...p.locationIds, locationId]) : p.locationIds.filter((x) => x !== locationId),
          updatedAt: nowIso(),
        })),
      persist: async () => {
        const s = db();
        const { error } = assigned
          ? await s.from("project_locations").upsert({ project_id: projectId, location_id: locationId })
          : await s.from("project_locations").delete().eq("project_id", projectId).eq("location_id", locationId);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(projectId, prev),
      context: "assign location",
    });
  }
}
