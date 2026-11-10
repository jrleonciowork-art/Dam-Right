# Dam Right Engineering Review Platform Implementation Plan

## Executive decision

Dam Right will evolve from a local water-level demonstration into an engineering review platform for reinforced-concrete flood and retaining walls. The first production release will accept project documents, extract and confirm design information, execute transparent hydraulic, geotechnical, and structural checks, compare design and as-built conditions, and produce traceable findings for review by a licensed engineer.

The platform will be an engineering review assistant, not an autonomous certifier. A result may be `pass`, `fail`, `warning`, `not applicable`, or `insufficient information`. Only an authorized engineer may approve a review or issue a final report.

The initial jurisdiction pack will target Philippine public-works practice. Every rule must identify its governing document, edition, section, applicability, inputs, and calculation version. Other jurisdictions and structure types will be added as separately validated rule packs.

## 1. Outcomes and success measures

### 1.1 Product outcomes

The first production release must allow a project team to:

1. Create a project, identify its site, asset type, design stage, jurisdiction, and responsible organization.
2. Upload drawings, specifications, design calculations, geotechnical reports, hydrology reports, surveys, inspection records, and as-built documents.
3. Extract drawing metadata, dimensions, notes, material properties, and reinforcement information with a confidence score and source location.
4. Require a human to confirm all extracted engineering inputs before they are used in calculations.
5. Select a versioned standards pack and project-specific design criteria.
6. Run deterministic engineering checks with recorded inputs, units, equations, assumptions, and results.
7. Display findings directly against their drawing sheet, detail, station, or calculation source.
8. Compare planned, approved, as-built, and monitored conditions without overwriting prior revisions.
9. Route findings through preparation, checking, approval, and closure.
10. Generate a reproducible engineering review report and machine-readable result package.

### 1.2 Measurable release criteria

- Every numeric result is reproducible from stored inputs and a versioned calculation engine.
- Every compliance result links to a source rule and evidence location.
- No low-confidence extraction can silently become an approved engineering input.
- Unsupported asset types and missing critical inputs return `insufficient information`, never `pass`.
- Benchmark calculations agree with independently checked reference calculations within documented tolerances.
- Project and document access is isolated by organization and role.
- Every upload, edit, rule change, calculation run, review decision, and report issuance is auditable.
- Monitoring alarms distinguish structural threshold exceedance, sensor fault, stale data, and communications failure.

## 2. Scope boundaries

### 2.1 Initial supported asset

The minimum viable engineering scope is a cast-in-place reinforced-concrete cantilever or gravity flood/retaining wall on a shallow foundation. The project must explicitly record whether water, retained soil, or both act on either side.

Supported configurations in the first production release:

- Straight wall segments analyzed per metre run.
- Stem, toe, heel, base slab, optional shear key, and soil over the heel.
- Wet-side and dry-side water elevations.
- Drained and undrained design cases, with the drainage assumption stated.
- Granular backfill represented by engineer-approved parameters.
- Uniform and line surcharge represented through approved calculation methods.
- Static and configured seismic load cases.
- Design, as-built, and current monitored geometry or water levels.

### 2.2 Deferred structures

These require independent calculation models and rule packs and must be rejected as unsupported until implemented:

- Embankment, rockfill, concrete gravity, arch, and tailings dams.
- Levees and dikes requiring seepage and slope-stability modelling.
- Sheet-pile, anchored, mechanically stabilized earth, crib, and gabion walls.
- Deep foundations, pile-supported walls, cofferdams, gates, spillways, culverts, seawalls, and breakwaters.
- Three-dimensional corners, transitions, appurtenant structures, and discontinuities not reducible to a validated two-dimensional segment.

### 2.3 Document formats

Delivery will be staged:

| Release | Accepted source | Capability |
| --- | --- | --- |
| MVP | Searchable PDF, CSV project template, manual forms | Metadata extraction, text search, sheet preview, manual geometry confirmation |
| Beta | Scanned PDF, PNG, JPEG | OCR, deskewing, scale calibration, confidence scoring |
| Production | PDF plus DXF | Layer/entity extraction and drawing-to-input mapping |
| Later | DWG through a licensed conversion service; IFC/BIM | Native CAD/BIM semantics and model checking |

Documents that cannot be parsed remain valid evidence and may be indexed manually. File conversion must preserve the original file, checksum, uploader, timestamp, and revision relationship.

## 3. Engineering basis and governance

### 3.1 Standards hierarchy

Before a project can be checked, its design-basis record must identify:

- Owner requirements and project specifications.
- Jurisdiction and approving authority.
- Applicable DPWH manuals, department orders, standard plans, and specifications.
- Applicable structural, concrete, seismic, geotechnical, hydraulic, environmental, and occupational-safety references.
- Edition dates and any project-approved amendments.
- Design life, consequence classification, design flood or return period, exposure class, and required reliability level.
- Resolution order when requirements conflict.

The standards library must not embed copyrighted code text beyond licensed use. Rules should store a concise requirement description, citation, parameters, and implementation notes. Access to licensed source documents must follow the organization's licence.

### 3.2 Rule approval

Each production rule passes this lifecycle:

`draft → technical review → software verification → approved → active → superseded`

At least one qualified civil or structural engineer other than the author must approve the engineering interpretation. A rule cannot be edited after activation. Corrections create a new version and preserve prior calculation reproducibility.

### 3.3 Required engineering modules

#### Geometry and section properties

- Stem, base, toe, heel, shear key, coping, embedment, and segment length.
- Component areas, weights, centroids, and lever arms.
- Design-to-as-built dimensional variance.
- Unit and coordinate conversion with dimensional validation.

#### Actions and load cases

- Differential hydrostatic pressure using both water levels.
- Uplift pressure distribution, drainage reduction, and seepage assumptions.
- Active, at-rest, and passive earth pressure selected by permitted wall movement.
- Uniform and line surcharge.
- Self-weight, soil over heel/toe, buoyancy, and permanent attachments.
- Configurable seismic earth and water actions.
- Hydrodynamic, wave, current, debris, vehicle, construction, and accidental actions only when an approved method is present.
- Normal, unusual, extreme, construction-stage, rapid-drawdown, and maintenance cases as applicable.

#### External stability

- Sliding, with each resistance component shown separately.
- Overturning about the governing point.
- Resultant location and eccentricity.
- Maximum and minimum base pressure.
- Foundation bearing resistance and utilization.
- Settlement input and allowable-limit comparison.
- Flotation and uplift stability.
- Scour/embedment adequacy.
- Global stability as an external specialist-analysis result until a validated solver is integrated.

#### Reinforced-concrete checks

- Stem, heel, toe, base, and shear-key demand envelopes.
- Flexure, one-way shear, axial-flexural interaction where applicable, and service stress/crack controls.
- Minimum and maximum reinforcement.
- Bar spacing, concrete cover, development, anchorage, laps, and construction joints.
- Material strengths, durability class, design life, and exposure requirements.
- Drawing-detail consistency: bar size, count/spacing, layer, face, extent, marks, and conflicting notes.

#### Hydraulic and site checks

- Design water/flood level and stated return period.
- Required crest elevation and freeboard.
- Overtopping disposition.
- Velocity, erosion protection, toe protection, and scour depth input.
- Drainage outlets, weep holes, filters, and blockage assumptions.
- Survey datum, stationing, coordinates, and relationship between plan/profile/section elevations.

### 3.4 Calculation-result policy

- Factors of safety and utilization limits are rule parameters, not global constants.
- Results are evaluated by load case and limit state.
- Units are mandatory and checked at module boundaries.
- Intermediate values are stored for audit and report generation.
- Calculations must not round until presentation unless the governing method requires it.
- Assumptions are explicit inputs with an owner, justification, and approval state.
- A passed calculation cannot override a failed detailing rule or missing mandatory investigation.
- Overall status is the most severe unresolved applicable result, with `insufficient information` treated as a release blocker when the missing item is mandatory.

## 4. User roles and workflows

### 4.1 Roles

| Role | Main permissions |
| --- | --- |
| Organization administrator | Manage organization, membership, retention, and rule-pack access |
| Project administrator | Create projects, assign teams, manage project configuration |
| Designer or preparer | Upload documents, enter inputs, respond to findings |
| Checker | Confirm extraction, review calculations and findings |
| Approving engineer | Approve design basis, close critical findings, issue reports |
| Inspector or surveyor | Submit as-built measurements, photos, observations, and calibration records |
| Monitoring operator | View telemetry, acknowledge alarms, record response actions |
| Auditor or regulator | Read-only access to approved records and audit history |

Role checks must be enforced in the data-access layer and mutation endpoints, not only by hiding interface controls.

### 4.2 Project review workflow

1. Create the project and select asset type and jurisdiction.
2. Establish the design basis and assign responsible engineers.
3. Upload source documents and classify each document.
4. Create immutable document revisions and identify superseded files.
5. Process documents asynchronously.
6. Review extraction issues, confirm scale and units, and approve extracted inputs.
7. Complete missing manual engineering inputs and attach their sources.
8. Freeze an input set and standards-pack version for a calculation run.
9. Execute calculations and rules.
10. Triage findings by severity, discipline, owner, and due date.
11. Upload responses or revised documents; never overwrite the reviewed revision.
12. Re-run only affected checks while retaining earlier results.
13. Checker recommends acceptance or rejection.
14. Approving engineer signs the review record and issues the report.
15. Later as-built and telemetry reviews reference, but do not modify, the approved baseline.

### 4.3 Blueprint review experience

The review screen should use a three-pane layout:

- Sheet tree and revision history on the left.
- Zoomable drawing with overlays in the centre.
- Extracted item, source rule, calculation, confidence, and disposition on the right.

Selecting a finding must navigate to the exact sheet and evidence region. Selecting an extracted value must show the source text or geometry and all downstream checks that consume it. An engineer can correct the interpreted value without altering the original evidence.

## 5. Technical architecture

### 5.1 Recommended system boundary

```text
Browser
  │
  ▼
Next.js App Router application
  ├─ Server-rendered project and review pages
  ├─ Route Handlers for uploads, integrations, and telemetry ingestion
  ├─ Server-side data access and authorization layer
  └─ Client components for drawing interaction and live controls
  │
  ├──────── PostgreSQL / Supabase
  │          project data, rule metadata, findings, audit records
  │
  ├──────── Private object storage
  │          originals, rendered sheets, evidence crops, reports
  │
  ├──────── Durable job queue
  │          extraction, OCR, conversion, calculation, reporting
  │
  └──────── Isolated worker services
             document pipeline, engineering engine, report renderer
```

The interactive application should remain in Next.js 16 App Router. Server Components should load protected project data. Client Components should be limited to interactive drawing, forms, charts, and live telemetry. Route Handlers and Server Actions must be treated as public endpoints and recheck authorization. A server-only data-access layer should centralize organization and project authorization.

Long-running OCR, CAD conversion, calculations, and report creation must run in workers, not inside a web request. Every job must be idempotent and addressed by a content hash plus processing-version key.

### 5.2 Proposed repository organization

```text
app/
  (auth)/
  (workspace)/
    projects/
      [projectId]/
        overview/
        documents/
        design-basis/
        inputs/
        checks/
        findings/
        monitoring/
        reports/
  api/
    uploads/
    telemetry/
    webhooks/
components/
  drawings/
  engineering/
  findings/
  monitoring/
lib/
  auth/
  dal/
  validation/
  units/
  storage/
  jobs/
packages/
  engineering-core/
  rule-engine/
  document-model/
  shared-types/
workers/
  document-processing/
  calculation/
  reporting/
supabase/
  migrations/
  seed/
firmware/
docs/
```

### 5.3 Core technology decisions

- PostgreSQL for relational records, revisioning, and transactional approvals.
- Private S3-compatible object storage for source and generated files.
- Row-level security as defence in depth, paired with server-side authorization.
- JSON Schema or an equivalent typed schema for engineering inputs and rule parameters.
- A unit-aware calculation library with runtime dimensional checks.
- A versioned, deterministic engineering core that has no network access during calculation.
- PDF.js or equivalent for browser rendering; server-side rendering for evidence crops and final reports.
- OCR and CAD tooling isolated in workers with file-type validation and resource limits.
- Structured logs, traces, metrics, and error monitoring with project identifiers but no sensitive document text in routine logs.

## 6. Data model

### 6.1 Organization and access

- `organizations`: tenant and retention settings.
- `users`: identity profile; authentication secrets remain with the identity provider.
- `organization_memberships`: organization role and status.
- `projects`: owner organization, site, asset type, lifecycle status.
- `project_memberships`: project-specific role and discipline.

### 6.2 Engineering configuration

- `design_bases`: jurisdiction, authorities, design life, flood criteria, datum, status.
- `standards`: source title, issuer, edition, effective dates, licence metadata.
- `rule_packs`: asset type, jurisdiction, semantic version, approval state.
- `rules`: stable rule identity and applicability metadata.
- `rule_versions`: immutable implementation, parameters, citation, reviewer approvals, test version.
- `project_rule_overrides`: approved project-specific values with justification and approver.

### 6.3 Documents and extraction

- `documents`: logical document identity and discipline.
- `document_revisions`: immutable file, checksum, revision, status, upload metadata.
- `document_sheets`: sheet number, title, dimensions, render references, scale and units.
- `document_regions`: geometry for text, detail, table, dimension, or evidence area.
- `extraction_jobs`: processor version, status, errors, timing.
- `extracted_items`: typed value, unit, confidence, bounding geometry, source revision.
- `input_confirmations`: accepted/corrected/rejected value, reviewer, timestamp, reason.

### 6.4 Models and calculations

- `asset_models`: logical wall or segment definition.
- `asset_model_versions`: immutable geometry and material snapshot.
- `load_cases`: category, water levels, surcharge, drainage, seismic and stage parameters.
- `engineering_inputs`: typed value, unit, source, confidence, approval state.
- `assumptions`: statement, basis, owner, approval state.
- `calculation_runs`: frozen model, rule-pack version, engine version, status, hash.
- `calculation_results`: rule, load case, limit state, status, demand, capacity, ratio, intermediates.
- `calculation_evidence`: links results to source documents and regions.

### 6.5 Findings and approvals

- `findings`: severity, status, rule, evidence, owner, due date.
- `finding_comments`: threaded discussion with attachments.
- `finding_resolutions`: proposed response, reviewer decision, linked revision.
- `review_gates`: submission, checking, approval, and issuance states.
- `signoffs`: signer, role, declaration, timestamp, signed snapshot hash.
- `reports`: template, calculation run, issued file, report number, supersession state.
- `audit_events`: append-only actor, action, subject, before/after hashes, request metadata.

### 6.6 Monitoring

- `devices`: structure binding, hardware identity, firmware, installation data.
- `sensors`: type, location, range, uncertainty, calibration status.
- `telemetry`: event time, receive time, value, unit, quality, sequence number.
- `health_events`: battery, signal, timeout, drift, obstruction, stale data.
- `alarm_rules`: threshold, persistence, hysteresis, severity, schedule.
- `alarms`: triggered state, acknowledgements, actions, closure.
- `inspections`: observations, measurements, photos, defects, responsible inspector.

## 7. Rule-engine design

### 7.1 Rule contract

Every rule implementation must define:

```ts
type RuleDefinition = {
  ruleId: string;
  version: string;
  title: string;
  jurisdiction: string;
  assetTypes: string[];
  citation: { standardId: string; edition: string; section: string };
  applicability: Expression;
  requiredInputs: InputRequirement[];
  parameters: Record<string, Quantity | string | boolean>;
  evaluate: (context: FrozenEngineeringContext) => RuleResult;
};

type RuleResult = {
  status: "pass" | "fail" | "warning" | "not_applicable" | "insufficient_information";
  severity: "info" | "minor" | "major" | "critical";
  summary: string;
  inputs: RecordedQuantity[];
  intermediates: RecordedQuantity[];
  demand?: Quantity;
  capacity?: Quantity;
  utilization?: number;
  evidence: EvidenceReference[];
};
```

Engineering equations remain compiled, reviewed code. A constrained rule configuration may select methods and set approved parameters, but administrators must not be able to inject arbitrary executable code.

### 7.2 Customization model

Customization occurs at three controlled levels:

1. **Rule pack:** approved jurisdiction and asset-type baseline.
2. **Organization profile:** permitted defaults such as naming, report templates, or stricter internal limits.
3. **Project design basis:** site-specific values and formally approved deviations.

An override must record the original value, new value, reason, supporting document, author, checker, and approval time. Relaxing a mandatory requirement requires the role configured by the owning authority; ordinary project users cannot do it.

### 7.3 Example first rule set

- Required-document completeness.
- Drawing title-block and revision consistency.
- Unit and datum consistency.
- Planned-versus-as-built dimensional tolerances.
- Differential hydrostatic load.
- Uplift and flotation.
- Sliding by load case.
- Overturning by load case.
- Resultant/eccentricity and base pressure.
- Bearing utilization.
- Stem, toe, and heel flexure/shear.
- Minimum reinforcement, spacing, cover, and development.
- Crest elevation and freeboard.
- Scour depth versus foundation/toe protection.
- Drainage, weep-hole, joint, waterstop, and filter-detail presence.
- Mandatory geotechnical, hydrologic, survey, and material information.

## 8. Document-processing pipeline

### 8.1 Ingestion controls

1. Create an upload intent after checking project permission.
2. Upload directly to private storage using a short-lived signed URL.
3. Verify checksum, MIME signature, extension, size, and malware status.
4. Store the original as immutable and create a revision record.
5. Queue rendering and extraction; never execute embedded file content.

### 8.2 Processing stages

1. Inspect document structure and detect pages/sheets.
2. Render normalized page images.
3. Extract native PDF text and vectors when available.
4. Apply OCR only to regions without usable text.
5. Detect title blocks, tables, notes, dimensions, callouts, and section/detail references.
6. Infer candidate units and scale; require human confirmation.
7. Normalize values into typed quantities while retaining original text.
8. Link duplicate or conflicting values across sheets.
9. Present all engineering-critical candidates for confirmation.
10. Build a frozen input proposal only from confirmed values and approved manual entries.

### 8.3 Confidence policy

- Confidence is recorded separately for recognition, classification, and value interpretation.
- Auto-acceptance is prohibited for engineering-critical values in the first production release.
- Conflicts always require review even if both extraction scores are high.
- The platform must show unreadable, cropped, missing, or unscaled regions as extraction issues.
- AI-generated explanations may assist review but cannot create an approved numerical result without deterministic validation.

## 9. API and event boundaries

Initial internal endpoints and commands:

- `POST /api/uploads/intents`
- `POST /api/uploads/complete`
- `POST /api/documents/:revisionId/process`
- `POST /api/extracted-items/:id/confirm`
- `POST /api/projects/:id/input-sets/freeze`
- `POST /api/projects/:id/calculation-runs`
- `POST /api/findings/:id/respond`
- `POST /api/reviews/:id/approve`
- `POST /api/reports/:id/issue`
- `POST /api/telemetry/v1/readings`
- `POST /api/devices/:id/commands` only after device-command authorization is designed and threat-modelled.

Useful domain events:

- `document.revision_uploaded`
- `document.processing_completed`
- `extraction.review_required`
- `input_set.frozen`
- `calculation.completed`
- `finding.created`
- `finding.resolved`
- `review.approved`
- `report.issued`
- `telemetry.quality_failed`
- `alarm.triggered`

Events must carry identifiers and hashes rather than sensitive document contents.

## 10. Monitoring and firmware plan

### 10.1 Field measurement design

- Record sensor face elevation and zero-water datum rather than relying only on a firmware constant.
- Add temperature measurement or a justified correction method for ultrasonic velocity.
- Store raw echo duration, calculated distance, calculated level, and quality flags.
- Add median filtering, physical-range checks, rate-of-change checks, and persistent-failure detection.
- Detect blind-zone, obstruction, loss of echo, repeated identical readings, and implausible jumps.
- Add device clock handling, sequence numbers, firmware version, reset reason, signal strength, supply voltage, and enclosure status where available.
- Use a second independent measurement or periodic surveyed staff-gauge comparison for critical installations.

### 10.2 Alarm policy

An alarm rule includes threshold, direction, minimum duration, hysteresis, required data quality, severity, escalation recipients, and closure criteria. The initial categories are:

- Advisory water level.
- Warning water level.
- Emergency water level.
- Excessive rate of rise.
- Sensor degraded or failed.
- Data stale or communications lost.
- Calibration expired.
- As-built or inspection variance requiring engineering review.

Structural capacity should be evaluated against a pre-approved model snapshot. Live telemetry must not continuously alter approved soil, material, or geometry parameters.

## 11. Security, privacy, and integrity

### 11.1 Threat controls

- Tenant isolation and project-scoped authorization on every data operation.
- Multi-factor authentication for approvers and administrators.
- Short-lived upload/download links and private storage by default.
- Encryption in transit and at rest.
- Malware scanning and sandboxed document conversion.
- File decompression, page count, memory, CPU, and execution-time limits.
- Strict input schemas and unit validation.
- Rate limits for sign-in, uploads, extraction, telemetry, and report generation.
- Hardware-bound device credentials and replay-resistant telemetry ingestion.
- Secret rotation and separate development, test, and production environments.
- Append-only audit history and cryptographic hashes for issued review packages.
- Backups, point-in-time recovery, restore tests, retention policy, and legal hold support.

### 11.2 Approval integrity

Approvals reference the exact document revisions, input-set hash, rule-pack version, engine version, calculation-run hash, and report hash. Any later change invalidates the approval for the changed scope and creates a new review version.

## 12. Testing and validation

### 12.1 Software testing

- Unit tests for quantities, units, geometry, load components, and rule applicability.
- Property-based tests for dimensional consistency, sign conventions, and monotonic behaviour.
- Contract tests between web application, workers, storage, and database.
- Migration tests using production-like datasets.
- End-to-end tests for upload, confirmation, calculation, finding, approval, and report issuance.
- Authorization tests for every role and tenant boundary.
- Malicious-file and resource-exhaustion tests for document processors.
- Firmware tests with simulated distance, timeout, noise, clock rollover, and reconnection.

### 12.2 Engineering verification

Each engineering module requires:

1. A written theory and sign-convention note.
2. Hand calculations or independently developed reference spreadsheets.
3. Normal, boundary, failure, missing-input, and unit-conversion cases.
4. A second engineer's review.
5. Locked golden results.
6. Traceability from requirement to code, test, and sample report.

Benchmark families should include dry wall, equal water levels, maximum water level, drainage failure, high surcharge, low friction, uplift-controlled, eccentric resultant, bearing failure, and reinforcement/detailing failures.

### 12.3 Extraction validation

Create a consented, de-identified reference set representing searchable PDFs, poor scans, rotated sheets, multiple scales, handwritten markups, conflicting revisions, metric/imperial units, and common reinforcement notations. Measure:

- Sheet/title-block classification precision and recall.
- Numeric value exact-match rate.
- Unit and scale interpretation accuracy.
- Evidence-region overlap.
- Conflict-detection rate.
- Reviewer correction time.

Release metrics should emphasize missed critical information, not only average OCR accuracy.

### 12.4 Release gates

No production release occurs until:

- All critical engineering modules have approved verification records.
- There are no unresolved critical security findings.
- Backup restore and disaster-recovery procedures have been exercised.
- Issued reports reproduce from their stored snapshot.
- An external licensed engineer completes an acceptance review of representative projects.
- Operators have documented alarm response procedures.

## 13. Delivery roadmap

The schedule assumes a focused team of two application engineers, one document/ML engineer, one test engineer, and part-time civil/structural, geotechnical, hydraulic, security, and product support. Calendar estimates must be revised after the design-basis workshop.

### Phase 0 — Definition and engineering basis, weeks 1–3

Deliverables:

- Confirm initial wall types, jurisdictions, user organizations, and approval process.
- Appoint engineer of record for calculation-method approval.
- Create requirements traceability matrix and terminology/data dictionary.
- Select the first standards editions and secure document licences.
- Produce threat model, document-classification policy, and data-retention decision.
- Assemble ten to twenty representative, permission-cleared project packages and benchmark calculations.

Exit gate: signed product scope, standards matrix, validation plan, and unsupported-use policy.

### Phase 1 — Platform foundation, weeks 4–7

Deliverables:

- Authentication, organizations, projects, roles, and server-side data-access layer.
- Database migrations, private storage, audit events, and environment separation.
- Project dashboard, design-basis form, and immutable document revision records.
- Direct-to-storage upload with validation and malware scanning.
- CI checks for formatting, type checking, tests, migrations, and dependency vulnerabilities.

Exit gate: two test organizations cannot access each other's projects; uploaded originals are immutable and auditable.

### Phase 2 — Document review MVP, weeks 8–12

Deliverables:

- Searchable-PDF rendering, sheet navigation, title-block fields, and text search.
- Manual evidence rectangles and typed engineering-input forms.
- Scale/unit confirmation and input provenance.
- Document revision comparison and supersession.
- Extraction worker/job framework with retry and failure visibility.

Exit gate: a reviewer can build a fully sourced input set from a real PDF package without editing application code.

### Phase 3 — Engineering engine MVP, weeks 10–16

This phase overlaps document work after shared schemas stabilize.

Deliverables:

- Unit-aware geometry and load-case model.
- Differential water, earth pressure, surcharge, self-weight, uplift, sliding, overturning, eccentricity, base pressure, bearing, and flotation modules.
- Versioned rules, immutable calculation runs, intermediate-value recording, and benchmark suite.
- Engineering calculation interface and result explanation.
- Explicit missing-input and unsupported-case handling.

Exit gate: independent engineers approve benchmark results and sign conventions; no calculation uses unconfirmed extracted values.

### Phase 4 — Findings and reports, weeks 17–20

Deliverables:

- Finding creation, severity, assignments, comments, responses, and closure workflow.
- Evidence-linked drawing overlays.
- Submission/checking/approval gates and approval invalidation.
- Calculation sheets, finding register, executive summary, limitations, and signed report package.
- Export to PDF and JSON with checksums and version manifest.

Exit gate: a frozen project can be independently reproduced from its exported package.

### Phase 5 — Reinforced-concrete and hydraulic checks, weeks 21–26

Deliverables:

- Stem, heel, toe, base, and shear-key flexure/shear checks.
- Reinforcement, cover, spacing, development, lap, joint, and material-property rules.
- Crest elevation, freeboard, scour/embedment, drainage, and toe-protection checks.
- Configurable normal, unusual, extreme, and construction-stage combinations.
- First approved Philippine flood-wall rule pack.

Exit gate: representative complete designs pass a documented external engineering validation review.

### Phase 6 — OCR-assisted extraction, weeks 23–29

Deliverables:

- Scanned-sheet cleanup and OCR.
- Candidate dimensions, notes, materials, reinforcement, and cross-reference extraction.
- Confidence and conflict review queue.
- Extraction quality dashboard and reference-dataset regression tests.

Exit gate: critical values always require confirmation, extraction performance meets agreed thresholds, and regression tests cover known failure patterns.

### Phase 7 — Monitoring integration, weeks 27–32

Deliverables:

- Device registry and authenticated telemetry API.
- Updated firmware payload, quality checks, health state, and calibration record.
- Time-series views, design-baseline comparison, alarm persistence/hysteresis, acknowledgement, and response log.
- Offline buffering and reconnect tests for the field device.

Exit gate: field pilot demonstrates accurate level comparison, fault differentiation, alarm routing, and recovery from connectivity loss.

### Phase 8 — Pilot and production readiness, weeks 33–36

Deliverables:

- Pilot on at least three representative projects, including one poor-quality drawing set.
- Accessibility, performance, penetration, recovery, and operational-readiness tests.
- User training, reviewer handbook, calculation manual, and incident/alarm procedures.
- Production runbooks, service-level targets, support ownership, and change-control board.

Exit gate: approving engineers and project owners accept the pilot; all critical findings are closed.

## 14. Prioritized delivery backlog

### Must have for engineering MVP

- Project, role, design-basis, and revision management.
- Searchable PDF upload and evidence linking.
- Manual and confirmed engineering inputs with units.
- Versioned rule pack and deterministic calculation engine.
- Differential water, soil, surcharge, self-weight, uplift, sliding, overturning, base pressure, bearing, and flotation.
- Missing-information handling.
- Findings, review gates, audit trail, and reproducible report.
- Independently verified benchmark suite.

### Must have before field deployment

- Device identity, secure telemetry ingestion, timestamps, sequences, quality flags, and health telemetry.
- Sensor calibration and field comparison procedure.
- Persistent alarms with hysteresis and documented response roles.
- Offline buffering and communication-loss handling.
- Separation of live operational alarms from design-compliance findings.

### Should have after MVP

- OCR-assisted extraction.
- Reinforcement schedule and detail consistency checking.
- DXF ingestion.
- Drawing revision visual comparison.
- Organization-specific report templates and stricter internal rules.
- API integrations with document-management and asset-management systems.

### Later

- IFC/BIM model checking.
- Specialist global-stability and seepage solver integrations.
- Additional wall, revetment, dam, coastal, drainage, gate, and deep-foundation rule packs.
- Portfolio risk views and deterioration forecasting after sufficient validated field history exists.

## 15. Team and responsibilities

- **Product owner:** scope, priorities, pilot partners, and acceptance decisions.
- **Civil/structural engineering lead:** methods, rules, benchmark approval, and professional workflow.
- **Geotechnical engineer:** soil, groundwater, bearing, settlement, sliding, and global-stability boundaries.
- **Hydraulic engineer:** flood basis, water actions, freeboard, scour, drainage, and monitoring thresholds.
- **Application engineers:** Next.js application, database, authorization, workflows, and reporting.
- **Document/ML engineer:** PDF/CAD/OCR pipeline and extraction evaluation.
- **Embedded engineer:** sensor firmware, device security, calibration, and reliability.
- **Quality engineer:** automated testing, traceability, release evidence, and regression management.
- **Security lead:** threat model, access controls, testing, incident response, and privacy review.
- **Independent checker:** engineering verification separate from rule authorship.

No engineer should approve a rule or benchmark they alone authored. Production deployment ownership and incident escalation must be assigned before the field pilot.

## 16. Risks and controls

| Risk | Consequence | Primary control |
| --- | --- | --- |
| OCR or AI misreads a critical dimension | Incorrect calculation | Human confirmation, confidence display, source overlay, typed units |
| Wrong standard edition is selected | Invalid compliance result | Approved design basis, immutable rule-pack version, report manifest |
| Simplified model is applied outside its domain | False assurance | Asset applicability checks and `unsupported`/`insufficient information` outcomes |
| Missing soil or hydraulic data is replaced by a hidden default | Unsafe result | No silent engineering defaults; assumption approval workflow |
| Rule update changes an issued result | Loss of reproducibility | Immutable rules and calculation snapshots |
| Unauthorized user accesses plans | Confidentiality breach | Tenant isolation, project authorization, private storage, audit logs |
| Malicious or oversized drawing harms the service | Availability or security incident | Scanning, sandboxing, file and resource limits |
| Sensor noise triggers emergency response | Alarm fatigue | Quality gates, persistence, hysteresis, redundant verification |
| Sensor failure appears as safe water level | Missed hazard | Stale/fault alarms and fail-safe status presentation |
| Automated `pass` is treated as certification | Professional and public-safety risk | Engineer approval gate, clear status language, signed scope and limitations |

## 17. Immediate next actions

Complete these actions before implementing new dashboard features:

1. Confirm whether the first supported structure is a cantilever flood wall, gravity wall, or both.
2. Select one representative project package and obtain permission to use it for development and validation.
3. Hold a design-basis workshop with structural, geotechnical, and hydraulic engineers.
4. Produce independently checked reference calculations for at least ten load and failure cases.
5. Decide the authoritative Philippine standards editions and licensing constraints.
6. Convert the existing global `FS ≥ 1.50` and mock geometry into an explicitly labelled demonstration mode.
7. Approve the core data model and calculation sign convention before building extraction automation.
8. Implement organization/project security and immutable document revisions.
9. Build the manual-input engineering MVP before OCR so the calculation workflow can be validated independently of extraction accuracy.
10. Define the pilot acceptance metrics, responsible approvers, and unsupported-use statement.

## 18. Definition of done for the first production release

The first release is complete only when a licensed reviewer can take an approved flood-wall document package, establish its design basis, confirm all critical inputs, run the applicable checks, trace every result to evidence and a rule version, resolve findings, issue a signed reproducible report, and later compare as-built or monitored conditions without altering the approved baseline.

Anything less remains a prototype and must be labelled accordingly.

## 19. Initial authoritative references

The standards register created in Phase 0 should begin with the following primary sources and then be completed by the responsible engineers and approving authority:

- [DPWH Department Order No. 100, series of 2020](https://www.dpwh.gov.ph/dpwh/sites/default/files/issuances/DO_100_s2020.pdf), which identifies new and updated standard plans for flood-control, urban-drainage, and coastal structures and refers to the DPWH Design Guidelines, Criteria and Standards, 2015 Edition.
- [Example current DPWH flood-control detailed design plan](https://www.dpwh.gov.ph/DPWH/sites/default/files/webform/civil_works/advertisement/25lj0082_1_plan_compressed.pdf), illustrating project documentation for hydraulic analysis, design flood/freeboard, material criteria, survey basis, and applicable DPWH references.
- [Association of Structural Engineers of the Philippines](https://aseponline.org/about/) for the official publication source of the National Structural Code of the Philippines. The organization must obtain and control access to the applicable licensed edition rather than copying unlicensed code text into the product.

These links establish a starting register, not the complete governing basis for any project. The authority having jurisdiction and responsible engineers must approve the exact editions, amendments, project specifications, and order of precedence before activating a production rule pack.

## 20. Design versus as built and AI blueprint workstream

The detailed implementation sequence, data model, accuracy gates, evaluation corpus, AI architecture, and field-verification workflow are defined in [AS_BUILT_AI_IMPLEMENTATION_PLAN.md](AS_BUILT_AI_IMPLEMENTATION_PLAN.md). That workstream preserves the broader roadmap's requirement that safety-critical extracted values remain human-confirmed and traceable to source evidence.
