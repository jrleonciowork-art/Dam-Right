import { describe, expect, it } from "vitest";
import { detectMissingData } from "./missing-data";
import { evaluateStructuralCompliance } from "./compliance";
import type { ExtractedBlueprintData } from "./types";

function mockData(overrides: Partial<ExtractedBlueprintData> = {}): ExtractedBlueprintData {
  return {
    metadata: {
      projectName: "Pampanga Delta Flood Retaining Wall",
      structureId: "PD-RW-04",
      sheetNumber: "S-05",
      sheetTitle: "Wall Section & Details",
      revision: "Rev 0",
      issueStatus: "approved_for_construction",
      date: "2026-10-18",
      engineerOfRecord: "Engr. M. Santos, PE",
    },
    dimensions: {
      wallHeightM: 4.5,
      crestElevationM: 8.5,
      baseWidthM: 2.8,
      stemThicknessM: 0.4,
      baseThicknessM: 0.5,
      toeWidthM: 0.7,
      heelWidthM: 1.7,
      embedmentDepthM: 1.2,
    },
    materials: {
      concreteStrengthMPa: 24.0,
      concreteUnitWeightKNM3: 24.0,
      rebarYieldStrengthMPa: 414.0,
      rebarSizeMm: 20,
      rebarSpacingMm: 150,
      concreteCoverMm: 75,
    },
    hydrologyGeotech: {
      designFloodElevationM: 3.5,
      wetSideLevelM: 3.5,
      drySideLevelM: 0.0,
      frictionCoefficient: 0.45,
      soilUnitWeightKNM3: 18.0,
      soilFrictionAngleDeg: 30,
      allowableBearingKPa: 160,
      surchargeKPa: 10,
      drainageEfficiency: 0.3,
      retainedSoilHeightM: 3.6,
      designScourDepthM: 0.6,
      foundationSoilType: "fine_sand",
    },
    rawNotes: ["Class A Concrete f'c = 24 MPa", "Grade 60 Reinforcing Bars", "Clear Cover = 75 mm"],
    ...overrides,
  };
}

describe("Missing Data Detection", () => {
  it("flags missing critical dimensions like base width and wall height", () => {
    const data = mockData({
      dimensions: {
        ...mockData().dimensions,
        baseWidthM: null,
        wallHeightM: null,
      },
    });

    const flags = detectMissingData(data);
    const baseFlag = flags.find((f) => f.field === "dimensions.baseWidthM");
    const heightFlag = flags.find((f) => f.field === "dimensions.wallHeightM");

    expect(baseFlag).toBeDefined();
    expect(baseFlag?.severity).toBe("critical");
    expect(baseFlag?.message).toContain("Base width dimension not found");

    expect(heightFlag).toBeDefined();
    expect(heightFlag?.severity).toBe("critical");
  });

  it("flags missing concrete compressive strength and clear cover", () => {
    const data = mockData({
      materials: {
        ...mockData().materials,
        concreteStrengthMPa: null,
        concreteCoverMm: null,
      },
    });

    const flags = detectMissingData(data);
    expect(flags.some((f) => f.field === "materials.concreteStrengthMPa")).toBe(true);
    expect(flags.some((f) => f.field === "materials.concreteCoverMm")).toBe(true);
  });
});

describe("Structural Code Compliance Evaluation", () => {
  it("passes compliant DPWH and NSCP structural specifications", () => {
    const data = mockData();
    const findings = evaluateStructuralCompliance(data);

    expect(findings.some((f) => f.ruleId === "NSCP-419.2-FC-MIN" && f.status === "pass")).toBe(true);
    expect(findings.some((f) => f.ruleId === "NSCP-420.6.1-COVER" && f.status === "pass")).toBe(true);
    expect(findings.some((f) => f.ruleId === "DPWH-DGCS-STEM-MIN" && f.status === "pass")).toBe(true);
    expect(findings.some((f) => f.ruleId === "USACE-EM-BASE-PROPORTION" && f.status === "pass")).toBe(true);
  });

  it("flags violation for substandard concrete strength (< 20.7 MPa per NSCP/ACI)", () => {
    const data = mockData({
      materials: {
        ...mockData().materials,
        concreteStrengthMPa: 17.5,
      },
    });

    const findings = evaluateStructuralCompliance(data);
    const fcFinding = findings.find((f) => f.ruleId === "NSCP-419.2-FC-MIN");
    expect(fcFinding?.status).toBe("violation");
    expect(fcFinding?.description).toContain("below the mandatory minimum of 20.7 MPa");
  });

  it("flags violation for substandard concrete cover (< 50 mm)", () => {
    const data = mockData({
      materials: {
        ...mockData().materials,
        concreteCoverMm: 40,
      },
    });

    const findings = evaluateStructuralCompliance(data);
    const coverFinding = findings.find((f) => f.ruleId === "NSCP-420.6.1-COVER");
    expect(coverFinding?.status).toBe("violation");
  });

  it("flags violation when base width ratio B/H is less than 0.45", () => {
    const data = mockData({
      dimensions: {
        ...mockData().dimensions,
        wallHeightM: 5.0,
        baseWidthM: 1.8, // 1.8 / 5.0 = 0.36 < 0.45
      },
    });

    const findings = evaluateStructuralCompliance(data);
    const baseFinding = findings.find((f) => f.ruleId === "USACE-EM-BASE-PROPORTION");
    expect(baseFinding?.status).toBe("violation");
    expect(baseFinding?.title).toContain("B/H < 0.45");
  });

  it("flags dimensional chain in-closure error if Toe + Stem + Heel != Base", () => {
    const data = mockData({
      dimensions: {
        ...mockData().dimensions,
        baseWidthM: 3.0,
        toeWidthM: 0.7,
        stemThicknessM: 0.4,
        heelWidthM: 1.5, // 0.7 + 0.4 + 1.5 = 2.6 != 3.0 (discrepancy 400 mm)
      },
    });

    const findings = evaluateStructuralCompliance(data);
    const chainFinding = findings.find((f) => f.ruleId === "DIMENSIONAL-CHAIN-CLOSURE");
    expect(chainFinding?.status).toBe("violation");
  });

  it("flags negative freeboard as a hydraulic violation", () => {
    const data = mockData({
      dimensions: {
        ...mockData().dimensions,
        wallHeightM: 3.0,
      },
      hydrologyGeotech: {
        ...mockData().hydrologyGeotech,
        wetSideLevelM: 3.5, // Water exceeds wall
      },
    });

    const findings = evaluateStructuralCompliance(data);
    const freeboardFinding = findings.find((f) => f.ruleId === "DPWH-DGCS-FREEBOARD-NEGATIVE");
    expect(freeboardFinding?.status).toBe("violation");
  });

  it("does not substitute generic values for missing stability inputs", () => {
    const data = mockData({
      hydrologyGeotech: {
        ...mockData().hydrologyGeotech,
        frictionCoefficient: null,
        allowableBearingKPa: null,
        drainageEfficiency: null,
      },
    });

    const findings = evaluateStructuralCompliance(data);
    const stability = findings.find((finding) => finding.id === "comp-stability-incomplete");

    expect(stability?.status).toBe("insufficient_information");
    expect(stability?.description).toContain("base friction coefficient");
    expect(stability?.description).toContain("allowable bearing pressure");
    expect(stability?.description).toContain("drainage efficiency");
    expect(findings.some((finding) => finding.id === "comp-sliding-pass")).toBe(false);
    expect(findings.some((finding) => finding.id === "comp-overturning-pass")).toBe(false);
  });
});
