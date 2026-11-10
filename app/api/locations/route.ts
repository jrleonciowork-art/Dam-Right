import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LOCATION_API =
  "https://lovethephilippines.com/api/open/v1/lgu";

type LocationLevel = "regions" | "provinces" | "citymun";
type UnknownRecord = Record<string, unknown>;

type LocationOption = {
  code: string;
  name: string;
  level: string;
  parent_code: string | null;
  project_count: number | null;
  flood_project_count: number | null;
  source_url: string | null;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeLocation(value: unknown): LocationOption | null {
  const record = asRecord(value);
  const code = asString(record?.psgc);
  const name = asString(record?.name);
  if (!record || !code || !name) return null;

  return {
    code,
    name,
    level: asString(record.level) ?? "Unknown",
    parent_code: asString(record.parent_psgc),
    project_count: asNumber(record.project_count),
    flood_project_count: asNumber(record.flood_count),
    source_url: asString(record.page_url),
  };
}

async function fetchLevel(
  endpoint: URL,
  level: "Reg" | "Prov" | "City" | "Mun",
  parent: string,
  signal: AbortSignal,
) {
  const url = new URL(endpoint);
  url.searchParams.set("level", level);
  if (parent) url.searchParams.set("parent", parent);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Location service returned ${response.status}.`);
  const payload = asRecord(await response.json());
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function GET(request: NextRequest) {
  const requestedLevel = request.nextUrl.searchParams.get("level") as LocationLevel | null;
  const level: LocationLevel = requestedLevel ?? "regions";
  const parent = request.nextUrl.searchParams.get("parent")?.trim() ?? "";

  if (!["regions", "provinces", "citymun"].includes(level)) {
    return NextResponse.json(
      { error: "Location level must be regions, provinces, or citymun." },
      { status: 400 },
    );
  }
  if (level !== "regions" && !/^\d{10}$/.test(parent)) {
    return NextResponse.json(
      { error: "A valid 10-digit parent PSGC code is required." },
      { status: 400 },
    );
  }

  const endpoint = new URL(
    process.env.LOCATIONS_DATA_API_URL?.trim() || DEFAULT_LOCATION_API,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const rows =
      level === "citymun"
        ? (
            await Promise.all([
              fetchLevel(endpoint, "City", parent, controller.signal),
              fetchLevel(endpoint, "Mun", parent, controller.signal),
            ])
          ).flat()
        : await fetchLevel(
            endpoint,
            level === "regions" ? "Reg" : "Prov",
            parent,
            controller.signal,
          );

    const data = rows
      .map(normalizeLocation)
      .filter((item): item is LocationOption => item !== null)
      .sort((a, b) => a.name.localeCompare(b.name, "en-PH"));

    return NextResponse.json(
      {
        data,
        source: {
          geographic_authority: "Philippine Statistics Authority PSGC",
          project_counts: "DPWH Transparency Portal records",
          provider: "Love the Philippines Open Data",
          retrieved_at: new Date().toISOString(),
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: timedOut
          ? "The official location list took too long to respond."
          : "The official location list is temporarily unavailable.",
      },
      { status: timedOut ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
