# Dam Right

Dam Right is a flood-control mitigation and evaluation prototype built for two very different audiences:

- **Civil engineering professionals** who need transparent structural checks, blueprint evidence, and as-built review tools.
- **Citizens** who want a plain-English answer to a simpler question: did the flood-control project actually reduce the flooding?

The application is a Phase 1 prototype. It is not a certification tool and must not replace review by qualified civil, structural, geotechnical, or hydraulic engineers.

## Application routes

| Route | Audience | Purpose |
| --- | --- | --- |
| `/` | Everyone | Landing page and split-path entry point |
| `/workspace` | Engineering professionals | Structural integrity calculator and design-versus-as-built review |
| `/public-evaluation` | General public | Nationwide project search and plain-English before-versus-after comparisons |
| `/api/projects` | Application API | Normalizes project data from a configured nationwide source |
| `/api/parse-blueprint` | Professional workspace | Optional Gemini-assisted blueprint candidate extraction |

## Public effectiveness checker

The public dashboard includes:

- Nationwide autocomplete and project search by name, city, province, region, or river.
- Live project names, locations, budgets, completion dates, and statuses from the configured project feed.
- A comparison-ready project list demonstrating the full before-versus-after experience.
- Visual historical and current water levels with a marked doorstep line.
- A color-coded effectiveness verdict and a plain-English explanation.
- Honest missing-data states when the upstream record does not contain flood-depth measurements.

The default public project feed is the no-key [Love the Philippines Open API](https://lovethephilippines.com/open), which republishes records sourced from the [DPWH Transparency Portal](https://transparency.dpwh.gov.ph/). The adapter remains configurable so an authorized DPWH, LGU, or project-monitoring service can replace it later.

### Data warning

The nationwide project feed publishes project and contract information, but it does not provide dependable historical and current flood-depth measurements for every project. The comparison-ready cards currently use clearly labeled **Phase 1 sample monitoring values** to demonstrate the interface. Replace those values with traceable LGU, barangay, or river-gauge records before describing a verdict as officially verified.

## Professional workspace

The engineering track provides:

- Local PDF, PNG, or JPEG blueprint intake metadata.
- Editable wall geometry, materials, water and soil loads, drainage assumptions, and acceptance limits.
- Differential water pressure, active earth pressure, surcharge, uplift, sliding, overturning, bearing, and base-contact checks.
- Explicit pass, fail, warning, not-applicable, and insufficient-information findings.
- Approved-design versus as-built comparisons with measurement uncertainty and evidence references.
- Calculation traces, release gates, coverage checks, and visible model limitations.
- Local review snapshots and watermarked incomplete Markdown report downloads.

The calculation engine does not provide validated reinforced-concrete member capacity, settlement, global stability, liquefaction, seismic, or certification decisions. The bundled Philippine flood-wall criteria remain an unapproved draft and require independent technical review.

More detail is available in:

- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [As-built AI implementation plan](docs/AS_BUILT_AI_IMPLEMENTATION_PLAN.md)

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Vitest

## Local setup

Requirements:

- Node.js 20 or newer
- npm

Install the dependencies:

```bash
npm install
```

Copy the example environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `PROJECTS_DATA_API_URL` | Yes, for nationwide search | Project dataset endpoint. The example uses the public no-key mirror. |
| `PROJECTS_DATA_API_TIMEOUT_MS` | No | Upstream timeout in milliseconds. Defaults to 12 seconds. |
| `PROJECTS_DATA_API_KEY` | No | Bearer token for a protected replacement project service. |
| `GEMINI_API_KEY` | No | Enables blueprint candidate extraction in the professional workspace. |

Never commit `.env.local` or real API keys.

## API search parameters

`GET /api/projects` accepts:

- `q`
- `region`
- `province`
- `city`
- `river_basin`
- `project_name`
- `status`
- `limit`
- `cursor`
- `mode=search|suggest`

Example:

```text
/api/projects?q=Marikina&mode=search&limit=20
```

Normalized project responses include the project name, location, budget, completion date, status, source information, and nullable before-and-after flood depths.

## Quality checks

```bash
npm run test
npm run typecheck
npm run build
```

## ESP32 firmware

The Phase 1 sensor firmware is located at `firmware/dam_right_phase1/dam_right_phase1.ino`.

Wiring:

- JSN-SR04T `TRIG` → ESP32 GPIO 5
- JSN-SR04T `ECHO` → voltage divider or level shifter → ESP32 GPIO 18
- Common ground between the sensor and ESP32

The JSN-SR04T ECHO signal may be 5 V and must not be connected directly to a 3.3 V-only ESP32 input. The firmware currently prints local JSON telemetry every five seconds and is not connected to the web application.

## Safety notice

Dam Right is a transparent development prototype for review support. Project inputs, standards, monitoring data, load combinations, model applicability, calculations, and conclusions require independent verification before any real-world decision or public effectiveness claim.
