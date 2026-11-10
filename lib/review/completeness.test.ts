import { describe, expect, it } from "vitest";
import { calculateWallReview } from "../engineering/wall";
import { DEFAULT_WALL_INPUT } from "../engineering/defaults";
import { buildCompletenessMatrix, completenessScopeGaps } from "./completeness";

describe("engineering completeness matrix", () => {
  it("exposes unsupported mandatory failure modes", () => {
    const findings = calculateWallReview(DEFAULT_WALL_INPUT).findings;
    const matrix = buildCompletenessMatrix(findings);
    const gaps = completenessScopeGaps(matrix);

    expect(gaps.some((gap) => gap.id === "unsupported-structural_capacity")).toBe(true);
    expect(gaps.some((gap) => gap.id === "unsupported-global_stability")).toBe(true);
  });

  it("accepts an approved specialist result without fabricating a solver", () => {
    const findings = calculateWallReview(DEFAULT_WALL_INPUT).findings;
    const matrix = buildCompletenessMatrix(findings, [{
      checkFamily: "global_stability",
      conclusion: "pass",
      sourceReference: "GEO-REP-04",
      author: "Geotechnical engineer",
      checker: "Independent checker",
      issuedAt: "2026-11-07",
      approved: true,
    }]);

    expect(matrix.find((item) => item.id === "global_stability")?.status).toBe("evaluated");
  });
});
