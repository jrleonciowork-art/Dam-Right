import { describe, expect, it } from "vitest";
import { DEFAULT_WALL_INPUT } from "../engineering/defaults";
import { calculateWallReview } from "../engineering/wall";
import { evaluateReleaseGate } from "./release-gate";
import { createReviewSnapshot } from "./snapshot";

describe("review snapshots", () => {
  it("captures a reproducible versioned input fingerprint", () => {
    const calculation = calculateWallReview(DEFAULT_WALL_INPUT);
    const releaseGate = evaluateReleaseGate({
      findings: calculation.findings,
      comparisons: [],
      inputsConfirmed: true,
    });
    const args = {
      inputs: DEFAULT_WALL_INPUT,
      calculation,
      releaseGate,
      rulePackId: "draft",
      rulePackVersion: "0.1",
      createdAt: "2026-11-07T00:00:00.000Z",
    };

    expect(createReviewSnapshot(args).snapshotId).toBe(createReviewSnapshot(args).snapshotId);
  });
});
