export type RuleApprovalState = "draft" | "technical_review" | "software_verified" | "active" | "superseded";

export type Criterion = {
  id: string;
  description: string;
  value: number | boolean;
  unit: string;
  applicability: string;
  sourceTitle: string;
  sourceEdition: string;
  sourceSection: string;
  approvalState: RuleApprovalState;
};

export type RulePack = {
  id: string;
  name: string;
  version: string;
  jurisdiction: string;
  assetType: string;
  approvalState: RuleApprovalState;
  criteria: {
    minimumSlidingFs: Criterion;
    minimumOverturningFs: Criterion;
    requireNoTension: Criterion;
  };
};

export const DRAFT_PHILIPPINE_FLOOD_WALL_PACK: RulePack = {
  id: "ph-flood-wall-draft",
  name: "Draft Philippine flood-wall screening pack",
  version: "0.1.0-draft",
  jurisdiction: "Philippines",
  assetType: "straight reinforced-concrete flood/retaining wall",
  approvalState: "draft",
  criteria: {
    minimumSlidingFs: {
      id: "external-stability-sliding-screening",
      description: "Minimum sliding factor used by the prototype screening calculation.",
      value: 1.5,
      unit: "ratio",
      applicability: "Prototype normal static screening case only",
      sourceTitle: "Project-specific governing reference not yet approved",
      sourceEdition: "unresolved",
      sourceSection: "unresolved",
      approvalState: "draft",
    },
    minimumOverturningFs: {
      id: "external-stability-overturning-screening",
      description: "Minimum overturning factor used by the prototype screening calculation.",
      value: 1.5,
      unit: "ratio",
      applicability: "Prototype normal static screening case only",
      sourceTitle: "Project-specific governing reference not yet approved",
      sourceEdition: "unresolved",
      sourceSection: "unresolved",
      approvalState: "draft",
    },
    requireNoTension: {
      id: "foundation-full-contact-screening",
      description: "Require full base contact in the prototype screening calculation.",
      value: true,
      unit: "boolean",
      applicability: "Prototype static screening case",
      sourceTitle: "Project-specific governing reference not yet approved",
      sourceEdition: "unresolved",
      sourceSection: "unresolved",
      approvalState: "draft",
    },
  },
};

export function resolveWallCriteria(pack: RulePack) {
  return {
    minimumSlidingFs: Number(pack.criteria.minimumSlidingFs.value),
    minimumOverturningFs: Number(pack.criteria.minimumOverturningFs.value),
    requireNoTension: Boolean(pack.criteria.requireNoTension.value),
    approved:
      pack.approvalState === "active" &&
      Object.values(pack.criteria).every((criterion) => criterion.approvalState === "active"),
    packId: pack.id,
    packVersion: pack.version,
  };
}
