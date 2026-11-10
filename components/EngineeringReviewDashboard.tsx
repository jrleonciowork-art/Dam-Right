"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import AsBuiltVerificationPanel from "@/components/AsBuiltVerificationPanel";
import BlueprintIngestion from "@/components/BlueprintIngestion";
import LogoMark from "@/components/LogoMark";
import type { ExtractedBlueprintData } from "@/lib/blueprint/types";
import { BLANK_WALL_INPUT, DEFAULT_WALL_INPUT } from "@/lib/engineering/defaults";
import {
  calculateWallReview,
  formatEngineeringNumber,
  type FoundationSoilType,
  type ReviewFinding,
  type WallInput,
} from "@/lib/engineering/wall";
import { evaluateReleaseGate } from "@/lib/review/release-gate";
import { buildCompletenessMatrix, completenessScopeGaps } from "@/lib/review/completeness";
import { DRAFT_PHILIPPINE_FLOOD_WALL_PACK } from "@/lib/standards/rule-pack";
import { createReviewSnapshot } from "@/lib/review/snapshot";
import { buildDraftReviewMarkdown } from "@/lib/reports/draft-report";
import {
  compareAsBuilt,
  summarizeComparisons,
  type FieldMeasurement,
} from "@/lib/verification/comparison";
import {
  DEFAULT_APPROVED_CHARACTERISTICS,
  DEFAULT_FIELD_MEASUREMENTS,
} from "@/lib/verification/defaults";

type TabId = "overview" | "blueprint" | "plan" | "checks" | "as-built" | "findings";

type NumberFieldProps = {
  label: string;
  value: number | null;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
  readOnly?: boolean;
  onChange: (value: number | null) => void;
};

const findingStyles: Record<ReviewFinding["status"], string> = {
  pass: "border-emerald-200 bg-emerald-50 text-emerald-900",
  fail: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  insufficient_information: "border-violet-200 bg-violet-50 text-violet-900",
  unsupported: "border-violet-200 bg-violet-50 text-violet-900",
  not_evaluated: "border-violet-200 bg-violet-50 text-violet-900",
  not_applicable: "border-slate-200 bg-slate-50 text-slate-600",
};

const findingLabels: Record<ReviewFinding["status"], string> = {
  pass: "Passed",
  fail: "Failed",
  warning: "Review",
  insufficient_information: "Incomplete",
  unsupported: "Unsupported",
  not_evaluated: "Not evaluated",
  not_applicable: "N/A",
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function NumberField({
  label,
  value,
  unit,
  min,
  max,
  step = 0.01,
  help,
  readOnly = false,
  onChange,
}: NumberFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
        {label}
        {unit && <span className="font-normal text-slate-400">{unit}</span>}
      </span>
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
        className={cx("w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-tide focus:ring-4 focus:ring-tide/10", readOnly ? "bg-slate-100 text-slate-600" : "bg-white")}
      />
      {help && <span className="mt-1 block text-xs leading-5 text-slate-500">{help}</span>}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={cx("w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-tide focus:ring-4 focus:ring-tide/10", readOnly ? "bg-slate-100 text-slate-600" : "bg-white")}
      />
    </label>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-tide">{eyebrow}</p>
      <h2 className="mt-1 font-[var(--font-display)] text-3xl font-bold tracking-tight text-ink">{title}</h2>
      {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}
    </div>
  );
}

const groupToneStyles = {
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  success: "bg-emerald-100 text-emerald-800 border-emerald-200",
  warning: "bg-amber-100 text-amber-900 border-amber-200",
  danger: "bg-red-100 text-red-900 border-red-200",
  info: "bg-cyan-100 text-cyan-900 border-cyan-200",
};

function InputGroup({
  title,
  status,
  children,
  open = false,
  tone = "neutral",
}: {
  title: string;
  status: string;
  children: ReactNode;
  open?: boolean;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <details open={open} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
        <span className="font-[var(--font-display)] text-lg font-bold text-ink">{title}</span>
        <span className="flex items-center gap-3">
          <span className={cx("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide", groupToneStyles[tone])}>
            {status}
          </span>
          <span className="text-slate-400 transition group-open:rotate-180" aria-hidden="true">⌄</span>
        </span>
      </summary>
      <div className="border-t border-slate-200 p-5">{children}</div>
    </details>
  );
}

function MetricCard({
  label,
  value,
  note,
  tone = "text-ink",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={cx("mt-2 font-[var(--font-display)] text-3xl font-bold", tone)}>{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </article>
  );
}

function FactorBar({
  label,
  value,
  required,
}: {
  label: string;
  value: number;
  required: number;
}) {
  const isEvaluated = Number.isFinite(value);
  const safeValue = isEvaluated ? Math.max(value, 0) : 0;
  const maximum = Math.max(required * 1.65, safeValue * 1.08, 1);
  const valuePercent = Math.min((safeValue / maximum) * 100, 100);
  const requiredPercent = Math.min((required / maximum) * 100, 100);
  const passed = isEvaluated && value >= required;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className={cx("mt-1 font-[var(--font-display)] text-3xl font-bold", !isEvaluated ? "text-violet-700" : passed ? "text-emerald-700" : "text-red-700")}>
            {formatEngineeringNumber(value)}
          </p>
        </div>
        <span className={cx("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide", !isEvaluated ? "bg-violet-100 text-violet-900" : passed ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900")}>
          {!isEvaluated ? "Not evaluated" : passed ? "Calculation passed" : "Below criterion"}
        </span>
      </div>
      <div className="relative mt-5 h-3 rounded-full bg-slate-100">
        <div
            className={cx("h-full rounded-full", !isEvaluated ? "bg-violet-400" : passed ? "bg-emerald-500" : "bg-red-500")}
          style={{ width: String(valuePercent) + "%" }}
        />
        <span
          className="absolute top-[-5px] h-5 w-0.5 bg-ink"
          style={{ left: String(requiredPercent) + "%" }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-500">
        <span>0</span>
        <span>Required {required.toFixed(2)}</span>
      </div>
    </div>
  );
}

function WallSectionDiagram({ input }: { input: WallInput }) {
  const waterHeight = Math.min(Math.max(input.loadCase.wetSideLevelM / Math.max(input.geometry.wallHeightM, 0.01), 0), 1);
  const waterTop = 190 - waterHeight * 125;

  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white">
      <figcaption>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Section model</p>
        <p className="mt-1 text-sm text-slate-300">Wet side left · dry side right · one-metre strip</p>
      </figcaption>
      <svg viewBox="0 0 520 250" className="mt-4 w-full" role="img" aria-label="Simplified flood-wall cross section with wet-side water and hydrostatic force">
        <defs>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22d3ee" stopOpacity="0.75" />
            <stop offset="1" stopColor="#087e8b" stopOpacity="0.35" />
          </linearGradient>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#fca5a5" />
          </marker>
        </defs>
        <rect x="30" y={waterTop} width="205" height={190 - waterTop} fill="url(#water)" />
        <path d="M235 40 L282 40 L282 184 L420 184 L420 220 L115 220 L115 184 L235 184 Z" fill="#b8c3c7" stroke="#e2e8f0" strokeWidth="3" />
        <path d="M282 146 L500 146 L500 220 L420 220 L420 184 L282 184 Z" fill="#8b7a59" opacity="0.9" />
        {[80, 112, 144, 174].map((y, index) => (
          <line key={y} x1={190 - index * 16} y1={y} x2="230" y2={y} stroke="#fca5a5" strokeWidth="3" markerEnd="url(#arrow)" />
        ))}
        <line x1="30" y1={waterTop} x2="235" y2={waterTop} stroke="#67e8f9" strokeWidth="3" />
        <text x="42" y={Math.max(waterTop - 10, 22)} fill="#a5f3fc" fontSize="13">Water {formatEngineeringNumber(input.loadCase.wetSideLevelM)} m</text>
        <text x="246" y="28" fill="#e2e8f0" fontSize="13">Stem {formatEngineeringNumber(input.geometry.stemThicknessM)} m</text>
        <text x="118" y="242" fill="#94a3b8" fontSize="12">Base {formatEngineeringNumber(input.geometry.baseWidthM)} m</text>
        <text x="430" y="138" fill="#cbd5e1" fontSize="12">Dry side</text>
      </svg>
    </figure>
  );
}

function FindingCard({ finding }: { finding: ReviewFinding }) {
  return (
    <details className={cx("group rounded-2xl border", findingStyles[finding.status])}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4">
        <div>
          <p className="font-bold">{finding.title}</p>
          <p className="mt-1 text-xs leading-5 opacity-80">{finding.summary}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide">
          {findingLabels[finding.status]}
        </span>
      </summary>
      {(finding.equation || finding.demand || finding.capacity) && (
        <div className="border-t border-current/15 px-4 py-3 text-xs">
          {finding.equation && <p className="font-medium italic opacity-85 text-slate-700">{finding.equation}</p>}
          <div className="mt-2 flex flex-wrap gap-4">
            {finding.demand && <span>{finding.demand.label}: <strong>{formatEngineeringNumber(finding.demand.value)} {finding.demand.unit}</strong></span>}
            {finding.capacity && <span>{finding.capacity.label}: <strong>{formatEngineeringNumber(finding.capacity.value)} {finding.capacity.unit}</strong></span>}
          </div>
        </div>
      )}
    </details>
  );
}

export default function EngineeringReviewDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("blueprint");
  const [input, setInput] = useState<WallInput>(BLANK_WALL_INPUT);
  const [measurements, setMeasurements] = useState<FieldMeasurement[]>(DEFAULT_FIELD_MEASUREMENTS);
  const [inputConfirmed, setInputConfirmed] = useState(false);
  const [blueprintParsed, setBlueprintParsed] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(true);

  const calculation = useMemo(() => calculateWallReview(input), [input]);
  const completenessMatrix = useMemo(
    () => buildCompletenessMatrix(calculation.findings),
    [calculation.findings],
  );
  const comparisons = useMemo(
    () => compareAsBuilt(DEFAULT_APPROVED_CHARACTERISTICS, measurements),
    [measurements],
  );
  const comparisonSummary = useMemo(() => summarizeComparisons(comparisons), [comparisons]);
  const releaseGate = useMemo(
    () => evaluateReleaseGate({
      findings: calculation.findings,
      comparisons,
      inputsConfirmed: inputConfirmed,
      standardsPackApproved: false,
      mandatoryScopeGaps: completenessScopeGaps(completenessMatrix),
    }),
    [calculation.findings, comparisons, completenessMatrix, inputConfirmed],
  );

  const findingCounts = useMemo(() => ({
    failed: calculation.findings.filter((finding) => finding.status === "fail").length,
    review: calculation.findings.filter((finding) => finding.status === "warning").length,
    incomplete: calculation.findings.filter((finding) =>
      finding.status === "insufficient_information" ||
      finding.status === "unsupported" ||
      finding.status === "not_evaluated"
    ).length,
    passed: calculation.findings.filter((finding) => finding.status === "pass").length,
  }), [calculation.findings]);

  const openComparisonIssues = comparisons.filter((result) => result.status !== "within_tolerance");
  const nonBlockingComparisonIssues = openComparisonIssues.filter(
    (result) => result.characteristic.criticality !== "critical",
  );
  const openFindingCount = releaseGate.blockers.length + findingCounts.review + nonBlockingComparisonIssues.length;
  const releaseBlocked = releaseGate.isBlocked;
  const reviewSnapshot = useMemo(
    () => createReviewSnapshot({
      inputs: input,
      calculation,
      releaseGate,
      rulePackId: DRAFT_PHILIPPINE_FLOOD_WALL_PACK.id,
      rulePackVersion: DRAFT_PHILIPPINE_FLOOD_WALL_PACK.version,
    }),
    [input, calculation, releaseGate],
  );

  const downloadDraftReport = () => {
    const report = buildDraftReviewMarkdown(reviewSnapshot, completenessMatrix);
    const url = URL.createObjectURL(new Blob([report], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${input.project.structureId || "unassigned"}-incomplete-review.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const nextActions = useMemo(() => {
    const actions: Array<{ label: string; tab: TabId; tone: string }> = [];
    calculation.findings.forEach((finding) => {
      if (
        finding.status === "fail" ||
        finding.status === "insufficient_information" ||
        finding.status === "unsupported" ||
        finding.status === "not_evaluated"
      ) {
        actions.push({
          label: finding.title,
          tab: finding.status === "insufficient_information" ? "plan" : "checks",
          tone: finding.status === "fail" ? "bg-red-500" : "bg-violet-500",
        });
      }
    });
    comparisons.forEach((result) => {
      if (result.status !== "within_tolerance") {
        actions.push({
          label: result.characteristic.name + " · " + (
            result.status === "outside_tolerance" ? "engineering disposition" : "evidence check"
          ),
          tab: "as-built",
          tone: result.status === "outside_tolerance" ? "bg-red-500" : "bg-amber-500",
        });
      }
    });
    releaseGate.blockers
      .filter((blocker) => blocker.category === "unsupported")
      .forEach((blocker) => actions.push({
        label: blocker.title,
        tab: "checks",
        tone: "bg-violet-500",
      }));
    return actions.slice(0, 5);
  }, [calculation.findings, comparisons, releaseGate.blockers]);

  const handleApplyParsedBlueprint = (data: ExtractedBlueprintData) => {
    setBlueprintParsed(true);
    setInputConfirmed(true);
    setInput((current) => ({
      ...current,
      project: {
        ...current.project,
        name: data.metadata.projectName || current.project.name,
        structureId: data.metadata.structureId || current.project.structureId,
      },
      geometry: {
        ...current.geometry,
        wallHeightM: data.dimensions.wallHeightM ?? current.geometry.wallHeightM,
        stemThicknessM: data.dimensions.stemThicknessM ?? current.geometry.stemThicknessM,
        plannedStemThicknessM: data.dimensions.stemThicknessM ?? current.geometry.plannedStemThicknessM,
        baseWidthM: data.dimensions.baseWidthM ?? current.geometry.baseWidthM,
        baseThicknessM: data.dimensions.baseThicknessM ?? current.geometry.baseThicknessM,
        toeWidthM: data.dimensions.toeWidthM ?? current.geometry.toeWidthM,
      },
      materials: {
        ...current.materials,
        concreteUnitWeightKNM3: data.materials.concreteUnitWeightKNM3 ?? current.materials.concreteUnitWeightKNM3,
        soilUnitWeightKNM3: data.hydrologyGeotech.soilUnitWeightKNM3 ?? current.materials.soilUnitWeightKNM3,
        frictionCoefficient: data.hydrologyGeotech.frictionCoefficient ?? current.materials.frictionCoefficient,
        soilFrictionAngleDeg: data.hydrologyGeotech.soilFrictionAngleDeg ?? current.materials.soilFrictionAngleDeg,
        allowableBearingKPa: data.hydrologyGeotech.allowableBearingKPa ?? current.materials.allowableBearingKPa,
      },
      subsurface: {
        ...current.subsurface,
        footingEmbedmentM: data.dimensions.embedmentDepthM ?? current.subsurface.footingEmbedmentM,
        asBuiltFootingEmbedmentM: data.dimensions.embedmentDepthM ?? current.subsurface.asBuiltFootingEmbedmentM,
      },
      loadCase: {
        ...current.loadCase,
        wetSideLevelM: data.hydrologyGeotech.wetSideLevelM ?? current.loadCase.wetSideLevelM,
        surchargeKPa: data.hydrologyGeotech.surchargeKPa ?? current.loadCase.surchargeKPa,
      },
    }));
    setActiveTab("plan");
  };

  const updateGeometry = (key: keyof WallInput["geometry"], value: number | null) => {
    setInputConfirmed(false);
    setInput((current) => ({ ...current, geometry: { ...current.geometry, [key]: value ?? 0 } }));
  };
  const updateMaterial = (key: keyof WallInput["materials"], value: number | null) => {
    setInputConfirmed(false);
    setInput((current) => ({ ...current, materials: { ...current.materials, [key]: value } }));
  };
  const updateLoadCase = (key: keyof WallInput["loadCase"], value: number | string | null) => {
    setInputConfirmed(false);
    setInput((current) => ({ ...current, loadCase: { ...current.loadCase, [key]: value ?? 0 } }));
  };
  const updateLimit = (key: keyof WallInput["limits"], value: number | boolean | null) => {
    setInputConfirmed(false);
    setInput((current) => ({ ...current, limits: { ...current.limits, [key]: value ?? 0 } }));
  };
  const updateSubsurface = (key: keyof WallInput["subsurface"], value: number | boolean | string | null) => {
    setInputConfirmed(false);
    setInput((current) => ({ ...current, subsurface: { ...current.subsurface, [key]: value } }));
  };

  type TabTone = "neutral" | "success" | "warning" | "danger" | "info";

  const planHasMissing = calculation.findings.some(
    (f) => f.status === "insufficient_information" && f.id !== "bearing",
  );
  const planStatus = planHasMissing
    ? "Incomplete"
    : inputConfirmed
      ? "Confirmed"
      : "Unconfirmed";
  const planTone: TabTone = planHasMissing
    ? "danger"
    : inputConfirmed
      ? "success"
      : "warning";

  const unsupportedCount = releaseGate.blockers.filter(
    (blocker) => blocker.category === "unsupported",
  ).length;

  const checksTone: TabTone =
    findingCounts.failed > 0
      ? "danger"
      : unsupportedCount > 0 || findingCounts.incomplete > 0 || findingCounts.review > 0
        ? "warning"
        : "success";

  const asBuiltTone: TabTone =
    comparisonSummary.outsideTolerance > 0
      ? "danger"
      : comparisonSummary.awaitingConfirmation > 0
        ? "warning"
        : "success";

  const tabs: Array<{ id: TabId; label: string; status: string; tone: TabTone }> = [
    {
      id: "overview",
      label: "Overview",
      status: releaseBlocked ? "Blocked" : "Review",
      tone: releaseBlocked ? "danger" : "success",
    },
    {
      id: "blueprint",
      label: "AI Blueprint Intake",
      status: blueprintParsed ? "Baseline applied" : "AI Ready",
      tone: blueprintParsed ? "success" : "info",
    },
    {
      id: "plan",
      label: "Plan & Design",
      status: planStatus,
      tone: planTone,
    },
    {
      id: "checks",
      label: "Engineering Checks",
      status:
        findingCounts.failed > 0
          ? `${findingCounts.failed} failed`
          : unsupportedCount > 0
            ? `${unsupportedCount} unsupported`
            : findingCounts.incomplete > 0
            ? `${findingCounts.incomplete} incomplete`
            : findingCounts.review > 0
            ? `${findingCounts.review} review`
            : "Implemented checks complete",
      tone: checksTone,
    },
    {
      id: "as-built",
      label: "As-Built Verification",
      status:
        comparisonSummary.outsideTolerance > 0
          ? `${comparisonSummary.outsideTolerance} outside`
          : comparisonSummary.awaitingConfirmation > 0
            ? `${comparisonSummary.awaitingConfirmation} awaiting`
            : "Within tolerance",
      tone: asBuiltTone,
    },
    {
      id: "findings",
      label: "Findings & Report",
      status: `${openFindingCount} open`,
      tone: openFindingCount > 0 ? (findingCounts.failed > 0 ? "danger" : "warning") : "success",
    },
  ];

  const statusLabel = releaseGate.label;

  return (
    <main className="min-h-screen bg-mist text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <Link href="/" className="text-xs font-bold uppercase tracking-[0.18em] text-tide hover:text-ink">
                ← Home
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-ink text-cyan-300 shadow-sm">
                  <LogoMark className="size-7" />
                </span>
                <h1 className="font-[var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">Dam Right</h1>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-950">
                  Demonstration · Not for certification
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">Flood-control plan and as-built verification</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[430px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Project</p>
                <p className="mt-1 text-sm font-bold">{input.project.name || "Awaiting blueprint intake"}</p>
                <p className="text-xs text-slate-500">{input.project.structureId || "Structure unassigned"} · Segment A</p>
              </div>
              <div className={cx("rounded-xl border px-4 py-3", releaseBlocked ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50")}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Review state</p>
                <p className={cx("mt-1 text-sm font-bold", releaseBlocked ? "text-red-800" : "text-emerald-800")}>{statusLabel}</p>
                <p className="text-xs text-slate-500">AFD-001 · ASB-001</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1500px] overflow-x-auto px-4 [scrollbar-width:none] sm:px-8 lg:px-12 [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-1 py-2" role="tablist" aria-label="Workspace sections">
            {tabs.map((tab) => {
              const toneClasses = {
                success:
                  activeTab === tab.id
                    ? "bg-emerald-500 text-white border-emerald-400"
                    : "bg-emerald-100 text-emerald-800 border-emerald-200",
                danger:
                  activeTab === tab.id
                    ? "bg-red-500 text-white border-red-400"
                    : "bg-red-100 text-red-800 border-red-200",
                warning:
                  activeTab === tab.id
                    ? "bg-amber-500 text-white border-amber-400"
                    : "bg-amber-100 text-amber-900 border-amber-200",
                info:
                  activeTab === tab.id
                    ? "bg-cyan-500 text-white border-cyan-400"
                    : "bg-cyan-100 text-cyan-800 border-cyan-200",
                neutral:
                  activeTab === tab.id
                    ? "bg-white/20 text-white border-white/25"
                    : "bg-slate-100 text-slate-600 border-slate-200",
              }[tab.tone];

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={"panel-" + tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cx(
                    "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition",
                    activeTab === tab.id ? "bg-ink text-white shadow-sm" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {tab.label}
                  <span className={cx("rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide", toneClasses)}>
                    {tab.status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mandatory Decision Support & Quality Gate Modal on Workspace Entry */}
      {showDisclaimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-3xl border border-slate-300 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-lg text-tide">
                ⚖️
              </span>
              <div>
                <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-900">
                  Decision Support Only
                </span>
                <h3 className="mt-1 font-[var(--font-display)] text-xl font-bold text-ink">
                  Civil Engineering Quality &amp; Approval Notice
                </h3>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700">
              <p>
                <strong>Dam Right</strong> is an analytical decision-support workspace comparing approved engineering plans with documented as-built field evidence and deterministic limit states.
              </p>
              <ul className="list-disc space-y-1.5 pl-4 text-slate-600">
                <li>
                  Calculations reporting <em>&ldquo;Passed&rdquo;</em> or <em>&ldquo;Within tolerance&rdquo;</em> do <strong>not</strong> constitute safety certification, building occupancy clearance, or official professional sign-off.
                </li>
                <li>
                  Public works structures require evaluation and formal endorsement by a duly registered Professional Civil/Structural Engineer in accordance with the National Structural Code of the Philippines (NSCP) and DPWH Design Guidelines, Criteria &amp; Standards (DGCS).
                </li>
                <li>
                  AI vision extractions and field tolerances must always be verified against official certified contract drawings.
                </li>
              </ul>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDisclaimerModal(false)}
                className="w-full rounded-xl bg-ink px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-slate-800 sm:w-auto"
              >
                I Understand &amp; Acknowledge →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8 lg:px-12 lg:py-8">
        <details className="mb-6 rounded-2xl border border-cyan-200 bg-cyan-50">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-cyan-950">
            Scope: straight reinforced-concrete flood wall · review support only
          </summary>
          <p className="border-t border-cyan-200 px-4 py-3 text-xs leading-5 text-slate-700">
            The workspace compares an approved flood-control plan with documented as-built evidence and configured criteria. “Within tolerance” and “calculation passed” are not safety certification or professional approval.
          </p>
        </details>

        {activeTab === "overview" && (
          <section id="panel-overview" role="tabpanel" aria-label="Overview" className="space-y-6">
            <div className="grid items-start gap-5 xl:grid-cols-[.9fr_1.1fr]">
              <article className={cx("rounded-3xl border p-6 text-white shadow-panel sm:p-8", releaseBlocked ? "border-red-800 bg-danger" : "border-emerald-800 bg-safety")}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-75">Current decision state</p>
                <h2 className="mt-2 font-[var(--font-display)] text-4xl font-bold">{statusLabel}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 opacity-90">
                  {releaseGate.summary}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full bg-black/15 px-3 py-1.5 text-xs font-bold">{findingCounts.failed} calculation failures</span>
                  <span className="rounded-full bg-black/15 px-3 py-1.5 text-xs font-bold">{comparisonSummary.outsideTolerance} outside tolerance</span>
                  <span className="rounded-full bg-black/15 px-3 py-1.5 text-xs font-bold">{findingCounts.incomplete} incomplete</span>
                  <span className="rounded-full bg-black/15 px-3 py-1.5 text-xs font-bold">{releaseGate.blockers.filter((blocker) => blocker.category === "unsupported").length} unsupported</span>
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-[var(--font-display)] text-xl font-bold">Next actions</h2>
                  <span className="text-xs text-slate-500">{nextActions.length} shown</span>
                </div>
                <ol className="mt-4 grid gap-2 xl:grid-cols-2">
                  {nextActions.map((action, index) => (
                    <li key={action.label + String(index)}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(action.tab)}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-left transition hover:border-tide hover:bg-cyan-50/40"
                      >
                        <span className={cx("size-2.5 shrink-0 rounded-full", action.tone)} />
                        <span className="flex-1 text-sm font-semibold text-slate-700">{action.label}</span>
                        <span className="text-slate-400" aria-hidden="true">→</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </article>
            </div>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Engineering summary">
              <MetricCard label="Sliding FS" value={formatEngineeringNumber(calculation.values.fsSliding)} note={"Required " + input.limits.minimumSlidingFs.toFixed(2)} tone={calculation.values.fsSliding < input.limits.minimumSlidingFs ? "text-red-700" : "text-emerald-700"} />
              <MetricCard label="Overturning FS" value={formatEngineeringNumber(calculation.values.fsOverturning)} note={"Required " + input.limits.minimumOverturningFs.toFixed(2)} tone={calculation.values.fsOverturning < input.limits.minimumOverturningFs ? "text-red-700" : "text-emerald-700"} />
              <MetricCard label="Toe pressure" value={formatEngineeringNumber(calculation.values.toePressureKPa) + " kPa"} />
              <MetricCard label="As-built review" value={comparisonSummary.outsideTolerance + " outside"} note={comparisonSummary.awaitingConfirmation + " awaiting check"} tone={comparisonSummary.releaseBlocked ? "text-red-700" : "text-emerald-700"} />
              <MetricCard label="Water level" value={formatEngineeringNumber(input.loadCase.wetSideLevelM) + " m"} note="Manual operational context" tone="text-tide" />
            </section>

            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-tide">Analysis coverage</p>
                  <h3 className="mt-1 font-[var(--font-display)] text-xl font-bold">Mandatory check-family status</h3>
                </div>
                <p className="text-xs text-slate-500">Unsupported and incomplete families block readiness.</p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {completenessMatrix.map((assessment) => {
                  const tone = assessment.status === "failed"
                    ? "border-red-200 bg-red-50 text-red-900"
                    : assessment.status === "evaluated"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-violet-200 bg-violet-50 text-violet-900";
                  return (
                    <div key={assessment.id} className={cx("rounded-xl border p-3", tone)}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold">{assessment.title}</p>
                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide">{assessment.status.replace("_", " ")}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 opacity-75">{assessment.discipline}</p>
                    </div>
                  );
                })}
              </div>
            </article>

            <div className="grid gap-5 lg:grid-cols-2">
              <WallSectionDiagram input={input} />
              <article className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-tide">Workflow progress</p>
                <div className="mt-4 space-y-4">
                  {tabs.slice(1).map((tab, index) => {
                    const numberCircleStyles = {
                      success: "bg-emerald-100 text-emerald-800",
                      danger: "bg-red-100 text-red-800",
                      warning: "bg-amber-100 text-amber-900",
                      info: "bg-cyan-100 text-cyan-900",
                      neutral: "bg-slate-100 text-slate-700",
                    }[tab.tone];

                    return (
                      <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className="flex w-full items-center gap-4 text-left">
                        <span className={cx("grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold", numberCircleStyles)}>{index + 1}</span>
                        <span className="flex-1">
                          <span className="block text-sm font-bold text-ink">{tab.label}</span>
                          <span className="block text-xs text-slate-500">{tab.status}</span>
                        </span>
                        <span className="text-slate-400">→</span>
                      </button>
                    );
                  })}
                </div>
              </article>
            </div>
          </section>
        )}

        {activeTab === "blueprint" && (
          <section id="panel-blueprint" role="tabpanel" aria-label="AI Blueprint Intake" className="space-y-6">
            <SectionTitle
              eyebrow="Vision & Document AI"
              title="Blueprint Ingestion & Code Compliance"
              description="Upload multi-sheet structural drawings or CAD scans to extract engineering parameters, detect missing data flags, and cross-reference NSCP / ACI / DPWH compliance standards."
            />
            <BlueprintIngestion onApplyBaseline={handleApplyParsedBlueprint} />
          </section>
        )}

        {activeTab === "plan" && (
          <section id="panel-plan" role="tabpanel" aria-label="Plan and design" className="space-y-5">
            <SectionTitle eyebrow="Approved baseline" title="Plan & Design" description="Confirm the evidence and required inputs first. Advanced assumptions stay collapsed until needed." />

            {/* AI Vision Baseline Status Banner */}
            {blueprintParsed ? (
              <div className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                    ✓
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                        AI Vision
                      </span>
                      <p className="text-sm font-bold text-emerald-950">Baseline Automatically Populated from Drawing</p>
                    </div>
                    <p className="mt-0.5 text-xs text-emerald-800">
                      Geometry, material strengths, embedment, and flood hydrology were populated from your blueprint. You can adjust or override any field below.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("blueprint")}
                  className="shrink-0 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100"
                >
                  View Drawing Diagnostics &amp; Compliance →
                </button>
              </div>
            ) : (
              <div className="flex flex-col justify-between gap-3 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-base font-bold text-cyan-800">
                    📄
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-cyan-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-900">
                        Multimodal AI
                      </span>
                      <p className="text-sm font-bold text-ink">Have a structural blueprint or CAD PDF?</p>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Use the single AI Blueprint Intake tab to auto-extract dimensions, rebar, and evaluate DPWH/NSCP code compliance.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("blueprint")}
                  className="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-700"
                >
                  Import via AI Vision →
                </button>
              </div>
            )}

            <InputGroup
              title="Project and revision identity"
              status={input.project.name && input.project.structureId ? "Identified" : "Incomplete"}
              tone={input.project.name && input.project.structureId ? "success" : "warning"}
              open
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Project name" value={input.project.name} onChange={(value) => setInput((current) => ({ ...current, project: { ...current.project, name: value } }))} />
                <TextField label="Structure ID" value={input.project.structureId} onChange={(value) => setInput((current) => ({ ...current, project: { ...current.project, structureId: value } }))} />
                <TextField label="Location" value={input.project.location} onChange={(value) => setInput((current) => ({ ...current, project: { ...current.project, location: value } }))} />
                <TextField label="Standards pack" value={input.project.standardPack} readOnly onChange={() => {}} />
              </div>
            </InputGroup>

            <InputGroup
              title="Required wall geometry"
              status={calculation.values.heelWidthM <= 0 ? "Geometry alert" : "Defined"}
              tone={calculation.values.heelWidthM <= 0 ? "danger" : "success"}
              open
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField label="Wall height" unit="m" min={0} value={input.geometry.wallHeightM} onChange={(value) => updateGeometry("wallHeightM", value)} />
                <NumberField label="As-built stem thickness" unit="m" min={0} value={input.geometry.stemThicknessM} onChange={(value) => updateGeometry("stemThicknessM", value)} />
                <NumberField label="Planned stem thickness" unit="m" min={0} value={input.geometry.plannedStemThicknessM} onChange={(value) => updateGeometry("plannedStemThicknessM", value)} />
                <NumberField label="Base width" unit="m" min={0} value={input.geometry.baseWidthM} onChange={(value) => updateGeometry("baseWidthM", value)} />
                <NumberField label="Base thickness" unit="m" min={0} value={input.geometry.baseThicknessM} onChange={(value) => updateGeometry("baseThicknessM", value)} />
                <NumberField label="Toe width" unit="m" min={0} value={input.geometry.toeWidthM} onChange={(value) => updateGeometry("toeWidthM", value)} />
              </div>
              <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-600">Calculated heel width: <strong>{formatEngineeringNumber(calculation.values.heelWidthM, 3)} m</strong></p>
            </InputGroup>

            <InputGroup
              title="Current hydraulic and load case"
              status={input.loadCase.wetSideLevelM > input.geometry.wallHeightM ? "Overtopping" : "Loaded"}
              tone={input.loadCase.wetSideLevelM > input.geometry.wallHeightM ? "danger" : "success"}
              open
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField label="Wet-side level" unit="m" min={0} value={input.loadCase.wetSideLevelM} onChange={(value) => updateLoadCase("wetSideLevelM", value)} />
                <NumberField label="Dry-side level" unit="m" min={0} value={input.loadCase.drySideLevelM} onChange={(value) => updateLoadCase("drySideLevelM", value)} />
                <NumberField label="Retained-soil height" unit="m" min={0} value={input.loadCase.retainedSoilHeightM} onChange={(value) => updateLoadCase("retainedSoilHeightM", value)} />
                <NumberField label="Uniform surcharge" unit="kPa" min={0} value={input.loadCase.surchargeKPa} onChange={(value) => updateLoadCase("surchargeKPa", value)} />
                <NumberField label="Drainage efficiency" unit="0–1" min={0} max={1} step={0.05} value={input.loadCase.drainageEfficiency} onChange={(value) => updateLoadCase("drainageEfficiency", value)} />
              </div>
            </InputGroup>

            <InputGroup
              title="Materials and geotechnical basis"
              status={input.materials.allowableBearingKPa === null ? "Geotech missing" : "Complete"}
              tone={input.materials.allowableBearingKPa === null ? "warning" : "success"}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField label="Concrete unit weight" unit="kN/m³" min={0} value={input.materials.concreteUnitWeightKNM3} onChange={(value) => updateMaterial("concreteUnitWeightKNM3", value)} />
                <NumberField label="Soil unit weight" unit="kN/m³" min={0} value={input.materials.soilUnitWeightKNM3} onChange={(value) => updateMaterial("soilUnitWeightKNM3", value)} />
                <NumberField label="Base friction coefficient" min={0} max={1.5} value={input.materials.frictionCoefficient} onChange={(value) => updateMaterial("frictionCoefficient", value)} />
                <NumberField label="Soil friction angle" unit="degrees" min={0} max={60} value={input.materials.soilFrictionAngleDeg} onChange={(value) => updateMaterial("soilFrictionAngleDeg", value)} />
                <NumberField label="Allowable bearing pressure" unit="kPa" min={0} value={input.materials.allowableBearingKPa} help="Requires an engineer-approved geotechnical basis." onChange={(value) => updateMaterial("allowableBearingKPa", value)} />
              </div>
            </InputGroup>

            <InputGroup
              title="Foundation, scour, and cutoff"
              status={
                calculation.findings.some((f) => f.id === "putol-na-sheet-pile" || f.id === "toe-scour-undermining" && f.status === "fail")
                  ? "Scour / Cutoff alert"
                  : input.subsurface.hasSheetPileCutoff
                    ? "Cutoff configured"
                    : "No cutoff"
              }
              tone={
                calculation.findings.some((f) => (f.id === "putol-na-sheet-pile" || f.id === "toe-scour-undermining") && f.status === "fail")
                  ? "danger"
                  : "success"
              }
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField label="Footing embedment" unit="m" min={0} value={input.subsurface.footingEmbedmentM} onChange={(value) => updateSubsurface("footingEmbedmentM", value ?? 0)} />
                <NumberField label="As-built embedment" unit="m" min={0} value={input.subsurface.asBuiltFootingEmbedmentM} onChange={(value) => updateSubsurface("asBuiltFootingEmbedmentM", value)} />
                <NumberField label="Design scour depth" unit="m" min={0} value={input.subsurface.designScourDepthM} onChange={(value) => updateSubsurface("designScourDepthM", value ?? 0)} />
                <NumberField label="Planned sheet-pile length" unit="m" min={0} value={input.subsurface.plannedSheetPileLengthM} onChange={(value) => updateSubsurface("plannedSheetPileLengthM", value ?? 0)} />
                <NumberField label="As-driven sheet-pile length" unit="m" min={0} value={input.subsurface.asDrivenSheetPileLengthM} onChange={(value) => updateSubsurface("asDrivenSheetPileLengthM", value)} />
                <label className="text-sm font-semibold text-slate-700">
                  Foundation soil type
                  <select value={input.subsurface.foundationSoilType} onChange={(event) => updateSubsurface("foundationSoilType", event.target.value as FoundationSoilType)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-tide">
                    <option value="fine_sand">Fine sand</option>
                    <option value="coarse_sand">Coarse sand</option>
                    <option value="silt">Silt</option>
                    <option value="clay">Clay</option>
                    <option value="gravel">Gravel</option>
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={input.subsurface.hasSheetPileCutoff} onChange={(event) => updateSubsurface("hasSheetPileCutoff", event.target.checked)} className="size-4 accent-tide" />
                  Sheet-pile cutoff present
                </label>
              </div>
            </InputGroup>

            <InputGroup title="Acceptance criteria" status="Unapproved draft · locked" tone="warning">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField label="Minimum sliding FS" min={0} value={input.limits.minimumSlidingFs} readOnly onChange={() => {}} />
                <NumberField label="Minimum overturning FS" min={0} value={input.limits.minimumOverturningFs} readOnly onChange={() => {}} />
                <label className="flex items-center gap-3 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={input.limits.requireNoTension} disabled className="size-4 accent-tide" />
                  Require full base contact
                </label>
              </div>
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                {DRAFT_PHILIPPINE_FLOOD_WALL_PACK.name} · {DRAFT_PHILIPPINE_FLOOD_WALL_PACK.version}. These screening criteria are locked but remain release-blocking until independently reviewed and activated.
              </p>
            </InputGroup>

            <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-panel backdrop-blur">
              <div className="flex items-center gap-3">
                <span
                  className={cx(
                    "flex size-3 rounded-full",
                    inputConfirmed ? "bg-emerald-500" : "bg-amber-500",
                  )}
                />
                <p className="text-sm font-semibold text-slate-600">
                  Input state:{" "}
                  <strong className={inputConfirmed ? "text-emerald-800" : "text-amber-900"}>
                    {inputConfirmed ? "Confirmed in this session" : "Unconfirmed (pending engineer review)"}
                  </strong>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setInput(BLANK_WALL_INPUT); setInputConfirmed(false); setBlueprintParsed(false); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Clear all inputs</button>
                <button type="button" onClick={() => setInputConfirmed(true)} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700">Confirm current inputs</button>
              </div>
            </div>
          </section>
        )}

        {activeTab === "checks" && (
          <section id="panel-checks" role="tabpanel" aria-label="Engineering checks" className="space-y-6">
            <SectionTitle eyebrow="Deterministic evaluation" title="Engineering Checks" description="See the threshold first; expand a finding only when you need its equation or inputs." />
            <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
              <WallSectionDiagram input={input} />
              <div className="space-y-4">
                <FactorBar label="Sliding factor of safety" value={calculation.values.fsSliding} required={input.limits.minimumSlidingFs} />
                <FactorBar label="Overturning factor of safety" value={calculation.values.fsOverturning} required={input.limits.minimumOverturningFs} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Toe pressure" value={formatEngineeringNumber(calculation.values.toePressureKPa) + " kPa"} />
              <MetricCard label="Heel pressure" value={formatEngineeringNumber(calculation.values.heelPressureKPa) + " kPa"} />
              <MetricCard label="Net horizontal force" value={formatEngineeringNumber(calculation.values.netHorizontalForceKNM) + " kN/m"} />
              <MetricCard label="Uplift force" value={formatEngineeringNumber(calculation.values.upliftForceKNM) + " kN/m"} />
            </div>
            <div>
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-[var(--font-display)] text-2xl font-bold">Review findings</h3>
                <span className="text-xs font-semibold text-slate-500">{calculation.findings.length} implemented checks</span>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {calculation.findings.map((finding) => <FindingCard key={finding.id} finding={finding} />)}
              </div>
            </div>
            <details className="group rounded-2xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between p-5">
                <div>
                  <p className="font-[var(--font-display)] text-xl font-bold">Calculation trace</p>
                  <p className="mt-1 text-xs text-slate-500">Forces, moments, assumptions, and model limits</p>
                </div>
                <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
              </summary>
              <div className="border-t border-slate-200 p-5">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Total weight", calculation.values.totalWeightKNM, "kN/m"],
                    ["Effective vertical force", calculation.values.effectiveVerticalForceKNM, "kN/m"],
                    ["Wet-side water force", calculation.values.wetWaterForceKNM, "kN/m"],
                    ["Earth force", calculation.values.earthForceKNM, "kN/m"],
                    ["Resisting moment", calculation.values.resistingMomentKNMPerM, "kN·m/m"],
                    ["Overturning moment", calculation.values.overturningMomentKNMPerM, "kN·m/m"],
                    ["Effective embedment", calculation.values.effectiveEmbedmentM, "m"],
                    ["Scour deficit", calculation.values.scourDeficitM, "m"],
                    ["Lane creep ratio", calculation.values.laneCreepRatio, ""],
                  ].map(([label, value, unit]) => (
                    <div key={String(label)} className="border-t border-slate-200 pt-3">
                      <dt className="text-xs text-slate-500">{label}</dt>
                      <dd className="mt-1 font-bold">{formatEngineeringNumber(value as number)} <span className="text-xs font-normal text-slate-400">{unit}</span></dd>
                    </div>
                  ))}
                </dl>
                <ul className="mt-6 space-y-2 rounded-xl bg-slate-100 p-4 text-xs leading-5 text-slate-600">
                  {calculation.assumptions.map((assumption) => <li key={assumption}>• {assumption}</li>)}
                </ul>
              </div>
            </details>
          </section>
        )}

        {activeTab === "as-built" && (
          <section id="panel-as-built" role="tabpanel" aria-label="As-built verification">
            <AsBuiltVerificationPanel measurements={measurements} setMeasurements={setMeasurements} />
          </section>
        )}

        {activeTab === "findings" && (
          <section id="panel-findings" role="tabpanel" aria-label="Findings and report" className="space-y-6">
            <SectionTitle eyebrow="Action queue" title="Findings & Report" description="Calculation failures, missing information, and field-verification issues are consolidated here." />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Calculation failures" value={String(findingCounts.failed)} tone="text-red-700" />
              <MetricCard label="Incomplete checks" value={String(findingCounts.incomplete)} tone="text-violet-700" />
              <MetricCard label="Outside tolerance" value={String(comparisonSummary.outsideTolerance)} tone="text-red-700" />
              <MetricCard label="Awaiting evidence check" value={String(comparisonSummary.awaitingConfirmation)} tone="text-amber-700" />
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
              <div className="space-y-3">
                <h3 className="font-[var(--font-display)] text-xl font-bold">Open queue</h3>
                {calculation.findings.filter((finding) => finding.status !== "pass" && finding.status !== "not_applicable").map((finding) => (
                  <FindingCard key={finding.id} finding={finding} />
                ))}
                {openComparisonIssues.map((result) => (
                  <article key={result.characteristic.id} className={cx("rounded-2xl border p-4", result.status === "outside_tolerance" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900")}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{result.characteristic.name}</p>
                        <p className="mt-1 text-xs leading-5 opacity-80">{result.message}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide">
                        {result.status === "outside_tolerance" ? "Nonconformance" : "Evidence"}
                      </span>
                    </div>
                  </article>
                ))}
                {releaseGate.blockers
                  .filter((blocker) => blocker.category === "unsupported" || blocker.id === "inputs-unconfirmed")
                  .map((blocker) => (
                    <article key={blocker.id} className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-900">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">{blocker.title}</p>
                          <p className="mt-1 text-xs leading-5 opacity-80">{blocker.reason}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide">
                          {blocker.category}
                        </span>
                      </div>
                    </article>
                  ))}
              </div>
              <aside className="h-fit rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Report preview</p>
                <h3 className="mt-2 font-[var(--font-display)] text-2xl font-bold">{input.project.name}</h3>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-white/10 pb-3"><dt className="text-slate-400">Structure</dt><dd className="font-bold">{input.project.structureId}</dd></div>
                  <div className="flex justify-between gap-4 border-b border-white/10 pb-3"><dt className="text-slate-400">Plan revision</dt><dd className="font-bold">AFD-001 · R0</dd></div>
                  <div className="flex justify-between gap-4 border-b border-white/10 pb-3"><dt className="text-slate-400">As-built state</dt><dd className="font-bold">ASB-001</dd></div>
                  <div className="flex justify-between gap-4 border-b border-white/10 pb-3"><dt className="text-slate-400">Open items</dt><dd className="font-bold text-red-300">{openFindingCount}</dd></div>
                  <div className="flex justify-between gap-4 border-b border-white/10 pb-3"><dt className="text-slate-400">Engine</dt><dd className="font-mono text-xs font-bold">{reviewSnapshot.engineVersion}</dd></div>
                  <div className="flex justify-between gap-4 border-b border-white/10 pb-3"><dt className="text-slate-400">Input fingerprint</dt><dd className="font-mono text-xs font-bold">{reviewSnapshot.inputFingerprint}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-400">Release</dt><dd className="text-right font-bold">{releaseGate.label}</dd></div>
                </dl>
                <p className="mt-6 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
                  Unsigned demonstration preview. The downloadable draft is reproducible but cannot be issued or professionally approved while blockers remain.
                </p>
                <button type="button" onClick={downloadDraftReport} className="mt-3 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/15">
                  Download incomplete review draft
                </button>
              </aside>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
