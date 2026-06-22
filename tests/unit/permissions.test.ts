import { describe, it, expect } from "vitest";
import { can, canEdit, isManager } from "@/lib/auth/permissions";

describe("can()", () => {
  it("grants org:manage only to owner/admin", () => {
    expect(can("owner", "org:manage")).toBe(true);
    expect(can("admin", "org:manage")).toBe(true);
    expect(can("editor", "org:manage")).toBe(false);
    expect(can("viewer", "org:manage")).toBe(false);
    expect(can(null, "org:manage")).toBe(false);
  });

  it("grants products:write to editor and above", () => {
    expect(can("owner", "products:write")).toBe(true);
    expect(can("admin", "products:write")).toBe(true);
    expect(can("editor", "products:write")).toBe(true);
    expect(can("viewer", "products:write")).toBe(false);
    expect(can(undefined, "products:write")).toBe(false);
  });

  it("grants read to every role but not to anonymous", () => {
    expect(can("viewer", "read")).toBe(true);
    expect(can("editor", "read")).toBe(true);
    expect(can("owner", "read")).toBe(true);
    expect(can(null, "read")).toBe(false);
  });
});

describe("isManager / canEdit", () => {
  it("isManager is owner/admin only", () => {
    expect(isManager("owner")).toBe(true);
    expect(isManager("admin")).toBe(true);
    expect(isManager("editor")).toBe(false);
    expect(isManager("viewer")).toBe(false);
  });
  it("canEdit is owner/admin/editor", () => {
    expect(canEdit("owner")).toBe(true);
    expect(canEdit("admin")).toBe(true);
    expect(canEdit("editor")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
    expect(canEdit(null)).toBe(false);
  });
});
