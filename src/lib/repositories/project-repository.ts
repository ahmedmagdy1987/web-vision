import type { ID, Project, ProjectStatus } from "@/lib/domain";
import { newId, nowIso } from "@/lib/ids";
import { buildSeed } from "@/lib/seed/seed-data";
import { ObservableCollection } from "./observable-store";
import type { ProjectInput, ProjectRepositoryApi } from "./types";

export type { ProjectInput } from "./types";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "project"
  );
}

export class ProjectRepository extends ObservableCollection<Project> implements ProjectRepositoryApi {
  constructor() {
    super("projects", () => buildSeed().projects);
  }

  addProject(input: ProjectInput): Project {
    const ts = nowIso();
    return this.create({
      id: newId("proj"),
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
    });
  }

  updateProject(id: ID, input: Partial<ProjectInput>): Project | undefined {
    return this.update(id, (p) => ({
      ...p,
      ...input,
      name: input.name?.trim() ?? p.name,
      updatedAt: nowIso(),
    }));
  }

  setStatus(id: ID, status: ProjectStatus): Project | undefined {
    return this.update(id, (p) => ({ ...p, status, updatedAt: nowIso() }));
  }

  private toggle(arr: ID[], itemId: ID, on: boolean): ID[] {
    const has = arr.includes(itemId);
    if (on && !has) return [...arr, itemId];
    if (!on && has) return arr.filter((x) => x !== itemId);
    return arr;
  }

  assignBrand(projectId: ID, brandId: ID, assigned: boolean): void {
    this.update(projectId, (p) => ({ ...p, brandIds: this.toggle(p.brandIds, brandId, assigned), updatedAt: nowIso() }));
  }
  assignProduct(projectId: ID, productId: ID, assigned: boolean): void {
    this.update(projectId, (p) => ({ ...p, productIds: this.toggle(p.productIds, productId, assigned), updatedAt: nowIso() }));
  }
  assignLocation(projectId: ID, locationId: ID, assigned: boolean): void {
    this.update(projectId, (p) => ({ ...p, locationIds: this.toggle(p.locationIds, locationId, assigned), updatedAt: nowIso() }));
  }
}

export const projectRepository = new ProjectRepository();
