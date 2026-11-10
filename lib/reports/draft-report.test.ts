import { describe, expect, it } from "vitest";
import { DEFAULT_WALL_INPUT } from "../engineering/defaults";
import { calculateWallReview } from "../engineering/wall";
import { buildCompletenessMatrix } from "../review/completeness";
import { evaluateReleaseGate } from "../review/release-gate";
import { createReviewSnapshot } from "../review/snapshot";
import { buildDraftReviewMarkdown } from "./draft-report";

describe("draft review report", () => {
  it("watermarks blocked output and includes reproducibility metadata", () => {
    const calculation = calculateWallReview(DEFAULT_WALL_INPUT);
    const releaseGate = evaluateReleaseGate({ findings: calculation.findings, comparisons: [], inputsConfirmed: true });
    const snapshot = createReviewSnapshot({
      inputs: DEFAULT_WALL_INPUT,
      calculation,
      releaseGate,
      rulePackId: "draft",
      rulePackVersion: "0.1",
      createdAt: "2026-11-07T00:00:00.000Z",
    });
    const report = buildDraftReviewMarkdown(snapshot, buildCompletenessMatrix(calculation.findings));

    expect(report).toContain("INCOMPLETE — NOT FOR APPROVAL");
    expect(report).toContain(snapshot.inputFingerprint);
    expect(report).toContain("Release blockers");
  });
});
