import { describe, expect, it } from "vitest";
import { parseExtractedBlueprintData } from "./extraction-schema";

const valid = {
  metadata: {
    projectName: "Test",
    structureId: "FW-1",
    sheetNumber: "S-1",
    sheetTitle: "Section",
    revision: "R0",
    issueStatus: "approved_for_construction",
    date: "2026-11-07",
    engineerOfRecord: "Engineer",
  },
  dimensions: {
    wallHeightM: 3,
    crestElevationM: 8,
    baseWidthM: 2.4,
    stemThicknessM: 0.4,
    baseThicknessM: 0.45,
    toeWidthM: 0.65,
    heelWidthM: 1.35,
    embedmentDepthM: 1.2,
  },
  materials: {
    concreteStrengthMPa: 24,
    concreteUnitWeightKNM3: 24,
    rebarYieldStrengthMPa: 414,
    rebarSizeMm: 20,
    rebarSpacingMm: 150,
    concreteCoverMm: 75,
  },
  hydrologyGeotech: {
    designFloodElevationM: 2.5,
    wetSideLevelM: 2.5,
    drySideLevelM: 0,
    frictionCoefficient: 0.5,
    soilUnitWeightKNM3: 18,
    soilFrictionAngleDeg: 30,
    allowableBearingKPa: 150,
    surchargeKPa: 10,
    drainageEfficiency: 0.3,
    retainedSoilHeightM: 2.4,
    designScourDepthM: 0.6,
    foundationSoilType: "fine_sand",
  },
  rawNotes: [],
};

describe("extraction runtime schema", () => {
  it("accepts a complete finite extraction result", () => {
    expect(parseExtractedBlueprintData(valid).dimensions.wallHeightM).toBe(3);
  });

  it("rejects invalid drainage efficiency", () => {
    expect(() => parseExtractedBlueprintData({
      ...valid,
      hydrologyGeotech: { ...valid.hydrologyGeotech, drainageEfficiency: 1.2 },
    })).toThrow(/runtime validation/);
  });

  it("rejects non-finite values", () => {
    expect(() => parseExtractedBlueprintData({
      ...valid,
      dimensions: { ...valid.dimensions, wallHeightM: Number.NaN },
    })).toThrow(/runtime validation/);
  });
});
