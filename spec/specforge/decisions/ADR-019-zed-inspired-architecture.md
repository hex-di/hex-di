---
id: ADR-019
kind: decision
title: Zed-Inspired Architectural Improvements
status: Accepted
date: 2026-02-28
supersedes: []
invariants: [INV-SF-21]
---

# ADR-019: Zed-Inspired Architectural Improvements

**Extends:** [ADR-018](./ADR-018-acp-agent-protocol.md)

## Context

After researching Zed's ACP implementation (documented in [references/zed/](../references/zed/)), we identified limitations in SpecForge's current architecture:

1. **Generic message streaming** — `ACPMessage` with string-based `contentType` discrimination forces consumers to parse and branch at runtime. There is no closed set of update variants.
2. **Conflated connections and sessions** — The subprocess link and conversation state are entangled. Restarting a subprocess loses the connection but should not lose the session.
3. **Runtime-only tool validation** — Tool capability mismatches are discovered at agent execution time, not at flow definition time.
4. **Fragmented agent sources** — Built-in roles, dynamic templates, and marketplace agents are resolved through different paths with no unified registry.
5. **Plans not modeled** — Agents produce plans informally in message text. There is no structured plan primitive for progress tracking.
6. **Dual-port drift** — `ACPAgentService` and `ACPServerService` define message types independently, risking inconsistency.
7. **Diffs as text** — Code changes are embedded in generic message content with no structured representation.
8. **Flat package structure** — No layered dependency rules between protocol, connection, session, and orchestration concerns.

## Decision

Adopt 8 improvements inspired by Zed's patterns:

### 1. FlowUpdate Discriminated Union

Replace generic `ACPMessage` streaming for session-scoped updates with a closed `FlowUpdate` union of 12 tagged variants. `OrchestratorEvent` remains for system-level lifecycle events.

### 2. Connection/Session Separation

Introduce `AgentConnection` and `ConnectionManagerService` to decouple subprocess lifecycle from conversation state. Sessions reference connections; connections can be pooled and reused.

### 3. Capability Validation at Flow Definition Time

Add `AgentRoleCapabilities` to stage definitions. `TemplateService.validateCapabilities()` checks all role-tool bindings before the first phase starts (INV-SF-21).

### 4. Agent Registry

Unify built-in roles, dynamic templates, and marketplace agents into a single `AgentRegistryService`. All sources produce `ACPAgentManifest` entries resolved by role ID.

### 5. AgentPlan as Protocol Primitive

Model plans as a `FlowUpdate` variant (`AgentPlan`) with structured `PlanEntry` items. Plans are complete replacements — clients replace the full plan on each update.

### 6. Side Pattern for ACP Dual-Mode

Introduce `ACPSide` generic (`"client" | "server"`) with conditional `InboundMessage<S>` / `OutboundMessage<S>` types. The two port interfaces remain separate for hex-di registration but derive message types from the shared generic.

### 7. CodeDiff as First-Class Content

Model code changes as `FlowUpdate { _tag: "CodeDiff" }` with `path`, `oldText`, and `newText` fields. Translates to `GraphNode { type: 'FileDiff' }` in the knowledge graph.

### 8. Layered Package Boundaries

Define 5 packages with strict downward-only dependency rules: protocol → connection → session → orchestration → surface.

## Concept Mapping

| Zed Pattern                               | SpecForge Adoption                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `Side` trait (client/server generics)     | `ACPSide` type with `InboundMessage<S>` / `OutboundMessage<S>`                 |
| `SessionUpdate` enum (closed variants)    | `FlowUpdate` discriminated union (12 variants)                                 |
| Layered crate boundaries (`crates/acp_*`) | 5-layer package hierarchy (`@specforge/protocol` through `@specforge/surface`) |
| `Plan` as protocol primitive              | `AgentPlan` FlowUpdate variant with `PlanEntry` items                          |
| Capability negotiation at init            | `AgentRoleCapabilities` validated at flow definition time                      |
| `ToolCallContent::Diff`                   | `CodeDiff` FlowUpdate variant with `oldText`/`newText`                         |
| Registry pattern (agent discovery)        | `AgentRegistryService` unifying builtin, template, marketplace                 |
| Connection vs Session separation          | `AgentConnection` + `ConnectionManagerService`                                 |

## Trade-Offs

**Benefits:**

- Exhaustive pattern matching on `FlowUpdate._tag` — consumers handle all variants at compile time
- Connection pooling enables subprocess reuse across sessions
- Fail-fast on capability mismatches before any LLM tokens are spent
- Single resolution path for all agent sources simplifies flow engine logic
- Structured plans enable progress tracking UI without text parsing
- Side pattern prevents message type drift between client and server ports
- CodeDiff enables rich diff rendering in dashboard without parsing
- Package layering enforces architectural discipline via ESLint import restrictions

**Costs:**

- FlowUpdate union requires updating all subscribers when new variants are added
- Connection/session separation adds one more lifecycle to manage
- Package layering adds build complexity and may slow initial development

## Consequences

- [types/acp.md](../types/acp.md) — FlowUpdate, Connection, Side, Plan, AgentRoleCapabilities, expanded manifest
- [types/ports.md](../types/ports.md) — ConnectionManagerService, AgentRegistryService, updated MessageExchangeService
- [types/flow.md](../types/flow.md) — capabilities on StageDefinition, FlowValidationResult, plan metrics
- [types/extensibility.md](../types/extensibility.md) — FlowUpdate vs OrchestratorEvent disambiguation
- [types/errors.md](../types/errors.md) — ConnectionError, AgentNotFoundError, AgentRegistryError
- [./invariants/index.md](../invariants/index.md) — INV-SF-21 (capability validation)
- [architecture/ports-and-adapters.md](../architecture/ports-and-adapters.md) — Package layering, ports #33–34
- [architecture/c3-acp-layer.md](../architecture/c3-acp-layer.md) — ConnectionManager, AgentRegistry, FlowUpdate translation, CodeDiff rule
- [architecture/dynamic-flow-execution.md](../architecture/dynamic-flow-execution.md) — Step 1.5 capability validation
- [glossary.md](../glossary.md) — Agent Plan, Agent Registry, CodeDiff, Connection, FlowUpdate, Package Layer

## References

- [ADR-018](./ADR-018-acp-agent-protocol.md) — ACP as Primary Agent Protocol (extended, not superseded)
- [references/zed/](../references/zed/) — Zed ACP implementation research
