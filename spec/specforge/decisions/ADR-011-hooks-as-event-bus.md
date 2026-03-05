---
id: ADR-011
kind: decision
title: Hooks as Event Bus
status: Accepted
date: 2026-02-27
supersedes: []
invariants: [INV-SF-12]
---

# ADR-011: Hooks as Event Bus

## Context

The current spec treats Claude Code hooks as a configuration mechanism (BEH-SF-158 references hook configuration in ClaudeCodeAdapter). However, five research files (02, 03, 05, 06, 10) independently identified hooks as a **programmable event bus** with lifecycle events, tool matchers, exit code semantics, and input rewriting. This transforms SpecForge's relationship with Claude Code from "orchestrator spawning opaque processes" to "orchestrator with real-time observability and control over every tool invocation."

Without promoting hooks to an architectural primitive, features like real-time graph sync, compliance gates, agent behavior monitoring, cost tracking, and audit trails would require invasive modifications to agent code or the ClaudeCodeAdapter.

## Decision

Promote Claude Code hooks from configuration convenience to architectural primitive. The hook pipeline is a first-class component with its own registry, state management, and execution guarantees.

## Mechanism

### 1. Hook Pipeline Architecture

The hook pipeline processes three event categories:

- **PreToolUse** — Executes before any tool invocation. Matchers filter by tool name and path glob. Exit code 0 = allow, 1 = error (logged, tool proceeds), 2 = block (tool rejected, feedback sent to agent via stderr).
- **PostToolUse** — Executes after tool completion. Receives tool result. Always async (FIFO queue). Used for graph sync, audit recording, and monitoring.
- **Stop** — Executes when an agent session ends. Used for session recording and cleanup.

### 2. Hook Registration

Hooks are registered in the HookRegistry at session creation time. Registration order defines execution order. Hooks are composable — multiple hooks can match the same event.

### 3. Hook State

Each hook can maintain rolling window state in `.specforge/hook-state/{sessionId}/`. State persists across tool invocations within a session. Used by behavioral monitors (loop detection, drift detection) that need multi-event context.

### 4. Compliance Gates

PreToolUse hooks with exit code 2 act as compliance gates. They block non-compliant tool invocations before execution. In GxP mode, compliance gates enforce: required document sections, requirement ID format, traceability annotations, and destructive git operation blocking.

## Rationale

1. **Aspect-oriented control** — Cross-cutting concerns (compliance, monitoring, graph sync, audit) are injected without modifying agent code or the orchestrator.

2. **Real-time observability** — PostToolUse hooks provide millisecond-level visibility into every tool invocation across all agent sessions.

3. **Compliance by construction** — PreToolUse gates prevent violations before they occur, rather than detecting them after the fact.

4. **Extensibility** — Plugin-provided hooks extend the pipeline without core modifications.

5. **Separation of concerns** — Agents focus on their domain task. The hook pipeline handles governance, monitoring, and integration independently.

## Trade-offs

- **Latency** — PreToolUse hooks add latency to every tool invocation. Mitigated by <50ms target and async PostToolUse processing.

- **Complexity** — The hook pipeline is a new subsystem with its own state management. Mitigated by simple registration API and FIFO execution guarantees.

- **Debugging** — Hook failures can be opaque to agents (they receive stderr feedback but don't know why). Mitigated by structured error messages in stderr and hook execution logging.

- **Ordering sensitivity** — Hook execution order matters (a compliance gate must run before a graph sync hook). Mitigated by explicit registration order and documented ordering conventions.

## References

- [Hook Pipeline Behaviors](../behaviors/BEH-SF-161-hook-pipeline.md) — BEH-SF-161 through BEH-SF-168
- [Hook Pipeline Types](../types/hooks.md) — HookEvent, HookPipeline, HookHandler, ComplianceGateResult
- [Audit Types](../types/audit.md) — AuditRecord, PermissionDecision
- [Hook Pipeline Architecture](../architecture/c3-hooks.md) — C3 component diagram
- [INV-SF-12](../invariants/INV-SF-12-hook-pipeline-ordering.md) — Hook Pipeline Ordering
