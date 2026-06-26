import { describe, it, expect } from "vitest";
import { matchesStatusFilter } from "@/components/common/library-status-filter";

describe("matchesStatusFilter (Active / Archived / All)", () => {
  it("Active (default) shows only non-archived assets", () => {
    expect(matchesStatusFilter("active", "active")).toBe(true);
    expect(matchesStatusFilter("archived", "active")).toBe(false);
  });
  it("Archived shows only archived assets", () => {
    expect(matchesStatusFilter("archived", "archived")).toBe(true);
    expect(matchesStatusFilter("active", "archived")).toBe(false);
  });
  it("All shows everything", () => {
    expect(matchesStatusFilter("active", "all")).toBe(true);
    expect(matchesStatusFilter("archived", "all")).toBe(true);
  });
  it("treats an unknown/empty status as active", () => {
    expect(matchesStatusFilter("", "active")).toBe(true);
    expect(matchesStatusFilter("", "archived")).toBe(false);
  });
});
