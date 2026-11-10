"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  compareAsBuilt,
  formatStation,
  summarizeComparisons,
  type ComparisonResult,
  type FieldMeasurement,
} from "@/lib/verification/comparison";
import {
  DEFAULT_APPROVED_CHARACTERISTICS,
  DEFAULT_SEGMENTS,
} from "@/lib/verification/defaults";

type Filter = "all" | "issues" | "critical";

type Props = {
  measurements: FieldMeasurement[];
  setMeasurements: Dispatch<SetStateAction<FieldMeasurement[]>>;
};

const statusPresentation: Record<
  ComparisonResult["status"],
  { label: string; className: string; dot: string }
> = {
  within_tolerance: {
    label: "Within tolerance",
    className: "bg-emerald-100 text-emerald-900",
    dot: "bg-emerald-500",
  },
  outside_tolerance: {
    label: "Outside tolerance",
    className: "bg-red-100 text-red-900",
    dot: "bg-red-500",
  },
  unconfirmed: {
    label: "Awaiting check",
    className: "bg-amber-100 text-amber-900",
    dot: "bg-amber-500",
  },
  missing_measurement: {
    label: "Not measured",
    className: "bg-violet-100 text-violet-900",
    dot: "bg-violet-500",
  },
  invalid: {
    label: "Invalid input",
    className: "bg-red-100 text-red-900",
    dot: "bg-red-500",
  },
};

function formatValue(value: number | null, digits = 3) {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits).replace(/\.000$/, "");
}

function acceptedRange(result: ComparisonResult) {
  const { minimumAccepted, maximumAccepted, unit } = result.characteristic;
  if (minimumAccepted !== null && maximumAccepted !== null) {
    return `${formatValue(minimumAccepted)}–${formatValue(maximumAccepted)} ${unit}`;
  }
  if (minimumAccepted !== null) return `≥ ${formatValue(minimumAccepted)} ${unit}`;
  if (maximumAccepted !== null) return `≤ ${formatValue(maximumAccepted)} ${unit}`;
  return "No numerical range";
}

export default function AsBuiltVerificationPanel({
  measurements,
  setMeasurements,
}: Props) {
  const [selectedSegmentId, setSelectedSegmentId] = useState(DEFAULT_SEGMENTS[0].id);
  const [filter, setFilter] = useState<Filter>("all");

  const comparisons = useMemo(
    () => compareAsBuilt(DEFAULT_APPROVED_CHARACTERISTICS, measurements),
    [measurements],
  );
  const summary = useMemo(() => summarizeComparisons(comparisons), [comparisons]);
  const selectedSegment =
    DEFAULT_SEGMENTS.find((segment) => segment.id === selectedSegmentId) ??
    DEFAULT_SEGMENTS[0];

  const visibleComparisons = comparisons.filter((result) => {
    if (result.characteristic.segmentId !== selectedSegmentId) return false;
    if (filter === "critical") return result.characteristic.criticality === "critical";
    if (filter === "issues") return result.status !== "within_tolerance";
    return true;
  });

  function updateMeasurement(
    characteristicId: string,
    update: Partial<FieldMeasurement>,
  ) {
    setMeasurements((current) => {
      const existing = current.find(
        (measurement) => measurement.characteristicId === characteristicId,
      );
      if (!existing) {
        return [
          ...current,
          {
            characteristicId,
            measuredValue: null,
            uncertaintyPlusMinus: null,
            method: "",
            instrumentId: "",
            evidenceReference: "",
            measuredAt: "",
            confirmed: false,
            ...update,
          },
        ];
      }
      return current.map((measurement) =>
        measurement.characteristicId === characteristicId
          ? { ...measurement, ...update }
          : measurement,
      );
    });
  }

  return (
    <section aria-labelledby="as-built-title">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-tide">
            Field verification
          </p>
          <h2 id="as-built-title" className="mt-1 font-[var(--font-display)] text-3xl font-bold text-ink">
            Approved design versus as built
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Results use the adverse uncertainty bound and require checker-confirmed evidence.
          </p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 text-sm ${
          summary.releaseBlocked
            ? "border-red-200 bg-red-50 text-red-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}>
          <p className="font-bold">
            {summary.releaseBlocked ? "As-built evidence blocks release" : "As-built comparison complete"}
          </p>
          <p className="mt-1 text-xs">
            {summary.outsideTolerance} outside · {summary.awaitingConfirmation} awaiting · {summary.withinTolerance} within
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Approved baseline</p>
          <p className="mt-2 font-bold text-ink">AFD-001 · Revision 0</p>
          <p className="mt-1 text-xs text-slate-500">Frozen demonstration state</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">As-built working set</p>
          <p className="mt-2 font-bold text-ink">ASB-001 · Unsigned</p>
          <p className="mt-1 text-xs text-slate-500">Editable local measurements</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-tide">Structure segment</p>
          <p className="mt-1 font-bold text-ink">
            {selectedSegment.name} · {selectedSegment.panelReference}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            STA {formatStation(selectedSegment.startStationM)} to {formatStation(selectedSegment.endStationM)}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-slate-600">
            Segment
            <select
              value={selectedSegmentId}
              onChange={(event) => setSelectedSegmentId(event.target.value)}
              className="mt-1 block rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-tide focus:ring-4 focus:ring-tide/10"
            >
              {DEFAULT_SEGMENTS.map((segment) => (
                <option key={segment.id} value={segment.id}>{segment.name}</option>
              ))}
            </select>
          </label>
          <div className="flex rounded-xl border border-slate-300 bg-slate-50 p-1" aria-label="Verification filters">
            {(["all", "issues", "critical"] as Filter[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                aria-pressed={filter === option}
                className={`rounded-lg px-3 py-2 text-xs font-bold capitalize transition ${
                  filter === option ? "bg-ink text-white shadow-sm" : "text-slate-600 hover:bg-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {visibleComparisons.map((result) => {
          const measurement = result.measurement;
          const presentation = statusPresentation[result.status];
          return (
            <details key={result.characteristic.id} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
              <summary className="grid cursor-pointer list-none gap-3 p-4 sm:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(7rem,.65fr))_auto] sm:items-center sm:p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${presentation.dot}`} />
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{result.characteristic.name}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {result.characteristic.sourceReference} · {result.characteristic.criticality}
                    </p>
                  </div>
                </div>
                <div className="text-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Approved</p>
                  <p className="mt-1 font-bold text-ink">{formatValue(result.characteristic.designValue)} {result.characteristic.unit}</p>
                </div>
                <div className="text-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">As built</p>
                  <p className="mt-1 font-bold text-ink">
                    {formatValue(measurement?.measuredValue ?? null)}
                    {measurement?.uncertaintyPlusMinus !== null && measurement?.uncertaintyPlusMinus !== undefined
                      ? ` ±${formatValue(measurement.uncertaintyPlusMinus)}`
                      : ""} {result.characteristic.unit}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${presentation.className}`}>
                    {presentation.label}
                  </span>
                  <span className="text-slate-400 transition group-open:rotate-180" aria-hidden="true">⌄</span>
                </div>
              </summary>

              <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="grid gap-5 xl:grid-cols-[1fr_1.25fr]">
                  <div>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-white p-3">
                        <dt className="text-xs text-slate-500">Accepted range</dt>
                        <dd className="mt-1 font-bold text-ink">{acceptedRange(result)}</dd>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <dt className="text-xs text-slate-500">Signed variance</dt>
                        <dd className="mt-1 font-bold text-ink">{formatValue(result.signedVariance)} {result.characteristic.unit}</dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-xs leading-5 text-slate-600">{result.message}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-600">
                      Measured value
                      <input
                        aria-label={`${result.characteristic.name} measured value`}
                        type="number"
                        step="any"
                        value={measurement?.measuredValue ?? ""}
                        onChange={(event) => updateMeasurement(result.characteristic.id, {
                          measuredValue: event.target.value === "" ? null : Number(event.target.value),
                          confirmed: false,
                        })}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-tide"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                      Uncertainty ±
                      <input
                        aria-label={`${result.characteristic.name} uncertainty`}
                        type="number"
                        min="0"
                        step="any"
                        value={measurement?.uncertaintyPlusMinus ?? ""}
                        onChange={(event) => updateMeasurement(result.characteristic.id, {
                          uncertaintyPlusMinus: event.target.value === "" ? null : Number(event.target.value),
                          confirmed: false,
                        })}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-tide"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                      Measurement method
                      <input
                        value={measurement?.method ?? ""}
                        onChange={(event) => updateMeasurement(result.characteristic.id, { method: event.target.value, confirmed: false })}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-tide"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                      Instrument
                      <input
                        value={measurement?.instrumentId ?? ""}
                        onChange={(event) => updateMeasurement(result.characteristic.id, { instrumentId: event.target.value, confirmed: false })}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-tide"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                      Evidence reference
                      <input
                        value={measurement?.evidenceReference ?? ""}
                        onChange={(event) => updateMeasurement(result.characteristic.id, { evidenceReference: event.target.value, confirmed: false })}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-tide"
                      />
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={measurement?.confirmed ?? false}
                        onChange={(event) => updateMeasurement(result.characteristic.id, { confirmed: event.target.checked })}
                        className="size-4 accent-tide"
                      />
                      Checker confirmed the measurement and evidence
                    </label>
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </div>

      {visibleComparisons.length === 0 && (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-5 text-sm text-violet-900">
          No characteristics match this view. For an unconfigured segment, this is missing verification scope—not a pass.
        </div>
      )}
    </section>
  );
}
