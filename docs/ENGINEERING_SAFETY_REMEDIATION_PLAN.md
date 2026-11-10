# Dam Right Comprehensive Engineering Safety Remediation Plan

## 1. Purpose

This plan removes the current false-assurance paths in which a flood-wall review can appear ready, passed, or compliant even though mandatory engineering information is missing, substituted with generic defaults, unsupported by the model, or invalidated by foundation conditions.

The finished workflow must behave as an engineering review gate, not as a collection of independent green calculation cards. A project is **ready for engineer review** only when every applicable mandatory check has been evaluated, every required input has an acceptable basis, and no unresolved release blocker remains. Readiness is not approval or certification.

This revision incorporates the findings from the 7 November 2026 re-examination. The blueprint extraction **auto-confirmation behavior** remains outside the scope of this remediation. Runtime validation, provenance, file safety, and the prohibition against engineering fallback values are in scope because they directly affect calculation validity.

The plan is organized so that unsafe result publication is stopped before new engineering solvers are added. Completing a later phase cannot compensate for an unmet earlier exit gate.

## 2. Safety rules to establish first

The following rules are non-negotiable and must be encoded once, tested directly, and reused by the workspace, findings queue, and report preview:

1. A critical `insufficient_information` result blocks release.
2. An `unsupported` mandatory check blocks release.
3. A failed critical check blocks release.
4. An unresolved critical as-built comparison blocks release.
5. A warning can permit continued review but cannot be silently converted into a pass.
6. A non-applicable result is allowed only when applicability has been explicitly determined and its basis recorded.
7. A calculation pass applies only to that calculation and load case. It does not establish overall structural safety.
8. “Ready for engineer review” is distinct from “Engineer approved.”
9. A result dependent on missing, invalid, or physically compromised inputs must be `insufficient_information` or `not_evaluated`, not a numeric pass.
10. A missing project value must never be replaced by a generic engineering value in a compliance calculation.
11. Acceptance criteria, load combinations, drainage assumptions, and applicability decisions must come from a versioned approved rule pack or an authorized project override—not editable display text.
12. A stale calculation must never remain current after a dependency changes.
13. Evidence coordinates, confidence values, revision states, and source references must represent actual processor output; placeholders cannot be presented as traceable evidence.

## 3. Target review-state model

Replace the current loosely coupled status checks with one review-state model.

```ts
type CheckStatus =
  | "pass"
  | "fail"
  | "warning"
  | "insufficient_information"
  | "unsupported"
  | "not_applicable"
  | "not_evaluated";

type ReviewGateState =
  | "blocked_failure"
  | "blocked_incomplete"
  | "blocked_unsupported"
  | "engineer_review_required"
  | "ready_for_engineer_review"
  | "engineer_approved";
```

Every check must also carry:

- applicability: `mandatory`, `conditional`, or `not_applicable`;
- release impact: `blocking` or `advisory`;
- discipline and check family;
- load case and limit state;
- input/evidence dependencies;
- standards-rule identifier and version, when available;
- criterion source: approved rule, authorized project override, or none;
- input provenance and approval state;
- calculation-engine version;
- calculation timestamp and dependency fingerprint;
- a reason when it is unsupported, incomplete, or not applicable.

Create a pure review-gate function in a dedicated module, for example `lib/review/release-gate.ts`. The UI must consume its result instead of deriving readiness independently.

## 4. Workstream A — Correct release gating

### Implementation

1. Move overall-state logic out of `EngineeringReviewDashboard.tsx`.
2. Replace `reviewStatus === "critical" || comparisonSummary.releaseBlocked` with the centralized review gate.
3. Treat mandatory `insufficient_information`, `unsupported`, and `not_evaluated` outcomes as release blockers.
4. Include unconfirmed standards packs, absent governing load cases, and missing mandatory evidence in the same gate.
5. Return structured blocker records rather than only a Boolean:
   - check or evidence identifier;
   - blocker category;
   - severity;
   - responsible discipline;
   - recommended next action.
6. Use the same gate result for:
   - workspace header;
   - overview status;
   - navigation badges;
   - findings queue;
   - report preview;
   - report export eligibility.
7. Do not allow `engineer_approved` until a later governed approval action is implemented. The local prototype may stop at `ready_for_engineer_review`.

### UI language

- `Blocked — failed mandatory check`
- `Blocked — required engineering information missing`
- `Blocked — mandatory analysis unsupported`
- `Engineer review required`
- `Ready for engineer review`

Do not display an overall `Passed`, `Safe`, or `Compliant` state.

### Acceptance tests

- Missing allowable bearing pressure produces `blocked_incomplete`.
- Missing design scour basis produces `blocked_incomplete`.
- A mandatory unsupported structural-capacity module produces `blocked_unsupported` even when sliding and overturning pass.
- A critical failure takes precedence over incomplete/advisory results.
- A noncritical warning produces `engineer_review_required`, not a release block or overall pass.
- Workspace, tabs, findings, and report preview show the same gate state and blocker count.

## 5. Workstream B — Eliminate silent engineering defaults

The blueprint compliance path currently fills missing project parameters with generic values before calling the deterministic engine. This can produce passing stability results from data that the missing-data detector correctly identifies as unavailable. That behavior must be removed before any compliance output is considered trustworthy.

### Required changes

1. Delete fallback substitutions for friction coefficient, soil friction angle, allowable bearing pressure, surcharge, drainage efficiency, water level, toe width, retained-soil height, and other safety-relevant quantities in `lib/blueprint/compliance.ts`.
2. Pass only explicit, schema-valid, traceable project values into the calculation engine.
3. Add a prerequisite evaluator that returns all missing dependencies for each requested check.
4. If any mandatory dependency is missing:
   - do not run that check;
   - emit `insufficient_information` for that check;
   - identify every missing field and its engineering consequence;
   - add a structured release blocker.
5. Do not count incomplete checks in the `passed` counter.
6. Replace the compliance result union with the shared engineering status model so blueprint and workspace results cannot disagree.
7. Remove blanket `try/catch` behavior that silently drops calculation failures. Convert caught errors to an auditable `not_evaluated` result with a stable error code.
8. Add a runtime schema at the API boundary. Reject or quarantine extracted values with wrong types, non-finite numbers, impossible ranges, missing units, or inconsistent dimensional chains.
9. Preserve extracted values separately from accepted engineering inputs. A missing value stays missing throughout the compliance path.

### Input-state model

Every safety-relevant value must distinguish these states:

```ts
type EngineeringInput<T> = {
  value: T | null;
  unit: string;
  state: "provided" | "missing" | "invalid" | "conflicting" | "not_applicable";
  sourceReference: string | null;
  evidenceRevisionId: string | null;
  acceptedBy: string | null;
};
```

Do not encode `missing`, `not applicable`, or `unknown` as numeric zero.

### Acceptance tests

- Missing friction coefficient prevents a sliding calculation; no assumed 0.45 value appears anywhere in the result.
- Missing allowable bearing pressure cannot produce a bearing pass using 150 kPa.
- Missing water level cannot be replaced by wall height minus freeboard.
- Missing drainage efficiency cannot receive a 30% reduction in uplift.
- A partial input set reports which checks can still run and which are blocked.
- The blueprint summary cannot display `Fully compliant` while `criticalMissing > 0`.
- Invalid model output becomes a visible `not_evaluated` finding rather than disappearing.

## 6. Workstream C — Make scour and foundation information mandatory

### Data-model changes

Do not use numeric zero as a proxy for “not supplied.” Change scour and foundation inputs to carry explicit state and evidence:

```ts
type ScourBasis = {
  applicability: "applicable" | "not_applicable" | "undetermined";
  designScourDepthM: number | null;
  designEvent: string | null;
  method: string | null;
  sourceReference: string | null;
  approvedBy: string | null;
};
```

Also add source/evidence fields for footing embedment, cutoff depth, groundwater levels, soil classification, and allowable bearing pressure. An explicit `not_applicable` determination requires a justification and reviewer identity; an empty or default-zero field cannot establish non-applicability.

### Calculation changes

1. Remove the current “No hydraulic scour applied” pass outcome.
2. If scour applicability is undetermined, return critical `insufficient_information`.
3. If scour applies but depth or basis is missing, return critical `insufficient_information`.
4. If scour is explicitly not applicable, return `not_applicable` with the recorded justification.
5. When scour reaches or exceeds footing embedment:
   - retain the critical undermining failure;
   - mark bearing/contact-pressure results as not valid for the assumed full base;
   - mark any dependent sliding and overturning result `not_evaluated` unless a validated post-scour model is used;
   - never continue to present full-base numerical results as passing.
6. When partial scour changes soil support, do not automatically assume the original allowable bearing pressure and full contact width remain valid. Require a geotechnical reassessment or an independently validated effective-support model.
7. Treat Lane's weighted creep ratio as a screening method until its applicability and criteria are approved in the standards pack. Avoid text such as “safe threshold”; use “configured screening criterion.”
8. Couple seepage, uplift, drainage, cutoff, and scour assumptions so mutually inconsistent inputs cannot be evaluated as independent passes.

### Validation requirements

- Independently check scour and seepage methods against the selected Philippine public-works design basis and project specifications.
- Add boundary tests for zero head, zero/missing scour, scour at the footing level, scour below the cutoff tip, partial support loss, and reverse head.
- Add a benchmark in which conventional sliding/overturning would pass before scour but the review remains blocked after foundation support is compromised.

## 7. Workstream D — Add an engineering applicability and completeness matrix

The current engine evaluates only a subset of the governing failure modes. Make that limitation machine-readable rather than leaving it only in explanatory text.

### Required check families

For each project segment and governing load case, record one status for every applicable family:

| Discipline | Check family | Initial implementation disposition |
| --- | --- | --- |
| Hydraulic | Design flood, datum, freeboard and overtopping | Mandatory; implement deterministic rules |
| Hydraulic/geotechnical | Scour and erosion protection | Mandatory; implement after method validation |
| Geotechnical | Bearing resistance and foundation preparation | Mandatory |
| Geotechnical | Settlement | Mandatory input or specialist-result check |
| Geotechnical | Global stability | Mandatory external specialist-result check until a validated solver exists |
| Geotechnical | Seepage, piping and uplift | Mandatory where differential head exists |
| Geotechnical | Liquefaction | Conditional on seismicity and susceptible soils; missing screening blocks when applicable |
| Structural | Stem, toe, heel and base flexure | Mandatory |
| Structural | One-way shear and other applicable shear modes | Mandatory |
| Structural | Reinforcement, cover, development, laps and joints | Mandatory |
| Structural | Crack/serviceability and durability | Mandatory for exposure and design life |
| Loading | Seismic earth and hydrodynamic effects | Conditional under the governing design basis |
| Loading | Debris, impact, wave, current, vehicle and construction cases | Applicability must be decided explicitly |
| Geometry | Corners, transitions and discontinuities | Unsupported in the 2D segment model unless separately assessed |

### Implementation sequence

1. Build the completeness matrix and blocker behavior before adding new solvers.
2. Represent unavailable modules as `unsupported`, never as absent rows or implicit passes.
3. Add specialist-result inputs for settlement, global stability, liquefaction, and other analyses that will remain outside the application initially. Store the source report, governing case, result, acceptance criterion, author, checker, and date.
4. Implement deterministic hydraulic/freeboard and reinforced-concrete checks only after equations, load combinations, material factors, and standards citations are technically approved.
5. Version every calculation and rule so earlier reviews remain reproducible.

### Dependency invalidation

Maintain an explicit dependency graph. Examples:

- A changed design flood invalidates freeboard, hydrostatic, uplift, seepage, scour, sliding, overturning, and bearing results.
- A changed scour depth invalidates effective support, seepage path, foundation, and related stability results.
- A changed wall geometry invalidates self-weight, force lever arms, base pressure, and structural demand.
- A changed soil parameter invalidates earth pressure and relevant geotechnical checks.

When an upstream input changes, affected results become `not_evaluated` until recalculated. Do not leave stale green results visible as current.

## 8. Workstream E — Separate calculation results from project readiness

### Presentation changes

1. Label factor-of-safety cards as `Calculated for selected model and load case`.
2. Show the load case, rule version, and model-validity state adjacent to each result.
3. Use green only for a completed individual check, not for the project-level review state.
4. Add a persistent “Analysis coverage” panel listing:
   - evaluated checks;
   - incomplete checks;
   - unsupported checks;
   - not-applicable checks and their bases.
5. If a result is invalidated by scour, missing geotechnical information, or model-domain failure, replace the number with `Not evaluated` and explain why.
6. The report preview must include unresolved blockers and exclusions before any summary of passed calculations.
7. Disable final report issuance while the centralized gate is blocked. A draft report may still be generated with an `INCOMPLETE — NOT FOR APPROVAL` watermark.

## 9. Workstream F — Govern standards, criteria, and engineering assumptions

Free-text standards names and unrestricted acceptance fields do not constitute an approved design basis. Replace them with governed records.

### Rule-pack requirements

1. Create immutable `RulePack`, `RuleVersion`, `Criterion`, `LoadCombination`, and `ProjectOverride` types.
2. Each criterion must identify issuer, document, edition, section, applicability, units, limit-state category, value, approval state, author, checker, and effective date.
3. Draft or superseded rule packs can support exploration but must block readiness.
4. The calculation engine receives resolved criteria; it must not read user-facing standards labels or global constants.
5. Project overrides require justification, authority, checker approval, timestamp, and linkage to the affected checks.
6. Drainage efficiency requires a design basis, drainage configuration, blockage case, maintenance assumption, and approved value per load case.
7. Prevent arbitrary lowering of sliding/overturning criteria or increasing drainage relief through ordinary form edits.
8. Freeze the rule-pack version and resolved criteria with every calculation run.

### Acceptance tests

- Changing the standards-pack label cannot change a criterion.
- An unapproved rule pack blocks readiness.
- An unauthorized project override is rejected.
- A valid approved override invalidates affected calculations and creates a new review snapshot.
- A report reproduces the exact criterion values and citations used by the calculation.

## 10. Workstream G — Harden document ingestion and evidence provenance

This workstream does not change the excluded auto-confirmation behavior. It ensures that document-processing output cannot masquerade as verified source evidence or compromise the service.

### API and file controls

1. Enforce an allowlist for PDF, PNG, and JPEG using detected file signatures, not only client MIME values.
2. Set request, file-size, page-count, pixel-count, and processing-time limits before reading the full file into memory.
3. Reject encrypted, malformed, polyglot, or unsupported documents with stable error codes.
4. Apply authentication, project authorization, rate limiting, audit logging, and secret-handling controls before production use.
5. Never return provider error bodies or credentials to the browser or routine logs.
6. Validate the external model response with the runtime engineering schema before downstream use.

### Provenance controls

1. Remove hard-coded bounding polygons, confidence scores, page numbers, and approved revision states.
2. If the processor cannot produce real coordinates or confidence components, mark those fields unavailable.
3. Store document checksum, source revision, page, region, extraction method, processor version, and timestamp.
4. Reject superseded or ambiguous revisions from governing calculations.
5. Make every displayed evidence link resolve to the actual source page and region.

### Acceptance tests

- Spoofed MIME types and oversized files are rejected before model invocation.
- Malformed external JSON cannot reach the engineering engine.
- No placeholder coordinate or confidence value appears as evidence.
- Provider errors produce sanitized client responses and detailed internal audit events.
- Superseded drawings cannot become the controlling calculation source.

## 11. Workstream H — Verification and independent engineering review

### Automated tests

Add focused tests at four levels:

1. **Calculation tests:** equations, units, signs, boundaries, reverse load cases, invalid inputs and dependency invalidation.
2. **Release-gate tests:** every combination of fail, incomplete, unsupported, warning, non-applicable and comparison status.
3. **Integration tests:** changing a critical input updates calculations, blocker list, workspace state and report state consistently.
4. **Regression tests:** known unsafe configurations can never produce a ready state.

Use property-based or generated cases where practical to test invariants such as:

- increasing adverse water head cannot improve a result solely because of a sign or clamping error;
- missing capacity cannot pass a demand/capacity check;
- loss of support cannot leave dependent bearing results valid;
- a mandatory unresolved result always blocks readiness.

### Independent technical verification

- Each engineering module requires a calculation note, governing references, applicability limits, hand-checked benchmark cases, and approval by a qualified engineer other than the implementer.
- Benchmarks must include passing, failing, boundary, incomplete, unsupported and sign-convention cases.
- Software verification must compare unrounded intermediate values, not only displayed numbers.
- Release evidence must identify the rule-pack version, engine version and benchmark version.

## 12. Delivery program

### Phase 0 — Contain false assurance

Target: first deployable change set. Do not wait for new engineering modules.

- Add the centralized release gate and structured blockers.
- Block on mandatory failure, incomplete information, unsupported analysis, invalid data, and stale results.
- Remove generic engineering fallbacks from blueprint compliance.
- Remove the zero-scour pass.
- Stop counting incomplete checks as passed.
- Replace project-level `Passed`, `Fully compliant`, and misleading green readiness states.
- Convert swallowed calculation exceptions to visible `not_evaluated` findings.
- Add regression tests for each known false-assurance path.

Exit gate: no missing, assumed, unsupported, stale, or physically invalid mandatory condition can display `Ready for engineer review`.

### Phase 1 — Shared safety domain and calculation prerequisites

- Introduce shared statuses, applicability, release impact, input state, provenance, and dependency types.
- Add per-check prerequisite evaluation.
- Add the engineering completeness matrix.
- Add explicit design-basis, scour-basis, geotechnical-basis, and drainage-basis records.
- Implement dependency fingerprints and result invalidation.
- Make blueprint compliance and workspace checks consume the same domain types.

Exit gate: every requested check either runs with complete traceable inputs or returns an explicit blocker; no check silently disappears.

### Phase 2 — Governed standards and criteria

- Implement immutable rule-pack and project-override records.
- Remove free-text standards and unrestricted criteria from calculation control.
- Resolve criteria and load combinations before calculation.
- Store the resolved rule version and criteria with each run.
- Add rule lifecycle and two-person technical/software approval.

Exit gate: every pass/fail result identifies an approved criterion and calculation version; draft or unapproved rules block readiness.

### Phase 3 — Foundation, scour, seepage, and geotechnical validity

- Validate and implement the approved scour and seepage approach.
- Couple support loss to bearing/contact/stability validity.
- Replace Lane's creep language with approved screening terminology and applicability.
- Add specialist-result capture for settlement, global stability, and liquefaction.
- Add independently checked benchmark cases and sign-convention tests.

Exit gate: compromised or unknown foundation support cannot coexist with a valid/pass bearing or stability presentation.

### Phase 4 — Structural, hydraulic, and load-case completeness

- Implement reviewed reinforced-concrete flexure, shear, serviceability, durability, and detailing modules.
- Implement design-flood, datum, freeboard, overtopping, erosion-protection, and drainage checks.
- Add conditional seismic, hydrodynamic, debris, impact, wave/current, vehicle, construction, maintenance, and rapid-drawdown applicability.
- Represent any remaining unavailable mandatory method as `unsupported` and release-blocking.

Exit gate: the supported wall type has no silently omitted mandatory failure mode for the selected project conditions.

### Phase 5 — Document and evidence hardening

- Add file validation, resource limits, runtime response schemas, sanitized errors, and audit records.
- Replace placeholder evidence metadata with actual processor output or explicit unavailable states.
- Enforce document revision and supersession rules.
- Link every accepted input and finding to reproducible evidence.

Exit gate: unvalidated, ambiguous, placeholder, or superseded document evidence cannot influence an engineering result.

### Phase 6 — Governed review, persistence, and reporting

- Freeze input, evidence, rule, engine, and calculation versions for each review snapshot.
- Add authenticated preparer/checker/approver roles and immutable decisions.
- Make report issuance conditional on the centralized release gate.
- Preserve incomplete drafts with an `INCOMPLETE — NOT FOR APPROVAL` watermark.
- Add report hash, supersession, audit export, backup, and retention behavior.

Exit gate: an issued report can be reproduced and its approval chain audited without relying on mutable application state.

## 13. Traceability matrix

| Observed problem | Primary remediation | Initial files | Required proof |
| --- | --- | --- | --- |
| Incomplete review does not block release | Central release gate | `components/EngineeringReviewDashboard.tsx`, new `lib/review/release-gate.ts` | Gate unit and UI integration tests |
| Missing values replaced by generic parameters | Prerequisite evaluator; remove fallbacks | `lib/blueprint/compliance.ts` | Missing-input regression fixtures |
| Zero scour reported as pass | Explicit scour applicability/basis | `lib/engineering/wall.ts`, `lib/engineering/defaults.ts` | Missing/zero/not-applicable scour tests |
| Undermining leaves stability numbers valid | Dependency and model-validity invalidation | `lib/engineering/wall.ts` | Post-scour invalidation benchmark |
| Mandatory failure modes omitted | Completeness matrix and unsupported blockers | new `lib/review/completeness.ts` | Coverage tests per asset/load case |
| Editable criteria can improve results | Approved rules and overrides | UI input components, new `lib/standards/` | Authorization and reproducibility tests |
| Misleading compliance/readiness language | Shared presentation vocabulary | `EngineeringReviewDashboard.tsx`, `BlueprintIngestion.tsx` | UI assertions and professional review |
| External extraction is trusted structurally | Runtime schema and quarantine | `app/api/parse-blueprint/route.ts` | Invalid-response tests |
| Placeholder evidence metadata | Real provenance or unavailable state | `app/api/parse-blueprint/route.ts`, `lib/blueprint/candidates.ts` | Evidence-link integration tests |
| Upload endpoint lacks production controls | File/auth/resource controls | `app/api/parse-blueprint/route.ts` | Security and abuse-case tests |

## 14. Suggested code organization

```text
lib/
  review/
    statuses.ts
    inputs.ts
    applicability.ts
    completeness.ts
    prerequisites.ts
    release-gate.ts
    dependencies.ts
    *.test.ts
  engineering/
    calculation-result.ts
    wall.ts
    hydraulic/
    geotechnical/
    structural/
    benchmarks/
  standards/
    rule-types.ts
    rule-pack.ts
    resolve-criteria.ts
    project-overrides.ts
  blueprint/
    extraction-schema.ts
    provenance.ts
    file-validation.ts
components/
  review/
    ReviewGateBanner.tsx
    AnalysisCoverage.tsx
    BlockerList.tsx
    CriterionReference.tsx
```

Keep numerical engineering functions deterministic and free of UI or network dependencies. The release gate must consume typed results rather than infer safety from text labels. The UI may format a result but may not decide its engineering status.

## 15. Migration and compatibility

1. Treat all existing saved or in-memory calculations as legacy and unverified after the new status model is introduced.
2. Do not migrate numeric zero to “approved zero” automatically. Mark ambiguous scour, surcharge, tailwater, and drainage values for review.
3. Mark current free-text standards packs as `unresolved` until mapped to an approved version.
4. Preserve legacy results for audit, but do not use them to determine current readiness.
5. Version the first remediated engine and rule schema explicitly; never overwrite earlier calculation meaning.
6. Provide a deterministic migration report listing every value, criterion, or result requiring human disposition.

## 16. Quality gates for every phase

Every phase must satisfy:

- engineering acceptance criteria reviewed by the responsible discipline;
- unit, integration, regression, and benchmark tests added before activation;
- `npm run test`, `npm run typecheck`, and `npm run build` pass;
- no reduction in existing missing-data and as-built uncertainty protections;
- keyboard and screen-reader review of new states and blockers;
- desktop and mobile visual verification;
- calculation trace reviewed for units, signs, unrounded intermediates, and criterion references;
- an explicit rollback path that does not restore unsafe readiness behavior.

Production activation additionally requires an independent engineer who did not author the implementation to approve the calculation note and benchmark results.

## 17. Definition of done

This remediation is complete when:

- all mandatory incomplete, invalid, stale, or unsupported checks block readiness;
- no compliance calculation substitutes a generic value for missing project data;
- zero/default values cannot masquerade as an approved scour, geotechnical, hydraulic, or loading basis;
- foundation support loss invalidates every dependent calculation;
- all applicable hydraulic, geotechnical, structural, durability, and loading check families have explicit outcomes;
- acceptance criteria and load combinations come from approved versioned rules or authorized overrides;
- the workspace, blueprint review, findings queue, and report use one consistent state model;
- calculation passes are never presented as overall structural approval;
- every accepted input, criterion, result, and disposition has reproducible provenance;
- ingestion cannot accept unsupported files, unvalidated model output, placeholder evidence, or superseded governing documents;
- independent benchmark and engineering-review records exist for every supported module;
- a qualified independent civil, structural, geotechnical, and hydraulic review team accepts the supported scope and remaining limitations;
- all quality gates pass and no unresolved critical remediation finding remains.

## 18. Implementation status

Status as of 8 November 2026:

### Phase 0 implemented

- Centralized release gate with structured failure, incomplete, and unsupported blockers.
- Mandatory unsupported structural, settlement, global-stability, and liquefaction scope blocks readiness.
- Critical missing inputs and unconfirmed input sets block readiness.
- Blueprint stability calculations no longer substitute generic geotechnical, hydraulic, loading, or geometry values.
- Zero scour is `insufficient_information`, not a pass.
- Piping is not evaluated without a scour basis.
- Footing undermining invalidates sliding, overturning, contact-pressure, and bearing outputs.
- Misleading overall `Passed`, `Fully compliant`, and as-built readiness language has been removed or narrowed.
- Regression coverage added for release gating, missing-value substitution, scour, and foundation-support invalidation.

### Additional implementation completed

- Mandatory check-family completeness matrix with approved specialist-result support.
- Input dependency graph and deterministic calculation fingerprints.
- Versioned, locked draft rule pack with an explicit unapproved release blocker.
- Immutable local review snapshots containing input, engine, rule-pack, calculation, and release-gate versions.
- Watermarked reproducible incomplete Markdown report generation.
- Report-issuance eligibility requiring an unblocked snapshot and distinct preparer, checker, and approving engineer decisions.
- Runtime extraction schema with finite/range checks.
- File type, extension, size, and signature validation for blueprint uploads.
- Server-only provider credentials and sanitized processing failures.
- Placeholder evidence coordinates and confidence values removed; unavailable provenance is blocked instead.
- Supabase governance migration covering tenant/project membership, private document metadata, specialist results, immutable review snapshots, separated approvals, issued reports, audit events, and row-level security.

### Remaining external validation and integration work

The repository now enforces the workflow boundary, but the following cannot be truthfully activated without external evidence or infrastructure:

- licensed technical approval and software verification of a Philippine public-works rule pack;
- independently checked structural, settlement, global-stability, liquefaction, seismic, hydraulic, scour, and seepage methods or approved project specialist reports;
- deployment of Supabase, private object storage, authentication, malware scanning, backups, and organizational role assignment;
- production rate limiting and durable asynchronous document-processing workers;
- authenticated digital signatures and final issued-report binary generation.

Until those items are supplied and approved, their states remain release-blocking by design.
