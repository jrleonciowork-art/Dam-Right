import { describe, expect, it } from "vitest";
import type { ReviewFinding } from "../engineering/wall";
import type { ComparisonResult } from "../verification/comparison";
import { evaluateReleaseGate } from "./release-gate";

const passFinding: ReviewFinding = {
  id: "sliding",
  title: "Sliding stability",
  status: "pass",
  severity: "info",
  summary: "Selected calculation passed.",
};

function gate(
  findings: ReviewFinding[],
  comparisons: ComparisonResult[] = [],
  inputsConfirmed = true,
) {
  return evaluateReleaseGate({
    findings,
    comparisons,
    inputsConfirmed,
    standardsPackApproved: true,
    mandatoryScopeGaps: [],
  });
}

describe("evaluateReleaseGate", () => {
  it("blocks critical missing engineering information", () => {
    const result = gate([
      {
        id: "bearing",
        title: "Allowable bearing pressure",
        status: "insufficient_information",
        severity: "critical",
        summary: "An approved capacity is required.",
      },
    ]);

    expect(result.state).toBe("blocked_incomplete");
    expect(result.isBlocked).toBe(true);
  });

  it("gives failure precedence over incomplete information", () => {
    const result = gate([
      {
        id: "sliding",
        title: "Sliding stability",
        status: "fail",
        severity: "critical",
        summary: "Factor of safety is below the criterion.",
      },
      {
        id: "bearing",
        title: "Bearing",
        status: "insufficient_information",
        severity: "critical",
        summary: "Capacity is missing.",
      },
    ]);

    expect(result.state).toBe("blocked_failure");
  });

  it("blocks mandatory unsupported scope", () => {
    const result = evaluateReleaseGate({
      findings: [passFinding],
      comparisons: [],
      inputsConfirmed: true,
      standardsPackApproved: true,
      mandatoryScopeGaps: [
        {
          id: "structural-capacity",
          title: "Structural capacity",
          discipline: "structural",
          reason: "Not implemented.",
        },
      ],
    });

    expect(result.state).toBe("blocked_unsupported");
  });

  it("blocks unconfirmed input sets", () => {
    const result = gate([passFinding], [], false);

    expect(result.state).toBe("blocked_incomplete");
    expect(result.blockers.some((blocker) => blocker.id === "inputs-unconfirmed")).toBe(true);
  });

  it("allows a completed result set to proceed to engineer review", () => {
    const result = gate([passFinding]);

    expect(result.state).toBe("ready_for_engineer_review");
    expect(result.isBlocked).toBe(false);
  });
});
