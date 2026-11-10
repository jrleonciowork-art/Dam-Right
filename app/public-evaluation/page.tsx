"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

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

type Filters = {
  region: string;
  province: string;
  city: string;
  river_basin: string;
};

const emptyFilters: Filters = {
  region: "",
  province: "",
  city: "",
  river_basin: "",
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

function buildParams(
  query: string,
  filters: Filters,
  mode: "search" | "suggest",
  cursor?: string | null,
) {
  const params = new URLSearchParams({
    mode,
    limit: mode === "suggest" ? "8" : "20",
  });
  if (query.trim()) params.set("q", query.trim());
  if (filters.region.trim()) params.set("region", filters.region.trim());
  if (filters.province.trim()) params.set("province", filters.province.trim());
  if (filters.city.trim()) params.set("city", filters.city.trim());
  if (filters.river_basin.trim()) {
    params.set("river_basin", filters.river_basin.trim());
  }
  if (cursor) params.set("cursor", cursor);
  return params;
}

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
  const listboxId = useId();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [suggestions, setSuggestions] = useState<NationwideProject[]>([]);
  const [results, setResults] = useState<NationwideProject[]>([]);
  const [selectedProject, setSelectedProject] =
    useState<NationwideProject | null>(comparisonProjects[0]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const hasFilters = Object.values(filters).some((value) => value.trim());

  useEffect(() => {
    if (query.trim().length < 2 && !hasFilters) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const params = buildParams(query, filters, "suggest");
        const response = await fetch("/api/projects?" + params.toString(), {
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload, "Project suggestions are temporarily unavailable."),
          );
        }
        const data = payload as ProjectsResponse;
        setSuggestions(data.data);
        setSuggestionsOpen(data.data.length > 0);
        setActiveSuggestion(-1);
        setError(null);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== "AbortError") {
          setSuggestions([]);
          setSuggestionsOpen(false);
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsSuggesting(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filters, hasFilters, query]);

  useEffect(() => {
    function closeSuggestions(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", closeSuggestions);
    return () => document.removeEventListener("mousedown", closeSuggestions);
  }, []);

  async function searchProjects(cursor?: string | null, append = false) {
    setIsSearching(true);
    setError(null);
    setSuggestionsOpen(false);

    try {
      const params = buildParams(query, filters, "search", cursor);
      const response = await fetch("/api/projects?" + params.toString());
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "The nationwide project search is unavailable."),
        );
      }

      const data = payload as ProjectsResponse;
      setResults((current) => (append ? [...current, ...data.data] : data.data));
      setNextCursor(data.pagination.next_cursor);
      setTotal(data.pagination.total);
      setHasSearched(true);

      if (!append && data.data.length > 0) {
        setSelectedProject(data.data[0]);
      } else if (!append) {
        setSelectedProject(null);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The nationwide project search is unavailable.",
      );
      if (!append) {
        setResults([]);
        setSelectedProject(null);
        setHasSearched(true);
      }
    } finally {
      setIsSearching(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void searchProjects();
  }

  function chooseProject(project: NationwideProject) {
    setSelectedProject(project);
    setQuery(project.project_name);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
  }

  function handleSearchKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (!suggestionsOpen || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((current) =>
        current >= suggestions.length - 1 ? 0 : current + 1,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      chooseProject(suggestions[activeSuggestion]);
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f8f5] text-slate-950">
      <header className="border-b border-slate-900/10 bg-white/85 px-5 py-4 backdrop-blur-xl sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-3" aria-label="Dam Right home">
            <span className="grid size-9 place-items-center bg-slate-950 font-[var(--font-display)] text-sm font-black text-cyan-200 transition group-hover:bg-cyan-950">
              DR
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
              Search by street, city, river, province, or project name. We turn
              official project records into an answer people can actually use.
            </p>
          </div>

          <form
            onSubmit={submitSearch}
            className="mt-10 rounded-[2rem] border border-cyan-900/15 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,23,42,.1)] sm:p-6"
          >
            <div ref={searchContainerRef} className="relative">
              <label
                htmlFor="nationwide-project-search"
                className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-800"
              >
                Search all Philippine flood-control projects
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl text-cyan-800"
                  >
                    ⌕
                  </span>
                  <input
                    id="nationwide-project-search"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={suggestionsOpen}
                    aria-controls={listboxId}
                    aria-activedescendant={
                      activeSuggestion >= 0
                        ? listboxId + "-option-" + activeSuggestion
                        : undefined
                    }
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onFocus={() =>
                      suggestions.length > 0 && setSuggestionsOpen(true)
                    }
                    onKeyDown={handleSearchKeys}
                    placeholder="Try “Marikina River”, “Pampanga”, or your city"
                    className="min-h-16 w-full rounded-2xl border border-slate-900/15 bg-[#f7fbfa] py-4 pl-14 pr-12 font-[var(--font-display)] text-base font-semibold outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-cyan-700 focus:border-cyan-700 focus:ring-4 focus:ring-cyan-600/10"
                  />
                  {isSuggesting && (
                    <span className="absolute right-5 top-1/2 size-5 -translate-y-1/2 animate-spin rounded-full border-2 border-cyan-700 border-t-transparent" />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="min-h-16 rounded-2xl bg-slate-950 px-7 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-cyan-900 disabled:cursor-wait disabled:opacity-60 sm:min-w-40"
                >
                  {isSearching ? "Searching…" : "Search projects"}
                </button>
              </div>

              <AnimatePresence>
                {suggestionsOpen && suggestions.length > 0 && (
                  <motion.ul
                    id={listboxId}
                    role="listbox"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute inset-x-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-slate-900/10 bg-white p-2 shadow-[0_25px_80px_rgba(15,23,42,.18)] sm:right-44"
                  >
                    {suggestions.map((project, index) => (
                      <li
                        key={project.id}
                        id={listboxId + "-option-" + index}
                        role="option"
                        aria-selected={activeSuggestion === index}
                      >
                        <button
                          type="button"
                          onMouseEnter={() => setActiveSuggestion(index)}
                          onClick={() => chooseProject(project)}
                          className={cx(
                            "w-full rounded-xl px-4 py-3 text-left transition",
                            activeSuggestion === index
                              ? "bg-cyan-50"
                              : "hover:bg-slate-50",
                          )}
                        >
                          <span className="block font-[var(--font-display)] text-sm font-semibold">
                            {project.project_name}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {project.location}
                            {project.river_basin
                              ? " · " + project.river_basin
                              : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FilterInput
                label="Region"
                placeholder="e.g. Central Luzon"
                value={filters.region}
                onChange={(value) =>
                  setFilters((current) => ({ ...current, region: value }))
                }
              />
              <FilterInput
                label="Province"
                placeholder="e.g. Pampanga"
                value={filters.province}
                onChange={(value) =>
                  setFilters((current) => ({ ...current, province: value }))
                }
              />
              <FilterInput
                label="City or municipality"
                placeholder="e.g. Marikina City"
                value={filters.city}
                onChange={(value) =>
                  setFilters((current) => ({ ...current, city: value }))
                }
              />
              <FilterInput
                label="River or basin"
                placeholder="e.g. Pampanga Delta"
                value={filters.river_basin}
                onChange={(value) =>
                  setFilters((current) => ({ ...current, river_basin: value }))
                }
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Results come from the configured nationwide project data service.
              </span>
              {(query || hasFilters) && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFilters(emptyFilters);
                    setSuggestions([]);
                    setResults([]);
                    setSelectedProject(null);
                    setHasSearched(false);
                    setError(null);
                  }}
                  className="font-bold text-cyan-800 underline decoration-cyan-800/30 underline-offset-4"
                >
                  Clear search
                </button>
              )}
            </div>
          </form>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-amber-900/15 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950"
            >
              <strong>Live data unavailable.</strong> {error} This dashboard does
              not substitute made-up projects when the official data connection is
              missing.
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
                  {total === null
                    ? results.length + " loaded"
                    : total.toLocaleString("en-PH") + " found"}
                </h2>
              </div>
              {nextCursor && (
                <button
                  type="button"
                  disabled={isSearching}
                  onClick={() => void searchProjects(nextCursor, true)}
                  className="rounded-full border border-slate-900/15 px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] transition hover:bg-slate-950 hover:text-white disabled:opacity-50"
                >
                  {isSearching ? "Loading…" : "Load more"}
                </button>
              )}
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

function FilterInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-11 w-full rounded-xl border border-slate-900/10 bg-slate-50 px-3 text-sm outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-600/10"
      />
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
            ? "Try a broader location or remove one of the filters."
            : "Pick a verified result to see what changed before and after construction."}
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
    <div className="grid border-t border-slate-900/10 sm:grid-cols-3">
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
