---
id: TYPE-SF-010
kind: types
title: Flow Execution Types
status: active
domain: flow
behaviors: []
adrs: [ADR-019]
---

# Flow Execution Types

- [architecture/c1-system-context.md](../architecture/c1-system-context.md) -- system context for flow engine placement
- [types/agent.md](./agent.md) -- `AgentRole` used in `StageDefinition`, `TestRunResult` used in `VerificationReport`
- [types/acp.md](./acp.md) -- `ACPMessage`, `ACPMessagePart` used for finding/document exchange
- [types/errors.md](./errors.md) -- `FlowNotFoundError`, `FlowAlreadyRunningError`, `FlowRunNotFoundError`, `PhaseError`, `FlowValidationError`, `SpecStoreError`, `CoverageError`, `VerificationError`, `TaskDecomposerError`, `ReverseRunStateError`

---

## FlowRun

Runtime representation of an executing or completed flow instance.

```typescript
interface FlowRun {
  readonly flowRunId: string;
  readonly flowName: string;
  readonly status: FlowRunStatus;
  readonly currentPhase: string | undefined;
  readonly currentIteration: number;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | undefined;
}
```

---

## FlowConfig

Configuration passed when starting a flow run.

```typescript
interface FlowConfig {
  readonly input: FlowInput | undefined;
  readonly overrides: Partial<FlowOptions> | undefined;
  readonly sessionId: string | undefined;
}
```

---

## Flow Input & Options

```typescript
interface FlowInput {
  readonly packageName?: string;
  readonly specPath?: string;
  readonly targetPath?: string;
  readonly diff?: string;
  readonly scope?: string;
  readonly composedContextId?: string;
  readonly options?: FlowOptions;
}
```

> **Forward reference:** `FlowPresetName` is defined in the [Flow Presets](#flow-presets) section below.

```typescript
interface FlowOptions {
  readonly batch?: boolean;
  readonly maxIterations?: number;
  readonly gxp?: boolean;
  readonly model?: "opus" | "sonnet" | "haiku";
  readonly tokenBudget?: number;
  readonly concurrency?: number;
  readonly preset?: FlowPresetName;
}

interface FlowScope {
  readonly flowRunId: string;
  readonly flowName: string;
  readonly projectId?: string;
}
```

---

## Flow Status

```typescript
type FlowRunStatus = "pending" | "running" | "paused" | "completed" | "cancelled" | "failed";

type OrchestratorStatus = "idle" | "running" | "paused";
```

---

## Result Types

```typescript
interface FlowResult {
  readonly flowRunId: string;
  readonly flowName: string;
  readonly status: FlowRunStatus;
  readonly phases: ReadonlyArray<PhaseResult>;
  readonly tokenUsage: TokenUsage;
  readonly startedAt: string;
  readonly completedAt?: string;
}

interface PhaseResult {
  readonly phaseName: string;
  readonly status: "converged" | "max-iterations" | "failed" | "cancelled";
  readonly iterations: number;
  readonly metrics: PhaseMetrics;
  readonly findings: ReadonlyArray<Finding>;
  readonly duration: number;
  readonly tokenUsage: TokenUsage;
}

interface OrchestratorResult {
  readonly flowRunId: string;
  readonly flowName: string;
  readonly status: FlowRunStatus;
}

interface FlowSummary {
  readonly name: string;
  readonly description: string;
  readonly phaseCount: number;
  readonly builtIn: boolean;
}
```

---

## Token Usage

```typescript
interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly estimatedCost?: number;
}
```

---

## Flow Definition

```typescript
interface FlowDefinition {
  readonly name: string;
  readonly description: string;
  readonly phases: ReadonlyArray<PhaseDefinition>;
  readonly tokenBudget?: number;
  readonly presets?: Record<FlowPresetName, FlowPreset>;
}

interface PhaseDefinition {
  readonly name: string;
  readonly mode: "automated" | "conversational";
  readonly stages: ReadonlyArray<StageDefinition>;
  readonly convergence: ConvergenceCriteria;
  readonly maxIterations: number;
  readonly tokenBudget?: number;
  readonly compositionStrategy?: CompositionStrategy;
  readonly modelStrategy?: ModelStrategy;
  readonly modelEscalation?: ModelEscalation;
  readonly preset?: FlowPresetName;
}

interface StageDefinition {
  readonly name: string;
  readonly agentRoles: ReadonlyArray<AgentRole>;
  readonly concurrent?: boolean;
  readonly capabilities?: Record<string, AgentRoleCapabilities>;
}
```

> **Capability validation (ADR-019):** When `capabilities` is specified, `TemplateService.validateCapabilities()` checks all role-tool bindings at flow definition time before the first phase starts. `AgentRoleCapabilities` is defined in [types/acp.md](./acp.md#agent-role-capabilities). The record key is the `AgentRole` string.

```typescript
interface FlowValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<FlowCapabilityError>;
}

interface FlowCapabilityError {
  readonly role: string;
  readonly phaseName: string;
  readonly missingTools: ReadonlyArray<string>;
  readonly missingCapabilities: ReadonlyArray<string>;
}

interface ConvergenceCriteria {
  readonly isConverged: (metrics: PhaseMetrics) => boolean;
}
```

> **Serialization note:** `ConvergenceCriteria` contains function-typed fields (`evaluate`) that are not directly serializable. For persistence and export use cases, use `ConvergenceCriteriaConfig` (the declarative configuration) which serializes to JSON. At runtime, `ConvergenceCriteriaConfig` is compiled into the executable `ConvergenceCriteria`.

```typescript
interface ConvergenceCriteriaConfig {
  readonly maxIterations: number;
  readonly strategy: "unanimous" | "majority" | "threshold";
  readonly threshold?: number; // Required when strategy is 'threshold'
  readonly minIterations?: number;
}
```

```typescript
type ModelSelection = "opus" | "sonnet" | "haiku";

type CompositionStrategy =
  | { readonly kind: "role-based" }
  | { readonly kind: "topic-based"; readonly keywords: ReadonlyArray<string> }
  | { readonly kind: "similarity"; readonly minScore: number }
  | { readonly kind: "flow-based"; readonly flowRunId: string }
  | { readonly kind: "curated"; readonly chunkIds: ReadonlyArray<string> };
```

---

## Flow Presets

```typescript
type FlowPresetName = "quick" | "standard" | "thorough";

interface FlowPreset {
  readonly name: FlowPresetName;
  readonly maxIterations: number;
  readonly modelOverride?: ModelSelection;
  readonly convergence: ConvergenceCriteria;
}

type ModelStrategy = "fixed" | "escalating";

interface ModelEscalation {
  readonly startModel: ModelSelection;
  readonly escalateToModel: ModelSelection;
  readonly escalateAfterIteration: number;
}
```

---

## Phase Metrics

Collected after each iteration and passed to convergence functions.

```typescript
interface PhaseMetrics {
  readonly iteration: number;
  readonly criticalFindings: number;
  readonly majorFindings: number;
  readonly minorFindings: number;
  readonly requirementsCovered: number;
  readonly totalRequirements: number;
  readonly coveragePercent: number;
  readonly testsPass: number;
  readonly testsFail: number;
  readonly skippedTests?: number;
  readonly planEntriesTotal?: number;
  readonly planEntriesCompleted?: number;
}
```

> **Note (M53):** `skippedTests` is optional. Convergence criteria implementations MUST treat `undefined` as `0` when evaluating test coverage.

---

## Spec Document & Output

```typescript
interface SpecDocument {
  readonly specId: string;
  readonly title: string;
  readonly content: string;
  readonly version: number;
  readonly requirements: ReadonlyArray<string>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface SpecSummary {
  readonly specId: string;
  readonly title: string;
  readonly version: number;
  readonly requirementCount: number;
  readonly updatedAt: string;
}

interface SpecFilter {
  readonly packageName?: string;
  readonly status?: string;
  readonly updatedSince?: string;
}

type OutputFormat =
  | "markdown"
  | "adr"
  | "rfc"
  | "coverage-report"
  | "task-list"
  | "traceability-matrix";
```

---

## Coverage Types

```typescript
interface CoverageScope {
  readonly specId?: string;
  readonly packageName?: string;
  readonly requirementIds?: ReadonlyArray<string>;
}

interface CoverageReport {
  readonly scope: CoverageScope;
  readonly totalRequirements: number;
  readonly coveredRequirements: number;
  readonly coveragePercent: number;
  readonly entries: ReadonlyArray<CoverageEntry>;
  readonly gaps: ReadonlyArray<CoverageGap>;
}

interface CoverageEntry {
  readonly requirementId: string;
  readonly coveredBy: ReadonlyArray<string>;
  readonly percentage: number;
}

interface CoverageGap {
  readonly requirementId: string;
  readonly missingLinks: ReadonlyArray<"task" | "code" | "test">;
  readonly severity: "critical" | "major" | "minor";
}
```

---

## Verification Types

```typescript
interface VerificationScope {
  readonly specId?: string;
  readonly requirementIds?: ReadonlyArray<string>;
  readonly testPaths?: ReadonlyArray<string>;
}

interface VerificationReport {
  readonly scope: VerificationScope;
  readonly status: "pass" | "fail" | "partial";
  readonly entries: ReadonlyArray<VerificationEntry>;
  readonly testResults: TestRunResult;
}

interface VerificationEntry {
  readonly requirementId: string;
  readonly status: "verified" | "failed" | "untested";
  readonly evidence: ReadonlyArray<string>;
}

type VerificationStatus = "verified" | "failed" | "untested" | "in-progress";
```

---

## Task Types

```typescript
interface TaskPlan {
  readonly planId: string;
  readonly specId: string;
  readonly groups: ReadonlyArray<TaskGroup>;
  readonly totalTasks: number;
  readonly createdAt: string;
}

interface TaskGroup {
  readonly groupId: string;
  readonly name: string;
  readonly tasks: ReadonlyArray<TaskItem>;
  readonly dependencies: ReadonlyArray<string>;
}

interface TaskItem {
  readonly taskId: string;
  readonly title: string;
  readonly requirementIds: ReadonlyArray<string>;
  readonly acceptanceCriteria: ReadonlyArray<string>;
  readonly status: "pending" | "in-progress" | "completed" | "blocked";
}
```

---

## Reverse Engineering Types

```typescript
interface ReverseRunState {
  readonly runId: string;
  readonly flowRunId: string;
  readonly completedPhases: ReadonlyArray<string>;
  readonly currentPhase?: string;
  readonly scannedFiles: ReadonlyArray<string>;
  readonly extractedSymbols: number;
  readonly lastCheckpoint: string;
}
```

---

## Finding Type

Shared across flow results, ACP message findings, and phase metrics.

```typescript
interface Finding {
  readonly findingId: string;
  readonly severity: "critical" | "major" | "minor" | "observation";
  readonly status: "open" | "resolved" | "wont-fix" | "deferred";
  readonly agentRole: string;
  readonly description: string;
  readonly requirementIds?: ReadonlyArray<string>;
  readonly specFile?: string;
  readonly createdAt: string;
}
```

---

## FlowTemplate

Reusable flow definition template with parameterized configuration.

```typescript
interface FlowTemplate {
  readonly templateName: string;
  readonly description: string;
  readonly definition: FlowDefinition;
  readonly parameters: ReadonlyArray<TemplateParameter> | undefined;
}

interface TemplateParameter {
  readonly name: string;
  readonly type: "string" | "number" | "boolean";
  readonly required: boolean;
  readonly defaultValue: string | number | boolean | undefined;
  readonly description: string | undefined;
}
```

---

## Convergence Types

Results and metrics produced by convergence evaluation during iterative phases.

```typescript
interface ConvergenceResult {
  readonly converged: boolean;
  readonly metrics: ConvergenceMetrics;
  readonly reason: string | undefined;
}

interface ConvergenceMetrics {
  readonly iteration: number;
  readonly criticalDelta: number;
  readonly majorDelta: number;
  readonly coverageDelta: number;
  readonly trend: "improving" | "stable" | "degrading";
}
```

---

## Composition Types

Configuration for session context composition.

```typescript
interface CompositionConfig {
  readonly strategy: CompositionStrategy;
  readonly tokenBudget: number;
  readonly includeRoles: ReadonlyArray<string> | undefined;
  readonly includeFlowRuns: ReadonlyArray<string> | undefined;
}

interface ComposedContext {
  readonly sessionId: string;
  readonly chunks: ReadonlyArray<SessionChunk>;
  readonly totalTokens: number;
  readonly composedAt: string;
}

interface SessionChunk {
  readonly chunkId: string;
  readonly source: "role-based" | "topic-based" | "similarity" | "flow-based" | "curated";
  readonly content: string;
  readonly tokenCount: number;
  readonly metadata: Record<string, unknown>;
}
```

---

## Analytics Types

Types for flow metrics, quality trends, and cost reporting.

```typescript
interface FlowMetrics {
  readonly flowRunId: string;
  readonly totalPhases: number;
  readonly completedPhases: number;
  readonly totalIterations: number;
  readonly tokenUsage: TokenUsage;
  readonly duration: number;
  readonly findingCounts: {
    readonly critical: number;
    readonly major: number;
    readonly minor: number;
    readonly observation: number;
  };
}

interface QualityTrends {
  readonly projectId: string;
  readonly entries: ReadonlyArray<QualityTrendEntry>;
}

interface QualityTrendEntry {
  readonly date: string;
  readonly coveragePercent: number;
  readonly openFindings: number;
  readonly criticalFindings: number;
}

interface CostReport {
  readonly flowRunId: string;
  readonly totalTokens: number;
  readonly estimatedCostUsd: number;
  readonly breakdownByPhase: ReadonlyArray<{
    readonly phaseName: string;
    readonly tokens: number;
    readonly costUsd: number;
  }>;
  readonly breakdownByModel: ReadonlyArray<{
    readonly model: ModelSelection;
    readonly tokens: number;
    readonly costUsd: number;
  }>;
}
```

---

## Import Types

Types for parsing imported data before graph integration.

```typescript
interface ParsedImport {
  readonly entries: ReadonlyArray<ParsedImportEntry>;
  readonly format: string;
  readonly sourceFile: string;
}

interface ParsedImportEntry {
  readonly id: string;
  readonly type: "requirement" | "task" | "test" | "code" | "document";
  readonly title: string;
  readonly content: string;
  readonly metadata: Record<string, unknown>;
}
```

---

## Schema Types

Schema definitions for runtime validation.

```typescript
interface SchemaDefinition {
  readonly name: string;
  readonly schema: Record<string, unknown>;
  readonly version: string | undefined;
}
```

---

## Cross-File Type References

The following types defined in this file are referenced by other specification files:

| Type                  | Referenced by                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ModelSelection`      | [types/ports.md](./ports.md), [types/acp.md](./acp.md), [types/extensibility.md](./extensibility.md), [types/agent.md](./agent.md) |
| `ComposedContext`     | [types/agent.md](./agent.md) (cross-reference only; canonical definition is in this file)                                          |
| `TokenUsage`          | [types/acp.md](./acp.md), [types/agent.md](./agent.md), [types/extensibility.md](./extensibility.md)                               |
| `Finding`             | [types/acp.md](./acp.md), [types/extensibility.md](./extensibility.md)                                                             |
| `PhaseMetrics`        | [types/extensibility.md](./extensibility.md)                                                                                       |
| `FlowPresetName`      | Used within this file by `FlowOptions` and `PhaseDefinition`                                                                       |
| `CompositionStrategy` | [types/agent.md](./agent.md)                                                                                                       |
