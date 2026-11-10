export type ExtractionMethod =
  | "native_pdf_text"
  | "native_pdf_vector"
  | "cad_entity"
  | "ocr"
  | "computer_vision"
  | "multimodal_model"
  | "manual";

export type RevisionState = "approved" | "current_unapproved" | "superseded" | "unknown";

export type ReviewDecision = "unreviewed" | "accepted" | "corrected" | "rejected" | "ambiguous";

export type BlueprintCandidate = {
  id: string;
  fieldKey: string;
  rawText: string;
  normalizedValue: number | string | null;
  unit: string | null;
  pageNumber: number | null;
  boundingPolygon: Array<{ x: number; y: number }>;
  sourceRevisionId: string;
  revisionState: RevisionState;
  extractionMethod: ExtractionMethod;
  confidence: {
    documentQuality: number;
    recognition: number;
    classification: number;
    normalization: number;
  } | null;
  reviewDecision: ReviewDecision;
};

export type CandidateIssue = {
  candidateId: string;
  code:
    | "invalid_provenance"
    | "invalid_confidence"
    | "superseded_source"
    | "unknown_revision"
    | "missing_unit"
    | "missing_value"
    | "conflicting_candidate";
  severity: "warning" | "critical";
  message: string;
};

export type CandidateGroup = {
  fieldKey: string;
  candidates: BlueprintCandidate[];
  issues: CandidateIssue[];
  state: "invalid" | "conflict" | "review_required" | "reviewed";
  mayEnterCalculation: boolean;
};

function confidenceIsValid(candidate: BlueprintCandidate) {
  if (candidate.confidence === null) return false;
  return Object.values(candidate.confidence).every(
    (value) => Number.isFinite(value) && value >= 0 && value <= 1,
  );
}

function provenanceIsValid(candidate: BlueprintCandidate) {
  return (
    candidate.pageNumber !== null &&
    Number.isInteger(candidate.pageNumber) &&
    candidate.pageNumber >= 1 &&
    candidate.sourceRevisionId.trim().length > 0 &&
    candidate.boundingPolygon.length >= 3 &&
    candidate.boundingPolygon.every(
      (point) =>
        Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        point.x >= 0 &&
        point.x <= 1 &&
        point.y >= 0 &&
        point.y <= 1,
    )
  );
}

function normalizedValuesConflict(candidates: BlueprintCandidate[]) {
  const comparable = candidates.filter(
    (candidate) =>
      candidate.revisionState === "approved" &&
      candidate.normalizedValue !== null &&
      candidate.unit !== null,
  );

  for (let index = 0; index < comparable.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < comparable.length; otherIndex += 1) {
      const left = comparable[index];
      const right = comparable[otherIndex];
      if (left.unit !== right.unit) continue;
      if (left.normalizedValue !== right.normalizedValue) return true;
    }
  }

  return false;
}

export function reconcileBlueprintCandidates(
  candidates: BlueprintCandidate[],
): CandidateGroup[] {
  const fieldKeys = [...new Set(candidates.map((candidate) => candidate.fieldKey))];

  return fieldKeys.map((fieldKey) => {
    const groupCandidates = candidates.filter((candidate) => candidate.fieldKey === fieldKey);
    const issues: CandidateIssue[] = [];

    for (const candidate of groupCandidates) {
      if (!provenanceIsValid(candidate)) {
        issues.push({
          candidateId: candidate.id,
          code: "invalid_provenance",
          severity: "critical",
          message: "Candidate lacks a valid page, revision, or normalized source polygon.",
        });
      }
      if (!confidenceIsValid(candidate)) {
        issues.push({
          candidateId: candidate.id,
          code: "invalid_confidence",
          severity: "critical",
          message: "All confidence components must be finite values from 0 to 1.",
        });
      }
      if (candidate.revisionState === "superseded") {
        issues.push({
          candidateId: candidate.id,
          code: "superseded_source",
          severity: "critical",
          message: "A superseded source cannot control the approved design state.",
        });
      }
      if (candidate.revisionState === "unknown") {
        issues.push({
          candidateId: candidate.id,
          code: "unknown_revision",
          severity: "critical",
          message: "The source revision must be resolved before this candidate can be accepted.",
        });
      }
      if (candidate.normalizedValue === null) {
        issues.push({
          candidateId: candidate.id,
          code: "missing_value",
          severity: "critical",
          message: "No normalized value was extracted.",
        });
      }
      if (typeof candidate.normalizedValue === "number" && candidate.unit === null) {
        issues.push({
          candidateId: candidate.id,
          code: "missing_unit",
          severity: "critical",
          message: "A numeric candidate requires an explicit supported unit.",
        });
      }
    }

    if (normalizedValuesConflict(groupCandidates)) {
      for (const candidate of groupCandidates.filter(
        (item) => item.revisionState === "approved",
      )) {
        issues.push({
          candidateId: candidate.id,
          code: "conflicting_candidate",
          severity: "critical",
          message: "Approved-source candidates disagree and require an engineer to resolve the conflict.",
        });
      }
    }

    const hasInvalidIssue = issues.some((issue) =>
      [
        "invalid_provenance",
        "invalid_confidence",
        "missing_value",
        "missing_unit",
      ].includes(issue.code),
    );
    const hasConflict = issues.some((issue) => issue.code === "conflicting_candidate");
    const approvedCandidates = groupCandidates.filter(
      (candidate) => candidate.revisionState === "approved",
    );
    const hasAcceptedApprovedCandidate = approvedCandidates.some(
      (candidate) =>
        candidate.reviewDecision === "accepted" || candidate.reviewDecision === "corrected",
    );
    const allApprovedCandidatesResolved = approvedCandidates.every(
      (candidate) => candidate.reviewDecision !== "unreviewed",
    );

    const state: CandidateGroup["state"] = hasInvalidIssue
      ? "invalid"
      : hasConflict
        ? "conflict"
        : hasAcceptedApprovedCandidate && allApprovedCandidatesResolved
          ? "reviewed"
          : "review_required";

    return {
      fieldKey,
      candidates: groupCandidates,
      issues,
      state,
      mayEnterCalculation: state === "reviewed" && !hasConflict && !hasInvalidIssue,
    };
  });
}

