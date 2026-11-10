import type { WallInput } from "./wall";
import { DRAFT_PHILIPPINE_FLOOD_WALL_PACK, resolveWallCriteria } from "../standards/rule-pack";

const DRAFT_CRITERIA = resolveWallCriteria(DRAFT_PHILIPPINE_FLOOD_WALL_PACK);

export const DEFAULT_WALL_INPUT: WallInput = {
  project: {
    name: "North River Flood Wall",
    location: "Prototype Station A",
    structureId: "DR-FW-001",
    jurisdiction: "Philippines",
    standardPack: `${DRAFT_PHILIPPINE_FLOOD_WALL_PACK.name} · ${DRAFT_PHILIPPINE_FLOOD_WALL_PACK.version} · not approved`,
  },
  geometry: {
    wallHeightM: 3,
    stemThicknessM: 0.4,
    plannedStemThicknessM: 0.5,
    baseWidthM: 2.4,
    baseThicknessM: 0.45,
    toeWidthM: 0.65,
  },
  materials: {
    concreteUnitWeightKNM3: 23.54,
    soilUnitWeightKNM3: 18,
    frictionCoefficient: 0.6,
    soilFrictionAngleDeg: 30,
    allowableBearingKPa: null,
  },
  subsurface: {
    footingEmbedmentM: 1.2,
    asBuiltFootingEmbedmentM: 1.2,
    hasSheetPileCutoff: false,
    plannedSheetPileLengthM: 0,
    asDrivenSheetPileLengthM: null,
    designScourDepthM: 0,
    foundationSoilType: "fine_sand",
  },
  loadCase: {
    name: "Normal high-water case",
    wetSideLevelM: 2.5,
    drySideLevelM: 0,
    retainedSoilHeightM: 0,
    surchargeKPa: 0,
    drainageEfficiency: 0.5,
  },
  limits: {
    minimumSlidingFs: DRAFT_CRITERIA.minimumSlidingFs,
    minimumOverturningFs: DRAFT_CRITERIA.minimumOverturningFs,
    requireNoTension: DRAFT_CRITERIA.requireNoTension,
  },
};

export const BLANK_WALL_INPUT: WallInput = {
  project: {
    name: "",
    location: "",
    structureId: "",
    jurisdiction: "Philippines",
    standardPack: `${DRAFT_PHILIPPINE_FLOOD_WALL_PACK.name} · ${DRAFT_PHILIPPINE_FLOOD_WALL_PACK.version} · not approved`,
  },
  geometry: {
    wallHeightM: 0,
    stemThicknessM: 0,
    plannedStemThicknessM: 0,
    baseWidthM: 0,
    baseThicknessM: 0,
    toeWidthM: 0,
  },
  materials: {
    concreteUnitWeightKNM3: 23.54,
    soilUnitWeightKNM3: 18,
    frictionCoefficient: 0,
    soilFrictionAngleDeg: 0,
    allowableBearingKPa: null,
  },
  subsurface: {
    footingEmbedmentM: 0,
    asBuiltFootingEmbedmentM: null,
    hasSheetPileCutoff: false,
    plannedSheetPileLengthM: 0,
    asDrivenSheetPileLengthM: null,
    designScourDepthM: 0,
    foundationSoilType: "fine_sand",
  },
  loadCase: {
    name: "Design flood load case",
    wetSideLevelM: 0,
    drySideLevelM: 0,
    retainedSoilHeightM: 0,
    surchargeKPa: 0,
    drainageEfficiency: 0,
  },
  limits: {
    minimumSlidingFs: DRAFT_CRITERIA.minimumSlidingFs,
    minimumOverturningFs: DRAFT_CRITERIA.minimumOverturningFs,
    requireNoTension: DRAFT_CRITERIA.requireNoTension,
  },
};
