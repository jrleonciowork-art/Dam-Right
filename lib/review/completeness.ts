import type { ReviewFinding } from "../engineering/wall";
import type { MandatoryScopeGap } from "./release-gate";

export type CheckFamilyId =
  | "external_stability"
  | "bearing"
  | "scour"
  | "seepage_piping"
  | "structural_capacity"
  | "reinforcement_detailing"
  | "settlement"
  | "global_stability"
  | "liquefaction"
  | "seismic"
  | "freeboard_overtopping"
  | "durability";

export type CompletenessStatus =
  | "evaluated"
  | "failed"
  | "incomplete"
  | "unsupported"
  | "not_applicable";

export type SpecialistResult = {
  checkFamily: CheckFamilyId;
  conclusion: "pass" | "fail";
  sourceReference: string;
  author: string;
  checker: string;
  issuedAt: string;
  approved: boolean;
};

export type CheckFamilyAssessment = {
  id: CheckFamilyId;
  discipline: string;
  title: string;
  mandatory: boolean;
  status: CompletenessStatus;
  reason: string;
};

const SPECIALIST_FAMILIES: Array<Omit<CheckFamilyAssessment, "status" | "reason">> = [
  { id: "structural_capacity", discipline: "structural", title: "Member flexure and shear capacity", mandatory: true },
  { id: "reinforcement_detailing", discipline: "structural", title: "Reinforcement detailing and serviceability", mandatory: true },
  { id: "settlement", discipline: "geotechnical", title: "Total and differential settlement", mandatory: true },
  { id: "global_stability", discipline: "geotechnical", title: "Global stability", mandatory: true },
  { id: "liquefaction", discipline: "geotechnical/seismic", title: "Liquefaction screening", mandatory: true },
  { id: "seismic", discipline: "structural/geotechnical", title: "Seismic load case", mandatory: true },
  { id: "durability", discipline: "structural/materials", title: "Durability and exposure design", mandatory: true },
];

function statusForFindings(findings: ReviewFinding[], ids: string[]): CompletenessStatus {
  const relevant = findings.filter((finding) => ids.includes(finding.id));
  if (relevant.some((finding) => finding.status === "fail")) return "failed";
  if (relevant.some((finding) => ["insufficient_information", "not_evaluated", "unsupported"].includes(finding.status))) return "incomplete";
  if (relevant.length > 0 && relevant.every((finding) => ["pass", "not_applicable"].includes(finding.status))) return "evaluated";
  return "incomplete";
}

export function buildCompletenessMatrix(
  findings: ReviewFinding[],
  specialistResults: SpecialistResult[] = [],
): CheckFamilyAssessment[] {
  const assessments: CheckFamilyAssessment[] = [
    {
      id: "external_stability",
      discipline: "civil/geotechnical",
      title: "Sliding, overturning, and base contact",
      mandatory: true,
      status: statusForFindings(findings, ["sliding", "overturning", "no-tension"]),
      reason: "Derived from the deterministic wall review for the selected load case.",
    },
    {
      id: "bearing",
      discipline: "geotechnical",
      title: "Foundation bearing",
      mandatory: true,
      status: statusForFindings(findings, ["bearing"]),
      reason: "Requires an approved geotechnical bearing basis.",
    },
    {
      id: "scour",
      discipline: "hydraulic/geotechnical",
      title: "Scour and post-scour support",
      mandatory: true,
      status: statusForFindings(findings, ["toe-scour-undermining"]),
      reason: "Requires an approved design scour depth and applicable foundation model.",
    },
    {
      id: "seepage_piping",
      discipline: "hydraulic/geotechnical",
      title: "Under-seepage and piping",
      mandatory: true,
      status: statusForFindings(findings, ["piping-creep"]),
      reason: "Current implementation is a screening calculation only.",
    },
    {
      id: "freeboard_overtopping",
      discipline: "hydraulic",
      title: "Freeboard and overtopping",
      mandatory: true,
      status: findings.some((finding) => finding.id === "overtopping" && finding.status === "fail")
        ? "failed"
        : "incomplete",
      reason: "A complete design-flood, datum, freeboard, wave, and overtopping basis is not yet implemented.",
    },
  ];

  for (const family of SPECIALIST_FAMILIES) {
    const result = specialistResults.find((item) => item.checkFamily === family.id && item.approved);
    assessments.push({
      ...family,
      status: result ? (result.conclusion === "pass" ? "evaluated" : "failed") : "unsupported",
      reason: result
        ? `Approved specialist result: ${result.sourceReference}; checked by ${result.checker}.`
        : "No validated integrated solver or approved specialist result is recorded.",
    });
  }

  return assessments;
}

export function completenessScopeGaps(matrix: CheckFamilyAssessment[]): MandatoryScopeGap[] {
  return matrix
    .filter((assessment) => assessment.mandatory && assessment.status === "unsupported")
    .map((assessment) => ({
      id: `unsupported-${assessment.id}`,
      title: `${assessment.title} is unsupported`,
      discipline: assessment.discipline,
      reason: assessment.reason,
    }));
}
