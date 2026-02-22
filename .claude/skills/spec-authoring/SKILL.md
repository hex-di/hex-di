---
name: spec-authoring
description: "Create, enhance, and maintain package specification documents following the hex-di spec conventions. Use when writing new spec documents for a package (overview, behaviors, decisions, invariants, glossary, traceability, risk assessment, process docs), when enhancing existing specs to match the result-level quality standard, when auditing spec completeness against the canonical structure, or when creating governance scaffolding (traceability, requirement IDs, process docs) for a package that only has technical specs. Covers all spec document types: overview, behaviors, decisions, invariants, glossary, traceability, risk assessment, roadmap, comparisons, type system docs, compliance, and process docs."
---

# Spec Authoring

Rules and conventions for creating and maintaining specification documents in the hex-di monorepo. All patterns are derived from the `@hex-di/result` specification suite, which is the canonical reference.

## When to use this skill

- Writing a new spec document for any package
- Enhancing an existing spec to match the result-level standard
- Auditing a spec directory for completeness
- Adding governance scaffolding (behaviors, decisions, traceability, process) to a package that only has numbered technical docs
- Creating or updating cross-references between spec documents
- Assigning requirement IDs, invariant IDs, or decision IDs

## Spec Directory Layout

Every package spec lives under `spec/` following this hierarchy:

```
spec/
  packages/<name>/          # Core DI kernel packages
  libs/<domain>/            # Feature libraries
  tooling/<name>/           # Developer tooling
  cross-cutting/<name>/     # Multi-package specs
```

### Canonical directory structure for a complete spec

```
spec/<tier>/<name>/
  overview.md               # Package metadata, mission, API surface, source file map
  glossary.md               # Domain terminology with links to behaviors/decisions
  invariants.md             # Runtime guarantees (INV-N identifiers)
  traceability.md           # Forward/backward requirement traceability matrix
  risk-assessment.md        # FMEA per-invariant risk analysis
  roadmap.md                # Planned future work with status tracking

  behaviors/                # Functional specifications (one file per capability)
    01-<capability>.md      # BEH-XX-NNN requirement IDs inside
    02-<capability>.md
    ...

  decisions/                # Architecture Decision Records
    001-<topic>.md          # ADR-NNN format
    002-<topic>.md
    ...

  type-system/              # Type-level documentation (if complex types exist)
    <topic>.md

  comparisons/              # Competitive analysis
    competitors.md

  compliance/               # Regulatory compliance mappings
    gxp.md                  # GxP/ALCOA+ mapping (see Compliance section below)

  process/                  # Governance documents
    change-control.md       # Change categories and approval workflow
    definitions-of-done.md  # Acceptance checklists per spec section/feature (see DoD section below)
    test-strategy.md        # Test pyramid, coverage targets, IQ/OQ/PQ (see Test Strategy section below)
    document-control-policy.md  # Git-based document versioning
    requirement-id-scheme.md    # ID format specification
    ci-maintenance.md       # CI pipeline and release process

  scripts/                  # Automated verification
    verify-traceability.sh  # Traceability matrix validator (required at Full governance tier)
```

### Completeness tiers

Not every package needs every document. Apply proportionally:

| Tier | When to use | Required documents |
|------|------------|-------------------|
| **Full governance** | Core packages, GxP-relevant libraries | All documents above, including compliance/gxp.md |
| **Technical + behaviors** | Feature libraries with stable APIs | overview, glossary, invariants, behaviors/ (or numbered chapters), decisions/, traceability, risk-assessment, definitions-of-done, test-strategy |
| **Technical only** | Libraries in active development | overview (or numbered 01-XX docs), README, definitions-of-done |
| **Stub** | Early-stage or planned libraries | README with scope description |

### Two structural patterns for functional specs

The monorepo uses two equally valid structural patterns for functional specifications:

#### Pattern A: Behaviors directory (canonical — used by result, result-react, result-testing)

Spec requirements live in `behaviors/NN-<capability>.md` files with `BEH-XX-NNN` IDs. A separate `overview.md` provides the URS. This is the canonical pattern described in detail below.

#### Pattern B: Numbered chapters (used by clock, guard, http-client, flow, query, saga, logger, store, mcp)

Spec content lives in numbered chapter files at the spec root:

```
spec/libs/<name>/
  README.md                       # Document Control hub + TOC (see below)
  01-overview.md                  # URS: mission, scope, design philosophy
  02-core-concepts.md             # Domain model, terminology
  03-<domain-topic>.md            # FS chapters (contain requirement IDs inline)
  ...
  NN-definition-of-done.md        # Test-enumeration DoD (always the last numbered chapter)
  overview.md                     # API surface + source file map (governance supplement)
  invariants.md                   # Runtime guarantees (same format as Pattern A)
  compliance/
    gxp.md                        # GxP governance index referencing cross-cutting framework
  NN-gxp-compliance/              # (Optional) Detailed GxP sub-documents when content is large
    README.md                     # Sub-directory index with cross-cutting links
    01-<topic>.md                 # e.g., clock-source-requirements
    02-<topic>.md                 # e.g., qualification-protocols
    ...
  decisions/                      # ADRs (same format as Pattern A)
    001-<topic>.md
  process/
    definitions-of-done.md        # Feature-level DoD checklist (separate from NN-definition-of-done.md)
    test-strategy.md
    change-control.md
    requirement-id-scheme.md      # Documents [OPERATIONAL] tags and domain prefix table
    document-control-policy.md
    ci-maintenance.md
  type-system/                    # Type-level documentation (if complex type patterns exist)
    phantom-brands.md             # Branded/phantom type patterns, uniqueness guarantees
    structural-safety.md          # Structural incompatibility, irresettability patterns
  scripts/
    verify-traceability.sh
```

In this pattern:

- Requirement IDs use domain prefixes instead of `BEH-XX-NNN` (see [Requirement ID uniqueness](#requirement-id-uniqueness))
- Each chapter is self-contained — it defines requirements, shows signatures, and documents edge cases
- The README.md is the **Document Control hub** (see below), not just a TOC
- `invariants.md`, `decisions/`, and `compliance/` follow the same conventions as Pattern A
- The DoD exists in **two layers**: `NN-definition-of-done.md` (test enumeration) and `process/definitions-of-done.md` (feature checklist)

#### Pattern B README.md: Document Control hub

In Pattern B, `README.md` is the primary governance anchor for the entire spec. It contains:

1. **Document Control table**: Document number, revision, GAMP 5 classification, author, reviewer, approver, effective date
2. **Sub-Document Version Control**: Declares that individual chapter files (01-NN) do NOT carry separate version numbers — the suite-level revision is authoritative. GxP organizations MUST use suite-level revision (not individual file Git SHAs) in validation documentation and audit trail references.
3. **Revision History table**: All revisions with date, author, and detailed change description. This narrative history is the living record of specification evolution through review cycles.
4. **Formal Specification Approval Record**: Template with signatory roles, review scope, approval statement, printed name, and date fields. Typically four roles: Specification Author (all sections), Independent QA Reviewer (GxP/compliance sections, RTM, FMEA, IQ/OQ/PQ), Technical Reviewer (ports, adapters, API surface), Regulatory Affairs Reviewer (ALCOA+ mapping, electronic signatures, personnel/supplier sections).
5. **Approval Enforcement Mechanism**: Describes the layered approval evidence model — signed Git tags (cryptographic identity), `APPROVAL_RECORD.json` (machine-verifiable, deployment-specific, NOT committed to source repo), and Review Comment Log (RCL) in the quality management system.
6. **Combined Specification Approach** (see below): GAMP 5 scalability justification for combining URS/FS/DS.
7. **Version Relationship Policy**: Spec revision (Major.Minor, e.g. 2.9) and npm package version (SemVer, e.g. 0.1.0) follow independent tracks. Spec revision increments on content changes; package version increments on implementation changes. The implementation MUST expose a `specRevision` constant (e.g. via a `getMetadata()` function) whose value matches the current spec revision.
8. **Table of Contents**: Links to every chapter with section-level anchors.
9. **Distribution List**: Development team, QA, Infrastructure/DevOps, Auditors.

#### Combined Specification Approach (GAMP 5)

For narrowly scoped libraries (small API surface, well-characterized risk profile), justify combining URS, FS, and DS into a single document set per the GAMP 5 scalability principle (Appendix D). The justification must address:
- **Focused scope**: API surface is small; three separate documents would largely repeat context
- **Proportionate effort (ICH Q9)**: Risk and complexity do not warrant three separate documents
- **Traceability is maintained**: The RTM provides complete traceability regardless of document structure
- **Independent review is preserved**: Distinct signatory roles review each specification level

Within each chapter, organize content abstract-to-concrete to preserve level separation:

| Content Type | Specification Level |
|---|---|
| Interface definitions, semantic contracts | URS |
| Behavioral requirements (`REQUIREMENT:` statements), error handling, ordering guarantees | FS |
| Platform mapping tables, factory strategies, implementation patterns | DS |

GxP organizations that require physically separated URS/FS/DS documents MAY extract content from the combined spec, provided traceability is maintained. The combined spec is the authoritative source.

#### GxP sub-directory vs single file

Use a **single `compliance/gxp.md`** when GxP content fits in one document. Promote to a **numbered sub-directory** (e.g. `06-gxp-compliance/`) when the compliance content requires separate chapters covering: clock source requirements, qualification protocols (IQ/OQ/PQ/DQ), change control, ALCOA+ mapping, audit trail contracts, recovery procedures, RTM, supplier assessment, personnel qualification, FMEA risk analysis, and glossary.

When using a sub-directory:
- `compliance/gxp.md` becomes a **governance index** — it opens with a cross-cutting reference table mapping each `spec/cross-cutting/gxp/NN-*.md` to its corresponding section in the per-package sub-documents, then contains the GAMP 5 classification and ALCOA+ mapping summaries
- `NN-gxp-compliance/README.md` is the sub-directory index with cross-cutting links and a Quick Reference Card for auditor navigation
- Each sub-document is a numbered chapter (01-clock-source-requirements, 02-qualification-protocols, etc.)

The `compliance/gxp.md` cross-cutting reference table format:

```markdown
| Cross-Cutting Document | Methodology Applied in This Document |
|---|---|
| [01 — Regulatory Framework](../../cross-cutting/gxp/01-regulatory-framework.md) | 21 CFR Part 11, EU GMP Annex 11, GAMP 5, ICH Q9 scope — see §Applicable Regulatory Framework |
| [05 — FMEA Methodology](../../cross-cutting/gxp/05-fmea-methodology.md) | RPN scoring (Severity × Occurrence × Detection) — see §FMEA Summary |
| [06 — Validation Protocol Template](../../cross-cutting/gxp/06-validation-protocol-template.md) | IQ/OQ/PQ/DQ structure — see §Qualification Protocol Coverage |
```

#### Dual DoD structure (Pattern B)

Pattern B uses two separate DoD documents with different purposes:

**`NN-definition-of-done.md`** (numbered chapter, last in sequence): The **test-enumeration DoD**. Lists every test by number with description and type, organized into named DoD groups. Each group names its test file(s), lists test rows as a table (`# | Test Description | Type`), and states the mutation score target. The total test count is maintained here and referenced from `process/definitions-of-done.md`.

```markdown
### DoD N: <Feature Name> (Spec Sections X.Y–X.Z)

**File:** `<feature>.test.ts`

| #   | Test Description                         | Type |
| --- | ---------------------------------------- | ---- |
| 1   | <what is tested>                         | unit |
| 2   | <type-level assertion>                   | type |

**Target: >95% mutation score.**
```

**`process/definitions-of-done.md`**: The **feature-level DoD checklist**. For each pull request or feature, this is the acceptance gate. References the numbered-chapter DoD for test counts. Covers: spec updated, unit tests written, type tests written, GxP tests updated (if applicable), mutation tests pass, traceability updated, GxP compliance reviewed (if applicable), build passes, changeset created.

**Choosing a pattern**: Use Pattern A for new packages in `packages/`. Use Pattern B for new packages in `libs/` that have naturally chapter-oriented content. Either pattern is acceptable — consistency within a single package is what matters.

## Document Conventions

### Overview (overview.md)

The overview is the entry point to the spec. It serves as the User Requirements Specification (URS) in GAMP 5 terms.

Required sections in order:

1. **Title**: `# @hex-di/<package> -- Overview`
2. **Package Metadata**: Table with Name, Version, License, Repository, Module format, Side effects, Node version, TypeScript version
3. **Mission**: Single paragraph stating the library's purpose
4. **Design Philosophy**: Numbered list of core principles (each is a short bold phrase followed by explanation)
5. **Runtime Requirements**: Node.js, TypeScript, Build, Test tooling
6. **Public API Surface**: Tables grouped by category, each row: Export | Kind | Source file
7. **Subpath Exports**: Table of package.json `"exports"` entries if applicable
8. **Module Dependency Graph**: Mermaid `graph TD` diagram showing internal module dependencies
9. **Source File Map**: Table mapping every source file to its responsibility
10. **Specification & Process Files**: Table mapping spec files to their responsibilities

### Behaviors (behaviors/NN-<capability>.md)

Behaviors are the Functional Specification (FS). Each file covers one logical capability area.

#### File naming

- Two-digit prefix: `01-`, `02-`, etc. assigned sequentially
- Kebab-case name matching the capability domain
- Example: `01-types-and-guards.md`, `03-transformation.md`

#### Structure

```markdown
# NN -- <Capability Name>

<One-line description of what this behavior file covers.>

## BEH-XX-NNN: <Function/Method Name>

<Prose description of the behavior.>

### Signature (if applicable)

\`\`\`ts
function name<T, E>(args): ReturnType
\`\`\`

### Behavior table or description

| Input | Output |
|-------|--------|
| ...   | ...    |

### Notes, edge cases, links to ADRs/INVs
```

#### Requirement ID rules

- Every testable requirement gets a `BEH-XX-NNN` heading
- `XX` = two-digit behavior file number (01-99)
- `NNN` = sequential requirement number within the file (001-999)
- IDs are permanent. Withdrawn requirements keep their ID with a "Withdrawn" marker. Numbers are never reused.
- The heading format is: `## BEH-XX-NNN: <descriptive name>`

#### Content rules

- Include TypeScript signatures with generics
- Show input/output tables for transformation functions
- Link to related ADRs: `See [ADR-NNN](../decisions/NNN-<topic>.md)`
- Link to related invariants: `See [INV-N](../invariants.md#inv-n-<slug>)`
- Include edge case notes where behavior is non-obvious

### Decisions (decisions/NNN-<topic>.md)

Architecture Decision Records document design rationale. They serve as part of the Design Specification (DS).

#### File naming

- Three-digit prefix: `001-`, `002-`, etc. assigned sequentially
- Kebab-case name describing the decision topic
- Example: `001-closures-over-classes.md`, `008-result-async-brand.md`

#### Structure

```markdown
# ADR-NNN: <Decision Title>

## Status

Accepted | Superseded by ADR-NNN | Deprecated

## Context

<Problem statement. What design question needed answering? What constraints exist?>

## Decision

<What was decided. Include code snippets showing the chosen approach.>

## Consequences

**Positive**:
- <benefit 1>
- <benefit 2>

**Negative**:
- <trade-off 1>
- <trade-off 2>

**Trade-off accepted**: <one-sentence justification for why negatives are acceptable>
```

#### Content rules

- Focus on the *why*, not the *what*. The behavior specs describe what; ADRs explain why.
- Include code snippets showing the concrete implementation choice
- List both positive and negative consequences honestly
- End with an explicit trade-off acceptance statement
- Cross-reference affected invariants and behavior specs

### Invariants (invariants.md)

Runtime guarantees enforced by the implementation. Part of the Design Specification. Invariants are the anchor for the traceability chain: each invariant connects to FMEA failure modes, DoD verification items, and specific test files.

#### Structure per invariant

```markdown
## INV-N: <Descriptive Name>

<One-paragraph statement of the guarantee.>

**Source**: `<source-file.ts>` -- <specific code location or pattern>

**Implication**: <What consumers can rely on because of this invariant.>

**Related**: [<requirement IDs>](<spec-file>), [FM-N](<risk-assessment or compliance/gxp.md>).
```

The `**Related**` line links the invariant to the requirement IDs it enforces and the FMEA failure mode(s) it mitigates. This creates a bidirectional chain: requirement → invariant → FMEA → test.

#### Rules

- Sequential numbering: `INV-1`, `INV-2`, etc. Numbers are permanent and never reused.
- Packages with domain prefixes use `INV-<PREFIX>-N` (e.g., `INV-CK-1` for clock, `INV-GD-1` for guard)
- Each invariant must have: name, description, source reference, implication, related links
- Link to related ADRs using `See [ADR-NNN](decisions/NNN-<topic>.md)`
- Link to FMEA failure modes using `FM-N` references (in `risk-assessment.md` or `compliance/gxp.md`)
- Every invariant appears in three places: `invariants.md` (definition), `risk-assessment.md` or `compliance/gxp.md` (FMEA row), and `traceability.md` (test mapping)

#### Risk-level-driven testing requirements

The risk level assigned to each invariant in the FMEA determines the minimum test coverage:

| Risk Level | Required Test Types | Example |
|------------|-------------------|---------|
| **High** | Unit + Type + GxP integrity test + Mutation test | `INV-1` (frozen results): `gxp-integrity.test.ts` |
| **Medium** | Unit + Type test | `INV-5` (brand checking): `type-guards.test.ts` |
| **Low** | Unit test (with prose justification for low classification) | `INV-9` (error message format): `error-patterns.test.ts` |
| **Negligible** | No automated test required — enforced purely at compile time | Type-system invariants where the type system makes the failure impossible (e.g. phantom-branded types, structural incompatibility). RPN is N/A (no occurrence, no runtime detection). Must still appear in invariants.md and traceability.md with an explanation of the compile-time mechanism. |

High-risk invariants **must** have a dedicated GxP integrity test file (e.g., `tests/gxp-integrity.test.ts` or `tests/unit/gxp-*.test.ts`). The traceability matrix maps each invariant to its specific test files.

### Glossary (glossary.md)

Domain terminology used throughout the specification.

#### Structure per term

```markdown
## <Term>

<Definition. One to three sentences.>
```

#### Rules

- Alphabetical ordering is not required; group related terms logically
- Include cross-references to behaviors/decisions where the term is defined: `See [NN-<file>.md](behaviors/NN-<file>.md)`
- Every concept that appears in multiple spec documents should have a glossary entry
- Keep definitions concise. Use the behavior spec for detailed explanation.

### Traceability (traceability.md)

Forward and backward traceability from requirements to source modules, test files, invariants, and definitions of done. The traceability matrix is the single document that proves every requirement has implementation, tests, and acceptance criteria.

#### Required sections

1. **Document Control**: Standard metadata table
2. **Traceability Overview**: ASCII art or prose showing the full traceability chain:
   ```
   Requirement (BEH/CLK/REQ) → Source Module → Test File → Invariant → FMEA (FM-N) → DoD Item
   ```
3. **Requirement Identification Convention**: ID scheme reference (link to `process/requirement-id-scheme.md`)
4. **Capability-Level Traceability**: Table mapping capability number → spec file → source modules → risk level → subpath
5. **Requirement-Level Traceability**: Table mapping each spec file → requirement ID ranges with counts
6. **Invariant Traceability**: Table mapping each INV-N → unit tests, type tests, mutation tests, GxP tests, DoD item
7. **ADR Traceability**: Table mapping each ADR → affected invariants → affected spec files
8. **Test File Map**: Backward traceability from test file → spec coverage → test level (see [Test file naming](#test-file-naming-conventions))
9. **DoD Traceability**: Table mapping each DoD item → spec section(s) it verifies → test files that satisfy it
10. **Coverage Targets**: Table of metric targets with regulatory basis (see [Test strategy](#test-strategy-test-strategymd))

#### Traceability chain completeness

Every link in this chain must be documented:

| From | To | Where documented |
|------|----|-----------------|
| Requirement ID | Source file | Capability-Level table |
| Requirement ID | Test file | Test File Map |
| Invariant | FMEA failure mode | `risk-assessment.md` or `compliance/gxp.md` |
| Invariant | Test files | Invariant Traceability table |
| DoD item | Spec section | DoD Traceability table |
| DoD item | Test files | DoD Traceability table |
| FMEA failure mode | Mitigation | `risk-assessment.md` or `compliance/gxp.md` |

For packages using the numbered chapter pattern, the "spec file" column uses chapter file names (e.g., `03-http-request.md`) instead of behavior file names.

### Risk Assessment (risk-assessment.md)

Failure Mode and Effects Analysis (FMEA) for invariants.

#### Required sections

1. **Document Control**: Standard metadata table
2. **System Context**: GAMP 5 classification, system characteristics
3. **Risk Assessment Methodology**: Severity × Occurrence × Detection scoring (1-10 each); RPN = S × O × D. Include the level determination matrix and the RPN action thresholds:
   | RPN Range | Classification | Required Action |
   |-----------|---------------|----------------|
   | 1–60 | Acceptable | Routine monitoring |
   | 61–99 | Conditionally acceptable | Documented risk acceptance by QA Reviewer |
   | 100+ | Unacceptable | Mandatory corrective action before deployment |
4. **Per-Invariant FMEA**: Table with columns: Invariant | Description | Severity | Detection | Risk | Primary Failure Mode | Mitigation | RPN
5. **Risk Summary**: Count by risk level (Negligible / Low / Medium / High) with testing requirements per level
6. **Low-Risk Justifications**: Explicit prose justification for every Low-risk classification
7. **Risk Acceptance Criteria**: Per-level acceptance conditions
8. **Residual Risk Summary**: Table with ID | Description | ALCOA+ Impact | Compensating Controls | Review Cadence
9. **Assessment Provenance**: Who assessed, independence, methodology reference
10. **Review Schedule**: Triggers for re-evaluation

### Roadmap (roadmap.md)

Planned future additions with status tracking.

#### Structure per item

```markdown
## <Feature Name>

**Status**: Planned | In Progress | Specified | Delivered

**Scope**: <Description of what the feature will provide>

**Deliverable**: <Link to spec file or "TBD">
```

### Comparisons (comparisons/competitors.md)

Feature matrix against competing implementations.

#### Rules

- Include a regulatory disclaimer: "This document is informational, not normative"
- Show package metadata table: Version, Last Release, Weekly Downloads, Stars
- Define scoring dimensions with clear definitions before showing scores
- Rate on a 0-10 scale per dimension
- Include maintenance status assessment

### Process Documents

#### Document Control header (required on all governance docs)

```markdown
## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-<PREFIX>-<CAT>-<NNN> |
| Version | Derived from Git -- `git log -1 --format="%H %ai" -- <filename>` |
| Author | Derived from Git -- `git log --format="%an" -1 -- <filename>` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record -- see Git merge commit |
| Change History | `git log --oneline --follow -- <filename>` |
| Status | Effective |
```

#### Document ID scheme

Format: `SPEC-<PKG>-<CAT>-<NNN>`

| Component | Description |
|-----------|-------------|
| `SPEC` | Fixed prefix |
| `<PKG>` | Package identifier (e.g., `CORE` for result, `REACT` for result-react) |
| `<CAT>` | Three-letter category code: OVW, BEH, INV, ADR, GLO, PRC, CMP, GXP, TRC, RSK, TYP, TST, RMP |
| `<NNN>` | Three-digit sequential number |

#### Requirement ID uniqueness

Each package uses a unique infix or domain prefix to prevent cross-package collisions:

| Package | Requirement IDs | Invariant IDs | ADR IDs | Infix |
|---------|----------------|---------------|---------|-------|
| result (core) | `BEH-XX-NNN` | `INV-N` | `ADR-NNN` | (none) |
| result-react | `BEH-RXX-NNN` | `INV-RN` | `ADR-RNNN` | `R` |
| result-testing | `BEH-TXX-NNN` | `INV-TN` | `ADR-TNNN` | `T` |
| clock | `CLK-{DOMAIN}-NNN` | `INV-CK-N` | `ADR-CK-NNN` | `CK` |
| guard | `REQ-GUARD-NNN` or `§N` | `INV-GD-N` | `ADR-GD-NNN` | `GD` |
| http-client | `§N` (section-numbered) | `INV-HC-N` | `ADR-HC-NNN` | `HC` |
| flow | `§N` or `FLW-NNN` | `INV-FL-N` | `ADR-FL-NNN` | `FL` |
| query | `§N` or `QRY-NNN` | `INV-QR-N` | `ADR-QR-NNN` | `QR` |
| saga | `§N` or `SGA-NNN` | `INV-SG-N` | `ADR-SG-NNN` | `SG` |
| logger | `§N` or `LOG-NNN` | `INV-LG-N` | `ADR-LG-NNN` | `LG` |
| store | `§N` or `STO-NNN` | `INV-ST-N` | `ADR-ST-NNN` | `ST` |
| mcp | `§N` or `MCP-NNN` | `INV-MC-N` | `ADR-MC-NNN` | `MC` |

For clock's domain-prefixed IDs, `{DOMAIN}` is a sub-domain abbreviation: `MON` (monotonic), `SYS` (system), `SEQ` (sequence), `TMR` (timer), `AUD` (audit), `INT` (integration), `ORD` (ordering).

New packages: choose a unique two-letter infix and document it in `process/requirement-id-scheme.md`.

### Definition of Done (definitions-of-done.md)

The Definition of Done (DoD) is the acceptance checklist that determines when a spec section's implementation is complete. Every package at Technical or higher tier must have one.

**Pattern B packages use two complementary DoD documents** (described in detail in the Pattern B section above):
- `NN-definition-of-done.md` — test-enumeration DoD (lives in the numbered chapter sequence)
- `process/definitions-of-done.md` — feature-level acceptance checklist (lives in `process/`)

#### Structure

The `process/definitions-of-done.md` file uses one of three patterns depending on the package:

**Pattern 1: Per-spec-section DoD** (Pattern B packages with numbered chapters)

Each capability area in the spec gets its own DoD section with a feature-level acceptance checklist. The numbered-chapter `NN-definition-of-done.md` file holds the actual test table with exact counts and file names per DoD group.

In `process/definitions-of-done.md`, cross-reference the numbered-chapter file for test counts:

```markdown
Per-feature acceptance criteria for `@hex-di/<package>`. The detailed test enumeration
(N tests across M files) is maintained in [NN-definition-of-done.md](../NN-definition-of-done.md).

## Feature Definition of Done

A feature is **done** when all of the following are satisfied:

### 1. Specification
- [ ] Spec section updated with requirement IDs
- [ ] New invariants added to invariants.md with INV-<PKG>-N identifier
- [ ] ADR created if architectural decision was made
- [ ] Glossary terms updated
- [ ] overview.md API tables updated

### 2. Unit Tests
- [ ] Runtime tests in appropriate *.test.ts file
- [ ] Success and error paths both covered
- [ ] Edge cases covered (negative, zero, MAX_SAFE_INTEGER, NaN, platform unavailability)
- [ ] Line coverage > 95%, branch coverage > 90%

### 3. Type Tests
- [ ] Type tests in *.test-d.ts file
- [ ] Branded type safety verified
- [ ] Result return types verified

### 4. GxP Tests (if applicable)
- [ ] If feature affects a High-risk invariant, corresponding GxP test updated

### 5. Mutation Tests
- [ ] Mutation score > 95% for new code
- [ ] No surviving mutants in security-critical code

### 6. Traceability
- [ ] Every new requirement ID maps to at least one test
- [ ] traceability.md requirement counts updated

### 7. Build
- [ ] tsc -p tsconfig.build.json succeeds
- [ ] No unintended new exports
```

**Pattern 2: Feature-based DoD** (used by guard — 27 DoD items)

Organized by feature area rather than spec chapter:

```markdown
## DoD N: <Feature Name>

**Acceptance criteria**:
1. <Criterion 1>
2. <Criterion 2>

**Test requirements**:
- Unit tests: N tests covering <scope>
- Type tests: N type-level assertions
- Integration tests: N tests covering <cross-feature scenarios>

**Spec sections**: §N, §M (links to numbered chapters)
```

**Pattern 3: Test-table-based DoD** (used by http-client)

Organized as a comprehensive test matrix:

```markdown
## DoD N: <Domain Area>

| Test ID | Description | Type | Spec Ref | Status |
|---------|------------|------|----------|--------|
| TST-HC-001 | Fetch adapter returns Result | Unit | §6 | Pending |
| TST-HC-002 | Timeout combinator wraps error | Unit | §7 | Pending |
```

#### Content rules

- Every DoD item must reference the spec section(s) it verifies
- Every DoD item must specify the test type(s) required (unit, type, GxP, integration, mutation)
- DoD items for high-risk invariants must include mutation testing criteria; target ≥ 80% for standard packages, ≥ 95% for GxP packages
- `[OPERATIONAL]` requirements are excluded from automated test coverage calculations — the DoD must not include them as failing items
- The DoD is a living document — mark items as `Done` or `Pending` to track implementation progress
- Include a summary table at the top: total items, done count, pending count

#### Relationship to other documents

```
spec section (requirement IDs)
    ↓ defines
DoD item (acceptance criteria + test requirements)
    ↓ verified by
test files (unit, type, GxP, mutation)
    ↓ traced in
traceability.md (DoD Traceability table)
```

### Test Strategy (test-strategy.md)

The test strategy defines the test pyramid, coverage targets, and qualification test protocols for the package.

#### Required sections

1. **Test Pyramid**: The six test levels used in hex-di, with which levels apply to this package
2. **Coverage Targets**: Per-level coverage percentages and regulatory basis
3. **Test File Naming Conventions**: Patterns for each test type
4. **Qualification Protocols** (GxP packages only): IQ/OQ/PQ test protocols

#### Test pyramid levels

| Level | File pattern | Purpose | When required |
|-------|-------------|---------|---------------|
| **Unit** | `tests/unit/*.test.ts` | Individual function behavior | Always |
| **Type** | `tests/*.test-d.ts` | Compile-time type contracts | When package exports complex types |
| **GxP Integrity** | `tests/unit/gxp-*.test.ts` | High-risk invariant verification | When invariant has High risk level |
| **Integration** | `tests/integration/*.test.ts` | Cross-module or cross-package behavior | When package has DI container integration |
| **Mutation** | Stryker config | Mutation score for critical paths | High-risk invariants; target >= 80% |
| **Performance** | `tests/benchmarks/*.bench.ts` | Latency and throughput baselines | When package has performance SLAs |

#### Test file naming conventions

```
tests/
  unit/
    <feature>.test.ts           # Unit tests for a feature
    gxp-<feature>.test.ts       # GxP integrity tests (high-risk invariants)
  integration/
    <scenario>.test.ts           # Cross-module integration tests
  benchmarks/
    <operation>.bench.ts         # Performance benchmarks
  <feature>.test-d.ts            # Type-level tests (vitest typecheck)
```

#### Coverage targets

| Metric | Target | Regulatory basis |
|--------|--------|-----------------|
| Branch coverage | >= 90% | GAMP 5 Category 5 |
| Line coverage | >= 95% | GAMP 5 Category 5 |
| Mutation score (high-risk) | >= 80% | ICH Q9 risk-proportionate testing |
| Type test coverage | 100% of public API types | ADR requiring compile-time safety |

#### Qualification protocols (GxP packages only)

For packages at Full governance tier with `compliance/gxp.md`, the test strategy includes IQ/OQ/PQ protocols:

| Protocol | Purpose | Scope | Location |
|----------|---------|-------|----------|
| **IQ (Installation Qualification)** | Verify package installs correctly | `npm install`, dependency resolution, subpath exports | `compliance/gxp.md` §IQ |
| **OQ (Operational Qualification)** | Verify package operates as specified | All DoD items pass, all test pyramid levels green | `compliance/gxp.md` §OQ |
| **PQ (Performance Qualification)** | Verify package performs under real conditions | Integration tests, benchmark baselines, stress tests | `compliance/gxp.md` §PQ |

The IQ/OQ/PQ protocols are documented in `compliance/gxp.md`, not in `test-strategy.md`. The test strategy references them and ensures the test pyramid supports their execution.

### Compliance (compliance/gxp.md)

The per-package GxP compliance mapping. Required for all packages at Full governance tier.

#### Structure

`compliance/gxp.md` is the governance index for all GxP content in the package. It must open with a **cross-cutting reference table** mapping each shared methodology document to its corresponding per-package section, then provide the GAMP 5 classification and ALCOA+ mapping summaries.

```markdown
# @hex-di/<package> — GxP Compliance

## Document Control
<standard metadata table>

## Cross-Cutting GxP Framework

This document applies the shared GxP methodology maintained in `spec/cross-cutting/gxp/`.

| Cross-Cutting Document | Methodology Applied in This Document |
|---|---|
| [01 — Regulatory Framework](../../../cross-cutting/gxp/01-regulatory-framework.md) | 21 CFR Part 11, EU GMP Annex 11, GAMP 5 regulatory scope — see §Applicable Regulatory Framework |
| [02 — GAMP 5 Classification](../../../cross-cutting/gxp/02-gamp5-classification.md) | Category 5 classification criteria — see §GAMP 5 Software Classification |
| [03 — ALCOA+ Mapping](../../../cross-cutting/gxp/03-alcoa-mapping.md) | Generic ALCOA+ principle definitions; package-specific feature mapping — see §ALCOA+ Principle Mapping |
| [05 — FMEA Methodology](../../../cross-cutting/gxp/05-fmea-methodology.md) | RPN scoring scale and risk level thresholds — see §FMEA Summary |
| [06 — Validation Protocol Template](../../../cross-cutting/gxp/06-validation-protocol-template.md) | IQ/OQ/PQ/DQ protocol structure — see §Qualification Protocol Coverage |
| [07 — Traceability Matrix Template](../../../cross-cutting/gxp/07-traceability-matrix-template.md) | RTM structure — see §Traceability |
...

---

## GAMP 5 Software Classification
<Category 5 justification, configurable vs non-configurable assessment>

---

## ALCOA+ Principle Mapping
<Table: Principle | Library Feature | Requirement IDs>

---

## GxP Compliance Sub-Documents
<Table: Sub-Document | Content | Primary Regulatory Basis>
<Only present when using the NN-gxp-compliance/ sub-directory pattern>

---

## FMEA Summary
<Risk level counts, highest RPN; link to full FMEA sub-document or risk-assessment.md>

---

## Qualification Protocol Coverage
<Table: Protocol | Tests | Reference>

---

## Traceability
<Forward traceability summary; link to RTM>
```

#### Cross-cutting vs per-package content

Shared regulatory methodology lives in `spec/cross-cutting/gxp/`:

| Cross-cutting file | Content | Per-package references it as |
|---|---|---|
| `01-regulatory-framework.md` | 21 CFR Part 11, Annex 11 context | Opening cross-cutting reference table |
| `02-gamp5-classification.md` | Category 5 criteria, combined spec justification | Opening cross-cutting reference table |
| `03-alcoa-mapping.md` | Generic ALCOA+ principle definitions | Package maps its specific features to principles |
| `04-personnel-qualification.md` | Role qualification requirements | Package lists roles specific to its compliance scope |
| `05-fmea-methodology.md` | RPN scoring, FMEA methodology | Package uses methodology for its own FM-N entries |
| `06-validation-protocol-template.md` | IQ/OQ/PQ/DQ templates | Package fills in its specific test protocols |
| `07-traceability-matrix-template.md` | RTM structure | Package fills in its requirement-to-test mappings |
| `08-change-control.md` | Change classification and approval workflow | Package describes its specific change procedure |
| `09-data-retention.md` | Retention period guidance | Package delegates or specifies retention enforcement |
| `10-supplier-assessment.md` | Supplier assessment criteria | Package lists its specific suppliers/dependencies |

Per-package `compliance/gxp.md` contains only content specific to that package: its own FMEA failure modes (FM-N), its own ALCOA+ feature mappings, its own RTM entries, and its own test protocol details. Never duplicate shared methodology — reference the cross-cutting document instead.

## Cross-Reference Conventions

### Internal links (within same spec)

```markdown
See [BEH-03-001](behaviors/03-transformation.md#beh-03-001-descriptive-slug).
See [INV-1](invariants.md#inv-1-frozen-result-instances).
See [ADR-001](decisions/001-closures-over-classes.md).
See [DoD 5](process/definitions-of-done.md#dod-5-feature-name).
See [GxP compliance](compliance/gxp.md).
```

### Links from sub-documents (behaviors, decisions, process, compliance)

```markdown
See [INV-1](../invariants.md#inv-1-frozen-result-instances).
See [ADR-001](../decisions/001-closures-over-classes.md).
See [gxp.md](../compliance/gxp.md).
See [DoD 3](../process/definitions-of-done.md#dod-3-feature-name).
```

### Cross-package links

Use relative paths that navigate up to the spec tier level, then down:

```markdown
See [integration patterns](../../cross-cutting/integration/flow-saga.md).
```

### Cross-cutting GxP links

Per-package specs reference the shared GxP framework in `spec/cross-cutting/gxp/`:

```markdown
# From spec/libs/<name>/compliance/gxp.md:
See [regulatory framework](../../../cross-cutting/gxp/01-regulatory-framework.md).
See [FMEA methodology](../../../cross-cutting/gxp/05-fmea-methodology.md).
See [validation protocol template](../../../cross-cutting/gxp/06-validation-protocol-template.md).

# From spec/packages/<name>/compliance/gxp.md:
See [regulatory framework](../../../cross-cutting/gxp/01-regulatory-framework.md).
```

The cross-cutting GxP spec provides shared methodology. Per-package `compliance/gxp.md` references it for generic content and contains only package-specific FMEA, ALCOA+, RTM, and test protocol content.

### DoD-to-spec cross-references

DoD items must link back to the spec section(s) they verify:

```markdown
# In definitions-of-done.md:
**Spec reference**: [02-clock-port.md](./02-clock-port.md) §CLK-MON-001 through §CLK-MON-005

# In numbered chapter specs (Pattern B), link forward to DoD:
> **Definition of Done**: [DoD 2](./NN-definition-of-done.md#dod-2-clock-port)
```

### Invariant-to-FMEA cross-references

Invariants link to their FMEA failure modes, and FMEA links back:

```markdown
# In invariants.md:
**Related**: [CLK-MON-001, CLK-MON-002](02-clock-port.md), FM-1c in [FMEA](compliance/gxp.md).

# In compliance/gxp.md FMEA table:
| FM-1c | Monotonic regression | INV-CK-1 | High | Clamped fallback | `gxp-monotonic.test.ts` |
```

### Heading anchor format

GitHub auto-generates anchors from headings. For requirement IDs:

- `## BEH-03-001: Ok.map applies f` -> `#beh-03-001-okmap-applies-f`
- `## INV-1: Frozen Result Instances` -> `#inv-1-frozen-result-instances`
- `## DoD 5: Scoped Logger` -> `#dod-5-scoped-logger`

Use lowercase, hyphens, strip special characters.

## Content Quality Rules

### Behavior specs / numbered chapters

- Every public function and method must have a requirement ID (`BEH-XX-NNN` for Pattern A, or domain-prefixed ID for Pattern B)
- Include TypeScript type signatures for every function
- Show concrete input/output examples for transformations
- Document edge cases explicitly (null, undefined, empty, NaN, nested types)
- Link to the ADR when a design choice is non-obvious
- Link to the DoD item that will verify this requirement
- Tag procedural/organizational requirements that cannot be verified by automated tests with `[OPERATIONAL]`. Format: `REQUIREMENT (PKG-DOM-NNN) [OPERATIONAL]: <text>`. These are excluded from automated test coverage calculations. Document the full list in `process/requirement-id-scheme.md` and mark them in the RTM. Typical examples: deployment procedure requirements, organizational staffing requirements, NTP configuration requirements, supplier SQA pre-requisites.

### Type system documents (type-system/)

The `type-system/` directory documents compile-time safety patterns that are too large or important for inline ADR treatment. Create a file here when the package uses a non-obvious type-level pattern that all contributors must understand.

Two canonical file types:

- **`phantom-brands.md`**: Documents all phantom-branded scalar types (e.g. `number & { [BrandSymbol]: true }`). Cover: the unique symbol intersection pattern, cross-domain assignment blocking, covariant widening to the base type, arithmetic widening (operations returning unbranded base type), validated (Result-returning) vs identity (unsafe cast) branding utilities, and a cascading API table of all branded types with their symbols, validators, and arithmetic behaviors.

- **`structural-safety.md`**: Documents structural type incompatibility patterns that enforce invariants. Cover: structural irresettability (interface deliberately omits `reset()` method, preventing accidental counter reset), structural incompatibility (two related interfaces use distinct method names to prevent substitution), port intersection types (how `PortA & PortB` composes two ports into one adapter), and opaque discriminated unions (`{ _tag: "X", id: number }` pattern for handles).

Both files must link to the invariants they enforce and the ADRs that justify them.

### Decision records

- Always include a `## Context` section that explains the problem space
- Always include concrete code showing the chosen approach
- Always list both positive and negative consequences
- Never write an ADR with only positive consequences

### Invariants

- One invariant per runtime guarantee (don't combine unrelated guarantees)
- Every invariant must reference its source file
- The "Implication" must describe what consumers can rely on, not what the code does
- Every invariant must include a `**Related**` line linking to requirement IDs and FMEA failure modes
- Every invariant must appear in all three locations: `invariants.md`, FMEA table, `traceability.md`

### Traceability

- Every requirement ID must map to at least one test file
- Every invariant must map to test coverage per its risk level
- Every ADR must list which invariants and spec files it affects
- Every DoD item must map to the spec section(s) it verifies and the test files that satisfy it
- Total requirement count must be maintained and accurate
- The traceability chain must be complete: requirement → source → test → invariant → FMEA → DoD

### Risk assessment

- Every High-risk invariant needs a dedicated GxP integrity test
- Every Low-risk classification needs an explicit prose justification
- Residual risks must have compensating controls documented
- The assessment methodology must reference ICH Q9
- Every FMEA failure mode (FM-N) must link back to the invariant it targets

### Definition of Done

- Every DoD item must reference specific spec section(s) with requirement IDs
- Every DoD item must specify required test types (unit, type, GxP, mutation, integration)
- DoD items for high-risk invariants must include mutation testing criteria (>= 80% score)
- The total DoD item count must match the number of spec sections/features
- Track implementation progress with Done/Pending status

### Test strategy

- The test pyramid must list all applicable test levels for the package
- Coverage targets must have regulatory basis citations (GAMP 5, ICH Q9)
- Test file naming must follow the conventions in this skill
- GxP packages must reference IQ/OQ/PQ protocols in `compliance/gxp.md`

## Verification Script (scripts/verify-traceability.sh)

Every spec at the **Full governance** or **Technical + behaviors** tier must include a `scripts/verify-traceability.sh` that validates internal consistency of the traceability matrix. If the script is missing, create it. If it exists but doesn't cover all checks, update it.

### Script architecture

The script follows a standard structure shared across all packages:

```bash
#!/usr/bin/env bash
set -euo pipefail

STRICT=false
[[ "${1:-}" == "--strict" ]] && STRICT=true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SPEC_DIR/<relative-path-to-repo-root>" && pwd)"

# Package-specific paths
TRACEABILITY="$SPEC_DIR/traceability.md"
INVARIANTS="$SPEC_DIR/invariants.md"
DECISIONS_DIR="$SPEC_DIR/decisions"
PKG_DIR="$REPO_ROOT/<path-to-package>"
TESTS_DIR="$PKG_DIR/tests"
```

**Path resolution**: The `REPO_ROOT` relative path depends on spec nesting depth:
- `spec/packages/result/` -> `../../..` (3 levels)
- `spec/libs/clock/` -> `../../..` (3 levels)
- `spec/packages/result/react/` -> `../../../..` (4 levels)

### Required checks

Every script must implement these 6 check categories, adapted to the package's ID scheme:

| # | Check | Spec-side | Code-side | What it validates |
|---|-------|-----------|-----------|-------------------|
| 1 | Spec file existence | Yes | No | Every spec file linked in Capability-Level table exists on disk |
| 2 | Invariant completeness | Yes | No | Every `INV-*` in `invariants.md` has an entry in the Invariant Traceability table |
| 3 | ADR completeness | Yes | No | Every `decisions/NNN-*.md` file has an entry in the ADR Traceability table |
| 4 | Test file existence | No | Yes | Every test file in the Test File Map exists under `tests/` |
| 5 | Forward traceability | No | Yes | Every requirement ID domain has `@traces` annotations in test files |
| 6 | No orphaned test files | No | Yes | Every `*.test.ts` / `*.test-d.ts` appears in the traceability matrix |

**Code-side checks** (4-6) depend on the package existing. When the package doesn't exist yet (spec-first development), they SKIP. With `--strict`, SKIPs become FAILs.

### Adapting checks per package ID scheme

The script must match the package's requirement and invariant ID formats:

| Package | Requirement IDs | Invariant IDs | ADR IDs | Regex pattern |
|---------|----------------|---------------|---------|---------------|
| result (core) | `BEH-XX-NNN` | `INV-N` | `ADR-NNN` | `BEH-[0-9]+-[0-9]+`, `INV-[0-9]+` |
| result-react | `BEH-RXX-NNN` | `INV-RN` | `ADR-RNNN` | `BEH-R[0-9]+-[0-9]+`, `INV-R[0-9]+` |
| result-testing | `BEH-TXX-NNN` | `INV-TN` | `ADR-TNNN` | `BEH-T[0-9]+-[0-9]+`, `INV-T[0-9]+` |
| clock | `CLK-{DOMAIN}-NNN` | `INV-CK-N` | `ADR-CK-NNN` | `CLK-[A-Z]+-[0-9]+`, `INV-CK-[0-9]+` |
| guard | `REQ-GUARD-NNN` / `§N` | `INV-GD-N` | `ADR-GD-NNN` | `REQ-GUARD-[0-9]+`, `INV-GD-[0-9]+` |
| http-client | `§N` | `INV-HC-N` | `ADR-HC-NNN` | `§[0-9]+`, `INV-HC-[0-9]+` |
| flow | `§N` / `FLW-NNN` | `INV-FL-N` | `ADR-FL-NNN` | `FLW-[0-9]+`, `INV-FL-[0-9]+` |
| logger | `§N` / `LOG-NNN` | `INV-LG-N` | `ADR-LG-NNN` | `LOG-[0-9]+`, `INV-LG-[0-9]+` |

For packages using domain-prefixed IDs (like clock's `CLK-*`), check 5 validates at the **domain level** (e.g., every `CLK-MON`, `CLK-SYS` domain has test coverage) rather than individual requirement level, since the full RTM lives in a separate GxP document.

For packages using section-numbered IDs (`§N`), check 5 validates at the **chapter level** (e.g., every numbered chapter has test coverage) rather than individual section level.

### Helper function

All scripts share this `table_rows` helper to extract markdown table data rows from a named `##` section:

```bash
table_rows() {
  awk -v h="$1" '
    $0 ~ ("^## " h) { found=1; next }
    found && /^## / { exit }
    found { print }
  ' "$TRACEABILITY" \
    | grep '^|' \
    | grep -v '^| *---' \
    | sed '1d'
}
```

### Output format

Scripts output a markdown table for easy reading in terminal or CI:

```
| Check | Status | Detail |
|-------|--------|--------|
| 1. Spec file existence | PASS | 6/6 spec files found |
| 2. Invariant completeness | PASS | 14/14 invariants traced |
...
```

Exit code: 0 if all pass/skip, 1 if any fail.

### macOS compatibility

Use `sed` instead of `grep -P` for link extraction (macOS grep lacks PCRE support):

```bash
# WRONG (fails on macOS):
grep -oP '\]\(\K[^)]+' file.md

# CORRECT:
sed -n 's/.*](\([^)]*\)).*/\1/p' file.md
```

### When to create vs update

- **Create**: When `scripts/verify-traceability.sh` doesn't exist and the spec is at Full governance or Technical + behaviors tier
- **Update**: When traceability.md section names change, new ID schemes are introduced, new check categories are needed, or the package directory structure changes
- **Skip**: Stub and Technical-only tier specs don't need a verification script

## Spec Enhancement Workflow

When enhancing an existing spec to match the canonical standard:

1. **Audit current state**: List what documents exist and what's missing against the canonical structure (including DoD, test-strategy, type-system/, compliance/)
2. **Add overview.md** (if missing): Extract mission, API surface, source file map from existing numbered docs
3. **Add requirement IDs**: For Pattern A, create `behaviors/` directory with `BEH-XX-NNN` IDs. For Pattern B, assign domain-prefixed IDs to testable requirements in existing chapters. Tag procedural requirements `[OPERATIONAL]`. Document the ID scheme in `process/requirement-id-scheme.md`.
4. **Extract decisions**: Identify design rationale scattered in technical docs, create formal ADR files in `decisions/`
5. **Identify invariants**: Find runtime guarantees stated in the code or docs, create `invariants.md` with `**Related**` links to FMEA and requirements
6. **Build glossary**: Collect domain terms used across multiple documents
7. **Create type system docs** (if applicable): Add `type-system/phantom-brands.md` for branded scalar types and `type-system/structural-safety.md` for structural incompatibility patterns. Create these files when the package uses non-obvious compile-time safety mechanisms that all contributors must understand.
8. **Create traceability**: Map requirements → source → tests → invariants → FMEA → DoD (full chain)
9. **Assess risk**: Run FMEA on each invariant, assign FM-N IDs, determine risk levels using 3-factor RPN (Severity × Occurrence × Detection)
10. **Create DoD**: For Pattern B packages, create both `NN-definition-of-done.md` (test enumeration with exact counts per file) and `process/definitions-of-done.md` (feature acceptance checklist). For Pattern A packages, create `process/definitions-of-done.md` only. Link every DoD item to spec sections and test files.
11. **Create test strategy**: Write `process/test-strategy.md` defining the test pyramid, coverage targets (≥ 95% for GxP, ≥ 80% mutation score), and file naming conventions
12. **Add compliance** (if GxP): Create `compliance/gxp.md` opening with the cross-cutting reference table, then GAMP 5 classification and ALCOA+ mapping. If compliance content exceeds one file, promote to a numbered `NN-gxp-compliance/` sub-directory.
13. **Add verification script**: Create `scripts/verify-traceability.sh` adapted to the package's ID scheme, then run it to validate consistency
14. **Verify cross-references**: Ensure all links between invariants, FMEA, DoD, traceability, and compliance resolve correctly

## What NOT to do

- Do not copy GxP compliance content from result unless the package genuinely needs GxP compliance
- Do not create governance documents for packages that are still in early design (stick to the appropriate tier)
- Do not add Document Control headers to technical-only specs (they belong on governance documents)
- Do not assign requirement IDs retroactively to existing numbered docs without verifying each ID maps to a genuine testable requirement
- Do not create empty placeholder files. Every file must contain substantive content.
- Do not duplicate content between overview and behavior specs. Overview has the API table; behaviors have the detailed contract.
