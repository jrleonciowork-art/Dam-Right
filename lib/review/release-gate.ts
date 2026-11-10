import type { ReviewFinding } from "../engineering/wall";
import type { ComparisonResult } from "../verification/comparison";

export type ReleaseBlockerCategory =
  | "failure"
  | "incomplete"
  | "unsupported";

export type ReleaseBlocker = {
  id: string;
  title: string;
  category: ReleaseBlockerCategory;
  discipline: string;
  reason: string;
};

export type MandatoryScopeGap = {
  id: string;
  title: string;
  discipline: string;
  reason: string;
};

export type ReviewGateState =
  | "blocked_failure"
  | "blocked_incomplete"
  | "blocked_unsupported"
  | "engineer_review_required"
  | "ready_for_engineer_review";

export type ReleaseGateResult = {
  state: ReviewGateState;
  label: string;
  summary: string;
  isBlocked: boolean;
  blockers: ReleaseBlocker[];
};

export const CURRENT_MANDATORY_SCOPE_GAPS: MandatoryScopeGap[] = [
  {
    id: "unsupported-structural-capacity",
    title: "Reinforced-concrete member capacity is unsupported",
    discipline: "structural",
    reason:
      "Stem, toe, heel, and base flexure, shear, serviceability, and reinforcement detailing have not been evaluated.",
  },
  {
    id: "unsupported-global-stability",
    title: "Global stability is unsupported",
    discipline: "geotechnical",
    reason:
      "No validated global slope/foundation stability analysis or approved specialist result is attached.",
  },
  {
    id: "unsupported-settlement",
    title: "Settlement is unsupported",
    discipline: "geotechnical",
    reason:
      "Total and differential settlement have not been evaluated against project criteria.",
  },
  {
    id: "unsupported-liquefaction",
    title: "Liquefaction screening is unsupported",
    discipline: "geotechnical/seismic",
    reason:
      "Liquefaction applicability and resistance have not been established for the site.",
  },
];

function findingBlocker(finding: ReviewFinding): ReleaseBlocker | null {
  if (finding.status === "fail") {
    return {
      id: `finding-${finding.id}`,
      title: finding.title,
      category: "failure",
      discipline: "engineering",
      reason: finding.summary,
    };
  }

  if (finding.status === "insufficient_information" || finding.status === "not_evaluated") {
    return {
      id: `finding-${finding.id}`,
      title: finding.title,
      category: "incomplete",
      discipline: "engineering",
      reason: finding.summary,
    };
  }

  if (finding.status === "unsupported") {
    return {
      id: `finding-${finding.id}`,
      title: finding.title,
      category: "unsupported",
      discipline: "engineering",
      reason: finding.summary,
    };
  }

  return null;
}

function comparisonBlocker(result: ComparisonResult): ReleaseBlocker | null {
  if (result.characteristic.criticality !== "critical" || result.status === "within_tolerance") {
    return null;
  }

  return {
    id: `comparison-${result.characteristic.id}`,
    title: result.characteristic.name,
    category: result.status === "outside_tolerance" ? "failure" : "incomplete",
    discipline: result.characteristic.category,
    reason: result.message,
  };
}

export function evaluateReleaseGate({
  findings,
  comparisons,
  inputsConfirmed,
  standardsPackApproved = false,
  mandatoryScopeGaps = CURRENT_MANDATORY_SCOPE_GAPS,
}: {
  findings: ReviewFinding[];
  comparisons: ComparisonResult[];
  inputsConfirmed: boolean;
  standardsPackApproved?: boolean;
  mandatoryScopeGaps?: MandatoryScopeGap[];
}): ReleaseGateResult {
  const blockers: ReleaseBlocker[] = [];

  for (const finding of findings) {
    const blocker = findingBlocker(finding);
    if (blocker) blockers.push(blocker);
  }

  for (const comparison of comparisons) {
    const blocker = comparisonBlocker(comparison);
    if (blocker) blockers.push(blocker);
  }

  if (!inputsConfirmed) {
    blockers.push({
      id: "inputs-unconfirmed",
      title: "Engineering inputs are unconfirmed",
      category: "incomplete",
      discipline: "multidisciplinary",
      reason: "The current input set has not been confirmed for this review session.",
    });
  }

  if (!standardsPackApproved) {
    blockers.push({
      id: "standards-pack-unapproved",
      title: "Standards pack is not approved",
      category: "incomplete",
      discipline: "engineering governance",
      reason: "The current screening criteria have not completed technical review and software verification.",
    });
  }

  blockers.push(
    ...mandatoryScopeGaps.map((gap) => ({
      ...gap,
      category: "unsupported" as const,
    })),
  );

  if (blockers.some((blocker) => blocker.category === "failure")) {
    return {
      state: "blocked_failure",
      label: "Blocked — mandatory check failed",
      summary: "One or more failed engineering or as-built checks require disposition before release.",
      isBlocked: true,
      blockers,
    };
  }

  if (blockers.some((blocker) => blocker.category === "unsupported")) {
    return {
      state: "blocked_unsupported",
      label: "Blocked — mandatory analysis unsupported",
      summary: "The current model does not evaluate every mandatory engineering failure mode.",
      isBlocked: true,
      blockers,
    };
  }

  if (blockers.some((blocker) => blocker.category === "incomplete")) {
    return {
      state: "blocked_incomplete",
      label: "Blocked — required information missing",
      summary: "Required engineering inputs or critical evidence are incomplete.",
      isBlocked: true,
      blockers,
    };
  }

  const needsEngineerReview = findings.some((finding) => finding.status === "warning") ||
    comparisons.some((result) => result.status !== "within_tolerance");

  if (needsEngineerReview) {
    return {
      state: "engineer_review_required",
      label: "Engineer review required",
      summary: "Advisory findings remain open for qualified engineering review.",
      isBlocked: false,
      blockers: [],
    };
  }

  return {
    state: "ready_for_engineer_review",
    label: "Ready for engineer review",
    summary: "Implemented and applicable checks are complete; professional approval is still required.",
    isBlocked: false,
    blockers: [],
  };
}
