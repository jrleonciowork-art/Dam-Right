# Dam Right Workspace UX Redesign Plan

## 1. Objective

Redesign `/workspace` from a long engineering form into a guided flood-control verification workflow. Preserve all calculations, evidence, assumptions, and as-built checks while showing users only the information needed for their current decision.

The redesigned workspace must let a reviewer answer these questions within seconds:

1. Is the review blocked?
2. What caused the current status?
3. Which structure segment is affected?
4. What action must be completed next?
5. Where can the reviewer inspect the supporting evidence and calculations?

The interface must continue to state that `within tolerance` and `calculation passed` are review results, not safety certification or professional approval.

## 2. Design principles

### Decision first, detail on demand

Show the review state, affected item, and next action before displaying equations or technical background.

### Progressive disclosure

Keep required inputs visible. Move advanced parameters, calculation assumptions, evidence metadata, and equations into expandable panels or drawers.

### One workflow, one source of truth

All tabs use the same local workspace state and the existing deterministic engineering and verification engines. Do not create separate calculations for overview cards.

### Traceability without clutter

Every result remains linked to its input, evidence, rule, and assumption, but those details appear when a user expands or selects the result.

### Safety language

Use `within tolerance`, `outside tolerance`, `calculation passed`, `incomplete`, `unsupported`, and `engineer approved` as distinct states. Never use green or the word `safe` to imply certification.

## 3. Target information architecture

Replace the current continuous page with a workspace shell containing five primary tabs.

### 3.1 Overview

Purpose: summarize the decision state and direct the reviewer to the next task.

Content:

- Overall review status.
- Project, structure, segment, plan revision, as-built revision, and standards-pack status.
- Five compact summary metrics: failed checks, incomplete requirements, unconfirmed evidence, out-of-tolerance characteristics, and passed checks.
- Primary engineering values: sliding FS, overturning FS, toe pressure, heel pressure, and water level.
- Prioritized next-actions list.
- Small operational-context panel for mock water level, clearly separated from verification status.

The overview must not show editable engineering forms, complete equations, or the full findings list.

### 3.2 Plan & Design

Purpose: establish the approved baseline and confirmed design inputs.

Sections:

- Project identity and supported asset scope.
- Approved plan and as-built revision cards.
- Document intake.
- Geometry.
- Materials and geotechnical inputs.
- Hydraulic and load-case inputs.
- Project acceptance criteria and standards pack.

Input groups will use accordions with completion summaries such as `6 of 6 complete` or `1 critical input missing`.

Initially expanded:

- Project identity.
- Required geometry.
- Current load case.

Initially collapsed:

- Advanced materials.
- Drainage assumptions.
- Project-specific criteria.
- Model limitations.

### 3.3 Engineering Checks

Purpose: communicate results before exposing the full calculation trace.

Content:

- Visual threshold bars for sliding and overturning factors of safety.
- Compact pressure cards for toe and heel values.
- Small wall cross-section showing water level, toe, heel, base, and force direction.
- Findings grouped into `Failed`, `Incomplete`, `Review`, `Passed`, and `Not applicable`.
- Expandable finding cards containing equation, demand, capacity, rule, assumptions, and related inputs.
- A collapsed `Calculation trace` panel for forces, moments, equations, and model limitations.

### 3.4 As-Built Verification

Purpose: compare the approved design with field evidence without displaying every evidence field at once.

Default row content:

- Characteristic.
- Approved value.
- As-built value and uncertainty.
- Signed variance.
- Result.
- Evidence/checker state.

Selecting a row opens a detail drawer containing:

- Measurement method.
- Instrument and calibration reference.
- Measurement date and inspector.
- Source drawing reference.
- Field evidence reference.
- Accepted range.
- Conservative uncertainty interval.
- Checker confirmation.
- Engineering disposition.

Additional controls:

- Segment selector.
- Status filters.
- `Critical only` filter.
- Release-blocking summary.
- Empty-segment warning that states `Missing verification scope`, never `Passed`.

### 3.5 Findings & Report

Purpose: provide one actionable queue for all unresolved work.

Finding sources:

- Engineering calculation failures.
- Missing required inputs.
- Unsupported checks.
- Confirmed out-of-tolerance measurements.
- Unconfirmed critical evidence.

Each finding shows:

- Severity.
- Short title.
- Structure segment.
- Source module.
- Owner placeholder.
- Current disposition.
- Next action.

The tab also contains:

- Filters by severity and state.
- Expandable evidence and calculation trace.
- Demonstration report preview.
- Disabled or labelled mock `Export report` action until report generation exists.

## 4. Workspace shell

### Persistent header

The header contains:

- Back to home.
- `Dam Right` and `Flood-control verification workspace`.
- Project and structure name.
- Selected segment.
- Review status.
- `Demonstration · Not for certification` badge.

The detailed safety explanation becomes a compact dismissible information panel. Its meaning remains available through an information control after dismissal.

### Desktop navigation

Use a left sidebar or horizontal tab bar depending on available width. Each item shows a status indicator:

- Overview.
- Plan & Design — `1 missing`.
- Engineering Checks — `3 failed`.
- As-Built Verification — `1 blocked`.
- Findings & Report — `5 open`.

### Mobile navigation

Use a horizontally scrollable tab bar below the compact header. Avoid a permanent sidebar. Preserve visible tab labels and status dots.

## 5. Visual system

### Status colors

- Red: critical and release-blocking.
- Amber: review required or awaiting confirmation.
- Violet: incomplete or unsupported.
- Green: check completed or within tolerance, never an overall `safe` status.
- Slate/cyan: neutral information and active navigation.

### Content density

- Limit overview cards to one label, one value, and one short status.
- Limit section descriptions to one sentence.
- Replace repeated explanations with tooltips or `Why this matters` disclosures.
- Avoid nested bordered cards deeper than two levels.
- Use whitespace to separate workflow stages instead of adding borders everywhere.

### Data visualization

Build code-native visuals rather than static images:

- FS threshold bar.
- Plan/as-built comparison bar.
- Wall cross-section diagram.
- Segment status strip or station map.

Every visualization must also include text values and status labels for accessibility.

## 6. State and calculation architecture

Create a single client workspace boundary that owns the prototype state:

```text
WorkspaceClient
├─ project and revision state
├─ engineering WallInput
├─ field measurements
├─ confirmation state
├─ selected segment
├─ selected tab
├─ filters and expanded panels
└─ derived calculation, comparisons, findings, and next actions
```

Rules:

- `calculateWallReview()` remains the only engineering-calculation source.
- `compareAsBuilt()` remains the only design-versus-as-built comparison source.
- Overview metrics are selectors derived from those results.
- Editing an input invalidates its confirmation state.
- Critical incomplete or outside-tolerance states remain release blocking.
- Navigation and disclosure state may be local UI state; engineering state must remain shared.

## 7. Proposed component structure

```text
app/workspace/
  page.tsx

components/workspace/
  WorkspaceClient.tsx
  WorkspaceHeader.tsx
  WorkspaceTabs.tsx
  ReviewStatusBanner.tsx
  ScopeNotice.tsx

  overview/
    OverviewTab.tsx
    MetricCard.tsx
    NextActions.tsx
    OperationalContext.tsx

  plan/
    PlanDesignTab.tsx
    InputGroup.tsx
    RevisionCard.tsx
    DocumentIntake.tsx
    GeometryInputs.tsx
    MaterialInputs.tsx
    LoadCaseInputs.tsx

  checks/
    EngineeringChecksTab.tsx
    FactorOfSafetyBar.tsx
    WallSectionDiagram.tsx
    FindingGroup.tsx
    FindingCard.tsx
    CalculationTrace.tsx

  verification/
    AsBuiltTab.tsx
    ComparisonList.tsx
    ComparisonRow.tsx
    MeasurementDrawer.tsx
    VerificationFilters.tsx

  findings/
    FindingsReportTab.tsx
    FindingQueue.tsx
    FindingDetail.tsx
    ReportPreview.tsx

lib/workspace/
  mock-state.ts
  selectors.ts
  findings.ts
  types.ts
```

## 8. Implementation phases

### Phase 1 — Workspace shell and overview

Deliverables:

- Create the shared `WorkspaceClient` state boundary.
- Add the persistent project header and responsive tab navigation.
- Move the safety message into a compact scope notice.
- Build the decision-focused overview.
- Generate next actions from calculation and verification results.
- Remove duplicate information from the overview.

Acceptance criteria:

- The first viewport communicates status, cause, and next action without scrolling.
- Every current feature remains reachable.
- Navigation works with keyboard and touch.
- The overview contains no independent calculation formulas.
- Desktop and mobile layouts have no horizontal page overflow.

### Phase 2 — Plan and input restructuring

Deliverables:

- Move project, geometry, material, criteria, and load-case forms into `Plan & Design`.
- Add accordion groups with completion states.
- Separate required and advanced inputs.
- Add units, validation text, and missing-input summaries.
- Preserve the confirmation and restore-demonstration actions.

Acceptance criteria:

- Required inputs are visible within one interaction.
- Advanced fields are collapsed by default.
- Changing any calculation input updates all dependent results and marks the input set unconfirmed.
- Missing critical inputs are visible in the tab status and overview.

### Phase 3 — Engineering-result visualization

Deliverables:

- Add FS threshold bars.
- Add a responsive wall cross-section diagram.
- Group findings by result state.
- Move equations and full forces/moments into expandable detail.
- Keep assumptions and unsupported checks visible inside the calculation trace.

Acceptance criteria:

- A reviewer can identify each failed threshold without reading an equation.
- Numeric values remain available beside every visual.
- Expanding a finding exposes its calculation and assumptions.
- Existing engineering unit tests continue to pass unchanged.

### Phase 4 — As-built list and evidence drawer

Deliverables:

- Replace the wide default table with compact comparison rows.
- Add status and criticality filters.
- Add the measurement detail drawer.
- Move method, instrument, date, evidence, confirmation, and disposition into the drawer.
- Add plan-versus-as-built comparison bars.

Acceptance criteria:

- The default list is scannable without horizontal scrolling.
- A row displays the approved value, as-built value, uncertainty, and outcome.
- Editing a measurement clears its checker confirmation.
- Unconfirmed critical evidence remains release blocking.
- The complete uncertainty interval remains the comparison basis.

### Phase 5 — Unified findings and report preview

Deliverables:

- Aggregate engineering and as-built findings into one queue.
- Add severity/state filters.
- Add disposition controls using local state.
- Add a demonstration report preview containing scope, results, evidence, limitations, and unresolved items.

Acceptance criteria:

- Every release blocker appears in one findings queue.
- Resolving or changing a source result updates the queue.
- Dimensional nonconformance is not described automatically as structural failure.
- Reports remain visibly marked as unsigned demonstration output.

### Phase 6 — Refinement and accessibility

Deliverables:

- Keyboard and screen-reader review.
- Focus management for tabs, accordions, and drawers.
- Reduced-motion behavior.
- Empty, incomplete, loading, and unsupported states.
- Copy reduction and consistency pass.
- Mobile, tablet, and desktop visual QA.

Acceptance criteria:

- All controls have accessible names and visible focus states.
- Status is never communicated by color alone.
- Opening and closing the measurement drawer returns focus correctly.
- The workspace remains usable at 320 px width and 200% zoom.
- No important content is hidden exclusively in hover interactions.

## 9. Testing plan

### Unit tests

- Overview summary selectors.
- Next-action prioritization.
- Tab status counts.
- Release-blocking aggregation.
- Confirmation invalidation after edits.
- Finding aggregation and disposition state.

### Integration tests

- Editing water level updates calculations, overview, checks, and findings.
- Editing an as-built value updates comparison status and release state.
- Confirming evidence changes `Awaiting check` to the correct tolerance result.
- Missing allowable bearing remains incomplete instead of passing.
- Changing segments updates the comparison list without changing the approved baseline.

### Visual and accessibility checks

- Mobile: 390 × 844.
- Tablet: 768 × 1024.
- Desktop: 1440 × 900.
- Keyboard-only workflow.
- Reduced-motion mode.
- 200% browser zoom.
- Red/green status distinguishability using labels and icons.

Required commands after each phase:

```bash
npm run test
npm run typecheck
npm run build
```

## 10. Definition of done

The redesign is complete when a first-time reviewer can identify the current project state and next action in the first viewport, move through the five review stages without losing context, inspect calculations and evidence on demand, complete the existing plan-versus-as-built workflow on desktop or mobile, and understand that the result supports—but does not replace—qualified engineering approval.

