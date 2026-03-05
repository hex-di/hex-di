---
id: PROC-SF-006
kind: process
title: Spec Validation Rules
status: active
---

# Spec Validation Rules

Formal catalog of 53 structural validation rules for the SpecForge specification. Each rule has a unique identifier (VAL-NNN), severity level, description, and example violation.

**ADR:** [ADR-026](../decisions/ADR-026-spec-structural-validation.md)

---

## Severity Levels

| Level     | Meaning                                              | CI Effect                        |
| --------- | ---------------------------------------------------- | -------------------------------- |
| `error`   | Structural break — the spec is inconsistent          | Fails CI gate                    |
| `warning` | Coverage gap — the spec is incomplete but not broken | Passes CI unless `--strict` mode |
| `info`    | Suggestion — the spec could be improved              | Never fails CI                   |

---

## Category 1: ID Integrity (VAL-001 through VAL-009)

Ensures all spec entity IDs are unique, non-overlapping, and correctly allocated.

| Rule    | Severity | Description                                                                                                                                                                                                            |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VAL-001 | error    | No duplicate BEH-SF IDs across all behavior files. Every `## BEH-SF-NNN:` header must appear exactly once across the entire spec (including gap-fills and plugins).                                                    |
| VAL-002 | error    | No duplicate FEAT-SF IDs across all feature files. Every `id` frontmatter value in `features/` must be unique.                                                                                                         |
| VAL-003 | error    | No duplicate UX-SF IDs across all capability files. Every `id` frontmatter value in `capabilities/` must be unique.                                                                                                    |
| VAL-004 | error    | No duplicate INV-SF IDs across all invariant files. Every invariant ID in `invariants/` must be unique.                                                                                                                |
| VAL-005 | error    | No duplicate ADR IDs across all decision files. Every `id` frontmatter value in `decisions/` must be unique.                                                                                                           |
| VAL-006 | error    | No duplicate TYPE-SF IDs across all type files. Every `id` frontmatter value (if present) in `types/` must be unique.                                                                                                  |
| VAL-007 | error    | BEH-SF section IDs (`## BEH-SF-NNN:`) fall within the file's declared `id_range`. Exception: gap-fill behaviors are explicitly allocated outside the primary range (documented in `process/requirement-id-scheme.md`). |
| VAL-008 | error    | `id_range` values don't overlap between behavior files. No two behavior files may claim the same ID range in their frontmatter.                                                                                        |
| VAL-009 | warning  | Filename ID prefix matches frontmatter `id` field. E.g., `BEH-SF-001-graph-operations.md` must have `id: BEH-SF-001` in frontmatter.                                                                                   |

**Example violation (VAL-001):**

```
BEH-SF-057 defined in both:
  - behaviors/BEH-SF-057-flow-execution.md (## BEH-SF-057: Convergence Evaluation)
  - behaviors/BEH-SF-049-flow-definitions.md (## BEH-SF-057: Convergence Evaluation)
```

**Parsing notes:**

- BEH-SF IDs are extracted from `## BEH-SF-NNN:` markdown headers, not from frontmatter `id` fields (which only identify the file).
- Gap-fill behaviors (IDs 300–396) are allocated to existing files outside their primary range. VAL-007 must cross-reference the allocation table in `process/requirement-id-scheme.md`.
- Plugin behaviors (`plugins/PLG-gxp.md` defining BEH-SF-370–379) are included in duplicate detection.

---

## Category 2: Frontmatter Schema (VAL-010 through VAL-017)

Validates that all spec files have correct YAML frontmatter with required fields.

| Rule    | Severity | Description                                                                                                                                                                                                                                                     |
| ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VAL-010 | error    | All spec files (excluding `visual/`, `references/`, `scripts/`, `research/`, `product/`) have valid YAML frontmatter delimited by `---` fences.                                                                                                                 |
| VAL-011 | error    | Required fields present in all frontmatter: `id`, `kind`, `title`, `status`.                                                                                                                                                                                    |
| VAL-012 | error    | `kind` value matches the file's parent directory: `behaviors/` → `behavior`, `decisions/` → `decision`, `features/` → `feature`, `capabilities/` → `capability`, `types/` → `type`, `invariants/` → `invariant`, `process/` → `process`, `plugins/` → `plugin`. |
| VAL-013 | warning  | `status` is a valid value for its kind: behaviors use `active` or `deprecated`; decisions use `Accepted`, `Superseded`, or `Draft`; features use `active` or `planned`; capabilities use `active` or `planned`.                                                 |
| VAL-014 | warning  | Behavior files have recommended frontmatter fields: `id_range`, `invariants`, `adrs`, `types`, `ports`.                                                                                                                                                         |
| VAL-015 | warning  | Feature files have recommended frontmatter fields: `behaviors`, `adrs`, `roadmap_phases`.                                                                                                                                                                       |
| VAL-016 | warning  | Capability files have recommended frontmatter fields: `features`, `behaviors`, `persona`, `surface`.                                                                                                                                                            |
| VAL-017 | warning  | Decision files have recommended frontmatter fields: `date`, `supersedes`.                                                                                                                                                                                       |

**Example violation (VAL-012):**

```
File: features/FEAT-SF-001-graph-store.md
  Frontmatter kind: "behavior"
  Expected kind: "feature" (file is in features/ directory)
```

---

## Category 3: Forward Reference Integrity (VAL-018 through VAL-024)

Every cross-reference in frontmatter must point to an existing target entity.

| Rule    | Severity | Description                                                                                                                                                                                                                              |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VAL-018 | error    | `invariants: [INV-SF-N]` in behavior frontmatter references an existing invariant. The INV-SF-N ID must exist in `invariants/`.                                                                                                          |
| VAL-019 | error    | `adrs: [ADR-NNN]` in behavior/feature/type frontmatter references an existing ADR file in `decisions/`.                                                                                                                                  |
| VAL-020 | error    | `behaviors: [BEH-SF-NNN]` in feature/capability frontmatter references an existing BEH-SF definition. Resolution: find a behavior file whose `id_range` covers the ID, or a `## BEH-SF-NNN:` header in any behavior file or plugin file. |
| VAL-021 | error    | `features: [FEAT-SF-NNN]` in capability frontmatter references an existing feature file in `features/`.                                                                                                                                  |
| VAL-022 | warning  | `types: [domain]` in behavior frontmatter references an existing type file in `types/` with that domain name (e.g., `types: [graph]` → `types/graph.md`).                                                                                |
| VAL-023 | error    | `supersedes: [ADR-NNN]` in decision frontmatter references an existing ADR file in `decisions/`.                                                                                                                                         |
| VAL-024 | warning  | `roadmap_phases: [RM-NN]` in feature frontmatter references an existing roadmap file or entry in `roadmap/`.                                                                                                                             |

**Example violation (VAL-020):**

```
File: features/FEAT-SF-004-flow-engine.md
  behaviors: [BEH-SF-057, BEH-SF-999]
  BEH-SF-999 not found in any behavior file id_range or ## header
```

**Parsing notes:**

- BEH-SF resolution requires building a lookup from `id_range` fields (e.g., `001--008` means IDs 001 through 008 are valid) AND scanning for `## BEH-SF-NNN:` headers in file content.
- INV-SF IDs use no zero-padding (`INV-SF-1` not `INV-SF-001`).
- ADR references may appear as `ADR-005` (number only) and must resolve to `decisions/ADR-005-*.md`.

---

## Category 4: Reverse Coverage (VAL-025 through VAL-030)

Every entity must be referenced by at least one upstream entity, ensuring full traceability.

| Rule    | Severity | Description                                                                                                                                                                     |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VAL-025 | warning  | Every BEH-SF ID (from `## BEH-SF-NNN:` headers) is referenced by at least one FEAT-SF `behaviors` list.                                                                         |
| VAL-026 | warning  | Every FEAT-SF is referenced by at least one UX-SF `features` list.                                                                                                              |
| VAL-027 | warning  | Every INV-SF is referenced by at least one BEH-SF `invariants` list.                                                                                                            |
| VAL-028 | warning  | Every ADR is referenced by at least one BEH-SF `adrs` list.                                                                                                                     |
| VAL-029 | info     | Every type domain is referenced by at least one BEH-SF `types` list.                                                                                                            |
| VAL-030 | warning  | Every BEH-SF file references at least one INV-SF or ADR in its frontmatter (traceability anchor). A behavior file with empty `invariants` and empty `adrs` has no traceability. |

**Example violation (VAL-025):**

```
BEH-SF-300: Idempotent Graph Sync
  Not referenced by any feature's behaviors list.
  Defined in: behaviors/BEH-SF-001-graph-operations.md (gap-fill)
```

---

## Category 5: Index File Completeness (VAL-031 through VAL-037)

Index.yaml files must be in sync with their directories.

| Rule    | Severity | Description                                                                                                                          |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| VAL-031 | error    | Every `.md` file in `behaviors/` (excluding `index.md`) is listed in `behaviors/index.yaml` `entries[]`.                             |
| VAL-032 | error    | Every `.md` file in `decisions/` is listed in `decisions/index.yaml` `entries[]`.                                                    |
| VAL-033 | error    | Every `.md` file in `types/` is listed in `types/index.yaml` `entries[]`.                                                            |
| VAL-034 | warning  | Every `.md` file in `features/` is listed in `features/index.yaml` `features[]`.                                                     |
| VAL-035 | warning  | Every `.md` file in `capabilities/` is listed in `capabilities/index.yaml` `groups[].capabilities[]`.                                |
| VAL-036 | warning  | Every `.md` file in `invariants/` is listed in `invariants/index.yaml` `entries[]`.                                                  |
| VAL-037 | error    | Every index.yaml entry's `file` field points to an existing `.md` file in its directory. No stale entries pointing to deleted files. |

**Example violation (VAL-031):**

```
File: behaviors/BEH-SF-536-reactive-graph-pipeline.md
  Not listed in behaviors/index.yaml entries[]
```

**Parsing notes — three index.yaml formats:**

1. **Standard** (`behaviors/`, `decisions/`, `invariants/`, `types/`, `process/`):

   ```yaml
   entries:
     - id: "BEH-SF-001-graph-operations"
       file: "BEH-SF-001-graph-operations.md"
       title: "01 — Graph Operations"
   ```

2. **Features** (`features/`):

   ```yaml
   features:
     - id: FEAT-SF-001
       file: FEAT-SF-001-graph-store.md
       title: "Graph-First Knowledge Store"
   ```

3. **Capabilities** (`capabilities/`):
   ```yaml
   groups:
     - name: Flow Operations
       capabilities:
         - id: UX-SF-001
           file: UX-SF-001-run-predefined-flow.md
           title: Run a Predefined Flow
   ```

---

## Category 6: Overview.md Completeness (VAL-038 through VAL-042)

The master navigation document must reference all spec files.

| Rule    | Severity | Description                                                                |
| ------- | -------- | -------------------------------------------------------------------------- |
| VAL-038 | warning  | Every behavior file is listed in overview.md `### Behaviors` table.        |
| VAL-039 | warning  | Every ADR is listed in overview.md `### Decisions` table.                  |
| VAL-040 | info     | Every type file is listed in overview.md `### Types` table.                |
| VAL-041 | info     | Every architecture file is listed in overview.md `### Architecture` table. |
| VAL-042 | info     | Every feature file is listed in overview.md `### Features` table.          |

**Example violation (VAL-038):**

```
File: behaviors/BEH-SF-544-project-lifecycle.md
  Not listed in overview.md ### Behaviors table
```

---

## Category 7: Markdown Link Integrity (VAL-043 through VAL-045)

All inline `[text](path)` links must resolve to existing files.

| Rule    | Severity | Description                                                                                                                    |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| VAL-043 | error    | All relative markdown links (`](../path)` or `](./path)`) resolve to existing files. Fragment links (`#section`) are excluded. |
| VAL-044 | warning  | Links to behavior files use the correct `BEH-SF-NNN-slug.md` filename format.                                                  |
| VAL-045 | warning  | Links to ADR files use the correct `ADR-NNN-slug.md` filename format.                                                          |

**Example violation (VAL-043):**

```
File: behaviors/BEH-SF-033-blackboard.md
  Link: [ADR-003](../decisions/ADR-003-blackboard-communications.md)
  Target does not exist (correct filename: ADR-003-blackboard-communication.md)
```

---

## Category 8: Content Structure (VAL-046 through VAL-048)

Behavior files must follow the standard section structure.

| Rule    | Severity | Description                                                                                                                 |
| ------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| VAL-046 | warning  | Every `## BEH-SF-NNN:` section has a `### Contract` subsection.                                                             |
| VAL-047 | error    | Every `### Contract` subsection contains a `REQUIREMENT (BEH-SF-NNN):` statement where NNN matches the parent section's ID. |
| VAL-048 | warning  | Every `## BEH-SF-NNN:` section has a `### Verification` subsection.                                                         |

**Example violation (VAL-047):**

```
File: behaviors/BEH-SF-057-flow-execution.md
  Section: ## BEH-SF-303: Budget Zone Enforcement
  Contract subsection found, but contains:
    "REQUIREMENT (BEH-SF-057):" — ID mismatch, expected BEH-SF-303
```

---

## Category 9: Traceability Matrix (VAL-049 through VAL-050)

Traceability documents must list all entities they track.

| Rule    | Severity | Description                                                                                               |
| ------- | -------- | --------------------------------------------------------------------------------------------------------- |
| VAL-049 | warning  | Every INV-SF ID appears in `traceability/TRACE-SF-002-invariant-behavior.md` (or the traceability index). |
| VAL-050 | warning  | Every ADR ID appears in `traceability/TRACE-SF-003-adr-behavior.md` (or the traceability index).          |

**Example violation (VAL-049):**

```
INV-SF-35: Coverage Completeness
  Not listed in traceability/TRACE-SF-002-invariant-behavior.md
```

---

## Category 10: Semantic Consistency (VAL-051 through VAL-053)

Cross-reference semantics must be logically consistent.

| Rule    | Severity | Description                                                                                                                                                                                |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| VAL-051 | warning  | If ADR-X has `supersedes: [ADR-Y]`, then ADR-Y's frontmatter `status` should be `"Superseded"`.                                                                                            |
| VAL-052 | info     | Behaviors with `status: deprecated` should mention a replacement or successor in their content (heuristic: content contains "superseded by", "replaced by", "see BEH-SF-", or "see ADR-"). |
| VAL-053 | info     | Port names in behavior `ports` frontmatter fields should appear in `types/ports.md` or `architecture/ports-and-adapters.md`.                                                               |

**Example violation (VAL-051):**

```
ADR-018 supersedes: [ADR-003, ADR-004]
  ADR-003 status: "Accepted" — expected "Superseded"
```

---

## Summary

| Category                    | Rules       | Errors | Warnings | Info  |
| --------------------------- | ----------- | ------ | -------- | ----- |
| ID Integrity                | VAL-001–009 | 8      | 1        | 0     |
| Frontmatter Schema          | VAL-010–017 | 3      | 5        | 0     |
| Forward Reference Integrity | VAL-018–024 | 5      | 2        | 0     |
| Reverse Coverage            | VAL-025–030 | 0      | 5        | 1     |
| Index File Completeness     | VAL-031–037 | 4      | 3        | 0     |
| Overview.md Completeness    | VAL-038–042 | 0      | 2        | 3     |
| Markdown Link Integrity     | VAL-043–045 | 1      | 2        | 0     |
| Content Structure           | VAL-046–048 | 1      | 2        | 0     |
| Traceability Matrix         | VAL-049–050 | 0      | 2        | 0     |
| Semantic Consistency        | VAL-051–053 | 0      | 1        | 2     |
| **Total**                   | **53**      | **22** | **25**   | **6** |
