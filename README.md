# Dam Right — Local Engineering Review MVP

Dam Right is evolving from a water-level demonstration into an evidence-linked engineering review assistant for reinforced-concrete flood and retaining walls. The current milestone remains local and is not suitable for certification or safety-critical decisions.

The complete platform roadmap, engineering scope, governance model, and release gates are in [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md). The focused design-versus-as-built and AI blueprint workstream is in [docs/AS_BUILT_AI_IMPLEMENTATION_PLAN.md](docs/AS_BUILT_AI_IMPLEMENTATION_PLAN.md).

## Current application

The browser interface now provides:

- Local PDF, PNG, or JPEG blueprint intake metadata. Files are not uploaded or persisted.
- Editable project identity, wall geometry, materials, water/soil loads, drainage assumption, and acceptance limits.
- Explicit input confirmation state.
- Differential hydrostatic force using wet- and dry-side levels.
- Rankine active earth pressure and uniform surcharge.
- Stem, base, and soil-over-heel weights.
- Linearly varying uplift pressure with an explicit drainage-efficiency assumption.
- Sliding, overturning, resultant, eccentricity, base contact pressure, and allowable-bearing checks.
- `pass`, `fail`, `warning`, `not applicable`, and `insufficient information` findings.
- Calculation trace and visible model limitations.
- Segment-based approved-design versus as-built comparisons.
- Field measurement uncertainty, evidence references, and checker confirmation.
- Conservative tolerance evaluation using the adverse uncertainty bound.
- A blueprint-candidate reconciliation boundary that blocks superseded, conflicting, untraceable, unitless, or unreviewed extracted values from calculations.
- A centralized release gate that blocks failed, incomplete, unsupported, unconfirmed, and stale/invalid review states.
- A mandatory analysis-coverage matrix; unsupported structural, geotechnical, hydraulic, and seismic families cannot silently disappear.
- Runtime validation and file-signature checks for PDF, PNG, and JPEG blueprint ingestion.
- Versioned, locked draft screening criteria that remain release-blocking until independently approved.
- Reproducible local review snapshots and watermarked incomplete Markdown report downloads.
- An optional Supabase governance schema for organization/project isolation, immutable snapshots, separated approvals, issued-report metadata, specialist results, and audit events.

The calculation engine still excludes validated reinforced-concrete member capacity, settlement, global stability, liquefaction, seismic effects, and other structure types. These are now explicit release blockers rather than silent exclusions. Scour and Lane-style seepage checks remain screening calculations pending independent method and rule-pack approval.

The bundled Philippine flood-wall criteria are an unapproved draft. Their values are locked in the interface to prevent casual manipulation, but every review remains blocked until an independently reviewed active rule pack or authorized project-specific basis exists.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Quality checks:

```bash
npm run test
npm run typecheck
npm run build
```

## ESP32 firmware

The Phase 1 sensor firmware remains at `firmware/dam_right_phase1/dam_right_phase1.ino`.

Wiring:

- JSN-SR04T `TRIG` → ESP32 GPIO 5
- JSN-SR04T `ECHO` → voltage divider or level shifter → ESP32 GPIO 18
- Common ground between sensor and ESP32

The JSN-SR04T ECHO signal may be 5 V, so it must not be connected directly to a 3.3 V-only ESP32 input. The firmware currently prints local JSON telemetry every five seconds and is not connected to the web application.

## Engineering warning

The current equations are a transparent development model for a straight, one-metre wall segment. Project inputs, standards, load combinations, model applicability, and results require independent review by qualified civil, geotechnical, hydraulic, and structural engineers before any real-world use.
