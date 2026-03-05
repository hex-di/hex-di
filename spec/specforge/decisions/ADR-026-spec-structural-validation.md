---
id: ADR-026
kind: decision
title: Spec Structural Validation
status: Accepted
date: 2026-03-01
supersedes: []
invariants: [INV-SF-35]
---

# ADR-026: Spec Structural Validation

**Extends:** [ADR-005](./ADR-005-graph-first-architecture.md)

## Context

The SpecForge specification has grown to 580+ markdown files with cross-references across 10+ categories (behaviors, features, capabilities, invariants, decisions, types, architecture, plugins, traceability, risk assessment). Maintaining structural integrity manually is unsustainable:

1. **No formal validity definition** — There is no specification of what constitutes a structurally valid spec. New contributors have no reference for required frontmatter fields, cross-reference rules, or naming conventions.
2. **Orphan entities** — Behaviors exist that no feature references. Invariants exist that no behavior claims. These orphans represent gaps in the traceability chain that go undetected until a manual audit.
3. **Broken forward references** — A behavior's `adrs: [ADR-042]` list may reference a non-existent ADR. A feature's `behaviors: [BEH-SF-999]` may point to an unallocated ID. These breakages are silent.
4. **Index drift** — Index.yaml files fall out of sync with their directories. New files are added but not listed; deleted files leave stale entries.
5. **Overview.md staleness** — The master navigation document (`overview.md`) misses newly added behavior files, ADRs, or process documents.
6. **Limited existing checks** — The current `scripts/verify-traceability.sh` covers only 8 basic checks (duplicate IDs, orphan behaviors, orphan invariants). It does not validate frontmatter schemas, index completeness, markdown link integrity, or content structure.
7. **Three index formats** — `behaviors/index.yaml` and `decisions/index.yaml` use `entries[]`, `features/index.yaml` uses `features[]`, and `capabilities/index.yaml` uses `groups[].capabilities[]`. Any validator must handle all three.

## Decision

### 1. Define 53 Structural Validation Rules

Catalog all structural validity constraints in `process/spec-validation-rules.md` as formally identified rules (VAL-001 through VAL-053) across 10 categories:

| Category                    | Rules       | Scope                                                                         |
| --------------------------- | ----------- | ----------------------------------------------------------------------------- |
| ID Integrity                | VAL-001–009 | No duplicate IDs, ranges don't overlap, section IDs within range              |
| Frontmatter Schema          | VAL-010–017 | Required fields present, kind matches directory, valid status values          |
| Forward Reference Integrity | VAL-018–024 | Every cross-reference points to an existing target                            |
| Reverse Coverage            | VAL-025–030 | Every entity referenced by at least one upstream entity                       |
| Index File Completeness     | VAL-031–037 | Index.yaml files in sync with their directories                               |
| Overview.md Completeness    | VAL-038–042 | Overview.md references all spec files                                         |
| Markdown Link Integrity     | VAL-043–045 | All relative links resolve to existing files                                  |
| Content Structure           | VAL-046–048 | Behavior sections have Contract and Verification subsections                  |
| Traceability Matrix         | VAL-049–050 | Traceability documents list all entities                                      |
| Semantic Consistency        | VAL-051–053 | Superseded ADRs have correct status, deprecated behaviors mention replacement |

### 2. Three Severity Levels

Each rule has a severity that determines its impact on validation:

| Severity  | Meaning                                          | CI behavior               |
| --------- | ------------------------------------------------ | ------------------------- |
| `error`   | Structural break — spec is inconsistent          | Fail CI gate              |
| `warning` | Coverage gap — spec is incomplete but not broken | Pass CI unless `--strict` |
| `info`    | Suggestion — spec could be improved              | Never fails CI            |

### 3. SpecValidatorPort as First-Class Component

Define a `SpecValidatorPort` with behaviors (BEH-SF-586 through BEH-SF-593) that specifies the validator's API contract: input (spec root directory), output (`ValidationReport` with per-rule results and summary stats), and execution modes (full, category-filtered, strict).

### 4. Replace verify-traceability.sh

The validator subsumes and replaces `scripts/verify-traceability.sh`. All 8 existing checks are covered by the 53-rule catalog. The validator is runnable as `pnpm spec:validate` and integrates into CI as a gate.

### 5. Key Parsing Challenges

The validator must handle several non-obvious parsing challenges:

- **Behavior ID resolution** — Features reference `BEH-SF-002` but the file is `BEH-SF-001-graph-operations.md` with `id_range: 001--008`. The validator must parse `id_range` fields and extract `## BEH-SF-NNN:` headers from content.
- **Gap-fill behaviors** — IDs 300–396 are placed in existing files outside their primary range (e.g., `BEH-SF-300` in `BEH-SF-001-graph-operations.md`).
- **Plugin behaviors** — `plugins/PLG-gxp.md` defines BEH-SF-370–379 outside the `behaviors/` directory.
- **Three index.yaml formats** — `entries[]`, `features[]`, and `groups[].capabilities[]`.
- **INV-SF numbering** — No zero-padding (`INV-SF-1`), unlike BEH-SF (`BEH-SF-001`).
- **Directories to skip** — `visual/`, `references/`, `scripts/`, `research/`, `product/` are excluded from frontmatter validation.

## Trade-Offs

**Benefits:**

- Every spec change can be validated before merge, catching structural drift automatically
- New spec authors have a clear reference for what makes a valid specification
- Orphan entities, broken links, and index gaps are surfaced immediately rather than during manual audits
- The formal rule catalog doubles as documentation of spec conventions
- Category filtering allows targeted validation during incremental edits

**Costs:**

- 53 rules require implementation and maintenance as the spec format evolves
- Some rules (e.g., VAL-052 content analysis for deprecation mentions) require heuristic parsing
- Gap-fill behaviors and cross-file ID ranges add parser complexity
- False positives from info-level rules may require tuning

## Consequences

- [process/spec-validation-rules.md](../process/spec-validation-rules.md) — Full 53-rule catalog with IDs, severity, descriptions, examples
- [behaviors/BEH-SF-586-spec-validation.md](../behaviors/BEH-SF-586-spec-validation.md) — BEH-SF-586 through BEH-SF-593
- [process/requirement-id-scheme.md](../process/requirement-id-scheme.md) — BEH-SF-586–593 allocation range added
- [scripts/verify-traceability.sh](../scripts/verify-traceability.sh) — Superseded by SpecValidatorPort (retained for reference)

## References

- [ADR-005](./ADR-005-graph-first-architecture.md) — Graph-First Architecture (spec graph as validation input)
- [behaviors/BEH-SF-582-spec-component-graph.md](../behaviors/BEH-SF-582-spec-component-graph.md) — Spec component graph assembly (complementary subsystem)
- [process/requirement-id-scheme.md](../process/requirement-id-scheme.md) — ID format definitions
- [process/ci-maintenance.md](../process/ci-maintenance.md) — CI pipeline stages (validator integration point)
