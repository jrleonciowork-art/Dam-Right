import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_TIMEOUT_MS = 12_000;

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

type UnknownRecord = Record<string, unknown>;

type ProjectQuery = {
  q: string;
  region: string;
  province: string;
  city: string;
  river_basin: string;
  project_name: string;
  status: string;
  cursor: string;
  mode: "suggest" | "search";
  limit: number;
};

const statusValues = new Set<ProjectStatus>([
  "for_procurement",
  "not_started",
  "ongoing",
  "completed",
  "terminated",
  "unknown",
]);

function clean(value: string | null, maxLength = 160) {
  return value?.trim().slice(0, maxLength) ?? "";
}

function parseLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
}

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function firstValue(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return null;
}

function asString(value: unknown) {
  if (typeof value === "string") {
    const result = value.trim();
    return result || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[₱,$\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStatus(value: unknown): ProjectStatus {
  const normalized = asString(value)
    ?.toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!normalized) return "unknown";
  if (statusValues.has(normalized as ProjectStatus)) {
    return normalized as ProjectStatus;
  }
  if (normalized.includes("complete")) return "completed";
  if (normalized.includes("ongoing") || normalized.includes("progress")) return "ongoing";
  if (normalized.includes("procurement") || normalized.includes("bidding")) {
    return "for_procurement";
  }
  if (normalized.includes("not_started") || normalized.includes("awaiting")) {
    return "not_started";
  }
  if (normalized.includes("terminate") || normalized.includes("cancel")) {
    return "terminated";
  }
  return "unknown";
}

function normalizeProject(value: unknown, index: number): NationwideProject | null {
  const record = asRecord(value);
  if (!record) return null;

  const projectName = asString(
    firstValue(record, [
      "project_name",
      "projectName",
      "name",
      "title",
      "contract_description",
    ]),
  );
  const explicitLocation = asString(
    firstValue(record, ["location", "full_location", "project_location", "address"]),
  );
  const location =
    explicitLocation ??
    [
      asString(firstValue(record, ["city", "city_name", "municipality"])),
      asString(firstValue(record, ["province", "province_name"])),
      asString(firstValue(record, ["region", "region_name"])),
    ]
      .filter(Boolean)
      .join(", ");

  if (!projectName || !location) return null;

  const rawId = asString(
    firstValue(record, ["id", "project_id", "contract_id", "contractId", "contract_number"]),
  );

  return {
    id: rawId ?? "project-" + index + "-" + encodeURIComponent(projectName.toLowerCase()),
    project_name: projectName,
    location,
    region: asString(firstValue(record, ["region", "region_name", "regionName"])),
    province: asString(firstValue(record, ["province", "province_name", "provinceName"])),
    city: asString(
      firstValue(record, ["city", "city_name", "cityName", "municipality", "municipality_name"]),
    ),
    river_basin: asString(
      firstValue(record, ["river_basin", "riverBasin", "river", "watershed"]),
    ),
    project_type: asString(
      firstValue(record, [
        "project_type",
        "projectType",
        "type_of_work",
        "category",
        "asset_type",
      ]),
    ),
    budget: asNumber(
      firstValue(record, [
        "budget",
        "project_cost",
        "contract_cost",
        "cost_php",
        "cost",
        "amount",
      ]),
    ),
    completion_date: asString(
      firstValue(record, [
        "completion_date",
        "completionDate",
        "completed_at",
        "actual_end_date",
        "target_end_date",
        "end_date",
      ]),
    ),
    historical_flood_depth_m: asNumber(
      firstValue(record, [
        "historical_flood_depth_m",
        "historicalFloodDepthM",
        "before_depth_m",
        "beforeDepthM",
      ]),
    ),
    current_flood_depth_m: asNumber(
      firstValue(record, [
        "current_flood_depth_m",
        "currentFloodDepthM",
        "after_depth_m",
        "afterDepthM",
      ]),
    ),
    status: normalizeStatus(firstValue(record, ["status", "project_status", "contract_status"])),
    data_source: asString(firstValue(record, ["data_source", "source", "agency"])),
    source_url: asString(
      firstValue(record, ["source_url", "sourceUrl", "page_url", "url"]),
    ),
  };
}

function extractItems(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  for (const key of ["data", "projects", "results", "items"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function extractMeta(payload: unknown) {
  const record = asRecord(payload);
  const pagination = asRecord(record?.pagination) ?? asRecord(record?.meta);

  return {
    total:
      asNumber(pagination?.total) ??
      asNumber(record?.total) ??
      asNumber(record?.count) ??
      null,
    next_cursor:
      asString(pagination?.next_cursor) ??
      asString(pagination?.nextCursor) ??
      asString(record?.next_cursor) ??
      asString(record?.nextCursor) ??
      null,
    facets: asRecord(record?.facets) ?? null,
  };
}

function isFloodControlProject(project: NationwideProject) {
  return /flood|drainage|river|dike|revetment|seawall|waterway|channel|slope protection/i.test(
    [project.project_name, project.project_type].filter(Boolean).join(" "),
  );
}

function jsonResponse(
  projects: NationwideProject[],
  query: ProjectQuery,
  meta: ReturnType<typeof extractMeta>,
) {
  return NextResponse.json(
    {
      data: projects,
      pagination: {
        total: meta.total,
        returned: projects.length,
        next_cursor: meta.next_cursor,
        limit: query.limit,
      },
      facets: meta.facets,
      query,
      source: {
        configured: true,
        live: true,
        provider: "DPWH Transparency Portal via Love the Philippines",
        retrieved_at: new Date().toISOString(),
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}

async function fetchLovePhilippines(
  endpoint: URL,
  query: ProjectQuery,
  signal: AbortSignal,
) {
  const searchText = [
    query.q,
    query.project_name,
    query.river_basin,
    query.city,
    query.province,
    query.region,
  ]
    .filter(Boolean)
    .join(" ");

  if (searchText) {
    const suggestUrl = new URL("/api/search/suggest", endpoint.origin);
    suggestUrl.searchParams.set("q", searchText);
    const suggestResponse = await fetch(suggestUrl, {
      headers: { Accept: "application/json" },
      signal,
      cache: "no-store",
    });
    if (!suggestResponse.ok) return { response: suggestResponse, projects: null };

    const suggestPayload = asRecord(await suggestResponse.json());
    const groups = Array.isArray(suggestPayload?.groups) ? suggestPayload.groups : [];
    const projectGroup = groups
      .map(asRecord)
      .find((group) => asString(group?.type) === "project");
    const items = Array.isArray(projectGroup?.items) ? projectGroup.items : [];

    if (query.mode === "suggest") {
      const projects = items
        .map((item, index) => {
          const record = asRecord(item);
          if (!record) return null;
          return normalizeProject(
            {
              id: record.id,
              title: record.title,
              location: record.subtitle ?? "Philippines",
              amount: record.amount,
              page_url: record.href
                ? new URL(String(record.href), endpoint.origin).toString()
                : null,
              data_source: "DPWH Transparency Portal via Love the Philippines",
            },
            index,
          );
        })
        .filter((project): project is NationwideProject => project !== null)
        .filter(isFloodControlProject)
        .slice(0, query.limit);
      return { response: null, projects, meta: extractMeta(null) };
    }

    const floodItems = items
      .map(asRecord)
      .filter((item): item is UnknownRecord => item !== null)
      .filter((item) =>
        /flood|drainage|river|dike|revetment|seawall|waterway|channel|slope protection/i.test(
          asString(item.title) ?? "",
        ),
      )
      .slice(0, query.limit);

    const detailRecords = await Promise.all(
      floodItems.map(async (item) => {
        const id = asString(item.id);
        if (!id) return null;
        const detailUrl = new URL(
          `/api/open/v1/projects/${encodeURIComponent(id)}`,
          endpoint.origin,
        );
        const detailResponse = await fetch(detailUrl, {
          headers: { Accept: "application/json" },
          signal,
          cache: "no-store",
        });
        if (!detailResponse.ok) return null;
        const payload = asRecord(await detailResponse.json());
        const data = asRecord(payload?.data);
        return data
          ? {
              ...data,
              location: item.subtitle,
              data_source: "DPWH Transparency Portal via Love the Philippines",
            }
          : null;
      }),
    );

    const projects = detailRecords
      .map(normalizeProject)
      .filter((project): project is NationwideProject => project !== null)
      .filter(isFloodControlProject);
    return { response: null, projects, meta: extractMeta(null) };
  }

  const listUrl = new URL(endpoint);
  listUrl.search = "";
  listUrl.searchParams.set("limit", "200");
  if (query.cursor) listUrl.searchParams.set("cursor", query.cursor);
  const listResponse = await fetch(listUrl, {
    headers: { Accept: "application/json" },
    signal,
    cache: "no-store",
  });
  if (!listResponse.ok) return { response: listResponse, projects: null };

  const payload: unknown = await listResponse.json();
  const projects = extractItems(payload)
    .map((item, index) => {
      const record = asRecord(item);
      return normalizeProject(
        record
          ? {
              ...record,
              data_source: "DPWH Transparency Portal via Love the Philippines",
            }
          : item,
        index,
      );
    })
    .filter((project): project is NationwideProject => project !== null)
    .filter(isFloodControlProject)
    .slice(0, query.limit);
  return { response: null, projects, meta: extractMeta(payload) };
}

export async function GET(request: NextRequest) {
  const upstreamUrl = process.env.PROJECTS_DATA_API_URL?.trim();
  if (!upstreamUrl) {
    return NextResponse.json(
      {
        error: "Nationwide project data service is not configured.",
        code: "projects_data_source_unavailable",
        details:
          "Set PROJECTS_DATA_API_URL to an authorized nationwide project index. No mock project fallback is used.",
      },
      { status: 503 },
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL(upstreamUrl);
  } catch {
    return NextResponse.json(
      { error: "PROJECTS_DATA_API_URL is invalid.", code: "invalid_data_source_url" },
      { status: 500 },
    );
  }

  if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost") {
    return NextResponse.json(
      {
        error: "The nationwide data service must use HTTPS.",
        code: "insecure_data_source_url",
      },
      { status: 500 },
    );
  }

  const incoming = request.nextUrl.searchParams;
  const query: ProjectQuery = {
    q: clean(incoming.get("q")),
    region: clean(incoming.get("region")),
    province: clean(incoming.get("province")),
    city: clean(incoming.get("city")),
    river_basin: clean(incoming.get("river_basin")),
    project_name: clean(incoming.get("project_name")),
    status: clean(incoming.get("status"), 40),
    cursor: clean(incoming.get("cursor"), 500),
    mode: incoming.get("mode") === "suggest" ? "suggest" : "search",
    limit: parseLimit(incoming.get("limit")),
  };

  const controller = new AbortController();
  const configuredTimeout = Number(process.env.PROJECTS_DATA_API_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeout)
    ? Math.min(30_000, Math.max(1_000, configuredTimeout))
    : DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (endpoint.hostname === "lovethephilippines.com") {
      const result = await fetchLovePhilippines(endpoint, query, controller.signal);
      if (result.response) {
        return NextResponse.json(
          {
            error: "The nationwide project service could not complete the query.",
            code: "upstream_projects_error",
            upstream_status: result.response.status,
          },
          { status: result.response.status === 429 ? 429 : 502 },
        );
      }
      return jsonResponse(result.projects ?? [], query, result.meta ?? extractMeta(null));
    }

    for (const [key, value] of Object.entries(query)) {
      if (typeof value === "number") endpoint.searchParams.set(key, String(value));
      else if (value) endpoint.searchParams.set(key, value);
    }

    const headers = new Headers({ Accept: "application/json" });
    if (process.env.PROJECTS_DATA_API_KEY) {
      headers.set("Authorization", "Bearer " + process.env.PROJECTS_DATA_API_KEY);
    }

    const response = await fetch(endpoint, {
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "The nationwide project service could not complete the query.",
          code: "upstream_projects_error",
          upstream_status: response.status,
        },
        { status: response.status === 429 ? 429 : 502 },
      );
    }

    const payload: unknown = await response.json();
    const projects = extractItems(payload)
      .map(normalizeProject)
      .filter((project): project is NationwideProject => project !== null);
    const meta = extractMeta(payload);

    return jsonResponse(projects, query, meta);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: timedOut
          ? "The nationwide project service took too long to respond."
          : "The nationwide project service is currently unreachable.",
        code: timedOut ? "projects_query_timeout" : "projects_service_unreachable",
      },
      { status: 504 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
