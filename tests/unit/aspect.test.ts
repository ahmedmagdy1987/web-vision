import { describe, it, expect } from "vitest";
import { ASPECT_RATIO_VALUES, dimensionsForAspect } from "@/lib/domain";

describe("dimensionsForAspect", () => {
  it("derives pixel dimensions consistent with the ratio (longest side 1280)", () => {
    expect(dimensionsForAspect("1:1")).toEqual({ width: 1280, height: 1280 });
    expect(dimensionsForAspect("9:16")).toEqual({ width: 720, height: 1280 });
    expect(dimensionsForAspect("16:9")).toEqual({ width: 1280, height: 720 });
    expect(dimensionsForAspect("3:2")).toEqual({ width: 1280, height: 853 });
  });
});

describe("ASPECT_RATIO_VALUES", () => {
  it("covers all 7 supported ratios", () => {
    expect(Object.keys(ASPECT_RATIO_VALUES).sort()).toEqual(
      ["1:1", "16:9", "2:3", "3:2", "4:3", "4:5", "9:16"].sort(),
    );
  });
});
