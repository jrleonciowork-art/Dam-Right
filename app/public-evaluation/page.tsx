"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import LogoMark from "@/components/LogoMark";

type ProjectStatus =
  | "for_procurement"
  | "not_started"
  | "ongoing"
  | "completed"
  | "terminated"
  | "unknown";

type NationwideProject = {
  id: string;
  project_name: string;
  location: string;
  region: string | null;
  province: string | null;
  city: string | null;
  river_basin: string | null;
  project_type: string | null;
  budget: number | null;
  completion_date: string | null;
  historical_flood_depth_m: number | null;
  current_flood_depth_m: number | null;
  status: ProjectStatus;
  data_source: string | null;
  source_url: string | null;
};

type ProjectsResponse = {
  data: NationwideProject[];
  pagination: {
    total: number | null;
    returned: number;
    next_cursor: string | null;
    limit: number;
  };
};

type LocationOption = {
  code: string;
  name: string;
  level: string;
  parent_code: string | null;
  project_count: number | null;
  flood_project_count: number | null;
  source_url: string | null;
};

type LocationsResponse = {
  data: LocationOption[];
};

const comparisonProjects: NationwideProject[] = [
  {
    id: "comparison-marikina-river",
    project_name: "Marikina River Flood Control Improvement",
    location: "Marikina City, Metro Manila",
    region: "National Capital Region",
    province: "Metro Manila",
    city: "Marikina City",
    river_basin: "Marikina River",
    project_type: "River improvement and flood control",
    budget: 50_000_000,
    completion_date: "2024-06-15",
    historical_flood_depth_m: 2.5,
    current_flood_depth_m: 0.2,
    status: "completed",
    data_source: "Phase 1 sample monitoring dataset",
    source_url: null,
  },
  {
    id: "comparison-tullahan-river",
    project_name: "Tullahan River Flood Mitigation Works",
    location: "Malabon and Valenzuela, Metro Manila",
    region: "National Capital Region",
    province: "Metro Manila",
    city: "Malabon City",
    river_basin: "Tullahan River",
    project_type: "Riverwall and drainage improvement",
    budget: 1_200_000_000,
    completion_date: "2023-11-30",
    historical_flood_depth_m: 1.9,
    current_flood_depth_m: 0.4,
    status: "completed",
    data_source: "Phase 1 sample monitoring dataset",
    source_url: null,
  },
  {
    id: "comparison-pampanga-delta",
    project_name: "Pampanga Delta Flood Protection Works",
    location: "Pampanga, Central Luzon",
    region: "Central Luzon",
    province: "Pampanga",
    city: null,
    river_basin: "Pampanga River Basin",
    project_type: "Dike and river channel improvement",
    budget: 2_150_000_000,
    completion_date: "2022-08-18",
    historical_flood_depth_m: 2.8,
    current_flood_depth_m: 1.1,
    status: "completed",
    data_source: "Phase 1 sample monitoring dataset",
    source_url: null,
  },
  {
    id: "comparison-pasig-marikina",
    project_name: "Pasig–Marikina River Channel Improvement",
    location: "Pasig and Marikina, Metro Manila",
    region: "National Capital Region",
    province: "Metro Manila",
    city: "Pasig City",
    river_basin: "Pasig–Marikina River Basin",
    project_type: "River channel improvement",
    budget: 3_400_000_000,
    completion_date: "2024-02-29",
    historical_flood_depth_m: 2.2,
    current_flood_depth_m: 1.6,
    status: "completed",
    data_source: "Phase 1 sample monitoring dataset",
    source_url: null,
  },
];

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function getErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return fallback;
}

export default function PublicEvaluationPage() {
  const reduceMotion = useReducedMotion();
  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [directCities, setDirectCities] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [selectedRegionCode, setSelectedRegionCode] = useState("");
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [results, setResults] = useState<NationwideProject[]>([]);
  const [selectedProject, setSelectedProject] =
    useState<NationwideProject | null>(comparisonProjects[0]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadRegions() {
      try {
        const response = await fetch("/api/locations?level=regions", {
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload, "The official region list is unavailable."),
          );
        }
        setRegions((payload as LocationsResponse).data);
        setError(null);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingLocations(false);
      }
    }
    void loadRegions();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedRegionCode) {
      setProvinces([]);
      setDirectCities([]);
      setCities([]);
      return;
    }
    const controller = new AbortController();
    async function loadRegionChildren() {
      setIsLoadingLocations(true);
      setError(null);
      try {
        const [provinceResponse, cityResponse] = await Promise.all([
          fetch(
            `/api/locations?level=provinces&parent=${selectedRegionCode}`,
            { signal: controller.signal },
          ),
          fetch(`/api/locations?level=citymun&parent=${selectedRegionCode}`, {
            signal: controller.signal,
          }),
        ]);
        const provincePayload: unknown = await provinceResponse.json();
        const cityPayload: unknown = await cityResponse.json();
        if (!provinceResponse.ok || !cityResponse.ok) {
          throw new Error("The province and city lists could not be loaded.");
        }
        const nextProvinces = (provincePayload as LocationsResponse).data;
        const nextDirectCities = (cityPayload as LocationsResponse).data;
        setProvinces(nextProvinces);
        setDirectCities(nextDirectCities);
        setCities(nextDirectCities);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingLocations(false);
      }
    }
    void loadRegionChildren();
    return () => controller.abort();
  }, [selectedRegionCode]);

  useEffect(() => {
    if (!selectedProvinceCode) {
      setCities(directCities);
      return;
    }
    const controller = new AbortController();
    async function loadCities() {
      setIsLoadingLocations(true);
      try {
        const response = await fetch(
          `/api/locations?level=citymun&parent=${selectedProvinceCode}`,
          { signal: controller.signal },
        );
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error("The city and municipality list is unavailable.");
        setCities((payload as LocationsResponse).data);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingLocations(false);
      }
    }
    void loadCities();
    return () => controller.abort();
  }, [directCities, selectedProvinceCode]);

  useEffect(() => {
    const locationCode = selectedCityCode || selectedProvinceCode;
    if (!locationCode) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    const controller = new AbortController();
    async function loadProjects() {
      setIsSearching(true);
      setError(null);
      try {
        const params = new URLSearchParams({ mode: "search", limit: "100" });
        if (selectedProvinceCode) {
          params.set("province_psgc", selectedProvinceCode);
        }
        if (selectedCityCode) params.set("citymun_psgc", selectedCityCode);
        const response = await fetch(`/api/projects?${params}`, {
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload, "Projects for this location are unavailable."),
          );
        }
        const data = payload as ProjectsResponse;
        setResults(data.data);
        setSelectedProject(data.data[0] ?? null);
        setHasSearched(true);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== "AbortError") {
          setError(requestError.message);
          setResults([]);
          setSelectedProject(null);
          setHasSearched(true);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }
    void loadProjects();
    return () => controller.abort();
  }, [selectedCityCode, selectedProvinceCode]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f8f5] text-slate-950">
      <header className="border-b border-slate-900/10 bg-white/85 px-5 py-4 backdrop-blur-xl sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-3" aria-label="Dam Right home">
            <span className="grid size-9 place-items-center rounded-lg bg-slate-950 text-cyan-200 transition group-hover:bg-cyan-950">
              <LogoMark className="size-6" />
            </span>
            <span className="hidden font-[var(--font-display)] text-sm font-bold uppercase tracking-[0.18em] sm:block">
              Dam Right
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-900/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition hover:border-slate-900 hover:bg-slate-950 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-700"
          >
            <span aria-hidden="true">←</span>
            Back to Home
          </Link>
        </div>
      </header>

      <section className="relative border-b border-slate-900/10 px-5 py-12 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-40 top-0 size-[34rem] rounded-full bg-cyan-300/25 blur-3xl" />
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative mx-auto max-w-7xl"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-800">
            Nationwide public effectiveness checker
          </p>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_.7fr] lg:items-end">
            <h1 className="max-w-4xl text-balance font-[var(--font-display)] text-5xl font-semibold leading-[0.95] tracking-[-0.055em] sm:text-7xl">
              Find the flood project near you.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600 lg:justify-self-end">
              Pick your region, province, and city from official location lists.
              Then choose a flood-control project—no exact spelling required.
            </p>
          </div>

          <div className="mt-10 rounded-[2rem] border border-cyan-900/15 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,23,42,.1)] sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-800">
                  Choose your area, then choose the project
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  No spelling contest. The location list follows official PSA geographic codes.
                </p>
              </div>
              {(selectedRegionCode || selectedProvinceCode || selectedCityCode) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRegionCode("");
                    setSelectedProvinceCode("");
                    setSelectedCityCode("");
                    setResults([]);
                    setSelectedProject(comparisonProjects[0]);
                    setHasSearched(false);
                    setError(null);
                  }}
                  className="text-xs font-bold text-cyan-800 underline decoration-cyan-800/30 underline-offset-4"
                >
                  Start over
                </button>
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <LocationSelect
                step="01"
                label="Region"
                value={selectedRegionCode}
                options={regions}
                placeholder={isLoadingLocations ? "Loading regions…" : "Select a region"}
                disabled={isLoadingLocations && regions.length === 0}
                onChange={(code) => {
                  setSelectedRegionCode(code);
                  setSelectedProvinceCode("");
                  setSelectedCityCode("");
                  setResults([]);
                }}
              />
              <LocationSelect
                step="02"
                label="Province"
                value={selectedProvinceCode}
                options={provinces}
                placeholder={
                  !selectedRegionCode
                    ? "Select a region first"
                    : provinces.length === 0
                      ? "No province — choose a city"
                      : "Select a province"
                }
                disabled={!selectedRegionCode || provinces.length === 0}
                onChange={(code) => {
                  setSelectedProvinceCode(code);
                  setSelectedCityCode("");
                  setResults([]);
                }}
              />
              <LocationSelect
                step="03"
                label="City or municipality"
                value={selectedCityCode}
                options={cities}
                placeholder={
                  !selectedRegionCode
                    ? "Select a region first"
                    : cities.length === 0
                      ? "Select a province"
                      : "All cities / municipalities"
                }
                disabled={!selectedRegionCode || cities.length === 0}
                allowAll={Boolean(selectedProvinceCode)}
                onChange={setSelectedCityCode}
              />
              <label className="block">
                <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <span className="grid size-6 place-items-center rounded-full bg-cyan-100 text-cyan-900">04</span>
                  Flood-control project
                </span>
                <select
                  value={selectedProject?.id ?? ""}
                  disabled={results.length === 0 || isSearching}
                  onChange={(event) => {
                    const project = results.find((item) => item.id === event.target.value);
                    if (project) setSelectedProject(project);
                  }}
                  className="mt-2 min-h-14 w-full rounded-xl border border-slate-900/10 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-600/10 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  <option value="">
                    {isSearching
                      ? "Loading flood projects…"
                      : results.length === 0
                        ? "Choose a province or city first"
                        : "Select a project"}
                  </option>
                  {results.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.project_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-900/10 pt-4 text-xs text-slate-500">
              <span>
                Locations: PSA PSGC · Projects: DPWH Transparency Portal · Mirror: Love the Philippines / BetterGov
              </span>
              {results.length > 0 && (
                <strong className="text-cyan-900">
                  {results.length} flood-control projects loaded
                </strong>
              )}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-amber-900/15 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950"
            >
              <strong>Live data temporarily unavailable.</strong> {error} Try again in a
              moment; the comparison samples below still work.
            </div>
          )}
        </motion.div>
      </section>

      <section className="px-5 py-10 sm:px-10 sm:py-14">
        <ComparisonProjectList
          projects={comparisonProjects}
          selectedProject={selectedProject}
          onSelect={setSelectedProject}
        />

        {!selectedProject ? (
          <EmptyState hasSearched={hasSearched} isSearching={isSearching} />
        ) : (
          <ProjectEvaluation
            key={selectedProject.id}
            project={selectedProject}
            reduceMotion={Boolean(reduceMotion)}
          />
        )}

        {results.length > 0 && (
          <section className="mx-auto mt-8 max-w-7xl rounded-[2rem] border border-slate-900/10 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.06)] sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-800">
                  Matching projects
                </p>
                <h2 className="mt-2 font-[var(--font-display)] text-2xl font-semibold">
                  {results.length} loaded for this area
                </h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {results.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedProject(project)}
                  className={cx(
                    "rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-700",
                    selectedProject?.id === project.id
                      ? "border-cyan-700 bg-cyan-50"
                      : "border-slate-900/10 bg-slate-50",
                  )}
                >
                  <span className="block font-[var(--font-display)] text-sm font-semibold">
                    {project.project_name}
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-slate-500">
                    {project.location}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function ComparisonProjectList({
  projects,
  selectedProject,
  onSelect,
}: {
  projects: NationwideProject[];
  selectedProject: NationwideProject | null;
  onSelect: (project: NationwideProject) => void;
}) {
  return (
    <section className="mx-auto mb-8 max-w-7xl rounded-[2rem] border border-emerald-900/10 bg-emerald-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,.12)] sm:p-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">
            Projects with before-and-after comparisons
          </p>
          <h2 className="mt-3 max-w-3xl font-[var(--font-display)] text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Skip the paperwork. Pick a project with numbers you can compare.
          </h2>
        </div>
        <p className="max-w-xl text-xs leading-6 text-emerald-100/70 lg:text-right">
          Phase 1 sample monitoring values are used here to demonstrate the full
          comparison experience. Replace them with LGU or river-gauge records before
          calling a result officially verified.
        </p>
      </div>

      <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {projects.map((project) => {
          const before = project.historical_flood_depth_m ?? 0;
          const after = project.current_flood_depth_m ?? 0;
          const reduction = before - after;
          const improvement = Math.round(
            (reduction / Math.max(before, 0.01)) * 100,
          );
          const effective = reduction > 0 && improvement >= 50;
          const selected = selectedProject?.id === project.id;

          return (
            <button
              key={project.id}
              type="button"
              onClick={() => onSelect(project)}
              className={cx(
                "group rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300",
                selected
                  ? "border-emerald-300 bg-white text-slate-950"
                  : "border-white/15 bg-white/5 hover:border-white/35 hover:bg-white/10",
              )}
            >
              <span
                className={cx(
                  "inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em]",
                  effective
                    ? "bg-emerald-300 text-emerald-950"
                    : "bg-red-300 text-red-950",
                )}
              >
                {effective ? "Improved" : "Needs work"}
              </span>
              <span className="mt-4 block font-[var(--font-display)] text-base font-semibold leading-5">
                {project.project_name}
              </span>
              <span
                className={cx(
                  "mt-2 block text-xs",
                  selected ? "text-slate-500" : "text-white/55",
                )}
              >
                {project.location}
              </span>
              <span className="mt-5 flex items-end justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.12em]">
                  {before.toFixed(1)} m → {after.toFixed(1)} m
                </span>
                <span
                  className={cx(
                    "font-[var(--font-display)] text-2xl font-semibold",
                    selected ? "text-emerald-800" : "text-emerald-300",
                  )}
                >
                  {Math.max(0, improvement)}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function LocationSelect({
  step,
  label,
  placeholder,
  value,
  options,
  disabled,
  allowAll = false,
  onChange,
}: {
  step: string;
  label: string;
  placeholder: string;
  value: string;
  options: LocationOption[];
  disabled: boolean;
  allowAll?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
        <span className="grid size-6 place-items-center rounded-full bg-cyan-100 text-cyan-900">
          {step}
        </span>
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-2 min-h-14 w-full rounded-xl border border-slate-900/10 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-600/10 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        <option value="">{allowAll && options.length > 0 ? "All cities / municipalities" : placeholder}</option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
            {option.flood_project_count !== null
              ? ` (${option.flood_project_count} flood projects)`
              : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({
  hasSearched,
  isSearching,
}: {
  hasSearched: boolean;
  isSearching: boolean;
}) {
  return (
    <div className="mx-auto grid min-h-96 max-w-7xl place-items-center rounded-[2rem] border border-dashed border-slate-900/20 bg-white/60 px-6 text-center">
      <div className="max-w-xl">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-cyan-100 text-2xl text-cyan-900">
          ⌕
        </span>
        <h2 className="mt-5 font-[var(--font-display)] text-3xl font-semibold">
          {isSearching
            ? "Checking the nationwide records…"
            : hasSearched
              ? "No matching project found."
              : "Start with your city, river, or project name."}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {hasSearched
            ? "Try the whole province or choose a nearby city or municipality."
            : "Choose a location above, then pick a project to inspect its public record."}
        </p>
      </div>
    </div>
  );
}

function ProjectEvaluation({
  project,
  reduceMotion,
}: {
  project: NationwideProject;
  reduceMotion: boolean;
}) {
  const hasDepthData =
    project.historical_flood_depth_m !== null &&
    project.current_flood_depth_m !== null;

  if (!hasDepthData) {
    return (
      <section className="mx-auto max-w-7xl rounded-[2rem] border border-slate-900/10 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,.08)] sm:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">
          Effectiveness data not yet published
        </p>
        <h2 className="mt-3 max-w-4xl font-[var(--font-display)] text-4xl font-semibold tracking-[-0.04em]">
          {project.project_name}
        </h2>
        <p className="mt-2 text-sm text-slate-500">{project.location}</p>
        <div className="mt-8 rounded-2xl bg-amber-50 p-6 text-sm leading-7 text-amber-950">
          This project exists in the nationwide record, but its verified before-and-after
          flood depths are missing. A budget and completion date can prove that concrete
          was paid for; they cannot prove that somebody&apos;s home stayed dry.
        </div>
        <ProjectFacts project={project} />
      </section>
    );
  }

  const before = project.historical_flood_depth_m as number;
  const after = project.current_flood_depth_m as number;
  const reduction = before - after;
  const improvement = Math.round((reduction / Math.max(before, 0.01)) * 100);
  const isEffective = reduction > 0 && improvement >= 50;
  const chartMaximum = Math.max(before, after, 3);
  const verdict = isEffective
    ? "Effective. Your living room is dry."
    : "Ineffective. Money down the drain, get the boat.";
  const explanation = isEffective
    ? "The recorded water level dropped by " +
      Math.max(0, reduction).toFixed(1) +
      " meters. That is the difference between floodwater entering a home and staying outside where it belongs."
    : "The latest water level is still too close to the old flood level. Residents would see little relief, even if the project is marked complete on paper.";

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.25fr_.75fr]"
    >
      <article className="overflow-hidden rounded-[2rem] border border-slate-900/10 bg-white shadow-[0_24px_70px_rgba(15,23,42,.08)]">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-900/10 px-6 py-6 sm:flex-row sm:items-end sm:px-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-800">
              Before vs. after
            </p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold">
              {project.project_name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{project.location}</p>
          </div>
          <StatusBadge status={project.status} />
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <FloodLevelCard
            label="Before the project"
            depth={before}
            heightPercent={(before / chartMaximum) * 100}
            variant="before"
            badge="Inside the house"
            reduceMotion={reduceMotion}
          />
          <FloodLevelCard
            label="After the project"
            depth={after}
            heightPercent={(after / chartMaximum) * 100}
            variant={isEffective ? "after" : "failed"}
            badge={isEffective ? "Below the doorstep" : "Still inside the house"}
            reduceMotion={reduceMotion}
          />
        </div>

        <ProjectFacts project={project} />
      </article>

      <aside
        className={cx(
          "flex min-h-[35rem] flex-col justify-between rounded-[2rem] border p-7 text-white shadow-[0_24px_70px_rgba(15,23,42,.12)] sm:p-9",
          isEffective
            ? "border-emerald-900/15 bg-emerald-950"
            : "border-red-950/20 bg-[#5d1719]",
        )}
      >
        <div>
          <div className="flex items-center gap-3">
            <span
              className={cx(
                "size-3 rounded-full",
                isEffective ? "bg-emerald-300" : "bg-red-300",
              )}
            />
            <p
              className={cx(
                "text-[10px] font-black uppercase tracking-[0.28em]",
                isEffective ? "text-emerald-200" : "text-red-100",
              )}
            >
              Effectiveness verdict
            </p>
          </div>
          <h2 className="mt-9 text-balance font-[var(--font-display)] text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">
            {verdict}
          </h2>
          <p className="mt-5 text-sm leading-6 text-white/70">
            Water moved from {before.toFixed(1)} m to {after.toFixed(1)} m—a{" "}
            {improvement}% change.
          </p>
        </div>

        <div className="mt-12 border-t border-white/15 pt-7">
          <p
            className={cx(
              "text-[10px] font-bold uppercase tracking-[0.22em]",
              isEffective ? "text-emerald-300" : "text-red-200",
            )}
          >
            Plain-English test
          </p>
          <p className="mt-3 text-sm leading-7 text-white/85">{explanation}</p>
        </div>
      </aside>
    </motion.div>
  );
}

function FloodLevelCard({
  label,
  depth,
  heightPercent,
  variant,
  badge,
  reduceMotion,
}: {
  label: string;
  depth: number;
  heightPercent: number;
  variant: "before" | "after" | "failed";
  badge: string;
  reduceMotion: boolean;
}) {
  const isBefore = variant === "before";
  const isFailed = variant === "failed";
  const displayedHeight = Math.min(100, Math.max(heightPercent, 4)) + "%";

  return (
    <section className="rounded-3xl border border-slate-900/10 bg-[#fbfcfc] p-4 sm:p-5">
      <div className="flex min-h-24 flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            {label}
          </p>
          <p className="mt-1 font-[var(--font-display)] text-4xl font-semibold tracking-[-0.04em]">
            {depth.toFixed(1)} m
          </p>
        </div>
        <span
          className={cx(
            "w-fit rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em]",
            isBefore || isFailed
              ? "bg-red-100 text-red-800"
              : "bg-emerald-100 text-emerald-800",
          )}
        >
          {badge}
        </span>
      </div>

      <div className="relative mt-4 h-72 overflow-hidden rounded-2xl border border-slate-900/10 bg-[linear-gradient(#eef2f3_1px,transparent_1px)] [background-size:100%_25%]">
        {[3, 2, 1].map((mark) => (
          <span
            key={mark}
            className="absolute left-3 z-10 -translate-y-1/2 text-[9px] font-bold text-slate-400"
            style={{ bottom: (mark / 3) * 100 - 2 + "%" }}
          >
            {mark} m
          </span>
        ))}
        <motion.div
          initial={reduceMotion ? { height: displayedHeight } : { height: 0 }}
          animate={{ height: displayedHeight }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          className={cx(
            "absolute inset-x-0 bottom-0",
            isBefore
              ? "bg-gradient-to-t from-red-700 to-orange-400"
              : "bg-gradient-to-t from-cyan-800 to-cyan-300",
          )}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-white/65" />
          <div className="absolute inset-x-0 top-2 text-center text-[9px] font-black uppercase tracking-[0.18em] text-white/90">
            Water line
          </div>
        </motion.div>
        <div className="absolute inset-x-0 bottom-[16%] z-20 border-t-2 border-dashed border-slate-700/50">
          <span className="absolute right-3 -top-6 rounded bg-white/80 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600 backdrop-blur">
            Doorstep
          </span>
        </div>
      </div>
    </section>
  );
}

function ProjectFacts({ project }: { project: NationwideProject }) {
  const currency = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  });

  return (
    <div className="border-t border-slate-900/10">
      <div className="grid sm:grid-cols-3">
        <Fact
          label="Project budget"
          value={project.budget === null ? "Not published" : currency.format(project.budget)}
        />
        <Fact
          label="Completion date"
          value={project.completion_date ?? "Not published"}
        />
        <Fact
          label="River or basin"
          value={project.river_basin ?? "Not identified"}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-900/10 bg-slate-50 px-6 py-4 text-xs text-slate-500 sm:px-8">
        <span>
          Source: {project.data_source ?? "Public project record"}
        </span>
        {project.source_url && (
          <a
            href={project.source_url}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-cyan-800 underline decoration-cyan-800/30 underline-offset-4"
          >
            Open cited government record ↗
          </a>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-slate-900/10 px-6 py-5 not-last:border-b sm:px-8 sm:not-last:border-r sm:not-last:border-b-0">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-[var(--font-display)] text-lg font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const label = status.replaceAll("_", " ");
  return (
    <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-xs font-bold capitalize text-slate-600">
      {label}
    </span>
  );
}
