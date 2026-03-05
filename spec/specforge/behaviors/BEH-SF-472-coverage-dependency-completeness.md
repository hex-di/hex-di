---
id: BEH-SF-472
kind: behavior
title: Coverage, Dependency Graph & Completeness
status: active
id_range: 472--479
invariants: [INV-SF-35, INV-SF-36]
adrs: [ADR-005, ADR-026]
types: [tracking]
ports: [CoverageAnalysisPort, DependencyGraphPort, CompletenessPort]
---

# Coverage, Dependency Graph & Completeness

## BEH-SF-472: Test Coverage per Behavior — Coverage Score 0.0--1.0

> **Invariant:** [INV-SF-35](../invariants/INV-SF-35-dependency-graph-consistency.md) — Dependency Graph Consistency

`CoverageAnalysisPort.behaviorCoverage(behaviorId)` computes a coverage score (0.0 to 1.0) for a single behavior by analyzing its `TESTED_BY` edges and the test results of linked test files. A behavior with no test links has a score of 0.0. A behavior with all tests passing has a score of 1.0. Partial test passage yields a proportional score.

### Contract

REQUIREMENT (BEH-SF-472): When `CoverageAnalysisPort.behaviorCoverage(behaviorId)` is called, the system MUST return a `BehaviorCoverage` with `coverageScore` between 0.0 and 1.0 computed from the ratio of passing tests to total linked tests. `branchCoverage` MUST be computed from branch coverage data if available, defaulting to 0.0 if not. A behavior with no `TESTED_BY` edges MUST return `coverageScore: 0.0`.

### Verification

- Unit test: behavior with 3 passing tests out of 4 linked; verify `coverageScore` is 0.75.
- Unit test: behavior with no linked tests; verify `coverageScore` is 0.0.
- Unit test: behavior with all tests passing; verify `coverageScore` is 1.0.

---

## BEH-SF-473: Test Coverage per Invariant — Min of Enforcing Behaviors

> **Invariant:** [INV-SF-35](../invariants/INV-SF-35-dependency-graph-consistency.md) — Dependency Graph Consistency

`CoverageAnalysisPort.invariantCoverage(invariantId)` computes the coverage score for an invariant as the minimum coverage score among all behaviors that enforce it (i.e., behaviors listed in the invariant's `behaviors` array). An invariant is only as covered as its least-covered enforcing behavior.

### Contract

REQUIREMENT (BEH-SF-473): When `CoverageAnalysisPort.invariantCoverage(invariantId)` is called, the system MUST return an `InvariantCoverage` with `coverageScore` equal to the minimum `coverageScore` of all enforcing behaviors. The `enforcingBehaviors` array MUST list all behavior IDs that reference this invariant. An invariant with no enforcing behaviors MUST return `coverageScore: 0.0`.

### Verification

- Unit test: invariant enforced by behaviors with scores [0.8, 0.6, 1.0]; verify invariant score is 0.6.
- Unit test: invariant with no enforcing behaviors; verify `coverageScore` is 0.0.
- Unit test: invariant enforced by one behavior with score 1.0; verify invariant score is 1.0.

---

## BEH-SF-474: Dependency Graph — `dependentsOf(conceptId)` (Reverse Traversal)

> **Invariant:** [INV-SF-35](../invariants/INV-SF-35-dependency-graph-consistency.md) — Dependency Graph Consistency

`DependencyGraphPort.dependentsOf(conceptId, options)` returns all concepts that depend on the given concept (reverse traversal of `DEPENDS_ON` edges). The result includes transitive dependents up to the configured `maxDepth`.

### Contract

REQUIREMENT (BEH-SF-474): When `DependencyGraphPort.dependentsOf(conceptId, options)` is called, the system MUST return a `DependencyResult` containing all nodes reachable via reverse traversal of `DEPENDS_ON` edges, each with a `distance` (hop count). The query MUST handle cycles by detecting and reporting them in the `cycles` array without infinite recursion. When `maxDepth` is specified, traversal MUST stop at that depth. When `includeTransitive` is false, only direct dependents (distance 1) MUST be returned.

### Verification

- Unit test: A depends on B depends on C; `dependentsOf(C)` returns [B (distance 1), A (distance 2)].
- Cycle test: A depends on B depends on A; verify the query terminates and reports the cycle.
- Depth test: `dependentsOf(C, { maxDepth: 1 })` returns only direct dependents.

---

## BEH-SF-475: Dependency Graph — `dependenciesOf(conceptId)` (Forward Traversal)

> **Invariant:** [INV-SF-35](../invariants/INV-SF-35-dependency-graph-consistency.md) — Dependency Graph Consistency

`DependencyGraphPort.dependenciesOf(conceptId, options)` returns all concepts that the given concept depends on (forward traversal of `DEPENDS_ON` edges). This is the complement of `dependentsOf`.

### Contract

REQUIREMENT (BEH-SF-475): When `DependencyGraphPort.dependenciesOf(conceptId, options)` is called, the system MUST return a `DependencyResult` containing all nodes reachable via forward traversal of `DEPENDS_ON` edges. The consistency invariant requires: if A appears in `dependentsOf(B)`, then B MUST appear in `dependenciesOf(A)`. Cycle detection and depth limiting MUST behave identically to `dependentsOf`.

### Verification

- Unit test: A depends on B depends on C; `dependenciesOf(A)` returns [B (distance 1), C (distance 2)].
- Consistency test: verify `dependentsOf` and `dependenciesOf` produce complementary results.
- Empty test: concept with no dependencies; verify empty nodes array.

---

## BEH-SF-476: Concept Completeness Validation — Schema-Based

> **Invariant:** [INV-SF-36](../invariants/INV-SF-36-completeness-schema-enforcement.md) — Completeness Schema Enforcement

`CompletenessPort.validate(conceptId)` checks a single concept against its completeness schema, returning a list of violations. `CompletenessPort.validateAll()` checks every concept in the graph. Each concept type (behavior, invariant, type, ADR, feature) has a defined set of required fields and cross-references.

### Contract

REQUIREMENT (BEH-SF-476): When `CompletenessPort.validate(conceptId)` is called, the system MUST check the concept against its type-specific completeness schema. Missing required fields MUST produce a `CompletenessViolation` with `rule: 'required_field'`. Missing cross-references (e.g., a behavior without an invariant reference) MUST produce a violation with `rule: 'missing_cross_ref'`. `validateAll()` MUST return a `CompletenessReport` with all violations across all concepts and a `completenessScore` (complete concepts / total concepts).

### Verification

- Unit test: validate a complete behavior (all fields, invariant reference); verify no violations.
- Unit test: validate a behavior missing its invariant reference; verify `missing_cross_ref` violation.
- Unit test: `validateAll()` on a graph with 10 concepts, 2 incomplete; verify score is 0.8.

---

## BEH-SF-477: Missing Invariant Cross-Reference Detection

> **Invariant:** [INV-SF-36](../invariants/INV-SF-36-completeness-schema-enforcement.md) — Completeness Schema Enforcement

`CompletenessPort.detectMissingInvariantRefs()` scans all behavior files and identifies behaviors that do not reference any invariant. This is a specialized completeness check focused on the critical behavior-to-invariant traceability chain.

### Contract

REQUIREMENT (BEH-SF-477): When `CompletenessPort.detectMissingInvariantRefs()` is called, the system MUST scan all behavior nodes in the graph and return a list of behavior IDs that have zero invariant references (no `ENFORCES` edges to invariant nodes). The result MUST include the behavior file name and the behavior's title for actionable reporting.

### Verification

- Unit test: graph with 5 behaviors, 2 missing invariant refs; verify 2 violations returned.
- Unit test: graph where all behaviors have invariant refs; verify empty result.
- Integration test: add a new behavior without an invariant ref, run detection; verify it appears.

---

## BEH-SF-478: Missing Port Specification Detection

> **Invariant:** [INV-SF-36](../invariants/INV-SF-36-completeness-schema-enforcement.md) — Completeness Schema Enforcement

`CompletenessPort.detectMissingPortSpecs()` scans all behavior files and identifies port names referenced in behavior contracts that do not have corresponding port specification entries in the types directory.

### Contract

REQUIREMENT (BEH-SF-478): When `CompletenessPort.detectMissingPortSpecs()` is called, the system MUST extract all port names referenced in behavior file frontmatter (`ports` array) and verify that each port has a corresponding type definition in the `types/ports.md` file or a domain-specific type file. Ports without specifications MUST be reported with the behavior file and port name.

### Verification

- Unit test: behavior references `FooPort` which has no type definition; verify violation reported.
- Unit test: behavior references `GraphStorePort` which has a type definition; verify no violation.
- Integration test: add a new port reference, run detection; verify it appears until the port spec is created.

---

## BEH-SF-479: Completeness Schema Customization — `.specforge/completeness-schema.json`

> **Invariant:** [INV-SF-36](../invariants/INV-SF-36-completeness-schema-enforcement.md) — Completeness Schema Enforcement

Users can customize completeness rules by placing a `.specforge/completeness-schema.json` file in the project root. This file overrides the default completeness schema for all concept types. The custom schema is validated against a meta-schema at load time.

### Contract

REQUIREMENT (BEH-SF-479): When a `.specforge/completeness-schema.json` file exists, the system MUST load and validate it against the completeness meta-schema before applying it. If validation fails, the system MUST return `CompletenessSchemaValidationError` and fall back to the default schema. The custom schema MUST support adding required fields and cross-references per concept type. Changes to the custom schema file MUST take effect on the next `validate()` or `validateAll()` call without restart.

### Verification

- Unit test: place a valid custom schema; verify it overrides default rules.
- Unit test: place an invalid custom schema; verify `CompletenessSchemaValidationError` and default fallback.
- Unit test: modify the custom schema and re-validate; verify new rules apply without restart.

---
