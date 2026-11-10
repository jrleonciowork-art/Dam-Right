import type { CheckFamilyAssessment } from "../review/completeness";
import type { ReviewSnapshot } from "../review/snapshot";

export function buildDraftReviewMarkdown(
  snapshot: ReviewSnapshot,
  coverage: CheckFamilyAssessment[],
) {
  const lines = [
    "# INCOMPLETE — NOT FOR APPROVAL",
    "",
    `Project: ${snapshot.inputs.project.name || "Unidentified project"}`,
    `Structure: ${snapshot.inputs.project.structureId || "Unassigned"}`,
    `Snapshot: ${snapshot.snapshotId}`,
    `Created: ${snapshot.createdAt}`,
    `Engine: ${snapshot.engineVersion}`,
    `Rule pack: ${snapshot.rulePackId} @ ${snapshot.rulePackVersion}`,
    `Input fingerprint: ${snapshot.inputFingerprint}`,
    `Release state: ${snapshot.releaseGate.label}`,
    "",
    "## Release blockers",
    "",
    ...snapshot.releaseGate.blockers.flatMap((blocker) => [
      `- [${blocker.category.toUpperCase()}] ${blocker.title}: ${blocker.reason}`,
    ]),
    "",
    "## Analysis coverage",
    "",
    ...coverage.map((item) => `- ${item.title}: ${item.status} — ${item.reason}`),
    "",
    "## Calculation findings",
    "",
    ...snapshot.calculation.findings.map(
      (finding) => `- ${finding.title}: ${finding.status} — ${finding.summary}`,
    ),
    "",
    "This draft is decision-support output only. It is not an issued engineering report, certification, or professional approval.",
  ];
  return lines.join("\n");
}
