---
id: TYPE-SF-017
kind: types
title: Structured Output Types
status: active
domain: structured-output
behaviors: []
adrs: [ADR-012]
---

# Structured Output Types

- [types/flow.md](./flow.md) -- `PhaseMetrics`, `FlowRunStatus`, `Finding`, `TokenUsage`, `ModelSelection`
- [types/agent.md](./agent.md) -- `AgentRole`
- [types/graph.md](./graph.md) -- graph node types
- [decisions/ADR-012-json-first-structured-output.md](../decisions/ADR-012-json-first-structured-output.md) -- ADR-012

---

## Agent Self-Assessment

```typescript
interface AgentSelfAssessment {
  readonly confidence: number;
  readonly suggestedNextAction: "continue" | "escalate" | "converge" | "request-review";
  readonly reasoning: string;
  readonly blockers: ReadonlyArray<string>;
}
```

---

## Per-Role Output Schemas

```typescript
interface DiscoveryOutput {
  readonly graphNodes: ReadonlyArray<{
    readonly type: "Requirement" | "Tag" | "Constraint";
    readonly properties: Record<string, unknown>;
  }>;
  readonly graphEdges: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly relationship: string;
  }>;
  readonly findings: ReadonlyArray<{
    readonly severity: "critical" | "major" | "minor" | "observation";
    readonly message: string;
    readonly context: string;
  }>;
  readonly errors: ReadonlyArray<{ readonly code: string; readonly message: string }>;
  readonly selfAssessment: AgentSelfAssessment;
}

interface SpecAuthorOutput {
  readonly graphNodes: ReadonlyArray<{
    readonly type: "SpecFile" | "Behavior" | "Invariant" | "ADR";
    readonly properties: Record<string, unknown>;
  }>;
  readonly graphEdges: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly relationship: string;
  }>;
  readonly findings: ReadonlyArray<{
    readonly severity: "critical" | "major" | "minor" | "observation";
    readonly message: string;
    readonly context: string;
  }>;
  readonly errors: ReadonlyArray<{ readonly code: string; readonly message: string }>;
  readonly selfAssessment: AgentSelfAssessment;
}

interface ReviewerOutput {
  readonly graphNodes: ReadonlyArray<{
    readonly type: "Finding" | "TraceabilityGap";
    readonly properties: Record<string, unknown>;
  }>;
  readonly graphEdges: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly relationship: string;
  }>;
  readonly findings: ReadonlyArray<{
    readonly severity: "critical" | "major" | "minor" | "observation";
    readonly message: string;
    readonly requirementId: string;
    readonly specFile: string;
  }>;
  readonly errors: ReadonlyArray<{ readonly code: string; readonly message: string }>;
  readonly selfAssessment: AgentSelfAssessment;
}

interface DevAgentOutput {
  readonly graphNodes: ReadonlyArray<{
    readonly type: "SourceFile" | "TestFile" | "TaskCompletion";
    readonly properties: Record<string, unknown>;
  }>;
  readonly graphEdges: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly relationship: string;
  }>;
  readonly findings: ReadonlyArray<{
    readonly severity: "critical" | "major" | "minor" | "observation";
    readonly message: string;
    readonly context: string;
  }>;
  readonly errors: ReadonlyArray<{ readonly code: string; readonly message: string }>;
  readonly selfAssessment: AgentSelfAssessment;
}

interface CoverageOutput {
  readonly graphNodes: ReadonlyArray<{
    readonly type: "CoverageReport" | "CoverageGap";
    readonly properties: Record<string, unknown>;
  }>;
  readonly graphEdges: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly relationship: string;
  }>;
  readonly findings: ReadonlyArray<{
    readonly severity: "critical" | "major" | "minor" | "observation";
    readonly message: string;
    readonly gap: string;
  }>;
  readonly errors: ReadonlyArray<{ readonly code: string; readonly message: string }>;
  readonly selfAssessment: AgentSelfAssessment;
}
```

---

## Streaming Events

```typescript
type StreamDashboardEvent =
  | {
      readonly _tag: "tool-call";
      readonly sessionId: string;
      readonly tool: string;
      readonly input: Record<string, unknown>;
      readonly timestamp: string;
    }
  | {
      readonly _tag: "tool-result";
      readonly sessionId: string;
      readonly tool: string;
      readonly result: string;
      readonly durationMs: number;
      readonly timestamp: string;
    }
  | {
      readonly _tag: "partial-text";
      readonly sessionId: string;
      readonly text: string;
      readonly timestamp: string;
    }
  | {
      readonly _tag: "token-update";
      readonly sessionId: string;
      readonly inputTokens: number;
      readonly outputTokens: number;
      readonly timestamp: string;
    }
  | {
      readonly _tag: "error";
      readonly sessionId: string;
      readonly code: string;
      readonly message: string;
      readonly timestamp: string;
    }
  | {
      readonly _tag: "system";
      readonly sessionId: string;
      readonly level: "info" | "warning" | "error";
      readonly message: string;
      readonly timestamp: string;
    };
```

---

## Typed Stage Definition

```typescript
interface TypedStageDefinition {
  readonly role: string;
  readonly outputSchema: string;
  readonly inputSources: ReadonlyArray<string>;
  readonly graphWritePermissions: ReadonlyArray<string>;
}
```
