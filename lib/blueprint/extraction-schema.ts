import type {
  ExtractedBlueprintData,
  ExtractedHydrologyGeotech,
  ExtractedMaterials,
  ExtractedDimensions,
} from "./types";

export class ExtractionValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Extracted blueprint data failed runtime validation.");
    this.name = "ExtractionValidationError";
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ExtractionValidationError([`${path} must be an object.`]);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, path: string) {
  if (typeof value !== "string") throw new ExtractionValidationError([`${path} must be a string.`]);
  return value;
}

function nullableNumber(
  value: unknown,
  path: string,
  options: { min?: number; max?: number } = {},
) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ExtractionValidationError([`${path} must be a finite number or null.`]);
  }
  if (options.min !== undefined && value < options.min) {
    throw new ExtractionValidationError([`${path} must be at least ${options.min}.`]);
  }
  if (options.max !== undefined && value > options.max) {
    throw new ExtractionValidationError([`${path} must be at most ${options.max}.`]);
  }
  return value;
}

function parseDimensions(value: unknown): ExtractedDimensions {
  const item = record(value, "dimensions");
  return {
    wallHeightM: nullableNumber(item.wallHeightM, "dimensions.wallHeightM", { min: 0 }),
    crestElevationM: nullableNumber(item.crestElevationM, "dimensions.crestElevationM"),
    baseWidthM: nullableNumber(item.baseWidthM, "dimensions.baseWidthM", { min: 0 }),
    stemThicknessM: nullableNumber(item.stemThicknessM, "dimensions.stemThicknessM", { min: 0 }),
    baseThicknessM: nullableNumber(item.baseThicknessM, "dimensions.baseThicknessM", { min: 0 }),
    toeWidthM: nullableNumber(item.toeWidthM, "dimensions.toeWidthM", { min: 0 }),
    heelWidthM: nullableNumber(item.heelWidthM, "dimensions.heelWidthM", { min: 0 }),
    embedmentDepthM: nullableNumber(item.embedmentDepthM, "dimensions.embedmentDepthM", { min: 0 }),
  };
}

function parseMaterials(value: unknown): ExtractedMaterials {
  const item = record(value, "materials");
  return {
    concreteStrengthMPa: nullableNumber(item.concreteStrengthMPa, "materials.concreteStrengthMPa", { min: 0 }),
    concreteUnitWeightKNM3: nullableNumber(item.concreteUnitWeightKNM3, "materials.concreteUnitWeightKNM3", { min: 0, max: 40 }),
    rebarYieldStrengthMPa: nullableNumber(item.rebarYieldStrengthMPa, "materials.rebarYieldStrengthMPa", { min: 0 }),
    rebarSizeMm: nullableNumber(item.rebarSizeMm, "materials.rebarSizeMm", { min: 0 }),
    rebarSpacingMm: nullableNumber(item.rebarSpacingMm, "materials.rebarSpacingMm", { min: 0 }),
    concreteCoverMm: nullableNumber(item.concreteCoverMm, "materials.concreteCoverMm", { min: 0 }),
  };
}

function parseHydrology(value: unknown): ExtractedHydrologyGeotech {
  const item = record(value, "hydrologyGeotech");
  const soilTypes = ["fine_sand", "coarse_sand", "silt", "clay", "gravel"] as const;
  const soilType = item.foundationSoilType;
  if (soilType !== null && !soilTypes.includes(soilType as (typeof soilTypes)[number])) {
    throw new ExtractionValidationError(["hydrologyGeotech.foundationSoilType is invalid."]);
  }
  return {
    designFloodElevationM: nullableNumber(item.designFloodElevationM, "hydrologyGeotech.designFloodElevationM"),
    wetSideLevelM: nullableNumber(item.wetSideLevelM, "hydrologyGeotech.wetSideLevelM", { min: 0 }),
    drySideLevelM: nullableNumber(item.drySideLevelM, "hydrologyGeotech.drySideLevelM", { min: 0 }),
    frictionCoefficient: nullableNumber(item.frictionCoefficient, "hydrologyGeotech.frictionCoefficient", { min: 0, max: 1.5 }),
    soilUnitWeightKNM3: nullableNumber(item.soilUnitWeightKNM3, "hydrologyGeotech.soilUnitWeightKNM3", { min: 0, max: 40 }),
    soilFrictionAngleDeg: nullableNumber(item.soilFrictionAngleDeg, "hydrologyGeotech.soilFrictionAngleDeg", { min: 0, max: 60 }),
    allowableBearingKPa: nullableNumber(item.allowableBearingKPa, "hydrologyGeotech.allowableBearingKPa", { min: 0 }),
    surchargeKPa: nullableNumber(item.surchargeKPa, "hydrologyGeotech.surchargeKPa", { min: 0 }),
    drainageEfficiency: nullableNumber(item.drainageEfficiency, "hydrologyGeotech.drainageEfficiency", { min: 0, max: 1 }),
    retainedSoilHeightM: nullableNumber(item.retainedSoilHeightM, "hydrologyGeotech.retainedSoilHeightM", { min: 0 }),
    designScourDepthM: nullableNumber(item.designScourDepthM, "hydrologyGeotech.designScourDepthM", { min: 0 }),
    foundationSoilType: soilType as ExtractedHydrologyGeotech["foundationSoilType"],
  };
}

export function parseExtractedBlueprintData(value: unknown): ExtractedBlueprintData {
  const root = record(value, "root");
  const metadata = record(root.metadata, "metadata");
  const issueStatuses = ["approved_for_construction", "as_built", "preliminary", "superseded", "unknown"] as const;
  const issueStatus = metadata.issueStatus;
  if (!issueStatuses.includes(issueStatus as (typeof issueStatuses)[number])) {
    throw new ExtractionValidationError(["metadata.issueStatus is invalid."]);
  }
  if (!Array.isArray(root.rawNotes) || !root.rawNotes.every((note) => typeof note === "string")) {
    throw new ExtractionValidationError(["rawNotes must be an array of strings."]);
  }

  return {
    metadata: {
      projectName: stringValue(metadata.projectName, "metadata.projectName"),
      structureId: stringValue(metadata.structureId, "metadata.structureId"),
      sheetNumber: stringValue(metadata.sheetNumber, "metadata.sheetNumber"),
      sheetTitle: stringValue(metadata.sheetTitle, "metadata.sheetTitle"),
      revision: stringValue(metadata.revision, "metadata.revision"),
      issueStatus: issueStatus as ExtractedBlueprintData["metadata"]["issueStatus"],
      date: stringValue(metadata.date, "metadata.date"),
      engineerOfRecord: stringValue(metadata.engineerOfRecord, "metadata.engineerOfRecord"),
    },
    dimensions: parseDimensions(root.dimensions),
    materials: parseMaterials(root.materials),
    hydrologyGeotech: parseHydrology(root.hydrologyGeotech),
    rawNotes: root.rawNotes as string[],
  };
}
