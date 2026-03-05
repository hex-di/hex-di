---
id: BEH-SF-586
kind: behavior
title: Spec Validation
status: active
id_range: 586--593
invariants: [INV-SF-25, INV-SF-35]
adrs: [ADR-026]
types: [graph]
ports: [SpecValidatorPort]
---

# 50 — Spec Validation

**ADR:** [ADR-026](../decisions/ADR-026-spec-structural-validation.md)

---

## BEH-SF-586: Spec Validator Port

> **Invariant:** [INV-SF-35](../invariants/INV-SF-35-coverage-completeness.md) — Coverage Completeness

The spec validator is the primary entry point for structural validation. It accepts a spec root directory and returns a comprehensive validation report covering all 53 rules defined in `process/spec-validation-rules.md`.

### Contract

REQUIREMENT (BEH-SF-586): `SpecValidatorPort.validate(specRoot: string, options?: ValidateOptions)` MUST return a `ValidationReport` containing: (1) `issues` — an array of `ValidationIssue` objects, each with `rule` (VAL-NNN), `severity` (`"error"` | `"warning"` | `"info"`), `message` (human-readable description), `file` (path relative to specRoot), and optional `entityId` (the ID of the violating entity); (2) `stats` — a `ValidationStats` object with `errors` (count), `warnings` (count), `info` (count), `rulesRun` (count of rules executed), `filesScanned` (count of files parsed), and `duration` (milliseconds). The validator MUST run all 53 rules from the catalog unless filtered by `options.categories`. The validator MUST NOT throw on malformed files — parsing failures MUST be reported as VAL-010 violations. The validator MUST process all files before returning (no early termination on first error).

### Verification

- Unit test: `validate()` returns a report with all 53 rules evaluated when no category filter
- Unit test: Report includes correct error, warning, and info counts
- Unit test: Malformed frontmatter produces a VAL-010 issue, not an exception
- Unit test: `filesScanned` count matches actual file count in spec directory
- Unit test: `duration` is a positive number
- Integration test: Running validator against the real spec directory produces a valid report

---

## BEH-SF-587: Rule Registry

> **Invariant:** None

The rule registry manages the collection of validation rules. Each rule is independently addressable and can be queried by ID, category, or severity.

### Contract

REQUIREMENT (BEH-SF-587): The system MUST maintain a `RuleRegistry` containing `RuleDefinition` entries. Each `RuleDefinition` MUST have: `id` (string matching `VAL-NNN` format), `name` (human-readable rule name), `category` (one of the 10 categories: `"id-integrity"`, `"frontmatter-schema"`, `"forward-reference"`, `"reverse-coverage"`, `"index-completeness"`, `"overview-completeness"`, `"markdown-links"`, `"content-structure"`, `"traceability-matrix"`, `"semantic-consistency"`), `severity` (`"error"` | `"warning"` | `"info"`), and `validate` (a function accepting `SpecRegistry` and returning `ValidationIssue[]`). `RuleRegistry.getRules()` MUST return all 53 rules. `RuleRegistry.getRulesByCategory(category)` MUST return only rules matching the category. `RuleRegistry.getRule(id)` MUST return the rule matching the ID or `undefined`. Rule IDs MUST be unique — registering a duplicate MUST fail.

### Verification

- Unit test: Registry contains exactly 53 rules after initialization
- Unit test: `getRulesByCategory("id-integrity")` returns 9 rules (VAL-001 through VAL-009)
- Unit test: `getRule("VAL-001")` returns the correct rule definition
- Unit test: `getRule("VAL-999")` returns undefined
- Unit test: Registering a duplicate ID fails
- Unit test: All rules have valid category and severity values

---

## BEH-SF-588: Frontmatter Parsing

> **Invariant:** None

The validator must parse YAML frontmatter from all markdown files in the spec directory. Parsing must be resilient to malformed content.

### Contract

REQUIREMENT (BEH-SF-588): The system MUST parse YAML frontmatter (delimited by `---` fences) from all `.md` files in the spec directory. Parsed frontmatter MUST be returned as a discriminated union on the `kind` field: `BehaviorFrontmatter` (kind `"behavior"`, with `id_range`, `invariants`, `adrs`, `types`, `ports`), `DecisionFrontmatter` (kind `"decision"`, with `date`, `supersedes`, `invariants`), `FeatureFrontmatter` (kind `"feature"`, with `behaviors`, `adrs`, `roadmap_phases`), `CapabilityFrontmatter` (kind `"capability"`, with `features`, `behaviors`, `persona`, `surface`), and `GenericFrontmatter` (all other kinds). Files without frontmatter MUST be reported as VAL-010 violations, not exceptions. Files with unparseable YAML MUST be reported as VAL-010 violations with the parse error in the message. Directories excluded from frontmatter validation: `visual/`, `references/`, `scripts/`, `research/`, `product/`.

### Verification

- Unit test: Valid behavior frontmatter is parsed into `BehaviorFrontmatter` with all fields
- Unit test: Valid decision frontmatter is parsed into `DecisionFrontmatter` with all fields
- Unit test: File with no `---` fences produces a VAL-010 issue
- Unit test: File with invalid YAML produces a VAL-010 issue with parse error message
- Unit test: Files in `visual/` directory are skipped
- Unit test: Missing optional fields default to empty arrays (not undefined)

---

## BEH-SF-589: Entity Registry Construction

> **Invariant:** None

Before validation runs, the system must build an in-memory registry of all spec entities. This registry is the shared data structure that validation rules query.

### Contract

REQUIREMENT (BEH-SF-589): The system MUST build a `SpecRegistry` from the spec root directory before running validation rules. The registry MUST contain: (1) `files` — all `.md` files with their parsed frontmatter and relative paths; (2) `behaviorIds` — a `Map<string, { file: string; title: string }>` of every `## BEH-SF-NNN:` header extracted from behavior files and plugin files; (3) `behaviorRanges` — a `Map<string, { start: number; end: number }>` from behavior file paths to their `id_range` bounds; (4) `featureIds` — a `Map<string, string>` of FEAT-SF IDs to file paths; (5) `capabilityIds` — a `Map<string, string>` of UX-SF IDs to file paths; (6) `invariantIds` — a `Map<string, string>` of INV-SF IDs to file paths; (7) `adrIds` — a `Map<string, string>` of ADR IDs to file paths; (8) `typeFiles` — a `Map<string, string>` of type domain names to file paths; (9) `indexes` — parsed contents of all `index.yaml` files. The registry MUST extract behavior section IDs by scanning markdown content for `## BEH-SF-NNN:` patterns (not just frontmatter). The registry MUST include plugin files (`plugins/*.md`) in behavior ID scanning.

### Verification

- Unit test: Registry includes all `.md` files from spec directory
- Unit test: `behaviorIds` map contains IDs from `## BEH-SF-NNN:` headers
- Unit test: `behaviorIds` includes gap-fill IDs (e.g., BEH-SF-300 from BEH-SF-001 file)
- Unit test: `behaviorIds` includes plugin IDs (e.g., BEH-SF-370 from PLG-gxp.md)
- Unit test: `behaviorRanges` correctly parses `001--008` format
- Unit test: `indexes` handles all three index.yaml formats (entries[], features[], groups[])
- Integration test: Registry built from real spec directory has correct entity counts

---

## BEH-SF-590: Validation Report Format

> **Invariant:** None

The validation report is the primary output of the validator. It must support both human-readable and machine-readable formats.

### Contract

REQUIREMENT (BEH-SF-590): `ValidationReport` MUST include: `issues` (array of `ValidationIssue`), `stats` (aggregate `ValidationStats`), `ruleResults` (a `Map<string, RuleResult>` mapping each rule ID to its pass/fail status and issue count), and `timestamp` (ISO 8601 string). Each `ValidationIssue` MUST include: `rule` (VAL-NNN string), `severity` (`"error"` | `"warning"` | `"info"`), `message` (human-readable), `file` (relative path), and optional `entityId`. `ValidationStats` MUST include: `errors`, `warnings`, `info` (counts), `rulesRun`, `rulesPassed`, `rulesFailed`, `filesScanned`, and `duration` (milliseconds). The report MUST support JSON serialization via `report.toJSON()`. The report MUST support a human-readable summary via `report.toSummary()` returning a formatted string with per-category breakdowns.

### Verification

- Unit test: Report JSON serialization produces valid JSON with all fields
- Unit test: `toSummary()` includes category headers and issue counts
- Unit test: `ruleResults` has an entry for every rule that was run
- Unit test: A rule with zero issues has `status: "passed"` in ruleResults
- Unit test: Stats counts match the actual number of issues in the issues array
- Unit test: `timestamp` is a valid ISO 8601 string

---

## BEH-SF-591: CI Integration

> **Invariant:** None

The validator must integrate into CI pipelines with standard exit code conventions and be runnable as a package script.

### Contract

REQUIREMENT (BEH-SF-591): The validator MUST be runnable via `pnpm spec:validate` from the repository root. The validator MUST exit with code 0 when no `error`-severity issues are found. The validator MUST exit with code 1 when one or more `error`-severity issues are found. `warning`-severity issues MUST NOT cause a non-zero exit code unless the `--strict` flag is provided. When `--strict` is set, both `error` and `warning` issues cause exit code 1. `info`-severity issues MUST never cause a non-zero exit code regardless of flags. The validator MUST write a JSON report to `spec-validation-report.json` when the `--json` flag is provided. The validator MUST print a human-readable summary to stdout by default. The validator MUST accept `--spec-root <path>` to specify the spec directory (defaulting to `spec/specforge/`).

### Verification

- Unit test: Exit code 0 when only warnings and info issues exist
- Unit test: Exit code 1 when at least one error issue exists
- Unit test: `--strict` mode exits with code 1 on warnings
- Unit test: `--json` writes a valid JSON file
- Unit test: Default output is human-readable summary on stdout
- Integration test: `pnpm spec:validate` runs successfully from repo root

---

## BEH-SF-592: Category Filtering

> **Invariant:** None

Users can run a subset of validation rules by specifying categories, enabling targeted validation during incremental spec edits.

### Contract

REQUIREMENT (BEH-SF-592): The validator MUST support a `--category <name>` flag to run only rules from the specified category. Multiple `--category` flags MAY be specified to run rules from multiple categories. Valid category names are: `id-integrity`, `frontmatter-schema`, `forward-reference`, `reverse-coverage`, `index-completeness`, `overview-completeness`, `markdown-links`, `content-structure`, `traceability-matrix`, `semantic-consistency`. An invalid category name MUST produce an error message listing valid categories. When categories are filtered, `stats.rulesRun` MUST reflect only the rules actually executed. The entity registry (BEH-SF-589) MUST still be fully built even when categories are filtered, because rules in one category may depend on data needed by another.

### Verification

- Unit test: `--category id-integrity` runs only 9 rules
- Unit test: `--category id-integrity --category frontmatter-schema` runs 17 rules
- Unit test: Invalid category name produces an error listing valid categories
- Unit test: `stats.rulesRun` matches the number of rules in selected categories
- Unit test: Full entity registry is built regardless of category filter

---

## BEH-SF-593: Severity Classification

> **Invariant:** None

Rules are classified into three severity levels with consistent assignment criteria.

### Contract

REQUIREMENT (BEH-SF-593): Rules MUST use exactly three severity levels: `error`, `warning`, `info`. Severity assignments MUST follow these criteria: (1) `error` — the violation makes the spec structurally inconsistent (duplicate IDs, broken forward references, missing required frontmatter, missing index entries, broken markdown links, mismatched requirement IDs); (2) `warning` — the violation represents a coverage gap or best-practice deviation (orphan entities, missing recommended frontmatter fields, stale overview.md, superseded ADR status mismatch); (3) `info` — the violation is a suggestion for improvement (unreferenced type domains, deprecated behavior without replacement mention, port names not in types/ports.md). Severity assignments MUST match those defined in `process/spec-validation-rules.md`. Changing a rule's severity MUST require updating both the rule implementation and the catalog document.

### Verification

- Unit test: Every rule's severity matches the catalog in `process/spec-validation-rules.md`
- Unit test: All error-severity rules detect structurally inconsistent states
- Unit test: Warning-severity rules detect coverage gaps but not structural breaks
- Unit test: Info-severity rules detect suggestions that don't affect structural integrity
- Unit test: No rule uses a severity value outside the three defined levels
