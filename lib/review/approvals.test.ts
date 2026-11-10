import { describe, expect, it } from "vitest";
import { DEFAULT_WALL_INPUT } from "../engineering/defaults";
import { calculateWallReview } from "../engineering/wall";
import { evaluateReleaseGate } from "./release-gate";
import { createReviewSnapshot } from "./snapshot";
import { evaluateIssuanceEligibility } from "./approvals";

describe("report issuance governance", () => {
  it("refuses issuance while the release gate is blocked", () => {
    const calculation = calculateWallReview(DEFAULT_WALL_INPUT);
    const gate = evaluateReleaseGate({ findings: calculation.findings, comparisons: [], inputsConfirmed: true });
    const snapshot = createReviewSnapshot({
      inputs: DEFAULT_WALL_INPUT,
      calculation,
      releaseGate: gate,
      rulePackId: "draft",
      rulePackVersion: "0.1",
    });

    expect(evaluateIssuanceEligibility(snapshot, []).eligible).toBe(false);
  });
});
