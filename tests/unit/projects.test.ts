import { describe, it, expect } from "vitest";
import { ProjectRepository } from "@/lib/repositories/project-repository";

// Runs against a fresh in-memory ProjectRepository (localStorage is a no-op in
// the node test env, so the collection starts empty).
describe("ProjectRepository (local backend)", () => {
  it("creates a project with a slug and active defaults", () => {
    const repo = new ProjectRepository();
    const p = repo.addProject({ name: "  Aventura Boardwalk  ", clientName: "Aventura" });
    expect(p.name).toBe("Aventura Boardwalk");
    expect(p.slug).toBe("aventura-boardwalk");
    expect(p.status).toBe("active");
    expect(p.clientName).toBe("Aventura");
    expect(p.brandIds).toEqual([]);
    expect(p.productIds).toEqual([]);
    expect(p.locationIds).toEqual([]);
  });

  it("assigns and unassigns brands/products/locations idempotently", () => {
    const repo = new ProjectRepository();
    const p = repo.addProject({ name: "Proj" });
    repo.assignBrand(p.id, "b1", true);
    repo.assignBrand(p.id, "b1", true); // idempotent — no duplicate
    expect(repo.getById(p.id)?.brandIds).toEqual(["b1"]);
    repo.assignBrand(p.id, "b1", false);
    expect(repo.getById(p.id)?.brandIds).toEqual([]);

    repo.assignProduct(p.id, "pr1", true);
    repo.assignLocation(p.id, "l1", true);
    expect(repo.getById(p.id)?.productIds).toEqual(["pr1"]);
    expect(repo.getById(p.id)?.locationIds).toEqual(["l1"]);
  });

  it("updates metadata and status", () => {
    const repo = new ProjectRepository();
    const p = repo.addProject({ name: "Proj" });
    repo.updateProject(p.id, { clientName: "New Client", description: "desc" });
    expect(repo.getById(p.id)?.clientName).toBe("New Client");
    repo.setStatus(p.id, "archived");
    expect(repo.getById(p.id)?.status).toBe("archived");
  });
});
