"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import type {
  BlueprintParseResult,
  ExtractedBlueprintData,
} from "@/lib/blueprint/types";

type BlueprintIngestionProps = {
  onApplyBaseline?: (data: ExtractedBlueprintData) => void;
  className?: string;
};

export default function BlueprintIngestion({
  onApplyBaseline,
  className = "",
}: BlueprintIngestionProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [parseResult, setParseResult] = useState<BlueprintParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Editable local state for the extracted data
  const [editableData, setEditableData] = useState<ExtractedBlueprintData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setParseResult(null);
      setError(null);
      setAcknowledged(false);
      setSavedSuccess(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setParseResult(null);
      setError(null);
      setAcknowledged(false);
      setSavedSuccess(false);
    }
  };


  const runParsing = async (fileToParse?: File) => {
    const targetFile = fileToParse || file;
    if (!targetFile) {
      setError("Please select or drop a structural PDF blueprint first.");
      return;
    }

    setLoading(true);
    setError(null);
    setAcknowledged(false);
    setSavedSuccess(false);

    try {
      setLoadingStep("1/3 Ingesting sheet geometry and CAD vector entities...");
      await new Promise((r) => setTimeout(r, 600));

      setLoadingStep("2/3 Extracting f'c, rebar details, and flood hydrology criteria...");

      const formData = new FormData();
      formData.append("file", targetFile);

      const res = await fetch("/api/parse-blueprint", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error (${res.status})`);
      }

      setLoadingStep("3/3 Evaluating NSCP 2015, ACI 318, and DPWH stability compliance...");
      await new Promise((r) => setTimeout(r, 400));

      const data: BlueprintParseResult = await res.json();
      setParseResult(data);
      setEditableData(JSON.parse(JSON.stringify(data.extractedData)));
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "An unexpected error occurred during parsing.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleDimensionChange = (key: keyof ExtractedBlueprintData["dimensions"], value: string) => {
    if (!editableData) return;
    const num = value === "" ? null : Number(value);
    setEditableData({
      ...editableData,
      dimensions: {
        ...editableData.dimensions,
        [key]: Number.isNaN(num) ? null : num,
      },
    });
    setAcknowledged(false);
    setSavedSuccess(false);
  };

  const handleMaterialChange = (key: keyof ExtractedBlueprintData["materials"], value: string) => {
    if (!editableData) return;
    const num = value === "" ? null : Number(value);
    setEditableData({
      ...editableData,
      materials: {
        ...editableData.materials,
        [key]: Number.isNaN(num) ? null : num,
      },
    });
    setAcknowledged(false);
    setSavedSuccess(false);
  };

  const handleHydrologyChange = (key: keyof ExtractedBlueprintData["hydrologyGeotech"], value: string) => {
    if (!editableData) return;
    const num = value === "" ? null : Number(value);
    setEditableData({
      ...editableData,
      hydrologyGeotech: {
        ...editableData.hydrologyGeotech,
        [key]: Number.isNaN(num) ? null : num,
      },
    });
    setAcknowledged(false);
    setSavedSuccess(false);
  };

  const handleSaveBaseline = () => {
    if (!acknowledged || !editableData) return;
    setSavedSuccess(true);
    if (onApplyBaseline) {
      onApplyBaseline(editableData);
    }
  };

  return (
    <section className={`rounded-3xl border border-slate-300 bg-white p-6 shadow-panel ${className}`}>
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-900">
              AI Vision &amp; Plan Checker
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
              PDF / CAD Ingestion
            </span>
          </div>
          <h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold text-ink">
            Blueprint Ingestion &amp; Code Compliance
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload structural drawings to extract design parameters, detect missing data, and cross-reference NSCP / ACI / DPWH standards.
          </p>
        </div>

      </div>

      {/* Drag & Drop Zone */}
      <div className="mt-6">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
            isDragging
              ? "border-tide bg-cyan-50/60"
              : file
                ? "border-emerald-300 bg-emerald-50/20"
                : "border-slate-300 bg-slate-50/80 hover:border-tide hover:bg-cyan-50/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            onChange={handleFileChange}
            className="sr-only"
          />

          <div className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200">
            <svg
              className={`size-7 ${file ? "text-emerald-600" : "text-tide"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>

          <p className="mt-3 text-sm font-bold text-ink">
            {file ? file.name : "Drop structural blueprint PDF or click to browse"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${file.type || "PDF drawing"}`
              : "Supports multi-sheet PDF plans, Section & Detail scans (PDF, PNG, JPEG up to 25MB)"}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              General Notes
            </span>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              Cross Sections A-A
            </span>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              Rebar Schedules
            </span>
          </div>
        </div>



        {/* Action Button */}
        {file && !loading && !parseResult && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => runParsing()}
              className="rounded-xl bg-ink px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              Parse Blueprint &amp; Run Compliance Checks →
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mt-6 rounded-2xl border border-cyan-300 bg-cyan-50/50 p-6 text-center">
          <div className="inline-block size-8 animate-spin rounded-full border-4 border-tide border-t-transparent" />
          <h3 className="mt-3 text-base font-bold text-ink">AI analyzing structural plans...</h3>
          <p className="mt-1 text-xs font-semibold text-tide">{loadingStep}</p>
          <p className="mt-2 text-xs text-slate-500">
            Cross-referencing dimensional chain closure, concrete cover, and stability equilibrium.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-bold">Extraction Error</p>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      )}

      {/* Extracted Data & Compliance Results */}
      {parseResult && editableData && (
        <div className="mt-8 space-y-7 border-t border-slate-200 pt-7">
          {/* Metadata & Engine Banner */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Extracted Document Info
              </p>
              <h3 className="text-base font-bold text-ink">
                {editableData.metadata.sheetNumber} · {editableData.metadata.sheetTitle}
              </h3>
              <p className="text-xs text-slate-600">
                {editableData.metadata.projectName} ({editableData.metadata.revision}) · {editableData.metadata.engineerOfRecord}
              </p>
            </div>
            <div className="text-right sm:self-center">
              <span className="rounded-full bg-slate-200 px-3 py-1 text-[10px] font-bold text-slate-700">
                {parseResult.aiProvider}
              </span>
              <p className="mt-1 text-[10px] text-slate-400">
                Parsed {new Date(parseResult.parsedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Compliance & Anomaly Summary Counters */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className={`rounded-2xl border p-4 ${parseResult.summary.criticalMissing > 0 ? "border-amber-300 bg-amber-50 text-amber-950" : "border-slate-200 bg-white"}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missing Data Flags</p>
              <p className={`mt-2 font-[var(--font-display)] text-3xl font-bold ${parseResult.summary.criticalMissing > 0 ? "text-amber-700" : "text-slate-800"}`}>
                {parseResult.summary.totalMissing}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {parseResult.summary.criticalMissing} critical calculation blockers
              </p>
            </div>

            <div className={`rounded-2xl border p-4 ${parseResult.summary.violations > 0 ? "border-red-300 bg-red-50 text-red-950" : "border-slate-200 bg-white"}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Code Violations</p>
              <p className={`mt-2 font-[var(--font-display)] text-3xl font-bold ${parseResult.summary.violations > 0 ? "text-red-700" : "text-emerald-700"}`}>
                {parseResult.summary.violations}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                NSCP 2015 / ACI 318 / DPWH
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Code Warnings</p>
              <p className="mt-2 font-[var(--font-display)] text-3xl font-bold text-amber-600">
                {parseResult.summary.warnings}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Durability / Slenderness advisories
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Individual Checks Satisfied</p>
              <p className="mt-2 font-[var(--font-display)] text-3xl font-bold text-emerald-700">
                {parseResult.summary.passed}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {parseResult.summary.incomplete > 0
                  ? `${parseResult.summary.incomplete} checks not evaluated`
                  : "Subject to overall release gate"}
              </p>
            </div>
          </div>

          {/* Section 1: Missing Data Flags */}
          {parseResult.missingDataFlags.length > 0 && (
            <div className="rounded-3xl border border-amber-300 bg-amber-50/40 p-6">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-white">
                  !
                </span>
                <h3 className="font-[var(--font-display)] text-lg font-bold text-amber-950">
                  Missing Data Detection ({parseResult.missingDataFlags.length} Items)
                </h3>
              </div>
              <p className="mt-1 text-xs leading-5 text-amber-900/80">
                The blueprint does not provide explicit values for these critical engineering parameters. Hydrostatic stability or structural capacity calculations are compromised until confirmed.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {parseResult.missingDataFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className="rounded-2xl border border-amber-300/80 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-amber-950">{flag.parameter}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${flag.severity === "critical" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                        {flag.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-700">{flag.message}</p>
                    <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] leading-4 text-slate-500">
                      <strong>Engineering Impact:</strong> {flag.engineeringImpact}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Code Compliance Report */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-[var(--font-display)] text-lg font-bold text-ink">
              Structural Code Compliance Report
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Evaluated against National Structural Code of the Philippines (NSCP 2015), ACI 318-19, and DPWH Flood Control Design Guidelines.
            </p>

            <div className="mt-5 space-y-3">
              {parseResult.complianceReport.map((finding) => (
                <div
                  key={finding.id}
                  className={`rounded-2xl border p-4.5 transition ${
                    finding.status === "violation"
                      ? "border-red-300 bg-red-50/70 text-red-950"
                      : finding.status === "warning"
                        ? "border-amber-300 bg-amber-50/70 text-amber-950"
                        : finding.status === "insufficient_information" || finding.status === "not_evaluated"
                          ? "border-violet-300 bg-violet-50/70 text-violet-950"
                        : "border-slate-200 bg-slate-50/60 text-slate-900"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                          {finding.codeStandard}
                        </span>
                        <span className="text-[10px] font-semibold opacity-40">·</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                          {finding.category}
                        </span>
                      </div>
                      <h4 className="mt-1 text-sm font-bold">{finding.title}</h4>
                      <p className="mt-1 text-xs leading-5 opacity-90">{finding.description}</p>
                    </div>

                    <span
                      className={`self-start shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                        finding.status === "violation"
                          ? "bg-red-600 text-white"
                          : finding.status === "warning"
                            ? "bg-amber-500 text-white"
                            : finding.status === "insufficient_information" || finding.status === "not_evaluated"
                              ? "bg-violet-600 text-white"
                            : "bg-emerald-600 text-white"
                      }`}
                    >
                      {finding.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-current/15 pt-2 text-xs">
                    <div>
                      <span className="text-[11px] opacity-70">Drawing Value: </span>
                      <strong className="font-semibold">{finding.demand}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] opacity-70">Code Requirement: </span>
                      <strong className="font-semibold">{finding.limit}</strong>
                    </div>
                  </div>

                  {finding.recommendation && (
                    <p className="mt-2 text-xs font-semibold text-tide">
                      💡 <strong>Recommendation:</strong> {finding.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Data Review Panel (Editable Auto-Filled Fields) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-[var(--font-display)] text-lg font-bold text-ink">
                  Data Review Panel (Auto-Filled Extracted Parameters)
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Verify or calibrate numerical dimensions extracted from the blueprint before confirming baseline.
                </p>
              </div>
              <span className="rounded-lg bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-tide">
                Editable Fields
              </span>
            </div>

            {/* Geometry Grid */}
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                01 · Structural Geometry
              </h4>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Wall Height (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editableData.dimensions.wallHeightM ?? ""}
                    onChange={(e) => handleDimensionChange("wallHeightM", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-tide"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Stem Thickness (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editableData.dimensions.stemThicknessM ?? ""}
                    onChange={(e) => handleDimensionChange("stemThicknessM", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-tide"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Base Width (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editableData.dimensions.baseWidthM ?? ""}
                    onChange={(e) => handleDimensionChange("baseWidthM", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-tide"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Footing Thickness (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editableData.dimensions.baseThicknessM ?? ""}
                    onChange={(e) => handleDimensionChange("baseThicknessM", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-tide"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Toe Width (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editableData.dimensions.toeWidthM ?? ""}
                    onChange={(e) => handleDimensionChange("toeWidthM", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-tide"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Heel Width (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editableData.dimensions.heelWidthM ?? ""}
                    onChange={(e) => handleDimensionChange("heelWidthM", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-tide"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Crest Elevation (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editableData.dimensions.crestElevationM ?? ""}
                    onChange={(e) => handleDimensionChange("crestElevationM", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-tide"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Embedment Depth (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editableData.dimensions.embedmentDepthM ?? ""}
                    onChange={(e) => handleDimensionChange("embedmentDepthM", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-tide"
                  />
                </label>
              </div>
            </div>

            {/* Materials Grid */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                02 · Materials &amp; Reinforcement
              </h4>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Concrete Strength f&apos;c (MPa)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={editableData.materials.concreteStrengthMPa ?? ""}
                    onChange={(e) => handleMaterialChange("concreteStrengthMPa", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-tide"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Clear Concrete Cover (mm)</span>
                  <input
                    type="number"
                    step="1"
                    value={editableData.materials.concreteCoverMm ?? ""}
                    onChange={(e) => handleMaterialChange("concreteCoverMm", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-tide"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Steel Yield fy (MPa)</span>
                  <input
                    type="number"
                    step="1"
                    value={editableData.materials.rebarYieldStrengthMPa ?? ""}
                    onChange={(e) => handleMaterialChange("rebarYieldStrengthMPa", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-tide"
                  />
                </label>
              </div>
            </div>

            {/* Hydrology & Soil Grid */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                03 · Hydrology &amp; Geotechnical Parameters
              </h4>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Design Flood Head (m)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={editableData.hydrologyGeotech.wetSideLevelM ?? ""}
                    onChange={(e) => handleHydrologyChange("wetSideLevelM", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-tide"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Base Friction Coefficient (μ)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editableData.hydrologyGeotech.frictionCoefficient ?? ""}
                    onChange={(e) => handleHydrologyChange("frictionCoefficient", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-tide"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Backfill Friction Angle (deg)</span>
                  <input
                    type="number"
                    step="1"
                    value={editableData.hydrologyGeotech.soilFrictionAngleDeg ?? ""}
                    onChange={(e) => handleHydrologyChange("soilFrictionAngleDeg", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-tide"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Manual Acknowledgment & Baseline Commit Gate */}
          <div className="rounded-3xl border border-slate-300 bg-slate-900 p-6 text-white shadow-panel">
            <h4 className="text-sm font-bold uppercase tracking-wider text-cyan-300">
              Civil Engineering Quality &amp; Approval Gate
            </h4>
            <p className="mt-1 text-xs text-slate-300">
              AI plan extraction is decision support. Public works standards require a licensed engineer to verify extracted values against source plans before locking the baseline.
            </p>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-white/10 p-4 transition hover:bg-white/15">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 size-4 accent-tide shrink-0"
              />
              <span className="text-xs leading-5">
                <strong>I have reviewed the AI-extracted plan parameters</strong>, acknowledged all missing data warnings and code compliance issues, and verified these values against the drawing sheets.
              </span>
            </label>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSaveBaseline}
                disabled={!acknowledged}
                className={`rounded-xl px-6 py-2.5 text-sm font-bold transition ${
                  acknowledged
                    ? "bg-cyan-300 text-slate-950 shadow-md hover:bg-white cursor-pointer"
                    : "bg-white/20 text-white/50 cursor-not-allowed"
                }`}
              >
                Save As-Planned Baseline to System
              </button>

              {savedSuccess && (
                <span className="rounded-xl bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                  ✓ As-Planned Baseline Saved &amp; Applied to Workspace!
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
