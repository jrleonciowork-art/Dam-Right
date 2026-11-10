export type CheckDependencyId =
  | "hydrostatic"
  | "earth_pressure"
  | "uplift"
  | "sliding"
  | "overturning"
  | "bearing"
  | "scour"
  | "piping";

const DEPENDENCIES: Record<string, CheckDependencyId[]> = {
  "geometry.wallHeightM": ["hydrostatic", "earth_pressure", "sliding", "overturning", "bearing"],
  "geometry.stemThicknessM": ["sliding", "overturning", "bearing"],
  "geometry.baseWidthM": ["uplift", "sliding", "overturning", "bearing", "piping"],
  "geometry.baseThicknessM": ["sliding", "overturning", "bearing"],
  "geometry.toeWidthM": ["overturning", "bearing"],
  "materials.frictionCoefficient": ["sliding"],
  "materials.soilFrictionAngleDeg": ["earth_pressure", "sliding", "overturning", "bearing"],
  "materials.allowableBearingKPa": ["bearing"],
  "loadCase.wetSideLevelM": ["hydrostatic", "uplift", "sliding", "overturning", "bearing", "piping"],
  "loadCase.drySideLevelM": ["hydrostatic", "uplift", "sliding", "overturning", "bearing", "piping"],
  "loadCase.retainedSoilHeightM": ["earth_pressure", "sliding", "overturning", "bearing"],
  "loadCase.surchargeKPa": ["sliding", "overturning", "bearing"],
  "loadCase.drainageEfficiency": ["uplift", "sliding", "overturning", "bearing"],
  "subsurface.designScourDepthM": ["scour", "sliding", "overturning", "bearing", "piping"],
  "subsurface.footingEmbedmentM": ["scour", "piping", "bearing"],
  "subsurface.asBuiltFootingEmbedmentM": ["scour", "piping", "bearing"],
  "subsurface.plannedSheetPileLengthM": ["piping"],
  "subsurface.asDrivenSheetPileLengthM": ["piping"],
};

export function affectedChecks(changedPaths: string[]) {
  return [...new Set(changedPaths.flatMap((path) => DEPENDENCIES[path] ?? []))];
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
}

export function dependencyFingerprint(value: unknown) {
  const text = JSON.stringify(stable(value));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
