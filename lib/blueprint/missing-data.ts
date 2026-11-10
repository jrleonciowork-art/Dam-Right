import type { ExtractedBlueprintData, MissingDataFlag } from "./types";

export function detectMissingData(data: ExtractedBlueprintData): MissingDataFlag[] {
  const flags: MissingDataFlag[] = [];
  const { dimensions, materials, hydrologyGeotech } = data;

  // 1. Structural Geometry
  if (dimensions.wallHeightM === null || dimensions.wallHeightM <= 0) {
    flags.push({
      id: "missing-wall-height",
      field: "dimensions.wallHeightM",
      parameter: "Wall Height (H)",
      category: "geometry",
      severity: "critical",
      message: "WARNING: Wall height dimension not found in elevation or section drawings.",
      engineeringImpact:
        "Cannot compute total hydrostatic demand, active earth pressure, or overturning moment.",
    });
  }

  if (dimensions.baseWidthM === null || dimensions.baseWidthM <= 0) {
    flags.push({
      id: "missing-base-width",
      field: "dimensions.baseWidthM",
      parameter: "Base Width (B)",
      category: "geometry",
      severity: "critical",
      message: "WARNING: Base width dimension not found in sections A or B.",
      engineeringImpact:
        "Cannot compute Resisting Moment, base resultant eccentricity, or foundation bearing pressures.",
    });
  }

  if (dimensions.stemThicknessM === null || dimensions.stemThicknessM <= 0) {
    flags.push({
      id: "missing-stem-thickness",
      field: "dimensions.stemThicknessM",
      parameter: "Stem Thickness (t_stem)",
      category: "geometry",
      severity: "critical",
      message: "WARNING: Stem thickness dimension not indicated in section details.",
      engineeringImpact:
        "Cannot compute wall self-weight, stem concrete shear capacity, or slenderness ratio.",
    });
  }

  if (dimensions.baseThicknessM === null || dimensions.baseThicknessM <= 0) {
    flags.push({
      id: "missing-base-thickness",
      field: "dimensions.baseThicknessM",
      parameter: "Footing Base Thickness (t_base)",
      category: "geometry",
      severity: "critical",
      message: "WARNING: Footing slab thickness is missing from drawing callouts.",
      engineeringImpact:
        "Cannot determine foundation component weight or moment arm for overturning equilibrium.",
    });
  }

  if (dimensions.toeWidthM === null || dimensions.toeWidthM < 0) {
    flags.push({
      id: "missing-toe-width",
      field: "dimensions.toeWidthM",
      parameter: "Toe Width (B_toe)",
      category: "geometry",
      severity: "warning",
      message: "WARNING: Toe projection width is not explicitly dimensioned.",
      engineeringImpact:
        "Footing eccentricity and dry-side resisting moment cannot be accurately localized.",
    });
  }

  // 2. Material Specifications
  if (materials.concreteStrengthMPa === null || materials.concreteStrengthMPa <= 0) {
    flags.push({
      id: "missing-concrete-strength",
      field: "materials.concreteStrengthMPa",
      parameter: "Concrete Compressive Strength (f'c)",
      category: "material",
      severity: "critical",
      message: "WARNING: Concrete compressive strength (f'c) missing from General Notes or title block.",
      engineeringImpact:
        "Structural code compliance (NSCP 2015 / ACI 318) for hydraulic durability and shear capacity cannot be verified.",
    });
  }

  if (materials.concreteCoverMm === null || materials.concreteCoverMm <= 0) {
    flags.push({
      id: "missing-concrete-cover",
      field: "materials.concreteCoverMm",
      parameter: "Clear Concrete Cover (c_c)",
      category: "material",
      severity: "critical",
      message: "WARNING: Minimum clear concrete cover is not specified in structural notes.",
      engineeringImpact:
        "Cannot confirm durability protection against soil, flood scour, and waterborne chemical exposure.",
    });
  }

  if (materials.rebarYieldStrengthMPa === null || materials.rebarYieldStrengthMPa <= 0) {
    flags.push({
      id: "missing-rebar-yield",
      field: "materials.rebarYieldStrengthMPa",
      parameter: "Reinforcing Steel Yield Strength (fy)",
      category: "material",
      severity: "warning",
      message: "WARNING: Steel rebar grade / yield strength (fy) not identified.",
      engineeringImpact:
        "Flexural steel capacity and development length cannot be computed; default Grade 40 (275 MPa) or Grade 60 (414 MPa) must be confirmed.",
    });
  }

  // 3. Hydrology & Geotechnical Criteria
  const floodLevel = hydrologyGeotech.designFloodElevationM ?? hydrologyGeotech.wetSideLevelM;
  if (floodLevel === null || floodLevel < 0) {
    flags.push({
      id: "missing-design-flood",
      field: "hydrologyGeotech.wetSideLevelM",
      parameter: "Design Flood Level / Wet-Side Head (H_w)",
      category: "hydrology",
      severity: "critical",
      message: "WARNING: Design flood elevation or maximum operational water head not indicated.",
      engineeringImpact:
        "Cannot calculate lateral hydrostatic pressure, uplift seepage head, or sliding factor of safety.",
    });
  }

  if (hydrologyGeotech.frictionCoefficient === null || hydrologyGeotech.frictionCoefficient <= 0) {
    flags.push({
      id: "missing-friction-coeff",
      field: "hydrologyGeotech.frictionCoefficient",
      parameter: "Foundation Base Friction Coefficient (μ)",
      category: "geotechnical",
      severity: "critical",
      message: "WARNING: Foundation base sliding friction coefficient (μ) missing from geotechnical parameters.",
      engineeringImpact:
        "Cannot compute resisting frictional force at base-soil interface; sliding stability cannot be calculated.",
    });
  }

  if (hydrologyGeotech.soilFrictionAngleDeg === null || hydrologyGeotech.soilFrictionAngleDeg <= 0) {
    flags.push({
      id: "missing-soil-friction",
      field: "hydrologyGeotech.soilFrictionAngleDeg",
      parameter: "Backfill Internal Friction Angle (φ)",
      category: "geotechnical",
      severity: "warning",
      message: "WARNING: Granular backfill friction angle (φ) is absent.",
      engineeringImpact:
        "Rankine active earth pressure coefficient Ka cannot be established from project documents.",
    });
  }

  if (materials.concreteUnitWeightKNM3 === null || materials.concreteUnitWeightKNM3 <= 0) {
    flags.push({
      id: "missing-concrete-unit-weight",
      field: "materials.concreteUnitWeightKNM3",
      parameter: "Concrete Unit Weight",
      category: "material",
      severity: "critical",
      message: "WARNING: Concrete unit weight is not established by the project documents.",
      engineeringImpact: "Wall and footing self-weight cannot be calculated without an approved value.",
    });
  }

  if (hydrologyGeotech.soilUnitWeightKNM3 === null || hydrologyGeotech.soilUnitWeightKNM3 <= 0) {
    flags.push({
      id: "missing-soil-unit-weight",
      field: "hydrologyGeotech.soilUnitWeightKNM3",
      parameter: "Soil Unit Weight",
      category: "geotechnical",
      severity: "critical",
      message: "WARNING: Backfill/soil unit weight is not established by the geotechnical basis.",
      engineeringImpact: "Earth pressure and soil-over-heel weight cannot be calculated.",
    });
  }

  if (hydrologyGeotech.allowableBearingKPa === null || hydrologyGeotech.allowableBearingKPa <= 0) {
    flags.push({
      id: "missing-allowable-bearing",
      field: "hydrologyGeotech.allowableBearingKPa",
      parameter: "Allowable Bearing Pressure",
      category: "geotechnical",
      severity: "critical",
      message: "WARNING: Allowable bearing pressure is not established by an approved geotechnical basis.",
      engineeringImpact: "Foundation bearing adequacy cannot be evaluated.",
    });
  }

  if (
    hydrologyGeotech.drainageEfficiency === null ||
    hydrologyGeotech.drainageEfficiency < 0 ||
    hydrologyGeotech.drainageEfficiency > 1
  ) {
    flags.push({
      id: "missing-drainage-efficiency",
      field: "hydrologyGeotech.drainageEfficiency",
      parameter: "Drainage Efficiency",
      category: "hydrology",
      severity: "critical",
      message: "WARNING: Drainage relief is missing or invalid.",
      engineeringImpact: "Uplift cannot be reduced without a documented drainage design and load-case assumption.",
    });
  }

  if (hydrologyGeotech.retainedSoilHeightM === null || hydrologyGeotech.retainedSoilHeightM < 0) {
    flags.push({
      id: "missing-retained-soil-height",
      field: "hydrologyGeotech.retainedSoilHeightM",
      parameter: "Retained-Soil Height",
      category: "geometry",
      severity: "critical",
      message: "WARNING: Retained-soil height is not identified for the governing section.",
      engineeringImpact: "Active earth pressure and soil-over-heel stabilizing weight cannot be established.",
    });
  }

  if (hydrologyGeotech.designScourDepthM === null || hydrologyGeotech.designScourDepthM <= 0) {
    flags.push({
      id: "missing-design-scour",
      field: "hydrologyGeotech.designScourDepthM",
      parameter: "Design Scour Depth",
      category: "hydrology",
      severity: "critical",
      message: "WARNING: An approved positive design scour depth is not provided.",
      engineeringImpact: "Foundation support, cutoff penetration, piping path, and stability validity cannot be confirmed.",
    });
  }

  if (dimensions.embedmentDepthM === null || dimensions.embedmentDepthM <= 0) {
    flags.push({
      id: "missing-foundation-embedment",
      field: "dimensions.embedmentDepthM",
      parameter: "Foundation Embedment",
      category: "geometry",
      severity: "critical",
      message: "WARNING: Foundation embedment depth is not provided.",
      engineeringImpact: "Post-scour support and piping resistance cannot be evaluated.",
    });
  }

  if (hydrologyGeotech.foundationSoilType === null) {
    flags.push({
      id: "missing-foundation-soil-type",
      field: "hydrologyGeotech.foundationSoilType",
      parameter: "Foundation Soil Type",
      category: "geotechnical",
      severity: "critical",
      message: "WARNING: Foundation soil classification is not provided.",
      engineeringImpact: "The configured seepage/piping screening criterion cannot be selected.",
    });
  }

  return flags;
}
