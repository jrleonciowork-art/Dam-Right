# As Built Verification and AI Blueprint Interpretation Implementation Plan

## Executive decision

Dam Right will implement design-versus-as-built verification before attempting automatic compliance approval. AI blueprint interpretation will accelerate evidence discovery and data entry, but deterministic parsers, engineering constraints, and engineer confirmation will control what enters a calculation.

The implementation should use a hybrid extraction pipeline rather than a single vision model. Searchable PDF text and vectors, CAD or BIM entities, OCR, computer vision, and multimodal AI each contribute candidates. A reconciliation layer then checks units, geometry, cross-sheet references, revision status, and engineering plausibility. Safety-critical values remain unapproved until a qualified reviewer confirms them against highlighted source evidence.

The first supported scope remains straight reinforced-concrete flood and retaining wall segments on shallow foundations. AI must return `unknown`, `ambiguous`, or `conflicting` whenever the evidence does not support one defensible value.

## 1. Objectives and boundaries

### 1.1 Required outcomes

The completed feature track must allow users to:

1. Freeze an approved design baseline without overwriting it.
2. Divide a structure into traceable stations, panels, pours, or inspection lots.
3. Store planned, as-designed, approved, as-built, and monitored states separately.
4. Import survey measurements, field inspection records, material tests, and construction evidence.
5. Extract candidate values and details from drawings while retaining page coordinates and source text.
6. Compare approved and measured values using project-specific tolerances and measurement uncertainty.
7. Recalculate stability using a frozen as-built input set.
8. Create nonconformances and route them to an authorized engineering disposition.
9. Show every AI suggestion with its source region, extraction method, confidence evidence, and detected conflicts.
10. Produce a reproducible design-versus-as-built report with signatures and hashes.

### 1.2 Explicit non-goals

The first release will not:

- Certify a structure without licensed-engineer review.
- Infer buried geometry solely from a post-construction photograph.
- Treat a drawing dimension as proof that construction matches the drawing.
- Automatically accept a safety-critical value based only on model confidence.
- Support dams, levees, sheet-pile walls, deep foundations, or three-dimensional transitions without separate validated models.
- Replace geotechnical investigation, survey, concrete testing, reinforcement inspection, or professional judgment.
- Train a custom foundation model before a representative correction dataset exists.

## 2. Verification model

### 2.1 Controlled state hierarchy

Every asset segment has separately versioned states:

| State | Purpose | Permitted evidence |
| --- | --- | --- |
| Planned | Early project intent | Concept drawings and preliminary assumptions |
| Approved design | Contractual engineering baseline | Approved drawings, calculations, specifications, design reports |
| As built | Verified construction condition | Survey, hold-point records, test results, scans, approved as-built drawings |
| Current condition | Operational state | Inspections, instrumentation, deterioration and repair records |

The approved-design state is immutable after sign-off. A change creates a new version with a supersession relationship. As-built evidence may reference the approved baseline but cannot modify it.

### 2.2 Spatial breakdown

The system will model a hierarchy such as:

```text
Project
  └─ Structure
      └─ Alignment
          └─ Segment or station range
              ├─ Wall panel
              ├─ Pour or inspection lot
              └─ Measurement location
```

Each evidence item must identify the narrowest applicable location. Required fields include alignment, start and end station, side or face, elevation range, panel or pour number, drawing grid when present, and coordinates when supplied by the survey.

### 2.3 Evidence classes

| Evidence class | Examples | Typical use |
| --- | --- | --- |
| Design record | Approved drawing, calculation, specification | Establish required condition |
| Survey | Total station, GNSS, level, laser scan | Alignment, dimensions and elevations |
| Construction hold point | Pre-pour checklist, reinforcement photo, formwork survey | Buried or concealed work |
| Material test | Cylinder, core, reinforcement certificate, field density | Strength and material compliance |
| Nondestructive test | Cover meter, GPR, ultrasonic method | Reinforcement, cover, thickness or condition |
| Visual inspection | Crack map, leakage, damage, drainage condition | Current condition and defects |
| Monitoring | Water level, displacement, pore pressure, tilt | Operational condition over time |

An evidence record must store its method, instrument, calibration status, operator, date, uncertainty, coordinate or station, attachment, and reviewer status.

## 3. Design versus as built workflow

### 3.1 Baseline creation

1. Upload the approved-for-construction document package.
2. Confirm document numbers, revisions, approval status, and governing design basis.
3. Extract or manually enter the approved geometry, materials, reinforcement, load cases, and tolerances.
4. Link every engineering input to a drawing region, report section, or calculation record.
5. Run the approved-design calculation and resolve missing information.
6. Checker and approving engineer freeze the baseline.

### 3.2 Field verification

1. Create inspection lots from stations, panels, or construction pours.
2. Generate a field checklist from the approved model and applicable rules.
3. Record measurements with method and uncertainty.
4. Attach survey files, photographs, laboratory reports, and hold-point records.
5. Map each observation to its design requirement and spatial location.
6. Checker validates evidence completeness and measurement credibility.
7. Accepted measurements populate a proposed as-built input set.

### 3.3 Comparison and engineering disposition

For each characteristic, calculate:

```text
signed variance = measured value − approved value
conservative variance = signed variance adjusted for measurement uncertainty
tolerance utilization = conservative variance / permitted variance
```

The direction of conservatism is characteristic-specific. Less wall thickness is adverse; greater cover may also be adverse if it reduces effective depth. The rule must therefore define whether lower, upper, bilateral, or categorical limits apply.

Results use these states:

- `within tolerance`
- `outside tolerance`
- `conflicting evidence`
- `measurement quality insufficient`
- `not measured`
- `not applicable`

An out-of-tolerance result creates a nonconformance. It does not independently prove structural inadequacy. The as-built calculation determines the effect where the model is applicable, and the engineer records one of the following dispositions:

- Accept as constructed with documented basis.
- Request additional survey or testing.
- Repair.
- Strengthen.
- Replace.
- Increase inspection or monitoring.
- Reject pending redesign.

### 3.4 Initial characteristic register

The first field workflow should cover:

- Alignment and wall segment limits.
- Foundation, base, ground, water and crest elevations.
- Wall height, base width, toe width, heel width, stem thickness and base thickness.
- Foundation embedment and observed scour.
- Concrete compressive strength and density where required.
- Reinforcement size, spacing, layer, face, extent, cover, anchorage and laps.
- Construction joints, movement joints, waterstops and sealants.
- Weep holes, drains, filters and outlets.
- Backfill type, elevation and compaction results.
- Cracks, leakage, honeycombing, spalls, displacement and settlement.
- Wet-side and dry-side water levels with datum.

## 4. AI blueprint interpretation strategy

### 4.1 Accuracy principle

The system will not ask one AI model to “read the blueprint” and return final values. Each source is processed through the most reliable available representation, and candidates are reconciled afterward.

```text
Original document
  ├─ Native PDF text and vector parser
  ├─ CAD or BIM semantic parser
  ├─ OCR and document-layout parser
  ├─ Computer-vision detectors
  └─ Multimodal AI interpreter
             ↓
      Candidate evidence graph
             ↓
  Unit, scale, revision, geometry and engineering validators
             ↓
   Conflict and confidence calibration
             ↓
      Human confirmation queue
             ↓
       Approved engineering input
```

### 4.2 Source precedence

Candidate sources receive reliability categories, not unconditional trust:

1. Native CAD or BIM entity with validated layer and coordinate system.
2. Native PDF vector or text object with a source bounding box.
3. Structured table or schedule extraction.
4. OCR text with character-level location and quality evidence.
5. Computer-vision symbol or geometry detection.
6. Multimodal AI interpretation of context and relationships.
7. Manually entered value supported by attached evidence.

Higher precedence does not automatically win. A superseded CAD file must not override an approved PDF revision. Conflict, revision, and approval rules are evaluated before source type.

### 4.3 Processing stages

#### Stage A — File and revision inspection

- Verify file signature, checksum, size and malware status.
- Identify drawing number, title, discipline, revision, issue status, date, sheet count and approval marks.
- Detect duplicates, superseded sheets and mixed-revision packages.
- Reject or quarantine encrypted, corrupt, truncated or unsupported files.

#### Stage B — Page preparation

- Render sheets at controlled high resolution.
- Preserve native PDF text and vectors before rasterization.
- Detect orientation, skew, cropping, low contrast, blur and compression defects.
- Segment title block, notes, schedules, plans, profiles, sections and details.
- Create high-resolution tiles with overlap while retaining page-level context.

#### Stage C — Deterministic extraction

- Parse native text, paths, line styles, hatches and dimension objects where available.
- Recover text spans, font size, orientation and bounding geometry.
- Parse DXF entities, blocks, attributes, layers, dimensions and coordinates.
- Parse IFC objects and properties when later enabled.
- Normalize drawing coordinates without discarding original coordinates.

#### Stage D — OCR and visual detection

- OCR raster-only text at token and symbol level.
- Detect dimension lines, extension lines, arrows, leaders, callouts, grids, section marks, elevation symbols and reinforcement notation.
- Extract table cells and associate headers with values.
- Detect drawing-region quality and route unreadable regions for manual review.

#### Stage E — Multimodal interpretation

Use a multimodal model to propose:

- Drawing type and detail purpose.
- Relationships between a label, dimension and geometric element.
- Unit and scale candidates.
- Reinforcement statements and their scope.
- Cross-references between plan, section, detail and schedule.
- Candidate conflicts or missing details.
- A structured explanation tied to supplied evidence regions.

The model must use a constrained output schema. It cannot create values that are absent from the supplied page or approved project context. Every candidate must include source page, bounding polygon, original text, normalized value, unit, field type, extraction method and uncertainty reason.

#### Stage F — Engineering reconciliation

- Confirm dimensional-chain closure within tolerance.
- Compare repeated dimensions across plan, elevation, section and schedule.
- Verify that scale-derived geometry agrees with written dimensions; written dimensions normally control unless project rules state otherwise.
- Check unit consistency and plausible ranges without replacing implausible values.
- Validate station continuity, elevation datum and drawing cross-references.
- Detect reinforcement conflicts by member, face, direction and extent.
- Record every conflict instead of selecting a convenient value.

#### Stage G — Human confirmation

The review interface displays the source sheet with overlays and a structured candidate panel. The reviewer may accept, correct, reject, mark ambiguous, or link another source. Corrections preserve the original prediction and become labelled evaluation data.

### 4.4 Confidence design

A single model score is insufficient. Dam Right should store a confidence vector:

- Document quality.
- OCR recognition confidence.
- Region-detection confidence.
- Field-classification confidence.
- Value-normalization confidence.
- Unit confidence.
- Source-revision confidence.
- Cross-source agreement.
- Engineering-consistency result.
- Model/version identifier.

The displayed review priority is calculated from field criticality, evidence quality, disagreement, and calibrated error probability. It must not be presented as a probability of structural safety.

### 4.5 Accuracy improvement loop

Accuracy should improve through this order:

1. Better source documents and native parsing.
2. Project-specific vocabulary, symbol and unit dictionaries.
3. Region-specific high-resolution crops with surrounding context.
4. Cross-sheet retrieval and reference resolution.
5. Constrained structured outputs.
6. Deterministic geometry and unit validators.
7. Ensemble disagreement and conflict detection.
8. Prompt and model comparison against a frozen evaluation set.
9. Active learning from reviewer corrections.
10. Fine-tuning only after there is sufficient representative, licensed and de-identified training data and a clear advantage over retrieval and prompting.

## 5. Data model additions

### 5.1 Asset and location records

- `structures`: project asset and coordinate/datum metadata.
- `alignments`: named alignment and station convention.
- `segments`: station range, panel, pour or inspection lot.
- `measurement_locations`: coordinate, elevation, face, member and region.

### 5.2 Controlled state records

- `asset_states`: planned, approved, as-built or current state.
- `asset_state_versions`: immutable state snapshot and parent/supersession links.
- `characteristic_definitions`: field type, unit, comparison direction and criticality.
- `characteristic_values`: typed value, uncertainty, state version and evidence.
- `tolerance_rules`: lower, upper, bilateral or categorical acceptance rule.

### 5.3 Field evidence records

- `measurements`: value, unit, method, uncertainty, location and reviewer status.
- `instruments`: type, identifier, owner and status.
- `calibration_records`: certificate, dates, range and result.
- `inspections`: checklist, inspector, conditions and approval state.
- `material_tests`: specimen, method, laboratory, result and acceptance rule.
- `evidence_files`: immutable file, checksum, capture date and spatial relationship.
- `evidence_annotations`: polygon, label, source page or image and reviewer notes.

### 5.4 AI interpretation records

- `document_processing_runs`: pipeline and component versions, configuration, timing and status.
- `page_quality_assessments`: quality score, defects and routing decision.
- `document_regions`: region type, polygon, parent region and detection method.
- `extraction_candidates`: field, raw text, normalized value, unit and confidence vector.
- `candidate_evidence`: source region, method and relationship.
- `candidate_conflicts`: candidates, conflict type and resolution.
- `review_decisions`: accept, correct, reject or ambiguous, with actor and reason.
- `model_evaluations`: dataset version, metrics, thresholds and approval decision.

### 5.5 Comparison and disposition records

- `comparison_runs`: approved and as-built snapshot hashes.
- `comparison_results`: variance, uncertainty adjustment, tolerance utilization and status.
- `nonconformances`: severity, owner, due date and affected segments.
- `engineering_dispositions`: decision, technical basis, calculation run and approvers.
- `verification_reports`: issued file, state hashes, signature records and supersession.

## 6. Application experience

### 6.1 Project navigation

Add these project areas:

- `Documents`
- `Approved Design`
- `As Built Verification`
- `Blueprint Review`
- `Comparisons`
- `Nonconformances`
- `Calculations`
- `Reports`

### 6.2 Blueprint review screen

Use a three-pane layout:

- Left: sheet tree, revision state, processing state and detected conflicts.
- Centre: drawing viewer with selectable evidence overlays.
- Right: candidate value, original text, unit, confidence components, related candidates, downstream calculations and review controls.

Review filters should include critical-only, conflict, low quality, unit uncertainty, scale uncertainty, missing mandatory field and unreviewed.

### 6.3 Design versus as built screen

Each row should show:

| Characteristic | Approved | As built | Uncertainty | Tolerance | Result | Evidence |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Stem thickness | 500 mm | 470 mm | ±5 mm | −10 mm | Outside tolerance | Survey point and photo |

Selecting a row opens both source drawing evidence and field evidence. A station heat map should show where failures, missing measurements and conflicting evidence occur along the wall.

### 6.4 Safety language

Use `candidate`, `confirmed input`, `within tolerance`, `outside tolerance`, `calculation passed`, and `engineer approved`. Avoid labels such as `AI verified`, `safe`, or `certified` unless the corresponding professional and regulatory process has actually occurred.

## 7. Service architecture

### 7.1 Components

```text
Next.js review application
  ├─ Project and document workflow
  ├─ Drawing viewer and evidence overlays
  ├─ As-built comparison and disposition UI
  └─ Server-side authorization and data access

Private object storage
  ├─ Original documents
  ├─ Rendered sheets and tiles
  ├─ Field evidence
  └─ Issued reports

Document processing workers
  ├─ PDF text/vector extraction
  ├─ Raster preparation and OCR
  ├─ CAD/BIM parsing
  ├─ Visual detection
  └─ Multimodal interpretation

Engineering services
  ├─ Unit and geometry validation
  ├─ Comparison and tolerance engine
  ├─ Stability calculation engine
  └─ Rule and report engine

PostgreSQL
  └─ Revisions, candidates, decisions, comparisons and audit events
```

### 7.2 Processing requirements

- Workers operate asynchronously through a durable queue.
- Every processing run is idempotent by source checksum and pipeline version.
- Original files are immutable.
- Each generated artifact records the tool, model and configuration version.
- Multimodal providers are accessed through an adapter so models can be evaluated and replaced.
- Project documents are not used for provider training unless the organization explicitly authorizes it contractually.
- Sensitive drawings must support a deployment path that meets the owner's data-location and retention requirements.
- Failed or partial processing must remain visible and recoverable.

### 7.3 Initial API surface

- `POST /api/projects/:id/structures`
- `POST /api/structures/:id/segments`
- `POST /api/documents/:revisionId/process`
- `GET /api/documents/:revisionId/candidates`
- `POST /api/extraction-candidates/:id/decisions`
- `POST /api/segments/:id/measurements`
- `POST /api/asset-states/:id/freeze`
- `POST /api/comparisons`
- `POST /api/nonconformances/:id/dispositions`
- `POST /api/as-built-calculation-runs`
- `POST /api/verification-reports/:id/issue`

Every mutation rechecks organization, project and role authorization at the data-access layer.

## 8. Evaluation and accuracy plan

### 8.1 Gold-standard dataset

Build a permission-cleared evaluation corpus containing:

- Searchable and raster PDFs.
- Clean and degraded scans.
- Metric, mixed-unit and uncommon notation examples.
- Plan, profile, elevation, section, detail, notes and schedules.
- Rotated text, dense reinforcement details and overlapping markups.
- Multiple scales on one sheet.
- Approved, superseded and conflicting revisions.
- Handwritten as-built annotations where permitted.
- Different DPWH offices, consultants, drawing templates and project periods.

Qualified annotators identify fields, values, units, page regions, relationships, revisions and ambiguity. A second engineer adjudicates critical labels. Split the corpus by project, not by page, so near-duplicate sheets cannot leak between training and evaluation.

### 8.2 Metrics

Measure results by field type and drawing class:

- Detection precision, recall and F1.
- Exact normalized value accuracy.
- Numeric error and unit accuracy.
- Bounding-polygon overlap.
- Cross-reference resolution accuracy.
- Conflict-detection precision and recall.
- Calibration error between estimated and observed correctness.
- Critical false-negative rate.
- Reviewer correction rate and median review time.
- Percentage of fields correctly routed to `ambiguous` or `unknown`.

Average OCR accuracy is not a release criterion. Critical dimensions, reinforcement, elevations, units, drawing revision and ambiguity handling require separate reporting.

### 8.3 Proposed promotion gates

These are product gates to validate against the pilot corpus, not claims about current model performance:

| Capability | Pilot gate |
| --- | --- |
| Critical values entering calculations | 100% engineer-confirmed |
| Revision and approval-status routing | No known superseded sheet selected as controlling in the release test set |
| Unit normalization | At least 99.5% exact on supported units; all uncertainty routed to review |
| Title-block field extraction | At least 98% F1 by supported template class |
| Critical dimension candidate recall | At least 97% with no auto-acceptance |
| Critical conflict detection | At least 95% recall on the adjudicated conflict set |
| Evidence localization | At least 95% of accepted candidates navigate to the correct source region |
| Unsupported or unreadable input | 100% routed away from automatic acceptance |
| As-built comparison arithmetic | 100% match to locked reference cases |

Confidence thresholds must be calibrated on held-out projects. Raising a threshold generally improves precision while reducing recall, so the system must expose below-threshold misses during evaluation rather than reporting only accepted predictions. This follows established document-extraction evaluation practice using false positives, false negatives, F1 and explicit confidence thresholds.

### 8.4 Experiment matrix

Evaluate each pipeline version against the same frozen corpus:

1. Native parser only.
2. OCR and layout parser only.
3. Multimodal model only.
4. Native parser plus OCR.
5. OCR plus multimodal interpretation.
6. Native parser, OCR, multimodal interpretation and engineering validators.
7. The full pipeline with cross-sheet retrieval and ensemble disagreement.

Record quality, latency, cost, failure categories and reviewer time. Promote a more complex pipeline only when it materially improves critical-field recall or reviewer efficiency without weakening traceability.

### 8.5 Red-team cases

Test deliberate and accidental failure patterns:

- A superseded drawing with clearer text than the approved revision.
- A detail labelled “NTS” beside a scale bar.
- Conflicting written and scale-derived dimensions.
- Millimetres interpreted as metres.
- Decimal point or diameter symbol lost by OCR.
- Reinforcement notation associated with the wrong face or direction.
- Mirrored or rotated scans.
- Cropped notes or missing continuation sheets.
- Similar station numbers or repeated panel identifiers.
- Engineer stamp or title-block text misclassified as a requirement.
- Prompt injection or operational instructions embedded in drawing text.
- A plausible but absent dimension generated by the multimodal model.

Document text is untrusted data. It may be extracted as evidence but cannot instruct the processing system, disclose other documents, change rules or initiate actions.

## 9. Delivery roadmap

This focused track is estimated at 20 weeks with two application engineers, one document/ML engineer, one quality engineer, and part-time civil/structural, survey, geotechnical and security specialists. It can run within the broader platform roadmap after project security and immutable document revisions exist.

### Phase A — Requirements and benchmark, weeks 1–3

Deliverables:

- Select two or three pilot flood-wall projects with authorized records.
- Define the spatial hierarchy and first characteristic register.
- Approve measurement methods, uncertainty policy and disposition workflow.
- Build the first gold-standard drawing and as-built dataset.
- Establish baseline manual review time and accuracy.
- Complete privacy, licensing and AI-provider data-use decisions.

Exit gate: approved field schema, evaluation protocol and representative reference corpus.

### Phase B — Controlled states and field evidence, weeks 4–7

Deliverables:

- Approved and as-built state versions.
- Alignments, segments, panels and measurement locations.
- Measurement, instrument, calibration, inspection and material-test records.
- Field evidence upload and annotation.
- Project-specific tolerance rules and uncertainty-aware comparison engine.

Exit gate: a project can complete a manual, evidence-linked as-built comparison without AI.

### Phase C — Comparison and disposition, weeks 8–10

Deliverables:

- Side-by-side design/as-built interface.
- Station-based variance view.
- Nonconformance workflow and engineering dispositions.
- As-built stability calculation snapshots.
- Reproducible verification report.

Exit gate: independent reviewers reproduce all comparison and calculation results from exported evidence.

### Phase D — Deterministic document pipeline, weeks 8–12

This phase may overlap Phase C.

Deliverables:

- PDF rendering, native text/vector extraction and page-quality assessment.
- Title-block, region, table and cross-reference detection.
- Candidate and evidence data model.
- Review interface with source overlays.
- Dataset annotation and evaluation tooling.

Exit gate: native searchable PDFs produce traceable candidates without a multimodal model.

### Phase E — OCR and visual interpretation, weeks 13–15

Deliverables:

- OCR for raster sheets with token and symbol locations.
- Dimension, leader, callout, grid, section, elevation and reinforcement detectors.
- Unit normalization and geometric association.
- Quality-based routing and conflict queue.

Exit gate: supported raster drawings meet the agreed noncritical and critical candidate gates with mandatory confirmation.

### Phase F — Multimodal AI experiment, weeks 16–18

Deliverables:

- Model-provider adapter and constrained extraction schema.
- High-resolution tiling with contextual retrieval.
- Cross-sheet candidate reconciliation.
- Experiment matrix, calibration results and documented failure taxonomy.
- Prompt-injection and data-leakage tests.

Exit gate: the full pipeline demonstrates a measured advantage over deterministic plus OCR processing on held-out projects.

### Phase G — Pilot and controlled rollout, weeks 19–20

Deliverables:

- Parallel manual and AI-assisted reviews on pilot projects.
- Correction analysis and updated thresholds.
- Reviewer training and operational handbook.
- Security and engineering acceptance review.
- Feature flags by organization, document class and field type.

Exit gate: authorized engineering reviewers accept the workflow and no unresolved critical release finding remains.

## 10. Prioritized backlog

### Must build first

- Immutable approved and as-built state versions.
- Segment/station model.
- Field measurements with uncertainty and evidence.
- Tolerance and comparison engine.
- Nonconformance and disposition workflow.
- Manual blueprint evidence annotations.
- Gold-standard evaluation corpus.

### AI exploration minimum

- Native PDF extraction.
- Page quality and revision classification.
- OCR with bounding polygons.
- Structured extraction candidates.
- Human correction capture.
- Multimodal provider adapter.
- Engineering and cross-sheet validators.
- Frozen evaluation runner and metric dashboard.

### Defer until evidence supports it

- Automatic acceptance of noncritical fields.
- Vision fine-tuning.
- DWG ingestion that depends on proprietary desktop automation.
- Full IFC model checking.
- Automatic reinforcement compliance from arbitrary legacy scans.
- Automatic certification or report issuance.

## 11. Security and governance

- Treat plans, surveys and infrastructure locations as confidential project data.
- Isolate organizations and projects at the database and storage layers.
- Use short-lived access URLs and prevent public object storage.
- Scan and sandbox every uploaded document.
- Strip active content and never execute drawing macros or attachments.
- Contractually control AI-provider retention and training use.
- Log the model, prompt template, retrieval context and output schema version for every interpretation.
- Keep reviewer corrections, approval decisions and model predictions immutable.
- Require an engineering change-control review before a new pipeline version affects active projects.
- Re-run, but do not overwrite, prior extraction when a model changes.
- Follow a documented AI incident process for systemic extraction errors.

NIST's AI Risk Management Framework and its generative-AI profile provide a useful governance structure for mapping, measuring and managing AI risks. The feature should maintain testing, evaluation, verification and validation evidence throughout development and operation rather than relying on a one-time model benchmark.

## 12. Immediate implementation decisions

Resolve these items before development begins:

1. Identify the pilot wall type and two or three permission-cleared projects.
2. Decide the controlling project document status labels and revision hierarchy.
3. Approve the first twenty to thirty as-built characteristics and their comparison directions.
4. Define station, panel, pour and coordinate conventions.
5. Select approved field measurement methods and uncertainty rules.
6. Assign who may confirm an extracted input and who may approve a disposition.
7. Confirm whether project documents may leave the organization's controlled environment for AI processing.
8. Select the initial OCR and multimodal candidates through a benchmark, not vendor preference.
9. Set evaluation gates and minimum examples per drawing class.
10. Decide the retention, deletion and retraining policy for reviewer corrections.

## 13. Definition of done

This track is complete when an engineer can freeze an approved design, map field evidence to wall segments, create a verified as-built state, compare values with uncertainty-aware tolerances, rerun the applicable stability model, resolve nonconformances, and issue a reproducible report.

AI interpretation is production-ready only when it demonstrably reduces review effort or improves critical-field discovery on held-out projects, retains exact source provenance, routes ambiguity and conflicts to humans, and never promotes an unconfirmed safety-critical value into an approved calculation.

## 14. Primary references

- [NIST AI Risk Management Framework resources](https://www.nist.gov/itl/ai-risk-management-framework/ai-risk-management-framework-resources), including the AI RMF, playbook, and generative-AI profile.
- [NIST AI Resource Center](https://airc.nist.gov/), which supports testing, evaluation, verification and validation of AI systems.
- [Google Document AI evaluation guidance](https://docs.cloud.google.com/document-ai/docs/evaluate), used here only as a primary reference for precision, recall, F1, false-negative and confidence-threshold evaluation concepts.
- [Google Document AI response model](https://docs.cloud.google.com/document-ai/docs/reference/rest/v1/Document), illustrating confidence, provenance, normalized values and page-anchor concepts that Dam Right should implement in a provider-neutral internal schema.
- [buildingSMART IFC mandate playbook](https://www.buildingsmart.org/wp-content/uploads/2024/10/IFC-Mandate-Final-1.pdf), identifying IFC as an open international standard for vendor-neutral BIM information exchange.
- [DPWH Department Order No. 100, series of 2020](https://www.dpwh.gov.ph/dpwh/sites/default/files/issuances/DO_100_s2020.pdf), establishing the initial Philippine flood-control standard-plan context for the broader project.

