import type { ReviewSnapshot } from "./snapshot";

export type ReviewRole = "preparer" | "checker" | "approving_engineer";

export type ReviewApproval = {
  role: ReviewRole;
  reviewerId: string;
  reviewerName: string;
  decision: "approve" | "reject";
  decidedAt: string;
  snapshotId: string;
  comment: string;
};

export type IssuanceEligibility = {
  eligible: boolean;
  reasons: string[];
};

export function evaluateIssuanceEligibility(
  snapshot: ReviewSnapshot,
  approvals: ReviewApproval[],
): IssuanceEligibility {
  const reasons: string[] = [];
  if (snapshot.releaseGate.isBlocked) reasons.push("The centralized release gate is blocked.");

  const current = approvals.filter(
    (approval) => approval.snapshotId === snapshot.snapshotId && approval.decision === "approve",
  );
  const byRole = new Map(current.map((approval) => [approval.role, approval]));
  for (const role of ["preparer", "checker", "approving_engineer"] as const) {
    if (!byRole.has(role)) reasons.push(`A current ${role.replaceAll("_", " ")} approval is required.`);
  }

  const reviewerIds = new Set(current.map((approval) => approval.reviewerId));
  if (current.length >= 3 && reviewerIds.size < 3) {
    reasons.push("Preparer, checker, and approving engineer must be different people.");
  }

  if (approvals.some(
    (approval) => approval.snapshotId === snapshot.snapshotId && approval.decision === "reject",
  )) {
    reasons.push("The current snapshot has a rejection decision.");
  }

  return { eligible: reasons.length === 0, reasons };
}
