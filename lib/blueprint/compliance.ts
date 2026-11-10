import type { ExtractedBlueprintData, ComplianceFinding } from "./types";
import { calculateWallReview, type WallInput } from "../engineering/wall";
import { DRAFT_PHILIPPINE_FLOOD_WALL_PACK, resolveWallCriteria } from "../standards/rule-pack";

const DRAFT_CRITERIA = resolveWallCriteria(DRAFT_PHILIPPINE_FLOOD_WALL_PACK);

function finite(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

export function evaluateStructuralCompliance(data: ExtractedBlueprintData): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  const { dimensions, materials, hydrologyGeotech } = data;

  // 1. Concrete Compressive Strength (f'c)
  // Reference: NSCP 2015 Section 419.2 / ACI 318 Section 19.2 / DPWH DGCS Vol 3
  if (materials.concreteStrengthMPa !== null) {
    const fc = materials.concreteStrengthMPa;
    if (fc < 20.7) {
      findings.push({
        id: "comp-fc-violation",
        ruleId: "NSCP-419.2-FC-MIN",
        codeStandard: "NSCP 2015 §419.2 / ACI 318 §19.2.1",
        category: "structural",
        status: "violation",
        title: "Substandard Concrete Compressive Strength",
        description: `Specified concrete strength f'c = ${fc.toFixed(1)} MPa is below the mandatory minimum of 20.7 MPa (3,000 psi) for hydraulic and soil-retaining structural concrete.`,
        demand: `${fc.toFixed(1)} MPa`,
        limit: "≥ 20.7 MPa",
        recommendation: "Specify Class A concrete mix (20.7 MPa to 27.6 MPa) per DPWH Standard Specifications Item 405.",
      });
    } else if (fc < 24.0) {
      findings.push({
        id: "comp-fc-warning",
        ruleId: "DPWH-DGCS-FC-DURABLE",
        codeStandard: "DPWH DGCS Vol 3 / ACI 350-06 §4.2",
        category: "durability",
        status: "warning",
        title: "Marginal Concrete Strength for Severe Water Exposure",
        description: `Specified f'c = ${fc.toFixed(1)} MPa meets bare structural minimum (20.7 MPa), but environmental durability for water-retaining flood structures recommends at least 24.0 MPa to 27.6 MPa.`,
        demand: `${fc.toFixed(1)} MPa`,
        limit: "≥ 24.0 MPa (recommended for water exposure)",
        recommendation: "Consider upgrading to 27.6 MPa (4,000 psi) mix to resist water permeability and abrasion.",
      });
    } else {
      findings.push({
        id: "comp-fc-pass",
        ruleId: "NSCP-419.2-FC-MIN",
        codeStandard: "NSCP 2015 §419.2 / ACI 318 §19.2.1",
        category: "structural",
        status: "pass",
        title: "Concrete Compressive Strength Compliant",
        description: `Specified f'c = ${fc.toFixed(1)} MPa satisfies NSCP 2015 and ACI 318 minimum requirements.`,
        demand: `${fc.toFixed(1)} MPa`,
        limit: "≥ 20.7 MPa",
      });
    }
  }

  // 2. Minimum Concrete Cover
  // Reference: NSCP 2015 Section 420.6.1 / ACI 318 Table 20.6.1.3.1
  if (materials.concreteCoverMm !== null) {
    const cover = materials.concreteCoverMm;
    if (cover < 50) {
      findings.push({
        id: "comp-cover-violation",
        ruleId: "NSCP-420.6.1-COVER",
        codeStandard: "NSCP 2015 §420.6.1 / ACI 318-19 Table 20.6.1.3.1",
        category: "detailing",
        status: "violation",
        title: "Severe Clear Concrete Cover Deficiency",
        description: `Specified cover = ${cover} mm is less than the absolute 50 mm minimum for formed surfaces exposed to weather, and well below 75 mm for concrete cast against earth.`,
        demand: `${cover} mm`,
        limit: "≥ 75 mm (against earth) / ≥ 50 mm (formed weather-exposed)",
        recommendation: "Provide 75 mm clear cover for footing bottom/sides and 50–75 mm for water-retaining wall stem.",
      });
    } else if (cover < 75) {
      findings.push({
        id: "comp-cover-warning",
        ruleId: "NSCP-420.6.1-COVER-EARTH",
        codeStandard: "NSCP 2015 §420.6.1 / DPWH Standard Plans",
        category: "detailing",
        status: "warning",
        title: "Concrete Cover Below 75 mm Earth-Contact Standard",
        description: `Specified cover = ${cover} mm is acceptable for formed surfaces, but concrete cast permanently against soil or wet backfill requires 75 mm minimum clear cover.`,
        demand: `${cover} mm`,
        limit: "≥ 75 mm for earth contact",
        recommendation: "Ensure 75 mm minimum cover is provided wherever concrete contacts native ground or backfill.",
      });
    } else {
      findings.push({
        id: "comp-cover-pass",
        ruleId: "NSCP-420.6.1-COVER",
        codeStandard: "NSCP 2015 §420.6.1 / ACI 318-19",
        category: "detailing",
        status: "pass",
        title: "Clear Concrete Cover Compliant",
        description: `Specified cover = ${cover} mm satisfies NSCP and ACI criteria for permanent soil and water contact.`,
        demand: `${cover} mm`,
        limit: "≥ 75 mm",
      });
    }
  }

  // 3. Stem Thickness & Slenderness
  // Reference: DPWH Standard Plan / ACI 318 Cantilever Retaining Walls
  if (dimensions.stemThicknessM !== null && dimensions.wallHeightM !== null) {
    const t = dimensions.stemThicknessM;
    const h = dimensions.wallHeightM;
    const minRecommendedThickness = Math.max(0.30, h / 12);

    if (t < 0.25) {
      findings.push({
        id: "comp-stem-violation",
        ruleId: "DPWH-DGCS-STEM-MIN",
        codeStandard: "DPWH Standard Plans / ACI 318 Cantilever Wall Practice",
        category: "structural",
        status: "violation",
        title: "Stem Thickness Below Absolute Structural Minimum",
        description: `Stem thickness of ${(t * 1000).toFixed(0)} mm is below the standard minimum of 300 mm (absolute 250 mm). High risk of rebar congestion and flexural failure under hydraulic load.`,
        demand: `${(t * 1000).toFixed(0)} mm`,
        limit: "≥ 300 mm (absolute min 250 mm)",
        recommendation: "Increase stem base thickness to at least 300 mm (or H/12).",
      });
    } else if (t < minRecommendedThickness) {
      findings.push({
        id: "comp-stem-slenderness-warning",
        ruleId: "ACI-318-STEM-SLENDERNESS",
        codeStandard: "ACI 318 / AASHTO LRFD Retaining Wall Rules",
        category: "structural",
        status: "warning",
        title: "Stem Slenderness Exceeds Empirical H/12 Rule",
        description: `Stem thickness ${(t * 1000).toFixed(0)} mm is less than recommended H/12 = ${(minRecommendedThickness * 1000).toFixed(0)} mm for wall height ${h.toFixed(2)} m. Excessive deflection or cracking possible under flood surge.`,
        demand: `${(t * 1000).toFixed(0)} mm`,
        limit: `≥ ${(minRecommendedThickness * 1000).toFixed(0)} mm (H/12 rule)`,
        recommendation: "Provide tapered stem or thicken base to meet H/12 proportion.",
      });
    } else {
      findings.push({
        id: "comp-stem-pass",
        ruleId: "DPWH-DGCS-STEM-MIN",
        codeStandard: "DPWH Standard Plans / ACI 318",
        category: "structural",
        status: "pass",
        title: "Stem Thickness & Proportion Adequate",
        description: `Stem thickness ${(t * 1000).toFixed(0)} mm satisfies minimum thickness and H/12 proportion for wall height ${h.toFixed(2)} m.`,
        demand: `${(t * 1000).toFixed(0)} mm`,
        limit: "≥ 300 mm",
      });
    }
  }

  // 4. Base Width to Height Proportion (B / H)
  // Reference: DPWH Flood Control Design Guidelines / USACE EM 1110-2-2502
  if (dimensions.baseWidthM !== null && dimensions.wallHeightM !== null) {
    const b = dimensions.baseWidthM;
    const h = dimensions.wallHeightM;
    const ratio = b / h;

    if (ratio < 0.45) {
      findings.push({
        id: "comp-base-ratio-violation",
        ruleId: "USACE-EM-BASE-PROPORTION",
        codeStandard: "USACE EM 1110-2-2502 / DPWH DGCS Vol 3 §4",
        category: "stability",
        status: "violation",
        title: "Base Width Proportion Inadequate (B/H < 0.45)",
        description: `Base width to wall height ratio is ${ratio.toFixed(2)} (B = ${b.toFixed(2)} m, H = ${h.toFixed(2)} m). Standard cantilever walls require B/H between 0.45 and 0.75 for external overturning stability.`,
        demand: `B/H = ${ratio.toFixed(2)}`,
        limit: "0.45 ≤ B/H ≤ 0.75",
        recommendation: `Widen footing base to at least ${(h * 0.55).toFixed(2)} m to provide sufficient resisting moment.`,
      });
    } else if (ratio > 0.85) {
      findings.push({
        id: "comp-base-ratio-warning",
        ruleId: "DPWH-DGCS-BASE-WIDTH-HEAVY",
        codeStandard: "DPWH DGCS Vol 3 Retaining Wall Standards",
        category: "stability",
        status: "warning",
        title: "Base Width Ratio B/H Exceeds Typical Range (B/H > 0.85)",
        description: `Base width ratio B/H = ${ratio.toFixed(2)} is unusually wide, typically indicating poor foundation bearing capacity or deep pile support requirements.`,
        demand: `B/H = ${ratio.toFixed(2)}`,
        limit: "0.45 ≤ B/H ≤ 0.75",
        recommendation: "Verify geotechnical allowable bearing pressure and examine if a shear key or pile foundation is more economical.",
      });
    } else {
      findings.push({
        id: "comp-base-ratio-pass",
        ruleId: "USACE-EM-BASE-PROPORTION",
        codeStandard: "USACE EM 1110-2-2502 / DPWH DGCS",
        category: "stability",
        status: "pass",
        title: "Base Width to Height Proportion Compliant",
        description: `Base width ratio B/H = ${ratio.toFixed(2)} is within the standard 0.45–0.75 design envelope.`,
        demand: `B/H = ${ratio.toFixed(2)}`,
        limit: "0.45 ≤ B/H ≤ 0.75",
      });
    }
  }

  // 5. Dimensional Chain Closure
  if (
    dimensions.baseWidthM !== null &&
    dimensions.toeWidthM !== null &&
    dimensions.stemThicknessM !== null &&
    dimensions.heelWidthM !== null
  ) {
    const sum = dimensions.toeWidthM + dimensions.stemThicknessM + dimensions.heelWidthM;
    const diff = Math.abs(dimensions.baseWidthM - sum);
    if (diff > 0.02) {
      findings.push({
        id: "comp-chain-closure-violation",
        ruleId: "DIMENSIONAL-CHAIN-CLOSURE",
        codeStandard: "Civil Engineering Drawing Standards / ASME Y14.5",
        category: "structural",
        status: "violation",
        title: "Dimensional Chain Inclosure Error",
        description: `Footing geometry does not close: Base Width (${dimensions.baseWidthM.toFixed(3)} m) ≠ Toe (${dimensions.toeWidthM.toFixed(3)} m) + Stem (${dimensions.stemThicknessM.toFixed(3)} m) + Heel (${dimensions.heelWidthM.toFixed(3)} m) [Sum = ${sum.toFixed(3)} m, discrepancy = ${(diff * 1000).toFixed(0)} mm].`,
        demand: `Discrepancy ${(diff * 1000).toFixed(0)} mm`,
        limit: "≤ 10 mm",
        recommendation: "Reconcile drawing callouts on Section A-A and Foundation Plan to establish exact heel/toe dimensions.",
      });
    }
  }

  // 6. Hydraulic Freeboard Adequacy
  // Reference: DPWH DGCS Vol 3 §4.2 Flood Control
  const floodLevel = hydrologyGeotech.designFloodElevationM ?? hydrologyGeotech.wetSideLevelM;
  if (floodLevel !== null && dimensions.wallHeightM !== null) {
    const freeboard = dimensions.wallHeightM - floodLevel;
    if (freeboard < 0) {
      findings.push({
        id: "comp-freeboard-violation",
        ruleId: "DPWH-DGCS-FREEBOARD-NEGATIVE",
        codeStandard: "DPWH DGCS Vol 3 §4.2 / USACE Design Flood Standards",
        category: "hydraulic",
        status: "violation",
        title: "Negative Hydraulic Freeboard (Overtopping Hazard)",
        description: `Design flood water level (${floodLevel.toFixed(2)} m) exceeds wall crest elevation (${dimensions.wallHeightM.toFixed(2)} m) by ${Math.abs(freeboard).toFixed(2)} m. Catastrophic overtopping and scour failure will occur.`,
        demand: `Freeboard = ${freeboard.toFixed(2)} m`,
        limit: "≥ 0.60 m freeboard",
        recommendation: `Increase wall crest height to at least ${(floodLevel + 0.60).toFixed(2)} m or add wave/splash deflector coping.`,
      });
    } else if (freeboard < 0.60) {
      findings.push({
        id: "comp-freeboard-warning",
        ruleId: "DPWH-DGCS-FREEBOARD-MIN",
        codeStandard: "DPWH DGCS Vol 3 §4.2 Flood Control Criteria",
        category: "hydraulic",
        status: "warning",
        title: "Freeboard Below DPWH 0.60 m Standard",
        description: `Freeboard of ${freeboard.toFixed(2)} m is less than the DPWH minimum 0.60 m required for flood walls to prevent wind setup, wave wash, and debris overtopping.`,
        demand: `${freeboard.toFixed(2)} m`,
        limit: "≥ 0.60 m",
        recommendation: "Raise crest elevation by at least " + ((0.60 - freeboard) * 100).toFixed(0) + " cm to guarantee required design freeboard.",
      });
    } else {
      findings.push({
        id: "comp-freeboard-pass",
        ruleId: "DPWH-DGCS-FREEBOARD-MIN",
        codeStandard: "DPWH DGCS Vol 3 §4.2",
        category: "hydraulic",
        status: "pass",
        title: "Hydraulic Freeboard Adequate",
        description: `Freeboard of ${freeboard.toFixed(2)} m meets or exceeds DPWH 0.60 m requirement.`,
        demand: `${freeboard.toFixed(2)} m`,
        limit: "≥ 0.60 m",
      });
    }
  }

  // 7. Factor of Safety against Sliding and Overturning via Deterministic Engine.
  // Missing project values are blockers; they are never replaced by generic defaults.
  const stabilityPrerequisites: Array<[string, number | null, (value: number) => boolean]> = [
    ["wall height", dimensions.wallHeightM, (value) => value > 0],
    ["stem thickness", dimensions.stemThicknessM, (value) => value > 0],
    ["base width", dimensions.baseWidthM, (value) => value > 0],
    ["base thickness", dimensions.baseThicknessM, (value) => value > 0],
    ["toe width", dimensions.toeWidthM, (value) => value >= 0],
    ["foundation embedment", dimensions.embedmentDepthM, (value) => value > 0],
    ["concrete unit weight", materials.concreteUnitWeightKNM3, (value) => value > 0],
    ["soil unit weight", hydrologyGeotech.soilUnitWeightKNM3, (value) => value > 0],
    ["base friction coefficient", hydrologyGeotech.frictionCoefficient, (value) => value > 0],
    ["soil friction angle", hydrologyGeotech.soilFrictionAngleDeg, (value) => value > 0],
    ["allowable bearing pressure", hydrologyGeotech.allowableBearingKPa, (value) => value > 0],
    ["design flood/wet-side level", floodLevel, (value) => value >= 0],
    ["dry-side level", hydrologyGeotech.drySideLevelM, (value) => value >= 0],
    ["retained-soil height", hydrologyGeotech.retainedSoilHeightM, (value) => value >= 0],
    ["surcharge", hydrologyGeotech.surchargeKPa, (value) => value >= 0],
    ["drainage efficiency", hydrologyGeotech.drainageEfficiency, (value) => value >= 0 && value <= 1],
    ["design scour depth", hydrologyGeotech.designScourDepthM, (value) => value > 0],
  ];
  const missingStabilityInputs = stabilityPrerequisites
    .filter(([, value, isValid]) => !finite(value) || !isValid(value))
    .map(([label]) => label);
  if (hydrologyGeotech.foundationSoilType === null) {
    missingStabilityInputs.push("foundation soil type");
  }

  if (missingStabilityInputs.length > 0) {
    findings.push({
      id: "comp-stability-incomplete",
      ruleId: "STABILITY-INPUT-PREREQUISITES",
      codeStandard: "Project design basis required",
      category: "stability",
      status: "insufficient_information",
      title: "Stability checks not evaluated",
      description: `Required project inputs are missing or invalid: ${missingStabilityInputs.join(", ")}. No generic engineering values were substituted.`,
      demand: "Incomplete input set",
      limit: "All mandatory inputs required",
      recommendation: "Provide traceable project-specific values before calculating stability.",
    });
  } else {
    const calcInput: WallInput = {
      project: {
        name: data.metadata.projectName,
        location: "Drawing review",
        structureId: data.metadata.structureId,
        jurisdiction: "Philippines",
        standardPack: "Draft criteria — independent approval required",
      },
      geometry: {
        wallHeightM: dimensions.wallHeightM as number,
        stemThicknessM: dimensions.stemThicknessM as number,
        plannedStemThicknessM: dimensions.stemThicknessM as number,
        baseWidthM: dimensions.baseWidthM as number,
        baseThicknessM: dimensions.baseThicknessM as number,
        toeWidthM: dimensions.toeWidthM as number,
      },
      materials: {
        concreteUnitWeightKNM3: materials.concreteUnitWeightKNM3 as number,
        soilUnitWeightKNM3: hydrologyGeotech.soilUnitWeightKNM3 as number,
        frictionCoefficient: hydrologyGeotech.frictionCoefficient as number,
        soilFrictionAngleDeg: hydrologyGeotech.soilFrictionAngleDeg as number,
        allowableBearingKPa: hydrologyGeotech.allowableBearingKPa as number,
      },
      subsurface: {
        footingEmbedmentM: dimensions.embedmentDepthM as number,
        asBuiltFootingEmbedmentM: dimensions.embedmentDepthM as number,
        hasSheetPileCutoff: false,
        plannedSheetPileLengthM: 0,
        asDrivenSheetPileLengthM: null,
        designScourDepthM: hydrologyGeotech.designScourDepthM as number,
        foundationSoilType: hydrologyGeotech.foundationSoilType!,
      },
      loadCase: {
        name: "Extracted design load case",
        wetSideLevelM: floodLevel as number,
        drySideLevelM: hydrologyGeotech.drySideLevelM as number,
        retainedSoilHeightM: hydrologyGeotech.retainedSoilHeightM as number,
        surchargeKPa: hydrologyGeotech.surchargeKPa as number,
        drainageEfficiency: hydrologyGeotech.drainageEfficiency as number,
      },
      limits: {
        minimumSlidingFs: DRAFT_CRITERIA.minimumSlidingFs,
        minimumOverturningFs: DRAFT_CRITERIA.minimumOverturningFs,
        requireNoTension: DRAFT_CRITERIA.requireNoTension,
      },
    };

    try {
      const review = calculateWallReview(calcInput);
      const { fsSliding, fsOverturning } = review.values;

      if (!Number.isFinite(fsSliding) || !Number.isFinite(fsOverturning)) {
        findings.push({
          id: "comp-stability-not-evaluated",
          ruleId: "STABILITY-MODEL-VALIDITY",
          codeStandard: "Deterministic engine validity gate",
          category: "stability",
          status: "not_evaluated",
          title: "Stability results invalidated",
          description: "The calculation model returned no valid stability result because a governing support or model-validity condition failed.",
          demand: "Not evaluated",
          limit: "Valid model domain required",
        });
      } else {
        findings.push({
          id: fsSliding < DRAFT_CRITERIA.minimumSlidingFs ? "comp-sliding-violation" : "comp-sliding-pass",
          ruleId: "PROJECT-STABILITY-SLIDING-DRAFT",
          codeStandard: "Draft project criterion — approval required",
          category: "stability",
          status: fsSliding < DRAFT_CRITERIA.minimumSlidingFs ? "violation" : "pass",
          title: fsSliding < DRAFT_CRITERIA.minimumSlidingFs ? "Sliding Factor of Safety Below Criterion" : "Sliding Calculation Satisfied",
          description: `Calculated sliding FS = ${fsSliding.toFixed(2)} against the unapproved draft criterion of ${DRAFT_CRITERIA.minimumSlidingFs.toFixed(2)}. This individual result is not overall approval.`,
          demand: `FS = ${fsSliding.toFixed(2)}`,
          limit: `≥ ${DRAFT_CRITERIA.minimumSlidingFs.toFixed(2)} (unapproved draft)`,
        });
        findings.push({
          id: fsOverturning < DRAFT_CRITERIA.minimumOverturningFs ? "comp-overturning-violation" : "comp-overturning-pass",
          ruleId: "PROJECT-STABILITY-OVERTURNING-DRAFT",
          codeStandard: "Draft project criterion — approval required",
          category: "stability",
          status: fsOverturning < DRAFT_CRITERIA.minimumOverturningFs ? "violation" : "pass",
          title: fsOverturning < DRAFT_CRITERIA.minimumOverturningFs ? "Overturning Factor of Safety Below Criterion" : "Overturning Calculation Satisfied",
          description: `Calculated overturning FS = ${fsOverturning.toFixed(2)} against the unapproved draft criterion of ${DRAFT_CRITERIA.minimumOverturningFs.toFixed(2)}. This individual result is not overall approval.`,
          demand: `FS = ${fsOverturning.toFixed(2)}`,
          limit: `≥ ${DRAFT_CRITERIA.minimumOverturningFs.toFixed(2)} (unapproved draft)`,
        });
      }

      const scourFinding = review.findings.find((finding) => finding.id === "toe-scour-undermining");
      if (scourFinding?.status === "fail") {
        findings.push({
          id: "comp-scour-undermining",
          ruleId: "SCOUR-SUPPORT-VALIDITY",
          codeStandard: "Project scour basis required",
          category: "hydraulic",
          status: "violation",
          title: "Footing support invalidated by scour",
          description: scourFinding.summary,
          demand: scourFinding.demand ? `${scourFinding.demand.value} ${scourFinding.demand.unit}` : "Scour depth",
          limit: scourFinding.capacity ? `${scourFinding.capacity.value} ${scourFinding.capacity.unit}` : "Embedment",
        });
      }
    } catch {
      findings.push({
        id: "comp-stability-calculation-error",
        ruleId: "STABILITY-CALCULATION-ERROR",
        codeStandard: "Calculation engine",
        category: "stability",
        status: "not_evaluated",
        title: "Stability calculation could not be completed",
        description: "The deterministic engine rejected the supplied input set. Review the input trace and model applicability.",
        demand: "Not evaluated",
        limit: "Successful deterministic calculation required",
      });
    }
  }

  return findings;
}
