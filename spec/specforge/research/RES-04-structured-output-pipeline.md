---
id: RES-04
kind: research
title: Research 04 -- Structured Output Pipeline
status: Draft
date: 2026-02-27
outcome: deferred
related_adr: []
---

# Research 04 -- Structured Output Pipeline

Claude Code's `--json-schema` flag combined with `--output-format stream-json` creates a fundamentally different integration surface than what SpecForge currently models. Today, the `ClaudeCodeAdapter` (BEH-SF-151 through BEH-SF-160) treats agent output as opaque text that must be parsed after the fact. Structured output eliminates that parsing layer entirely: agents return validated JSON conforming to schemas that map directly to SpecForge's type system, Neo4j graph nodes, and ACP session events.

This document explores the concrete capabilities this unlocks across the entire pipeline.

---

## 1. Schema-Validated Agent Outputs

### The Problem

The current adapter receives agent output as a `result` string field (BEH-SF-155). Extracting structured artifacts -- findings, documents, graph nodes -- requires fragile regex or LLM-based post-processing. A reviewer agent might produce findings embedded in markdown prose. A spec-author might output a requirement list inside a fenced code block. Extraction fails silently when the agent deviates from expected formatting.

### The Solution

Every `sendTask()` call passes a `--json-schema` that matches the expected `AgentOutput` shape for that specific task type. Claude Code validates the output against the schema before returning it. The adapter receives typed JSON, not text.

```bash
claude -p --resume "$SESSION_ID" \
  --output-format json \
  --json-schema '{
    "type": "object",
    "properties": {
      "documents": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "documentId": { "type": "string" },
            "title": { "type": "string" },
            "content": { "type": "string" },
            "version": { "type": "integer" }
          },
          "required": ["documentId", "title", "content", "version"]
        }
      },
      "findings": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "findingId": { "type": "string" },
            "severity": { "enum": ["critical", "major", "minor", "observation"] },
            "status": { "enum": ["open", "resolved", "wont-fix", "deferred"] },
            "agentRole": { "type": "string" },
            "description": { "type": "string" },
            "requirementIds": { "type": "array", "items": { "type": "string" } },
            "specFile": { "type": "string" }
          },
          "required": ["findingId", "severity", "status", "agentRole", "description"]
        }
      },
      "status": { "enum": ["completed", "needs-clarification", "blocked"] },
      "tokenUsage": {
        "type": "object",
        "properties": {
          "inputTokens": { "type": "integer" },
          "outputTokens": { "type": "integer" },
          "totalTokens": { "type": "integer" }
        },
        "required": ["inputTokens", "outputTokens", "totalTokens"]
      }
    },
    "required": ["status", "tokenUsage"]
  }' \
  "Review the auth module for security issues"
```

The `structured_output` field in the response is guaranteed to conform. No extraction. No retry on malformed output. The adapter deserializes it directly into `AgentOutput`.

### Impact on ClaudeCodeAdapter

BEH-SF-155 (Token Tracking from Stream) changes: instead of parsing stream-json events for token metadata alone, the final JSON response provides an authoritative `structured_output` that maps one-to-one to `AgentOutput`. The adapter no longer assembles output from text fragments.

---

## 2. Direct Graph Node Extraction

### The Mechanism

Agent schemas can include graph-native output fields. Instead of agents producing prose that a separate pipeline converts to graph operations, agents produce graph nodes directly.

```json
{
  "type": "object",
  "properties": {
    "graphNodes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "labels": { "type": "array", "items": { "type": "string" } },
          "properties": { "type": "object" }
        },
        "required": ["id", "labels", "properties"]
      }
    },
    "graphEdges": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "sourceId": { "type": "string" },
          "targetId": { "type": "string" },
          "type": { "type": "string" },
          "properties": { "type": "object" }
        },
        "required": ["sourceId", "targetId", "type"]
      }
    }
  }
}
```

A discovery-agent scanning a codebase outputs `Requirement` nodes with `TRACES_TO` edges to `Task` nodes. A reviewer outputs `Finding` nodes with `COVERS` edges to the requirements they affect. These are not intermediate representations. They match `GraphNode` and `GraphEdge` from `types/graph.md` exactly. The `GraphSyncPort` ingests them without transformation.

### Per-Role Graph Schemas

Each agent role gets a schema tailored to the node types it produces:

| Role              | Output Node Types                | Output Edge Types        |
| ----------------- | -------------------------------- | ------------------------ |
| `discovery-agent` | `Requirement`, `Tag`             | `CONTAINS`, `TAGS`       |
| `spec-author`     | `SpecFile`, `Requirement`        | `CONTAINS`, `DEPENDS_ON` |
| `reviewer`        | `Finding`                        | `COVERS`, `MITIGATES`    |
| `task-decomposer` | `Task`, `TaskGroup`              | `TRACES_TO`              |
| `coverage-agent`  | `QualityMetric`, `CoverageEntry` | `MEASURES`               |
| `dev-agent`       | `Task` (status updates)          | --                       |

The schema enforces that a reviewer cannot produce `Task` nodes and a discovery-agent cannot produce `Finding` nodes. Schema validation replaces the tool scoping approach (BEH-SF-152) at the output level: roles are constrained not just in what tools they can use, but in what artifacts they can produce.

---

## 3. Real-Time Streaming Dashboard

### Stream-JSON Event Model

`--output-format stream-json` emits newline-delimited JSON events. Each event has a `type` field. Combined with `--verbose` and `--include-partial-messages`, the stream provides:

- `text` events with partial model output
- `tool_use` events when the agent calls a tool
- `tool_result` events with tool output
- `system` events (compaction, context management)
- `error` events

### Dashboard Integration

The SpecForge Web Dashboard (architecture/c3-web-dashboard.md) currently receives updates via ACP session events over WebSocket. Stream-json enables a finer-grained view:

1. **Live agent activity** -- each `tool_use` event surfaces what the agent is doing right now. "Agent `reviewer` is reading `src/auth/middleware.ts`." This replaces polling for status updates.

2. **Partial finding preview** -- `text` events with `--include-partial-messages` let the dashboard show findings as they form. A finding about a security issue appears in the dashboard before the agent finishes its full review pass.

3. **Tool call timeline** -- every `tool_use` / `tool_result` pair becomes a timeline entry. The dashboard can render: "Glob `src/**/*.ts` -> 47 files -> Read `src/auth/jwt.ts` -> 142 lines -> Grep `password` in `src/` -> 3 matches". This is observability that no amount of after-the-fact logging recreates.

4. **Token burn rate** -- stream events carry token metadata. The dashboard renders a real-time token consumption gauge per agent, per phase, per flow run. Budget warnings trigger as they happen, not after the agent finishes.

### Implementation Shape

```typescript
interface StreamDashboardEvent {
  readonly flowRunId: string;
  readonly sessionId: string;
  readonly agentRole: AgentRole;
  readonly timestamp: string;
  readonly event:
    | { readonly kind: "tool-call"; readonly tool: string; readonly args: string }
    | { readonly kind: "tool-result"; readonly tool: string; readonly duration: number }
    | { readonly kind: "partial-text"; readonly text: string }
    | { readonly kind: "token-update"; readonly inputTokens: number; readonly outputTokens: number }
    | { readonly kind: "error"; readonly message: string }
    | { readonly kind: "system"; readonly message: string };
}
```

The adapter transforms raw stream-json lines into `StreamDashboardEvent` instances and forwards them via the existing WebSocket channel to the dashboard. This requires no new protocol -- it extends the `ACPSessionEvent` union with a `StreamUpdate` variant.

---

## 4. Typed Pipeline Composition

### Agent-to-Agent Data Flow

Structured output enables type-checked pipelines where one agent's output schema is the next agent's input schema. The orchestrator validates compatibility at flow-definition time, not at runtime.

**Example: Discovery -> Spec Author -> Reviewer pipeline**

Stage 1 -- Discovery agent output schema:

```json
{
  "requirements": [{ "id": "string", "text": "string", "priority": "string" }],
  "codebaseMap": { "modules": ["string"], "entryPoints": ["string"] }
}
```

Stage 2 -- Spec author receives `requirements` and `codebaseMap` as composed context. Its output schema:

```json
{
  "specDocument": {
    "specId": "string",
    "title": "string",
    "content": "string",
    "version": "integer"
  },
  "extractedRequirements": [{ "id": "string", "text": "string", "traces": ["string"] }]
}
```

Stage 3 -- Reviewer receives `specDocument` and `extractedRequirements`. Its output schema:

```json
{
  "findings": [
    {
      "findingId": "string",
      "severity": "string",
      "description": "string",
      "requirementIds": ["string"]
    }
  ],
  "verdict": { "approved": "boolean", "reason": "string" }
}
```

### Compile-Time Schema Validation

The flow definition declares schemas for each stage. Before execution, the orchestrator validates that output schemas are compatible with downstream input expectations. A type mismatch -- say the discovery agent's schema uses `priority` as an integer but the spec author expects a string enum -- is caught when the flow is registered, not when it runs.

```typescript
interface TypedStageDefinition extends StageDefinition {
  readonly inputSchema?: object; // JSON Schema for expected input
  readonly outputSchema: object; // JSON Schema for guaranteed output
}
```

This transforms flows from "agents produce text and we hope it works" to "agents produce validated data and the pipeline is type-safe end-to-end."

---

## 5. Structured Error Reporting

### Error-as-Data via JSON Schema

When an agent encounters an issue it cannot resolve, the structured output schema includes an `errors` field. Errors are not exceptions that crash the pipeline. They are data that flows through the same channels as findings and documents.

```json
{
  "type": "object",
  "properties": {
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "_tag": { "type": "string" },
          "message": { "type": "string" },
          "severity": { "enum": ["fatal", "degraded", "warning"] },
          "context": {
            "type": "object",
            "properties": {
              "file": { "type": "string" },
              "line": { "type": "integer" },
              "suggestion": { "type": "string" }
            }
          }
        },
        "required": ["_tag", "message", "severity"]
      }
    }
  }
}
```

A reviewer agent that hits a file it cannot parse reports a structured error with a `suggestion` field: "File `legacy/auth.c` uses C preprocessor macros. Consider running through `cpp` first." This error becomes a `Finding` node in the graph with `severity: "warning"` and a `COVERS` edge to the requirement it was trying to verify.

The adapter maps agent-reported structured errors to SpecForge error types from `types/errors.md`. The `_tag` field in the agent error maps to the SpecForge error `_tag` discriminant. No string parsing. No heuristic matching.

---

## 6. Automated Test Case Generation

### Structured Test Output

Agents producing test cases return them as structured JSON, not as code blocks embedded in prose.

```json
{
  "type": "object",
  "properties": {
    "testCases": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "testId": { "type": "string" },
          "name": { "type": "string" },
          "requirementId": { "type": "string" },
          "type": { "enum": ["unit", "integration", "e2e"] },
          "filePath": { "type": "string" },
          "code": { "type": "string" },
          "assertions": {
            "type": "array",
            "items": { "type": "string" }
          }
        },
        "required": ["testId", "name", "requirementId", "type", "code"]
      }
    }
  }
}
```

### Pipeline Integration

1. The `coverage-agent` identifies requirements without test coverage (gaps from `CoverageReport.gaps`).
2. The `dev-agent` receives those gaps and produces test cases as structured output.
3. Each test case carries its `requirementId`, creating a `TRACES_TO` edge in the graph.
4. The orchestrator writes test files to disk and runs them via `TestRunConfig`.
5. Results feed back as `VerificationEntry` nodes with `status: "verified"` or `status: "failed"`.

The structured schema guarantees that every test case has a requirement link. No orphan tests. The traceability gap detection from `TraceabilityGapsResult.codeWithoutTests` shrinks automatically.

---

## 7. Multi-Format Rendering from Structured Source

### JSON-First, Render-Second

Today, `OutputFormat` from `types/flow.md` lists: `markdown`, `adr`, `rfc`, `coverage-report`, `task-list`, `traceability-matrix`. Each format requires its own rendering logic. If the canonical source is markdown, producing an ADR means parsing markdown to extract structure, then re-rendering.

With structured output, the canonical source is JSON. Rendering is projection.

```
Structured JSON (source of truth)
  |
  +---> Markdown renderer  -> .md files
  +---> ADR renderer       -> decisions/*.md
  +---> HTML renderer      -> dashboard views
  +---> Neo4j renderer     -> MERGE queries
  +---> Traceability renderer -> matrix views
  +---> PDF renderer       -> compliance documents
```

A single `SpecDocument` as structured JSON renders to markdown for human review, to Neo4j MERGE statements for graph sync, and to HTML for the web dashboard. The spec-author agent never needs to know the output format. It produces structure. Rendering is a downstream concern.

### Export Adapter Simplification

The `ExportAdapterService` from `types/import-export.md` becomes simpler. Its `render()` method receives typed JSON instead of parsing markdown. The `ImportAdapterService.parse()` method returns the same structured type. Import and export share a common intermediate representation: the agent's JSON schema.

---

## 8. Incremental Diff Streaming

### The Scenario

A spec-author agent is rewriting a large specification document. The current model: the agent finishes, returns the full document, the adapter diffs it against the previous version, and syncs changes to the graph.

### The Stream-JSON Alternative

With `--output-format stream-json` combined with structured output schemas, the adapter processes partial results as they arrive. The agent's output schema includes an `incremental` flag:

```json
{
  "type": "object",
  "properties": {
    "patches": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "nodeId": { "type": "string" },
          "operation": { "enum": ["create", "update", "delete"] },
          "properties": { "type": "object" }
        },
        "required": ["nodeId", "operation"]
      }
    }
  }
}
```

As the agent works, stream events carry partial patches. The adapter applies them to the ACP session incrementally. The graph sync port projects them into Neo4j in near-real-time. The dashboard shows requirements appearing in the graph as the agent discovers them, not after a batch dump.

This leverages the idempotent graph sync invariant: replaying the same patch produces the same state. Incremental application is safe.

---

## 9. Schema Evolution and Versioning

### The Problem

As SpecForge evolves, agent output schemas change. A v1 finding has `severity` as a three-value enum. A v2 finding adds `observation` as a fourth value. Running a v2 flow against a project with v1 findings in the graph causes mismatches.

### Versioned Schemas

Every schema carries a `$version` field. The orchestrator tracks schema versions per project.

```json
{
  "$version": "2.0",
  "type": "object",
  "properties": {
    "findings": { "...": "..." }
  }
}
```

Migration functions transform between versions:

```typescript
interface SchemaMigration {
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly migrate: (data: unknown) => unknown;
}
```

When the orchestrator detects a version mismatch between stored graph data and the current schema, it runs the migration chain. This is analogous to database migrations but for agent output schemas.

### Backward Compatibility Without Compatibility Shims

Per project rules: "No backward compatibility. Always implement the cleanest solution." Schema evolution here means: if the v2 schema is better, migrate all existing data. No dual-format support. No compatibility layers. The migration runs once, the old schema is deleted, and the system moves forward.

---

## 10. Convergence Metrics as Structured Output

### Current Convergence Model

`ConvergenceCriteria.isConverged(metrics: PhaseMetrics)` is a function that evaluates whether a phase should continue iterating. `PhaseMetrics` includes `criticalFindings`, `coveragePercent`, `testsPass`, etc.

### Structured Metrics from Agents

Instead of the orchestrator computing metrics by counting findings in the ACP session, agents report their own structured metrics as part of their output schema:

```json
{
  "type": "object",
  "properties": {
    "selfAssessment": {
      "type": "object",
      "properties": {
        "criticalIssuesFound": { "type": "integer" },
        "requirementsCoveredIds": { "type": "array", "items": { "type": "string" } },
        "confidenceScore": { "type": "number", "minimum": 0, "maximum": 1 },
        "suggestedNextAction": { "enum": ["iterate", "converge", "escalate"] }
      },
      "required": ["criticalIssuesFound", "confidenceScore", "suggestedNextAction"]
    }
  }
}
```

The orchestrator still makes the final convergence decision, but it has richer input: not just counts from the ACP session, but the agent's own confidence score and recommendation. A reviewer that reports `confidenceScore: 0.3` and `suggestedNextAction: "iterate"` tells the orchestrator something that raw finding counts cannot.

---

## 11. Session Context Injection via Structured Input

### Bidirectional Structured Contracts

If output is structured, input should be too. When the adapter composes context for `--append-system-prompt` (BEH-SF-157), it can inject structured data that the agent's schema expects as input context:

```bash
claude -p --resume "$SESSION_ID" \
  --append-system-prompt "$(cat <<'CONTEXT'
{
  "priorFindings": [...],
  "requirementsCovered": [...],
  "graphSnapshot": { "nodes": 142, "edges": 287, "orphans": 3 },
  "iterationNumber": 2,
  "budgetRemaining": { "tokens": 50000, "usd": 1.20 }
}
CONTEXT
)" \
  --json-schema '{ ... }' \
  "Continue reviewing, focusing on the 3 orphan nodes"
```

The agent receives machine-readable context about the graph state, prior findings, and budget. It does not need to infer these from prose. Its structured output references the input context directly: a finding can reference a prior finding's ID, creating a `MITIGATES` edge.

---

## 12. Subagent Schema Inheritance

### The `--agents` Flag with Schemas

When the adapter defines subagents via `--agents` (BEH-SF-159), each subagent definition can include an output schema. The parent agent delegates to subagents that return typed results.

```json
{
  "file-scanner": {
    "description": "Scans files for patterns",
    "prompt": "You scan files and return structured findings",
    "tools": ["Read", "Glob", "Grep"],
    "model": "haiku",
    "outputSchema": {
      "type": "object",
      "properties": {
        "matches": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "file": { "type": "string" },
              "line": { "type": "integer" },
              "pattern": { "type": "string" },
              "severity": { "enum": ["high", "medium", "low"] }
            }
          }
        }
      }
    }
  }
}
```

The parent agent (say, `reviewer`) delegates file scanning to a `haiku`-powered subagent that returns structured match data. The parent aggregates subagent outputs into its own structured output. Schema validation happens at every boundary. A subagent that returns malformed data is caught before the parent processes it.

This creates a hierarchy of typed contracts: flow schema -> stage schema -> agent schema -> subagent schema. Type safety propagates downward through every layer.

---

## Summary of Capabilities

| Capability           | Current State            | With Structured Output                 |
| -------------------- | ------------------------ | -------------------------------------- |
| Agent output parsing | Text extraction, fragile | Schema-validated JSON, guaranteed      |
| Graph node creation  | Post-hoc transformation  | Direct agent output                    |
| Dashboard updates    | ACP session polling      | Real-time stream events                |
| Pipeline type safety | Runtime hope             | Schema validation at definition time   |
| Error reporting      | String matching          | Typed errors with `_tag` discriminants |
| Test generation      | Code blocks in prose     | Structured test case objects           |
| Multi-format export  | Parse-then-render        | Project from structured source         |
| Incremental updates  | Batch after completion   | Stream patches during execution        |
| Schema evolution     | Manual migration         | Versioned schemas with auto-migration  |
| Convergence input    | ACP session counting     | Agent self-assessment + metrics        |

### Key Architectural Consequence

Structured output inverts the data flow model. Today: agents produce text, SpecForge extracts structure. Tomorrow: agents produce structure, SpecForge renders text. The knowledge graph becomes the primary consumer of agent output, with human-readable documents as derived views. This aligns with principle 1 (graph-canonical) more deeply than the current architecture achieves.

---

## Cross-References

- [architecture/c3-knowledge-graph.md](../architecture/c3-knowledge-graph.md) -- graph node and edge types that structured output schemas mirror
- [behaviors/BEH-SF-151-claude-code-adapter.md](../behaviors/BEH-SF-151-claude-code-adapter.md) -- adapter behaviors that change with structured output
- [references/claude-code/headless-usage.md](../references/claude-code/headless-usage.md) -- `--json-schema` and `--output-format` flags
- [references/claude-code/agent-sdk.md](../references/claude-code/agent-sdk.md) -- `--agents` subagent definitions
- [types/flow.md](../types/flow.md) -- `AgentOutput`, `Finding`, `PhaseMetrics`
- [types/graph.md](../types/graph.md) -- `GraphNode`, `GraphEdge`
- [types/ports.md](../types/ports.md) -- `ClaudeCodeAdapter`, `StreamMessage`
