import type { WallCalculation, WallInput } from "../engineering/wall";
import type { ReleaseGateResult } from "./release-gate";
import { dependencyFingerprint } from "./dependencies";

export const ENGINE_VERSION = "wall-screening-0.2.0";

export type ReviewSnapshot = {
  snapshotId: string;
  createdAt: string;
  engineVersion: string;
  inputFingerprint: string;
  rulePackId: string;
  rulePackVersion: string;
  inputs: WallInput;
  calculation: WallCalculation;
  releaseGate: ReleaseGateResult;
};

export function createReviewSnapshot({
  inputs,
  calculation,
  releaseGate,
  rulePackId,
  rulePackVersion,
  createdAt = new Date().toISOString(),
}: {
  inputs: WallInput;
  calculation: WallCalculation;
  releaseGate: ReleaseGateResult;
  rulePackId: string;
  rulePackVersion: string;
  createdAt?: string;
}): ReviewSnapshot {
  const inputFingerprint = dependencyFingerprint({ inputs, rulePackId, rulePackVersion, engineVersion: ENGINE_VERSION });
  return {
    snapshotId: `review-${inputFingerprint}`,
    createdAt,
    engineVersion: ENGINE_VERSION,
    inputFingerprint,
    rulePackId,
    rulePackVersion,
    inputs: structuredClone(inputs),
    calculation: structuredClone(calculation),
    releaseGate: structuredClone(releaseGate),
  };
}
