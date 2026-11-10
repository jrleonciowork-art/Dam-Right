export type ExtractedDimensions = {
  wallHeightM: number | null;
  crestElevationM: number | null;
  baseWidthM: number | null;
  stemThicknessM: number | null;
  baseThicknessM: number | null;
  toeWidthM: number | null;
  heelWidthM: number | null;
  embedmentDepthM: number | null;
};

export type ExtractedMaterials = {
  concreteStrengthMPa: number | null; // fc'
  concreteUnitWeightKNM3: number | null;
  rebarYieldStrengthMPa: number | null; // fy
  rebarSizeMm: number | null;
  rebarSpacingMm: number | null;
  concreteCoverMm: number | null;
};

export type ExtractedHydrologyGeotech = {
  designFloodElevationM: number | null;
  wetSideLevelM: number | null;
  drySideLevelM: number | null;
  frictionCoefficient: number | null; // mu
  soilUnitWeightKNM3: number | null;
  soilFrictionAngleDeg: number | null; // phi
  allowableBearingKPa: number | null;
  surchargeKPa: number | null;
  drainageEfficiency: number | null;
  retainedSoilHeightM: number | null;
  designScourDepthM: number | null;
  foundationSoilType: "fine_sand" | "coarse_sand" | "silt" | "clay" | "gravel" | null;
};

export type ExtractedMetadata = {
  projectName: string;
  structureId: string;
  sheetNumber: string;
  sheetTitle: string;
  revision: string;
  issueStatus: "approved_for_construction" | "as_built" | "preliminary" | "superseded" | "unknown";
  date: string;
  engineerOfRecord: string;
};

export type ExtractedBlueprintData = {
  metadata: ExtractedMetadata;
  dimensions: ExtractedDimensions;
  materials: ExtractedMaterials;
  hydrologyGeotech: ExtractedHydrologyGeotech;
  rawNotes: string[];
};

export type MissingDataSeverity = "warning" | "critical";

export type MissingDataFlag = {
  id: string;
  field: string;
  parameter: string;
  category: "geometry" | "material" | "hydrology" | "geotechnical";
  severity: MissingDataSeverity;
  message: string;
  engineeringImpact: string;
};

export type ComplianceStatus =
  | "pass"
  | "warning"
  | "violation"
  | "insufficient_information"
  | "not_evaluated";

export type ComplianceFinding = {
  id: string;
  ruleId: string;
  codeStandard: string; // e.g. "NSCP 2015 §420.6.1 / ACI 318"
  category: "structural" | "detailing" | "stability" | "durability" | "hydraulic";
  status: ComplianceStatus;
  title: string;
  description: string;
  demand: string;
  limit: string;
  recommendation?: string;
};

export type BlueprintParseResult = {
  success: boolean;
  sourceFileName: string;
  fileSizeBytes: number;
  extractedData: ExtractedBlueprintData;
  missingDataFlags: MissingDataFlag[];
  complianceReport: ComplianceFinding[];
  summary: {
    totalMissing: number;
    criticalMissing: number;
    violations: number;
    warnings: number;
    incomplete: number;
    passed: number;
  };
  aiProvider: string;
  parsedAt: string;
};
