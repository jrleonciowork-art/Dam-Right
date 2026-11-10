import { describe, expect, it } from "vitest";
import {
  reconcileBlueprintCandidates,
  type BlueprintCandidate,
} from "./candidates";

function candidate(overrides: Partial<BlueprintCandidate> = {}): BlueprintCandidate {
  return {
    id: "candidate-1",
    fieldKey: "geometry.stemThicknessM",
    rawText: "500 mm",
    normalizedValue: 500,
    unit: "mm",
    pageNumber: 5,
    boundingPolygon: [
      { x: 0.1, y: 0.1 },
      { x: 0.2, y: 0.1 },
      { x: 0.2, y: 0.2 },
      { x: 0.1, y: 0.2 },
    ],
    sourceRevisionId: "S-05-R0",
    revisionState: "approved",
    extractionMethod: "native_pdf_text",
    confidence: {
      documentQuality: 1,
      recognition: 0.99,
      classification: 0.98,
      normalization: 1,
    },
    reviewDecision: "unreviewed",
    ...overrides,
  };
}

describe("blueprint candidate reconciliation", () => {
  it("never lets an unreviewed model candidate enter a calculation", () => {
    const group = reconcileBlueprintCandidates([
      candidate({ extractionMethod: "multimodal_model", reviewDecision: "unreviewed" }),
    ])[0];

    expect(group.state).toBe("review_required");
    expect(group.mayEnterCalculation).toBe(false);
  });

  it("permits a valid approved-source candidate only after human acceptance", () => {
    const group = reconcileBlueprintCandidates([
      candidate({ reviewDecision: "accepted" }),
    ])[0];

    expect(group.state).toBe("reviewed");
    expect(group.mayEnterCalculation).toBe(true);
  });

  it("blocks conflicting values from approved sources", () => {
    const groups = reconcileBlueprintCandidates([
      candidate({ id: "one", normalizedValue: 500, reviewDecision: "accepted" }),
      candidate({ id: "two", normalizedValue: 450, reviewDecision: "accepted" }),
    ]);

    expect(groups[0].state).toBe("conflict");
    expect(groups[0].mayEnterCalculation).toBe(false);
    expect(groups[0].issues.some((issue) => issue.code === "conflicting_candidate")).toBe(true);
  });

  it("blocks superseded sources even when they have high confidence", () => {
    const group = reconcileBlueprintCandidates([
      candidate({ revisionState: "superseded", reviewDecision: "accepted" }),
    ])[0];

    expect(group.mayEnterCalculation).toBe(false);
    expect(group.issues.some((issue) => issue.code === "superseded_source")).toBe(true);
  });

  it("requires page-normalized provenance geometry", () => {
    const group = reconcileBlueprintCandidates([
      candidate({ boundingPolygon: [{ x: 20, y: 30 }], reviewDecision: "accepted" }),
    ])[0];

    expect(group.state).toBe("invalid");
    expect(group.mayEnterCalculation).toBe(false);
  });

  it("requires explicit units for numeric values", () => {
    const group = reconcileBlueprintCandidates([
      candidate({ unit: null, reviewDecision: "accepted" }),
    ])[0];

    expect(group.state).toBe("invalid");
    expect(group.issues.some((issue) => issue.code === "missing_unit")).toBe(true);
  });
});

