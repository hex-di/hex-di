---
id: BEH-SF-598
kind: behavior
title: CI Gate & Drift Core
status: active
id_range: 598--601
invariants: [INV-SF-37, INV-SF-35]
adrs: [ADR-005]
types: [graph, tracking]
ports: [DriftDetectionPort, CIGatePort]
---

# 52 — CI Gate & Drift Core

---

## BEH-SF-598: Drift Detection — Code-to-Spec Delta Computation

> **Invariant:** None

Drift detection computes a delta between the current codebase and the knowledge graph, identifying code artifacts that have diverged from their corresponding spec nodes. The delta captures missing requirement coverage, stale specifications, and broken traceability links.

### Contract

REQUIREMENT (BEH-SF-598): `DriftDetectionPort.computeDelta(specRoot: string, codeRoot: string, options?: DeltaOptions)` MUST return a `DriftDelta` containing: (1) `missingCoverage` — spec behaviors with no corresponding code implementation; (2) `staleSpecs` — spec nodes whose linked code artifacts have changed since the spec was last updated; (3) `brokenLinks` — traceability links (behavior → test, behavior → code, feature → behavior) where the target no longer exists; (4) `unmappedCode` — code files with no corresponding spec traceability link. Each delta entry MUST include: `entityId` (the spec or code identifier), `file` (relative path), `deltaType` (one of `"missing-coverage"`, `"stale-spec"`, `"broken-link"`, `"unmapped-code"`), and `details` (human-readable description). `DeltaOptions` MAY include `incrementalPaths` — when provided, only files in the specified paths are checked (enabling PR-scoped drift detection). The delta computation MUST NOT modify any spec or code files.

### Verification

- Unit test: A behavior with no corresponding test file appears in `missingCoverage`.
- Unit test: A spec node linked to a deleted code file appears in `brokenLinks`.
- Unit test: A code file with no spec traceability link appears in `unmappedCode`.
- Unit test: `incrementalPaths` restricts delta to only the specified files.
- Unit test: Delta computation does not modify any files (read-only operation).
- Integration test: Running against the real spec and code directories produces a valid `DriftDelta`.

---

## BEH-SF-599: Drift Scoring by Severity

> **Invariant:** None

Each drift delta entry is scored by severity to prioritize remediation. The aggregate drift score quantifies the overall health of code-to-spec alignment.

### Contract

REQUIREMENT (BEH-SF-599): `DriftDetectionPort.scoreDelta(delta: DriftDelta)` MUST return a `DriftScore` containing: (1) `totalScore` — a numeric value from 0 (no drift) to 100 (maximum drift); (2) `entries` — the original delta entries annotated with `severity` (`"critical"` | `"high"` | `"medium"` | `"low"`); (3) `breakdown` — a `Map<DeltaType, { count: number; score: number }>` summarizing score contribution by delta type. Severity assignment MUST follow these rules: `"critical"` for broken traceability links to invariant-linked behaviors; `"high"` for missing coverage on active (non-superseded) behaviors; `"medium"` for stale specs older than 30 days; `"low"` for unmapped code files and stale specs newer than 30 days. The scoring formula MUST be deterministic — the same delta always produces the same score. Severity thresholds and scoring weights MUST be configurable via `DriftDetectionPort.setScoringConfig(config: ScoringConfig)`.

### Verification

- Unit test: A broken link to an invariant-linked behavior is scored `"critical"`.
- Unit test: Missing coverage on an active behavior is scored `"high"`.
- Unit test: A stale spec older than 30 days is scored `"medium"`.
- Unit test: An unmapped code file is scored `"low"`.
- Unit test: `totalScore` is 0 when the delta is empty.
- Unit test: Same delta input produces the same score (deterministic).
- Unit test: Custom scoring config changes the resulting score.

---

## BEH-SF-600: CI Gate — Fail Build on Threshold Violation

> **Invariant:** None

The CI gate integrates with CI/CD pipelines to enforce code-to-spec alignment. It fails the build when the drift score exceeds configurable thresholds.

### Contract

REQUIREMENT (BEH-SF-600): `CIGatePort.check(specRoot: string, codeRoot: string, thresholds: GateThresholds)` MUST: (1) compute the drift delta via `DriftDetectionPort.computeDelta()`; (2) score the delta via `DriftDetectionPort.scoreDelta()`; (3) evaluate the score against `GateThresholds`. `GateThresholds` MUST include: `maxScore` (maximum allowed total drift score; exceeding this fails the gate), `maxCritical` (maximum allowed critical-severity entries; exceeding fails), `maxHigh` (maximum allowed high-severity entries; exceeding fails). The gate MUST return a `GateResult` with: `passed` (boolean), `score` (the `DriftScore`), `violations` (array of threshold violations with `threshold`, `actual`, and `message`), and `exitCode` (`0` for pass, `1` for fail). When multiple thresholds are violated, ALL violations MUST be reported (not just the first). Default thresholds MUST be: `maxScore: 50`, `maxCritical: 0`, `maxHigh: 5`.

### Verification

- Unit test: Drift score below all thresholds returns `passed: true` with `exitCode: 0`.
- Unit test: Drift score above `maxScore` returns `passed: false` with `exitCode: 1`.
- Unit test: A single critical entry with `maxCritical: 0` fails the gate.
- Unit test: Multiple threshold violations are all reported in `violations`.
- Unit test: Default thresholds are applied when no custom thresholds are provided.
- Integration test: `CIGatePort.check()` runs end-to-end against real spec and code directories.

---

## BEH-SF-601: Machine-Readable Output (JSON, JUnit XML) for CI

> **Invariant:** None

The CI gate produces machine-readable output formats for integration with CI/CD dashboard tools, test reporters, and PR comment bots.

### Contract

REQUIREMENT (BEH-SF-601): `CIGatePort.formatResult(result: GateResult, format: OutputFormat)` MUST produce output in the requested format. Supported `OutputFormat` values: (1) `"json"` — a JSON object matching the `GateResult` structure with all fields serialized; (2) `"junit"` — JUnit XML format where each drift entry is a `<testcase>`, failed entries have `<failure>` elements with the violation message, and the `<testsuite>` summary includes total/passed/failed counts; (3) `"summary"` — a human-readable markdown summary suitable for PR comments, including a drift score badge, a table of top violations by severity, and a pass/fail status line. The JSON output MUST be valid JSON parseable by `JSON.parse()`. The JUnit XML MUST be valid XML parseable by standard JUnit report tools (e.g., Jenkins, GitHub Actions test reporter). The summary format MUST include the total drift score, counts by severity, and the pass/fail verdict.

### Verification

- Unit test: `"json"` format produces valid JSON with all `GateResult` fields.
- Unit test: `"junit"` format produces valid XML with `<testsuite>` and `<testcase>` elements.
- Unit test: Failed drift entries in JUnit have `<failure>` elements.
- Unit test: `"summary"` format includes drift score, severity counts, and pass/fail verdict.
- Unit test: Empty delta produces valid output in all three formats.
- Unit test: JUnit XML with special characters in messages is properly escaped.
