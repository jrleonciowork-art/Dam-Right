# Dam Right Workspace and Verifier Implementation Plan

## Product reminder

**Dam Right is a flood-control infrastructure verification workspace. It compares an approved project plan with documented as-built conditions and evaluates the configured engineering checks against an engineer-approved standards pack. It is not a generic building checker, a dam-operation control system, or an automatic certification tool.**

Every workspace screen and issued result must also state:

> Results support engineering review. “Within tolerance” or “calculation passed” does not mean safe, certified, or professionally approved. Final acceptance requires review and sign-off by qualified engineers and the responsible authority.

The initial supported asset remains a straight, cast-in-place reinforced-concrete flood or retaining wall on a shallow foundation. Other flood-control assets must be marked `unsupported` until a reviewed calculation model and rule pack exist for them.

## 1. Goal

Unify the simplified live-metrics prototype and the existing engineering verifier into one coherent `/workspace` experience that answers five questions:

1. What flood-control project, structure, segment, design revision, and standards pack are being reviewed?
2. What does the approved plan require, and where is each value evidenced?
3. What was actually constructed, how was it measured, and what is the measurement uncertainty?
4. Which dimensional, material, hydraulic, geotechnical, and stability checks pass, fail, remain incomplete, or are unsupported?
5. What must be reviewed, corrected, dispositioned, and signed before the structure can be accepted?

## 2. Workspace information architecture

Use a persistent workspace header with the project name, structure ID, selected segment, approved-plan revision, as-built revision, standards-pack status, and overall review state.

The workspace will contain these sections:

### 2.1 Overview

- Project and structure identity.
- Explicit flood-control scope reminder and prototype limitation.
- Overall state: `Incomplete`, `Critical findings`, `Engineer review required`, or `Ready for engineer review`.
- Summary cards for open critical findings, missing evidence, out-of-tolerance measurements, unconfirmed inputs, and calculation failures.
- Live water-level telemetry shown as operational context, visually separated from design-compliance results.
- “Continue review” actions that lead to the next incomplete workflow step.

### 2.2 Plans and design basis

- Upload and identify drawings, specifications, calculations, geotechnical reports, hydrology reports, surveys, and approved revisions.
- Record the asset type, design flood, return period, datum, wall direction, wet/dry sides, and applicability limits.
- Display the selected standards pack, edition, rule status, and project-specific acceptance criteria.
- Require confirmation of every safety-critical input before it enters a calculation.
- Preserve source references such as drawing, sheet, detail, note, page, and revision.

### 2.3 Engineering checks

- Geometry and section validation.
- Differential hydrostatic pressure.
- Earth pressure and surcharge.
- Self-weight and retained-soil weight.
- Uplift and drainage-efficiency assumptions.
- Sliding and overturning factors of safety.
- Resultant location, eccentricity, full-base-contact/no-tension check, toe and heel pressure, and allowable bearing.
- Missing-information and model-applicability outcomes; missing or unsupported data must never appear as a pass.
- Calculation trace containing inputs, equations, units, assumptions, intermediate forces, moments, criteria, and rule references.

The existing deterministic engine in `lib/engineering/wall.ts` will remain the calculation source. The simplified equations currently embedded in `app/workspace/page.tsx` will be removed or clearly retained only as demonstration telemetry summaries to avoid two conflicting calculation paths.

### 2.4 As-built verifier/checker

- Segment and station-based comparison of approved versus as-built conditions.
- Initial characteristic register: wall height, crest elevation, stem thickness, base width and thickness, toe/heel geometry, alignment, concrete strength, cover, reinforcement evidence, joint spacing, drainage features, and foundation/bearing preparation evidence.
- For every measurement: value, unit, uncertainty, method, instrument, calibration reference, date, inspector, and evidence reference.
- Conservative tolerance evaluation using the adverse uncertainty bound.
- Checker confirmation gate before a result can be accepted.
- Row outcomes: `Within tolerance`, `Outside tolerance`, `Awaiting check`, `Not measured`, `Invalid input`, or `Unsupported`.
- Selecting a row will expose both approved-plan evidence and field evidence.
- A segment/station summary will show where failures, missing measurements, and conflicts occur.

The current `AsBuiltVerificationPanel` and comparison engine will be restored first, then expanded without weakening its uncertainty and confirmation rules.

### 2.5 Findings and nonconformances

- Create a finding automatically from calculation failures, missing critical evidence, and confirmed out-of-tolerance results.
- Severity, owner, due date, evidence, comments, and history.
- Engineering disposition: `Accept as built`, `Repair`, `Replace`, `Recalculate`, `Request more evidence`, or `Reject`.
- A dimensional nonconformance must not automatically be described as structural failure; its engineering consequence must be evaluated.
- Critical unresolved findings block release.

### 2.6 Evidence, trace, and report

- Unified evidence register linking documents, drawing locations, field records, tests, photos, measurements, and calculations.
- Immutable review snapshot for the approved design, as-built state, rule-pack version, and engine version.
- Reviewer/checker names and timestamps in the prototype; authenticated signatures in production.
- Reproducible verification report containing scope, exclusions, inputs, evidence, comparisons, calculations, findings, dispositions, and approvals.
- Clear watermark for demonstration or unsigned reports.

## 3. UI and safety-language requirements

- Add the product reminder below the workspace title and a shorter persistent label: `Flood-control plan & as-built verification`.
- Show `DEMONSTRATION — NOT FOR CERTIFICATION` whenever mock data, unapproved rules, or unsigned reviews are active.
- Reserve red for critical failures and release-blocking conditions; amber for review/incomplete states; green for checks ready for professional review.
- Never use green to claim that a structure is “safe.”
- Use `within tolerance`, `outside tolerance`, `calculation passed`, and `engineer approved` as separate states.
- Do not use `AI verified`, `certified`, or `compliant` unless the corresponding governed process is complete.
- Keep source evidence and rule citations one interaction away from every result.
- Keep tables usable on mobile through stacked measurement cards; do not rely on a very wide horizontal table as the only interface.
- Preserve keyboard navigation, visible focus, field labels, units, error descriptions, and status text that does not depend on color alone.

## 4. Implementation phases

### Phase 1 — Restore the complete local verifier

Target: the next implementation milestone.

- Replace the simplified one-screen workspace with a sectioned workspace shell.
- Restore the existing engineering input, load-case, deterministic result, finding, calculation-trace, and as-built comparison interfaces.
- Add `Overview`, `Plans & Inputs`, `Engineering Checks`, `As-Built Checker`, and `Findings & Trace` navigation.
- Add the flood-control scope reminder and demonstration/certification warnings to the landing page and workspace.
- Use one calculation source of truth.
- Preserve all current mock data in local React state; no Supabase dependency.
- Add responsive layouts for the comparison checker and workspace navigation.

Acceptance criteria:

- A user can reach every restored feature from `/workspace`.
- The selected section is obvious and keyboard accessible.
- Editing an engineering input updates one deterministic result set.
- An unconfirmed as-built measurement cannot show an accepted result.
- A critical missing, invalid, or outside-tolerance characteristic blocks release.
- Operational telemetry is visibly distinct from compliance findings.
- `npm run test`, `npm run typecheck`, and `npm run build` pass.

### Phase 2 — Complete the manual plan-versus-as-built workflow

- Introduce project, structure, segment, document, approved-state, and as-built-state types.
- Add revision selection and prevent silent overwriting of the approved baseline.
- Expand the characteristic register and field evidence form.
- Add missing/unsupported/applicability logic to every engineering module.
- Add finding creation, disposition, closure, and release-blocking rules.
- Add an evidence drawer and source-reference links from all inputs and results.
- Add printable/exportable local report generation using the frozen mock snapshot.

Acceptance criteria:

- A reviewer can complete a fully manual comparison from approved values through checker confirmation and disposition.
- Every accepted input and result has a source reference.
- A report can be reproduced from its captured snapshot.
- Changing the approved revision creates a new review context rather than rewriting the prior one.

### Phase 3 — Standards and engineering validation

- Replace the draft/global `FS ≥ 1.50` assumption with a versioned, engineer-approved Philippine flood-control rule pack and project overrides.
- Record issuer, title, edition, effective date, section citation, parameter, applicability, and approval status for every rule.
- Add reinforced-concrete, hydraulic/freeboard, scour, drainage, settlement, and other checks only after their supported models are independently reviewed.
- Create independently checked benchmark cases covering passing, failing, boundary, missing-data, and sign-convention scenarios.

Acceptance criteria:

- No rule is labelled active before technical review and software verification.
- Every calculation finding identifies the exact rule version and evidence.
- Benchmark outputs are approved independently of the rule author.
- Unsupported assets and unavailable checks are explicitly reported.

### Phase 4 — Persistence, governance, and signed reporting

- Add authenticated organizations, roles, projects, and project-scoped authorization.
- Store immutable originals, revisions, approved baselines, as-built snapshots, calculation runs, findings, and audit events.
- Add two-person approval, signature, report hash, and supersession workflow.
- Add private file storage, malware scanning, size limits, backups, and retention controls.

Acceptance criteria:

- Users cannot access another organization’s project.
- Issued reports reference immutable document, input, rule, engine, and calculation versions.
- Later changes invalidate the affected approval and create a new version.

### Phase 5 — Assisted document extraction

- Add deterministic PDF text/table/vector extraction first.
- Add OCR for raster drawings only after the manual workflow is stable.
- Present extracted values as candidates with source overlays, confidence components, units, and conflicts.
- Require human confirmation for critical values; AI/OCR output never writes directly to an approved calculation input.

Acceptance criteria:

- Critical extraction errors are measured against an approved test corpus.
- Ambiguous, conflicting, unitless, or superseded evidence is blocked from calculations.
- The assisted workflow is demonstrably faster without reducing review accuracy.

### Phase 6 — Field telemetry integration

- Add device identity, calibration, timestamps, sequence numbers, quality flags, connectivity health, and stale/fault states.
- Compare monitored water level with approved thresholds without mixing operational alarms with design-compliance findings.
- Add persistence, hysteresis, offline buffering, and documented alarm-response roles.

Acceptance criteria:

- Sensor faults cannot appear as a safe water level.
- Live alarms and engineering verification findings remain separate but traceable.
- Field comparison demonstrates acceptable accuracy and recovery from connection loss.

## 5. Recommended component structure for Phase 1

```text
app/
  workspace/
    page.tsx                    Server route shell
components/workspace/
  WorkspaceClient.tsx          Local prototype state and section routing
  WorkspaceHeader.tsx          Project identity, scope reminder, review state
  WorkspaceNavigation.tsx      Accessible section navigation
  OverviewSection.tsx          Summary, telemetry context, next actions
  PlansInputsSection.tsx       Evidence intake, geometry, materials, criteria
  EngineeringChecksSection.tsx Load cases, metrics, findings, trace
  AsBuiltCheckerSection.tsx    Segment comparisons and field evidence
  FindingsTraceSection.tsx     Findings, assumptions, evidence, limitations
lib/
  engineering/                 Deterministic calculations and findings
  verification/                Approved-versus-as-built comparisons
  workspace/                   Shared prototype types, selectors, mock state
```

The route should remain a Server Component. Only the interactive workspace boundary and its descendants should use `"use client"`, keeping the client boundary deliberate and avoiding one oversized route component.

## 6. Phase 1 work order

1. Define shared workspace mock state and remove duplicate calculation formulas.
2. Build the workspace shell, responsive navigation, and persistent safety reminder.
3. Refactor the current `EngineeringReviewDashboard` into plan/input and engineering-check sections.
4. Refactor `AsBuiltVerificationPanel` into a responsive checker section using the same approved project/segment state.
5. Add the overview summaries and keep telemetry explicitly labelled as mock operational data.
6. Add findings/trace aggregation and release-blocking status logic.
7. Add focused unit tests for aggregation, blocking states, missing information, and cross-section state updates.
8. Run type, test, build, keyboard, desktop, and mobile visual checks.

## 7. Phase 1 definition of done

Phase 1 is complete when the prototype lets a reviewer identify a flood-control wall project, inspect its design basis, confirm manual engineering inputs, run the existing deterministic checks, compare approved and as-built characteristics with uncertainty and evidence, see all blockers in one place, and understand that the output is review support—not certification.

