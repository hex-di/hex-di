---
id: TYPE-SF-018
kind: types
title: Implementation Tracking Types
status: active
domain: tracking
behaviors:
  [
    BEH-SF-464,
    BEH-SF-465,
    BEH-SF-466,
    BEH-SF-467,
    BEH-SF-468,
    BEH-SF-469,
    BEH-SF-470,
    BEH-SF-471,
    BEH-SF-472,
    BEH-SF-473,
    BEH-SF-474,
    BEH-SF-475,
    BEH-SF-476,
    BEH-SF-477,
    BEH-SF-478,
    BEH-SF-479,
    BEH-SF-480,
    BEH-SF-481,
    BEH-SF-482,
    BEH-SF-483,
    BEH-SF-484,
    BEH-SF-485,
    BEH-SF-486,
    BEH-SF-487,
    BEH-SF-488,
    BEH-SF-489,
    BEH-SF-490,
    BEH-SF-491,
    BEH-SF-492,
    BEH-SF-493,
    BEH-SF-494,
    BEH-SF-495,
  ]
adrs: []
---

# Implementation Tracking Types

- [types/graph.md](./graph.md) -- `GraphNode`, `GraphEdge` used as base graph primitives
- [types/errors.md](./errors.md) -- error type conventions (`_tag` discriminants, `Object.freeze()`)

---

## Implementation Status

```typescript
type ImplementationStatus = "not_started" | "in_progress" | "implemented" | "verified";

interface StatusTransition {
  readonly behaviorId: string;
  readonly from: ImplementationStatus;
  readonly to: ImplementationStatus;
  readonly changedBy: string;
  readonly changedAt: string; // ISO-8601
  readonly reason: string;
  readonly force: boolean;
}

interface ImplementationStatusEntry {
  readonly behaviorId: string;
  readonly status: ImplementationStatus;
  readonly updatedAt: string; // ISO-8601
  readonly testedBy: ReadonlyArray<string>; // test file paths
  readonly implementedBy: ReadonlyArray<string>; // source file paths
}

interface ImplementationStatusFilter {
  readonly status?: ImplementationStatus;
  readonly behaviorFile?: string;
  readonly phase?: string;
  readonly since?: string; // ISO-8601
}

interface ImplementationStatusReport {
  readonly entries: ReadonlyArray<ImplementationStatusEntry>;
  readonly summary: StatusSummary;
  readonly generatedAt: string; // ISO-8601
}

interface StatusSummary {
  readonly total: number;
  readonly notStarted: number;
  readonly inProgress: number;
  readonly implemented: number;
  readonly verified: number;
}
```

---

## Lifecycle Timestamps

```typescript
interface LifecycleTimestamps {
  readonly createdAt: string; // ISO-8601, set once at creation
  readonly updatedAt: string; // ISO-8601, monotonically non-decreasing
}
```

---

## Test Coverage

```typescript
interface BehaviorCoverage {
  readonly behaviorId: string;
  readonly testFiles: ReadonlyArray<string>;
  readonly coverageScore: number; // 0.0 to 1.0
  readonly branchCoverage: number; // 0.0 to 1.0
}

interface InvariantCoverage {
  readonly invariantId: string;
  readonly enforcingBehaviors: ReadonlyArray<string>;
  readonly coverageScore: number; // min of enforcing behavior scores
}

interface AggregateCoverage {
  readonly totalBehaviors: number;
  readonly coveredBehaviors: number;
  readonly averageScore: number;
  readonly belowThreshold: ReadonlyArray<string>; // behavior IDs below min threshold
}

interface CoverageReport {
  readonly behaviors: ReadonlyArray<BehaviorCoverage>;
  readonly invariants: ReadonlyArray<InvariantCoverage>;
  readonly aggregate: AggregateCoverage;
  readonly generatedAt: string; // ISO-8601
}
```

---

## Dependency Graph

```typescript
interface DependencyQueryOptions {
  readonly maxDepth?: number; // default: unlimited
  readonly includeTransitive?: boolean; // default: true
  readonly edgeTypes?: ReadonlyArray<string>; // filter by relationship type
}

interface DependencyNode {
  readonly id: string;
  readonly type: string; // 'behavior' | 'invariant' | 'type' | 'adr' | 'feature'
  readonly name: string;
  readonly distance: number; // hop count from query root
}

interface DependencyEdge {
  readonly sourceId: string;
  readonly targetId: string;
  readonly type: string; // 'DEPENDS_ON' | 'ENFORCES' | 'IMPLEMENTS' | 'TESTS'
}

interface DependencyResult {
  readonly rootId: string;
  readonly nodes: ReadonlyArray<DependencyNode>;
  readonly edges: ReadonlyArray<DependencyEdge>;
  readonly cycles: ReadonlyArray<ReadonlyArray<string>>; // detected cycle paths
}
```

---

## Completeness

```typescript
interface CompletenessViolation {
  readonly conceptId: string;
  readonly conceptType: string;
  readonly field: string;
  readonly rule: string; // e.g., 'required_field', 'missing_cross_ref'
  readonly message: string;
}

interface CompletenessReport {
  readonly violations: ReadonlyArray<CompletenessViolation>;
  readonly totalConcepts: number;
  readonly completeConcepts: number;
  readonly completenessScore: number; // 0.0 to 1.0
  readonly generatedAt: string; // ISO-8601
}

interface CompletenessSchema {
  readonly version: string;
  readonly rules: ReadonlyArray<CompletenessRule>;
}

interface CompletenessRule {
  readonly conceptType: string;
  readonly requiredFields: ReadonlyArray<string>;
  readonly requiredCrossRefs: ReadonlyArray<{
    readonly targetType: string;
    readonly minCount: number;
  }>;
}
```

---

## Progress Dashboard

```typescript
interface ProgressOverview {
  readonly summary: StatusSummary;
  readonly coverage: AggregateCoverage;
  readonly stalenessAlerts: ReadonlyArray<StalenessAlert>;
  readonly generatedAt: string; // ISO-8601
}

interface PhaseProgress {
  readonly phaseId: string;
  readonly phaseName: string;
  readonly summary: StatusSummary;
  readonly coverage: AggregateCoverage;
}

interface BurndownDataPoint {
  readonly date: string; // ISO-8601 date
  readonly notStarted: number;
  readonly inProgress: number;
  readonly implemented: number;
  readonly verified: number;
}

interface StalenessAlert {
  readonly behaviorId: string;
  readonly lastVerifiedAt: string; // ISO-8601
  readonly sourceFileChangedAt: string; // ISO-8601
  readonly staleByDays: number;
}
```

---

## Issue & PR Linkage

```typescript
interface IssueNode {
  readonly issueId: string;
  readonly url: string;
  readonly title: string;
  readonly state: "open" | "closed";
  readonly labels: ReadonlyArray<string>;
  readonly lastSyncedAt: string; // ISO-8601
}

interface PullRequestNode {
  readonly prId: string;
  readonly url: string;
  readonly title: string;
  readonly state: "open" | "closed" | "merged";
  readonly targetBranch: string;
  readonly lastSyncedAt: string; // ISO-8601
}

interface WorkItemTraceabilityReport {
  readonly behaviorId: string;
  readonly issues: ReadonlyArray<IssueNode>;
  readonly pullRequests: ReadonlyArray<PullRequestNode>;
  readonly fullyTracked: boolean; // has both issue and PR linkage
}
```

---

## CI Validation

```typescript
interface CICheckResult {
  readonly passed: boolean;
  readonly exitCode: 0 | 1;
  readonly violations: ReadonlyArray<CIViolation>;
  readonly checksum: string; // deterministic hash of input state
  readonly duration: number; // milliseconds
  readonly generatedAt: string; // ISO-8601
}

interface CIViolation {
  readonly rule: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly conceptId?: string;
  readonly file?: string;
}

interface CICoverageGate {
  readonly minCoverageScore: number; // 0.0 to 1.0
  readonly minBranchCoverage: number; // 0.0 to 1.0
  readonly excludePatterns: ReadonlyArray<string>;
}

interface CICompletenessGate {
  readonly requireInvariantRefs: boolean;
  readonly requireTypeRefs: boolean;
  readonly requireAdrRefs: boolean;
}
```

---

## Error Types

```typescript
interface InvalidStatusTransitionError {
  readonly _tag: "InvalidStatusTransitionError";
  readonly behaviorId: string;
  readonly from: ImplementationStatus;
  readonly to: ImplementationStatus;
  readonly message: string;
}

interface TestFileNotFoundError {
  readonly _tag: "TestFileNotFoundError";
  readonly behaviorId: string;
  readonly testFilePath: string;
  readonly message: string;
}

interface SourceFileNotFoundError {
  readonly _tag: "SourceFileNotFoundError";
  readonly behaviorId: string;
  readonly sourceFilePath: string;
  readonly message: string;
}

interface IssueNotFoundError {
  readonly _tag: "IssueNotFoundError";
  readonly issueId: string;
  readonly message: string;
}

interface CompletenessSchemaValidationError {
  readonly _tag: "CompletenessSchemaValidationError";
  readonly schemaPath: string;
  readonly violations: ReadonlyArray<string>;
  readonly message: string;
}
```

> All error objects MUST be created with `Object.freeze()` per project conventions. The `_tag` field enables discriminated union pattern matching.
