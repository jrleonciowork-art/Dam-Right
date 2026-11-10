export type ReviewStatus =
  | "pass"
  | "fail"
  | "warning"
  | "insufficient_information"
  | "unsupported"
  | "not_evaluated"
  | "not_applicable";

export type FoundationSoilType =
  | "fine_sand"
  | "coarse_sand"
  | "silt"
  | "clay"
  | "gravel";

export type SubsurfaceInput = {
  footingEmbedmentM: number;
  asBuiltFootingEmbedmentM: number | null;
  hasSheetPileCutoff: boolean;
  plannedSheetPileLengthM: number;
  asDrivenSheetPileLengthM: number | null;
  designScourDepthM: number;
  foundationSoilType: FoundationSoilType;
};

export type WallInput = {
  project: {
    name: string;
    location: string;
    structureId: string;
    jurisdiction: string;
    standardPack: string;
  };
  geometry: {
    wallHeightM: number;
    stemThicknessM: number;
    plannedStemThicknessM: number;
    baseWidthM: number;
    baseThicknessM: number;
    toeWidthM: number;
  };
  materials: {
    concreteUnitWeightKNM3: number;
    soilUnitWeightKNM3: number;
    frictionCoefficient: number;
    soilFrictionAngleDeg: number;
    allowableBearingKPa: number | null;
  };
  subsurface: SubsurfaceInput;
  loadCase: {
    name: string;
    wetSideLevelM: number;
    drySideLevelM: number;
    retainedSoilHeightM: number;
    surchargeKPa: number;
    drainageEfficiency: number;
  };
  limits: {
    minimumSlidingFs: number;
    minimumOverturningFs: number;
    requireNoTension: boolean;
  };
};

export type Quantity = {
  label: string;
  value: number;
  unit: string;
};

export type ReviewFinding = {
  id: string;
  title: string;
  status: ReviewStatus;
  severity: "info" | "minor" | "major" | "critical";
  summary: string;
  equation?: string;
  demand?: Quantity;
  capacity?: Quantity;
};

export type WallCalculation = {
  values: {
    heelWidthM: number;
    activeEarthCoefficient: number;
    stemWeightKNM: number;
    baseWeightKNM: number;
    soilWeightKNM: number;
    totalWeightKNM: number;
    wetWaterForceKNM: number;
    dryWaterForceKNM: number;
    earthForceKNM: number;
    surchargeForceKNM: number;
    upliftForceKNM: number;
    effectiveVerticalForceKNM: number;
    netHorizontalForceKNM: number;
    overturningMomentKNMPerM: number;
    resistingMomentKNMPerM: number;
    fsSliding: number;
    fsOverturning: number;
    resultantFromToeM: number;
    eccentricityM: number;
    toePressureKPa: number;
    heelPressureKPa: number;
    effectiveEmbedmentM: number;
    scourDeficitM: number;
    penetrationBelowScourM: number;
    laneCreepRatio: number;
    allowableCreepRatio: number;
  };
  findings: ReviewFinding[];
  assumptions: string[];
};

export const ALLOWABLE_CREEP_RATIOS: Record<FoundationSoilType, number> = {
  fine_sand: 7.0,
  silt: 8.5,
  coarse_sand: 5.0,
  gravel: 3.5,
  clay: 2.5,
};

const WATER_UNIT_WEIGHT_KNM3 = 9.81;

function isPositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function isNonNegative(value: number) {
  return Number.isFinite(value) && value >= 0;
}

function safeRatio(numerator: number, denominator: number) {
  if (denominator <= 0) return Number.POSITIVE_INFINITY;
  return numerator / denominator;
}

function hydrostaticForce(levelM: number) {
  return 0.5 * WATER_UNIT_WEIGHT_KNM3 * levelM ** 2;
}

function pressureCentroidFromToe(
  toePressureKPa: number,
  heelPressureKPa: number,
  baseWidthM: number,
) {
  const pressureSum = toePressureKPa + heelPressureKPa;
  if (pressureSum <= 0) return baseWidthM / 2;
  return (
    (baseWidthM * (toePressureKPa + 2 * heelPressureKPa)) /
    (3 * pressureSum)
  );
}

function missingInputFindings(input: WallInput, heelWidthM: number) {
  const findings: ReviewFinding[] = [];
  const required: Array<[string, number | null]> = [
    ["Wall height", input.geometry.wallHeightM],
    ["Stem thickness", input.geometry.stemThicknessM],
    ["Planned stem thickness", input.geometry.plannedStemThicknessM],
    ["Base width", input.geometry.baseWidthM],
    ["Base thickness", input.geometry.baseThicknessM],
    ["Concrete unit weight", input.materials.concreteUnitWeightKNM3],
    ["Soil unit weight", input.materials.soilUnitWeightKNM3],
    ["Friction coefficient", input.materials.frictionCoefficient],
    ["Soil friction angle", input.materials.soilFrictionAngleDeg],
    ["Minimum sliding factor", input.limits.minimumSlidingFs],
    ["Minimum overturning factor", input.limits.minimumOverturningFs],
  ];

  for (const [label, value] of required) {
    if (value === null || !isPositive(value)) {
      findings.push({
        id: `missing-${label.toLowerCase().replaceAll(" ", "-")}`,
        title: `${label} is required`,
        status: "insufficient_information",
        severity: "critical",
        summary: "Enter a finite value greater than zero before this load case can be evaluated.",
      });
    }
  }

  if (!isNonNegative(input.geometry.toeWidthM) || heelWidthM <= 0) {
    findings.push({
      id: "invalid-base-geometry",
      title: "Base geometry is invalid",
      status: "insufficient_information",
      severity: "critical",
      summary: "Base width must exceed the sum of toe width and stem thickness, leaving a positive heel width.",
    });
  }

  if (
    !isNonNegative(input.loadCase.wetSideLevelM) ||
    !isNonNegative(input.loadCase.drySideLevelM) ||
    !isNonNegative(input.loadCase.retainedSoilHeightM) ||
    !isNonNegative(input.loadCase.surchargeKPa)
  ) {
    findings.push({
      id: "invalid-load-input",
      title: "Load-case inputs are invalid",
      status: "insufficient_information",
      severity: "critical",
      summary: "Water levels, retained-soil height, and surcharge must be finite non-negative values.",
    });
  }

  if (
    !Number.isFinite(input.loadCase.drainageEfficiency) ||
    input.loadCase.drainageEfficiency < 0 ||
    input.loadCase.drainageEfficiency > 1
  ) {
    findings.push({
      id: "invalid-drainage-efficiency",
      title: "Drainage efficiency is invalid",
      status: "insufficient_information",
      severity: "critical",
      summary: "Drainage efficiency must be between 0 and 1 and must be supported by the drainage design.",
    });
  }

  if (input.subsurface) {
    if (!isNonNegative(input.subsurface.footingEmbedmentM)) {
      findings.push({
        id: "invalid-footing-embedment",
        title: "Footing embedment is invalid",
        status: "insufficient_information",
        severity: "critical",
        summary: "Footing embedment depth must be a non-negative finite number.",
      });
    }
    if (!isNonNegative(input.subsurface.designScourDepthM)) {
      findings.push({
        id: "invalid-scour-depth",
        title: "Design scour depth is invalid",
        status: "insufficient_information",
        severity: "critical",
        summary: "Design scour depth must be a non-negative finite number.",
      });
    }
    if (input.subsurface.hasSheetPileCutoff && !isNonNegative(input.subsurface.plannedSheetPileLengthM)) {
      findings.push({
        id: "invalid-sheet-pile-length",
        title: "Sheet pile length is invalid",
        status: "insufficient_information",
        severity: "critical",
        summary: "Planned sheet pile length must be a non-negative finite number when sheet pile cutoff is enabled.",
      });
    }
  }

  return findings;
}

export function calculateWallReview(input: WallInput): WallCalculation {
  const { geometry, materials, loadCase, limits } = input;
  const heelWidthM = geometry.baseWidthM - geometry.toeWidthM - geometry.stemThicknessM;
  const missing = missingInputFindings(input, heelWidthM);

  if (missing.length > 0) {
    return {
      values: {
        heelWidthM,
        activeEarthCoefficient: Number.NaN,
        stemWeightKNM: Number.NaN,
        baseWeightKNM: Number.NaN,
        soilWeightKNM: Number.NaN,
        totalWeightKNM: Number.NaN,
        wetWaterForceKNM: Number.NaN,
        dryWaterForceKNM: Number.NaN,
        earthForceKNM: Number.NaN,
        surchargeForceKNM: Number.NaN,
        upliftForceKNM: Number.NaN,
        effectiveVerticalForceKNM: Number.NaN,
        netHorizontalForceKNM: Number.NaN,
        overturningMomentKNMPerM: Number.NaN,
        resistingMomentKNMPerM: Number.NaN,
        fsSliding: Number.NaN,
        fsOverturning: Number.NaN,
        resultantFromToeM: Number.NaN,
        eccentricityM: Number.NaN,
        toePressureKPa: Number.NaN,
        heelPressureKPa: Number.NaN,
        effectiveEmbedmentM: Number.NaN,
        scourDeficitM: Number.NaN,
        penetrationBelowScourM: Number.NaN,
        laneCreepRatio: Number.NaN,
        allowableCreepRatio: Number.NaN,
      },
      findings: missing,
      assumptions: [],
    };
  }

  const phiRadians = (materials.soilFrictionAngleDeg * Math.PI) / 180;
  const activeEarthCoefficient = (1 - Math.sin(phiRadians)) / (1 + Math.sin(phiRadians));

  const stemWeightKNM =
    geometry.wallHeightM * geometry.stemThicknessM * materials.concreteUnitWeightKNM3;
  const baseWeightKNM =
    geometry.baseWidthM * geometry.baseThicknessM * materials.concreteUnitWeightKNM3;
  const effectiveSoilHeightM = Math.min(loadCase.retainedSoilHeightM, geometry.wallHeightM);
  const soilWeightKNM = heelWidthM * effectiveSoilHeightM * materials.soilUnitWeightKNM3;
  const totalWeightKNM = stemWeightKNM + baseWeightKNM + soilWeightKNM;

  const wetWaterForceKNM = hydrostaticForce(loadCase.wetSideLevelM);
  const dryWaterForceKNM = hydrostaticForce(loadCase.drySideLevelM);
  const earthForceKNM =
    0.5 * activeEarthCoefficient * materials.soilUnitWeightKNM3 * effectiveSoilHeightM ** 2;
  const surchargeForceKNM = activeEarthCoefficient * loadCase.surchargeKPa * effectiveSoilHeightM;

  const residualHeadFactor = 1 - loadCase.drainageEfficiency;
  const toeUpliftKPa = WATER_UNIT_WEIGHT_KNM3 * loadCase.drySideLevelM * residualHeadFactor;
  const heelUpliftKPa = WATER_UNIT_WEIGHT_KNM3 * loadCase.wetSideLevelM * residualHeadFactor;
  const upliftForceKNM = 0.5 * (toeUpliftKPa + heelUpliftKPa) * geometry.baseWidthM;
  const upliftCentroidM = pressureCentroidFromToe(
    toeUpliftKPa,
    heelUpliftKPa,
    geometry.baseWidthM,
  );

  const baseMoment = baseWeightKNM * (geometry.baseWidthM / 2);
  const stemMoment = stemWeightKNM * (geometry.toeWidthM + geometry.stemThicknessM / 2);
  const soilMoment =
    soilWeightKNM * (geometry.toeWidthM + geometry.stemThicknessM + heelWidthM / 2);
  const dryWaterMoment =
    dryWaterForceKNM * (geometry.baseThicknessM + loadCase.drySideLevelM / 3);

  const wetWaterMoment =
    wetWaterForceKNM * (geometry.baseThicknessM + loadCase.wetSideLevelM / 3);
  const earthMoment =
    earthForceKNM * (geometry.baseThicknessM + effectiveSoilHeightM / 3);
  const surchargeMoment =
    surchargeForceKNM * (geometry.baseThicknessM + effectiveSoilHeightM / 2);
  const upliftMoment = upliftForceKNM * upliftCentroidM;

  const resistingMomentKNMPerM = baseMoment + stemMoment + soilMoment + dryWaterMoment;
  const overturningMomentKNMPerM = wetWaterMoment + earthMoment + surchargeMoment + upliftMoment;
  const effectiveVerticalForceKNM = totalWeightKNM - upliftForceKNM;
  const netHorizontalForceKNM = Math.max(
    wetWaterForceKNM + earthForceKNM + surchargeForceKNM - dryWaterForceKNM,
    0,
  );
  const fsSliding = safeRatio(
    materials.frictionCoefficient * Math.max(effectiveVerticalForceKNM, 0),
    netHorizontalForceKNM,
  );
  const fsOverturning = safeRatio(resistingMomentKNMPerM, overturningMomentKNMPerM);

  const netMomentAboutToeKNMPerM = resistingMomentKNMPerM - overturningMomentKNMPerM;
  const resultantFromToeM =
    effectiveVerticalForceKNM > 0
      ? netMomentAboutToeKNMPerM / effectiveVerticalForceKNM
      : Number.NaN;
  const eccentricityM = geometry.baseWidthM / 2 - resultantFromToeM;
  const averageBearingKPa = effectiveVerticalForceKNM / geometry.baseWidthM;
  const toePressureKPa =
    averageBearingKPa * (1 + (6 * eccentricityM) / geometry.baseWidthM);
  const heelPressureKPa =
    averageBearingKPa * (1 - (6 * eccentricityM) / geometry.baseWidthM);

  const findings: ReviewFinding[] = [
    {
      id: "sliding",
      title: "Sliding stability",
      status: fsSliding >= limits.minimumSlidingFs ? "pass" : "fail",
      severity: fsSliding >= limits.minimumSlidingFs ? "info" : "critical",
      summary: `Calculated FS ${formatEngineeringNumber(fsSliding)} against project limit ${limits.minimumSlidingFs.toFixed(2)}.`,
      equation: "FS = μ × (ΣW − U) / ΣH",
      demand: { label: "Required factor", value: limits.minimumSlidingFs, unit: "" },
      capacity: { label: "Calculated factor", value: fsSliding, unit: "" },
    },
    {
      id: "overturning",
      title: "Overturning stability",
      status: fsOverturning >= limits.minimumOverturningFs ? "pass" : "fail",
      severity: fsOverturning >= limits.minimumOverturningFs ? "info" : "critical",
      summary: `Calculated FS ${formatEngineeringNumber(fsOverturning)} against project limit ${limits.minimumOverturningFs.toFixed(2)}.`,
      equation: "FS = ΣMresisting / ΣMoverturning",
      demand: { label: "Required factor", value: limits.minimumOverturningFs, unit: "" },
      capacity: { label: "Calculated factor", value: fsOverturning, unit: "" },
    },
    {
      id: "no-tension",
      title: "Base contact pressure",
      status: !limits.requireNoTension
        ? "not_applicable"
        : heelPressureKPa >= 0 && toePressureKPa >= 0
          ? "pass"
          : "fail",
      severity:
        !limits.requireNoTension || (heelPressureKPa >= 0 && toePressureKPa >= 0)
          ? "info"
          : "major",
      summary: limits.requireNoTension
        ? `Toe ${formatEngineeringNumber(toePressureKPa)} kPa; heel ${formatEngineeringNumber(heelPressureKPa)} kPa.`
        : "The selected project criteria do not require a no-tension check.",
      equation: "q = V/B × (1 ± 6e/B)",
    },
    materials.allowableBearingKPa === null
      ? {
          id: "bearing",
          title: "Allowable bearing pressure",
          status: "insufficient_information",
          severity: "critical",
          summary: "Provide an engineer-approved allowable bearing pressure from the geotechnical basis.",
        }
      : {
          id: "bearing",
          title: "Bearing pressure",
          status:
            Math.max(toePressureKPa, heelPressureKPa) <= materials.allowableBearingKPa
              ? "pass"
              : "fail",
          severity:
            Math.max(toePressureKPa, heelPressureKPa) <= materials.allowableBearingKPa
              ? "info"
              : "critical",
          summary: `Maximum calculated pressure ${formatEngineeringNumber(Math.max(toePressureKPa, heelPressureKPa))} kPa against allowable ${materials.allowableBearingKPa.toFixed(1)} kPa.`,
          demand: {
            label: "Maximum base pressure",
            value: Math.max(toePressureKPa, heelPressureKPa),
            unit: "kPa",
          },
          capacity: {
            label: "Allowable bearing",
            value: materials.allowableBearingKPa,
            unit: "kPa",
          },
        },
    {
      id: "stem-thickness",
      title: "As-built stem thickness",
      status:
        geometry.stemThicknessM >= geometry.plannedStemThicknessM ? "pass" : "warning",
      severity:
        geometry.stemThicknessM >= geometry.plannedStemThicknessM ? "info" : "major",
      summary:
        geometry.stemThicknessM >= geometry.plannedStemThicknessM
          ? "Entered thickness meets or exceeds the planned thickness."
          : `Entered thickness is ${((geometry.plannedStemThicknessM - geometry.stemThicknessM) * 1000).toFixed(0)} mm below plan and requires an engineer's disposition.`,
    },
  ];

  if (loadCase.wetSideLevelM > geometry.wallHeightM) {
    findings.push({
      id: "overtopping",
      title: "Water level exceeds wall height",
      status: "fail",
      severity: "critical",
      summary: "The selected load case overtops the entered wall height. Freeboard and overtopping consequences require review.",
    });
  }

  if (loadCase.retainedSoilHeightM > geometry.wallHeightM) {
    findings.push({
      id: "soil-height-clipped",
      title: "Retained-soil height exceeds the model domain",
      status: "warning",
      severity: "major",
      summary: "Earth-pressure calculations were limited to the entered wall height. Confirm the section geometry before relying on results.",
    });
  }

  if (loadCase.drySideLevelM > loadCase.wetSideLevelM) {
    findings.push({
      id: "reverse-water-case",
      title: "Reverse differential water case",
      status: "insufficient_information",
      severity: "critical",
      summary: "The current wall orientation assumes the wet/retained side is at the heel. Create a separately oriented reverse load case.",
    });
  }

  const subsurface = input.subsurface ?? {
    footingEmbedmentM: 1.0,
    asBuiltFootingEmbedmentM: 1.0,
    hasSheetPileCutoff: false,
    plannedSheetPileLengthM: 0,
    asDrivenSheetPileLengthM: null,
    designScourDepthM: 0,
    foundationSoilType: "fine_sand" as FoundationSoilType,
  };

  const actualFootingEmbedment =
    subsurface.asBuiltFootingEmbedmentM ?? subsurface.footingEmbedmentM;
  const actualPileLength = subsurface.hasSheetPileCutoff
    ? (subsurface.asDrivenSheetPileLengthM ?? subsurface.plannedSheetPileLengthM)
    : 0;
  const totalSubsurfaceDepth = actualFootingEmbedment + actualPileLength;
  const effectiveEmbedmentM = Math.max(0, actualFootingEmbedment - subsurface.designScourDepthM);
  const penetrationBelowScourM = totalSubsurfaceDepth - subsurface.designScourDepthM;
  const scourDeficitM = Math.max(0, subsurface.designScourDepthM - totalSubsurfaceDepth);

  const allowableCreepRatio = ALLOWABLE_CREEP_RATIOS[subsurface.foundationSoilType] ?? 5.0;
  const deltaH = Math.max(0, loadCase.wetSideLevelM - loadCase.drySideLevelM);

  const wetVerticalPathM = Math.max(0, penetrationBelowScourM);
  const dryVerticalPathM = totalSubsurfaceDepth;
  const lVerticalM = wetVerticalPathM + dryVerticalPathM;
  const lCreepM = geometry.baseWidthM / 3 + lVerticalM;
  const laneCreepRatio = deltaH > 0 ? lCreepM / deltaH : Number.POSITIVE_INFINITY;

  if (subsurface.hasSheetPileCutoff) {
    const planned = subsurface.plannedSheetPileLengthM;
    const asDriven = subsurface.asDrivenSheetPileLengthM;
    if (asDriven !== null && asDriven !== undefined) {
      if (asDriven < planned) {
        const deficitM = planned - asDriven;
        const deficitPct = planned > 0 ? (deficitM / planned) * 100 : 0;
        findings.push({
          id: "putol-na-sheet-pile",
          title: "Subsurface sheet pile truncated (Putol na Sheet Pile)",
          status: "fail",
          severity: "critical",
          summary: `As-driven sheet pile is ${deficitM.toFixed(2)} m shorter than planned (${deficitPct.toFixed(0)}% deficit). High risk of cutoff bypass, piping, and contractual non-conformance.`,
          equation: "Deficit = L_planned − L_as_driven",
          demand: { label: "Billed cutoff depth", value: planned, unit: "m" },
          capacity: { label: "As-driven depth", value: asDriven, unit: "m" },
        });
      } else {
        findings.push({
          id: "putol-na-sheet-pile",
          title: "Sheet pile embedment verified",
          status: "pass",
          severity: "info",
          summary: `As-driven sheet pile depth (${asDriven.toFixed(2)} m) satisfies planned requirement (${planned.toFixed(2)} m).`,
          demand: { label: "Planned cutoff depth", value: planned, unit: "m" },
          capacity: { label: "As-driven depth", value: asDriven, unit: "m" },
        });
      }
    } else {
      findings.push({
        id: "putol-na-sheet-pile",
        title: "Sheet pile penetration unverified",
        status: "warning",
        severity: "major",
        summary: "Sheet pile driving logs / penetration depths have not been field-verified. Verification required to rule out subsurface truncation.",
      });
    }
  }

  if (subsurface.designScourDepthM > 0) {
    if (subsurface.designScourDepthM >= actualFootingEmbedment) {
      findings.push({
        id: "toe-scour-undermining",
        title: "Footing undermined by hydraulic scour",
        status: "fail",
        severity: "critical",
        summary: `Design scour depth (${subsurface.designScourDepthM.toFixed(2)} m) meets or exceeds footing embedment (${actualFootingEmbedment.toFixed(2)} m). The footing is undermined with zero toe passive support and loss of edge bearing.`,
        equation: "Deff = max(0, Df − y_scour)",
        demand: { label: "Design scour depth", value: subsurface.designScourDepthM, unit: "m" },
        capacity: { label: "Footing embedment", value: actualFootingEmbedment, unit: "m" },
      });
    } else if (effectiveEmbedmentM < 0.5) {
      findings.push({
        id: "toe-scour-undermining",
        title: "Post-scour embedment below minimum safe cover",
        status: "warning",
        severity: "major",
        summary: `Post-scour effective embedment is only ${effectiveEmbedmentM.toFixed(2)} m (< 0.50 m minimum cover). Lateral restraint is severely compromised.`,
        equation: "Deff = Df − y_scour",
        demand: { label: "Minimum safe embedment", value: 0.5, unit: "m" },
        capacity: { label: "Effective embedment", value: effectiveEmbedmentM, unit: "m" },
      });
    } else {
      findings.push({
        id: "toe-scour-undermining",
        title: "Post-scour toe embedment",
        status: "pass",
        severity: "info",
        summary: `Post-scour effective embedment is ${effectiveEmbedmentM.toFixed(2)} m after applying the entered scour depth of ${subsurface.designScourDepthM.toFixed(2)} m.`,
        equation: "Deff = Df − y_scour",
        demand: { label: "Design scour depth", value: subsurface.designScourDepthM, unit: "m" },
        capacity: { label: "Effective embedment", value: effectiveEmbedmentM, unit: "m" },
      });
    }
  } else {
    findings.push({
      id: "toe-scour-undermining",
      title: "Design scour basis is missing",
      status: "insufficient_information",
      severity: "critical",
      summary: "Provide an engineer-approved design scour depth and source. Zero cannot be treated as a passing riverine condition without an explicit not-applicable determination.",
      demand: { label: "Design scour depth", value: 0, unit: "m" },
      capacity: { label: "Effective embedment", value: actualFootingEmbedment, unit: "m" },
    });
  }

  if (subsurface.designScourDepthM <= 0 && deltaH > 0) {
    findings.push({
      id: "piping-creep",
      title: "Under-seepage and piping check not evaluated",
      status: "not_evaluated",
      severity: "critical",
      summary: "The seepage path depends on the design scour condition. Provide the approved scour basis before evaluating piping resistance.",
    });
  } else if (deltaH > 0) {
    if (penetrationBelowScourM <= 0) {
      findings.push({
        id: "piping-creep",
        title: "Hydraulic blowout / piping cutoff short-circuit",
        status: "fail",
        severity: "critical",
        summary: `Scour line exposes the cutoff tip (deficit ${Math.abs(penetrationBelowScourM).toFixed(2)} m). Direct subterranean hydraulic short-circuit will trigger subgrade boiling and catastrophic foundation collapse.`,
        equation: "Lpen = D_total − y_scour",
        demand: { label: "Required penetration", value: 0.1, unit: "m" },
        capacity: { label: "Penetration below scour", value: penetrationBelowScourM, unit: "m" },
      });
    } else if (laneCreepRatio < allowableCreepRatio) {
      findings.push({
        id: "piping-creep",
        title: "Lane's weighted creep ratio (Piping risk)",
        status: "fail",
        severity: "critical",
        summary: `Calculated weighted creep ratio ${formatEngineeringNumber(laneCreepRatio)} is below the configured screening criterion ${allowableCreepRatio.toFixed(1)} for ${subsurface.foundationSoilType.replace("_", " ")}. High susceptibility to piping and subgrade erosion under differential head.`,
        equation: "Cw = (Lh/3 + Lv) / ΔH",
        demand: { label: "Required creep ratio", value: allowableCreepRatio, unit: "" },
        capacity: { label: "Calculated creep ratio", value: laneCreepRatio, unit: "" },
      });
    } else {
      findings.push({
        id: "piping-creep",
        title: "Under-seepage & piping resistance",
        status: "pass",
        severity: "info",
        summary: `Lane's weighted creep ratio ${formatEngineeringNumber(laneCreepRatio)} satisfies the configured screening criterion ${allowableCreepRatio.toFixed(1)} for ${subsurface.foundationSoilType.replace("_", " ")}. This screening result is not a seepage certification.`,
        equation: "Cw = (Lh/3 + Lv) / ΔH",
        demand: { label: "Required creep ratio", value: allowableCreepRatio, unit: "" },
        capacity: { label: "Calculated creep ratio", value: laneCreepRatio, unit: "" },
      });
    }
  } else {
    findings.push({
      id: "piping-creep",
      title: "Under-seepage & piping resistance",
      status: "not_applicable",
      severity: "info",
      summary: "No differential hydraulic head across the wall; zero under-seepage gradient.",
    });
  }

  const foundationSupportCompromised =
    subsurface.designScourDepthM > 0 &&
    subsurface.designScourDepthM >= actualFootingEmbedment;

  if (foundationSupportCompromised) {
    const invalidatedIds = new Set(["sliding", "overturning", "no-tension", "bearing"]);
    for (let index = 0; index < findings.length; index += 1) {
      const finding = findings[index];
      if (!invalidatedIds.has(finding.id)) continue;
      findings[index] = {
        ...finding,
        status: "not_evaluated",
        severity: "critical",
        summary:
          "This result is invalid because the entered design scour reaches or exceeds footing embedment. A validated post-scour support model or foundation redesign is required.",
        demand: undefined,
        capacity: undefined,
      };
    }
  }

  return {
    values: {
      heelWidthM,
      activeEarthCoefficient,
      stemWeightKNM,
      baseWeightKNM,
      soilWeightKNM,
      totalWeightKNM,
      wetWaterForceKNM,
      dryWaterForceKNM,
      earthForceKNM,
      surchargeForceKNM,
      upliftForceKNM,
      effectiveVerticalForceKNM,
      netHorizontalForceKNM,
      overturningMomentKNMPerM,
      resistingMomentKNMPerM,
      fsSliding: foundationSupportCompromised ? Number.NaN : fsSliding,
      fsOverturning: foundationSupportCompromised ? Number.NaN : fsOverturning,
      resultantFromToeM: foundationSupportCompromised ? Number.NaN : resultantFromToeM,
      eccentricityM: foundationSupportCompromised ? Number.NaN : eccentricityM,
      toePressureKPa: foundationSupportCompromised ? Number.NaN : toePressureKPa,
      heelPressureKPa: foundationSupportCompromised ? Number.NaN : heelPressureKPa,
      effectiveEmbedmentM,
      scourDeficitM,
      penetrationBelowScourM,
      laneCreepRatio,
      allowableCreepRatio,
    },
    findings,
    assumptions: [
      "Two-dimensional analysis of a straight, one-metre wall segment.",
      "Rankine active earth pressure with level backfill and no wall friction.",
      "Base friction only; passive resistance, cohesion, anchors, and shear-key resistance are excluded.",
      "Linear uplift pressure between entered dry- and wet-side heads, reduced by the stated drainage efficiency.",
      "Under-seepage piping evaluated using Lane's weighted creep ratio. Global 2D slope stability, liquefaction, and structural rebar capacity are not evaluated in this increment.",
    ],
  };
}

export function summarizeReview(findings: ReviewFinding[]) {
  if (findings.some((finding) => finding.status === "fail" && finding.severity === "critical")) {
    return "critical" as const;
  }
  if (
    findings.some(
      (finding) =>
        finding.status === "insufficient_information" ||
        finding.status === "unsupported" ||
        finding.status === "not_evaluated",
    )
  ) {
    return "incomplete" as const;
  }
  if (findings.some((finding) => finding.status === "fail" || finding.status === "warning")) {
    return "attention" as const;
  }
  return "pass" as const;
}

export function formatEngineeringNumber(value: number, digits = 2) {
  if (Number.isNaN(value)) return "—";
  if (!Number.isFinite(value)) return "∞";
  return value.toFixed(digits);
}

