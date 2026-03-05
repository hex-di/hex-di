---
id: ADR-012
kind: decision
title: JSON-First Structured Output
status: Accepted
date: 2026-02-27
supersedes: []
invariants: [INV-SF-13]
---

# ADR-012: JSON-First Structured Output

## Context

The current architecture relies on text parsing of agent output. Agents produce natural language text, and SpecForge extracts structure through regex patterns and LLM-based post-processing. This approach is fragile — regex patterns miss edge cases, LLM post-processing is non-deterministic and expensive, and the extraction layer is a significant source of bugs and maintenance burden.

Claude Code's `--json-schema` flag enables schema-validated JSON output from agents, eliminating the parsing layer entirely.

## Decision

Use the `--json-schema` flag per agent role. Each role gets a constrained output schema that produces typed graph nodes directly. Agents produce structured JSON with `graphNodes[]`, `graphEdges[]`, `findings[]`, `errors[]`, and `selfAssessment` fields.

## Mechanism

### 1. Per-Role Schemas

Each agent role has a dedicated output schema:

- **Discovery Agent** — Produces `Requirement`, `Tag`, `Constraint` nodes
- **Spec Author** — Produces `SpecFile`, `Behavior`, `Invariant`, `ADR` nodes
- **Reviewer** — Produces `Finding`, `TraceabilityGap` nodes
- **Dev Agent** — Produces `SourceFile`, `TestFile`, `TaskCompletion` nodes
- **Coverage Agent** — Produces `CoverageReport`, `CoverageGap` nodes

### 2. Self-Assessment

Every output includes an `AgentSelfAssessment` with confidence score (0-1), suggested next action (`continue`, `escalate`, `converge`, `request-review`), reasoning, and blockers. This shifts convergence evaluation from external observation to agent self-report, supplemented by external metrics.

### 3. Validation Pipeline

1. Agent produces JSON output via `--json-schema`
2. ClaudeCodeAdapter validates against the role's schema
3. Valid output: graph nodes written directly to Neo4j via GraphSyncPort
4. Invalid output: `SchemaValidationError` recorded as finding, agent retries

### 4. Streaming Integration

The `--output-format stream-json` flag provides real-time streaming events (`tool-call`, `tool-result`, `partial-text`, `token-update`, `error`, `system`) that feed the web dashboard's live monitoring views.

## Rationale

1. **Eliminates parsing layer** — No regex extraction, no LLM post-processing, no parsing bugs.

2. **Machine-verifiable output** — Schema validation catches malformed output immediately.

3. **Role contamination prevention** — Reviewer schema cannot produce `Task` nodes; dev-agent schema cannot produce `Finding` nodes.

4. **Graph-direct writing** — Structured output writes to Neo4j without transformation.

5. **Self-assessment convergence** — Agent confidence scores provide richer convergence signals than external metrics alone.

## Trade-offs

- **Schema rigidity** — Fixed schemas may constrain agent creativity. Mitigated by `Record<string, unknown>` properties fields for extensible metadata.

- **Schema evolution** — Changing schemas requires coordinating agent prompts and validation logic. Mitigated by versioned schemas with backward compatibility.

- **LLM compliance** — Not all LLM outputs perfectly match schemas. Mitigated by retry on validation failure and graceful degradation to text mode.

## References

- [Structured Output Types](../types/structured-output.md) — Per-role schemas, StreamDashboardEvent
- [ClaudeCodeAdapter](../behaviors/BEH-SF-151-claude-code-adapter.md) — BEH-SF-155 through BEH-SF-159
- [INV-SF-13](../invariants/INV-SF-13-structured-output-schema-compliance.md) — Structured Output Schema Compliance
