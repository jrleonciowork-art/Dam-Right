import { describe, expect, it } from "vitest";
import { DEFAULT_WALL_INPUT } from "./defaults";
import { calculateWallReview, summarizeReview, type WallInput } from "./wall";

function inputWith(overrides: Partial<WallInput>): WallInput {
  return {
    ...DEFAULT_WALL_INPUT,
    ...overrides,
    project: { ...DEFAULT_WALL_INPUT.project, ...overrides.project },
    geometry: { ...DEFAULT_WALL_INPUT.geometry, ...overrides.geometry },
    materials: { ...DEFAULT_WALL_INPUT.materials, ...overrides.materials },
    subsurface: { ...DEFAULT_WALL_INPUT.subsurface, ...overrides.subsurface },
    loadCase: { ...DEFAULT_WALL_INPUT.loadCase, ...overrides.loadCase },
    limits: { ...DEFAULT_WALL_INPUT.limits, ...overrides.limits },
  };
}

describe("calculateWallReview", () => {
  it("reproduces the locked demonstration case", () => {
    const result = calculateWallReview(DEFAULT_WALL_INPUT);

    expect(result.values.heelWidthM).toBeCloseTo(1.35, 8);
    expect(result.values.totalWeightKNM).toBeCloseTo(53.6712, 4);
    expect(result.values.upliftForceKNM).toBeCloseTo(14.715, 3);
    expect(result.values.fsSliding).toBeCloseTo(0.7623, 3);
    expect(result.values.fsOverturning).toBeCloseTo(0.867, 3);
    expect(result.values.toePressureKPa).toBeCloseTo(73.64, 2);
    expect(result.values.heelPressureKPa).toBeCloseTo(-41.18, 2);
    expect(summarizeReview(result.findings)).toBe("critical");
  });

  it("does not pass bearing when the geotechnical capacity is missing", () => {
    const result = calculateWallReview(DEFAULT_WALL_INPUT);
    const bearing = result.findings.find((finding) => finding.id === "bearing");

    expect(bearing?.status).toBe("insufficient_information");
  });

  it("reports invalid geometry as insufficient information", () => {
    const result = calculateWallReview(
      inputWith({ geometry: { ...DEFAULT_WALL_INPUT.geometry, baseWidthM: 0.8, toeWidthM: 0.6 } }),
    );

    expect(result.findings.some((finding) => finding.id === "invalid-base-geometry")).toBe(true);
    expect(Number.isNaN(result.values.fsSliding)).toBe(true);
  });

  it("flags a reverse differential-water case instead of silently approving it", () => {
    const result = calculateWallReview(
      inputWith({ loadCase: { ...DEFAULT_WALL_INPUT.loadCase, wetSideLevelM: 1, drySideLevelM: 2 } }),
    );

    expect(result.findings.find((finding) => finding.id === "reverse-water-case")?.status).toBe(
      "insufficient_information",
    );
  });

  it("evaluates the allowable bearing pressure when it is supplied", () => {
    const result = calculateWallReview(
      inputWith({ materials: { ...DEFAULT_WALL_INPUT.materials, allowableBearingKPa: 100 } }),
    );

    expect(result.findings.find((finding) => finding.id === "bearing")?.status).toBe("pass");
  });

  it("flags truncated sheet pile malpractice ('putol na sheet pile') as critical failure", () => {
    const result = calculateWallReview(
      inputWith({
        subsurface: {
          ...DEFAULT_WALL_INPUT.subsurface,
          hasSheetPileCutoff: true,
          plannedSheetPileLengthM: 12.0,
          asDrivenSheetPileLengthM: 4.5,
          designScourDepthM: 1.5,
        },
      }),
    );

    const sheetPileFinding = result.findings.find((f) => f.id === "putol-na-sheet-pile");
    expect(sheetPileFinding?.status).toBe("fail");
    expect(sheetPileFinding?.severity).toBe("critical");
    expect(sheetPileFinding?.summary).toContain("63% deficit");
  });

  it("detects catastrophic toe scour undermining when scour depth exceeds embedment", () => {
    const result = calculateWallReview(
      inputWith({
        subsurface: {
          ...DEFAULT_WALL_INPUT.subsurface,
          footingEmbedmentM: 1.0,
          asBuiltFootingEmbedmentM: 1.0,
          designScourDepthM: 2.0,
        },
      }),
    );

    const scourFinding = result.findings.find((f) => f.id === "toe-scour-undermining");
    expect(scourFinding?.status).toBe("fail");
    expect(scourFinding?.severity).toBe("critical");
    expect(result.values.effectiveEmbedmentM).toBe(0);
    expect(Number.isNaN(result.values.fsSliding)).toBe(true);
    expect(result.findings.find((f) => f.id === "sliding")?.status).toBe("not_evaluated");
  });

  it("treats a zero scour depth as missing information rather than a pass", () => {
    const result = calculateWallReview(DEFAULT_WALL_INPUT);
    const scourFinding = result.findings.find((f) => f.id === "toe-scour-undermining");

    expect(scourFinding?.status).toBe("insufficient_information");
    expect(scourFinding?.severity).toBe("critical");
    expect(result.findings.find((f) => f.id === "piping-creep")?.status).toBe("not_evaluated");
  });

  it("detects hydraulic piping risk using Lane's weighted creep ratio", () => {
    const result = calculateWallReview(
      inputWith({
        loadCase: {
          ...DEFAULT_WALL_INPUT.loadCase,
          wetSideLevelM: 4.0,
          drySideLevelM: 0.0,
        },
        subsurface: {
          ...DEFAULT_WALL_INPUT.subsurface,
          footingEmbedmentM: 0.5,
          asBuiltFootingEmbedmentM: 0.5,
          designScourDepthM: 0.1,
          hasSheetPileCutoff: false,
          foundationSoilType: "fine_sand",
        },
      }),
    );

    const pipingFinding = result.findings.find((f) => f.id === "piping-creep");
    expect(pipingFinding?.status).toBe("fail");
    expect(pipingFinding?.severity).toBe("critical");
  });
});

