---
id: ADR-001
kind: decision
title: HexDi as DI Foundation
status: Accepted
date: 2025-01-15
supersedes: []
invariants: []
---

# ADR-001: HexDi as DI Foundation

## Context

SpecForge requires a dependency injection framework to wire its components: ports, adapters, orchestrator, agents, graph store, desktop services. The options are: use an existing DI library (tsyringe, inversify, etc.), build a custom solution, or use HexDi — the DI framework in this very monorepo.

## Decision

Use HexDi (`@hex-di/core`, `@hex-di/graph`) as the dependency injection foundation for all SpecForge packages.

## Rationale

1. **Compile-time validation** — HexDi's `GraphBuilder` validates the dependency graph at build time. Missing adapters, circular dependencies, and port mismatches are caught by the TypeScript compiler, not at runtime.

2. **Dog-fooding** — SpecForge is part of the hex-di monorepo. Using HexDi validates the framework in a substantial real-world application. Issues discovered here improve the framework for all users.

3. **Consistent patterns** — All hex-di ecosystem packages use the same port/adapter/graph model. Contributors moving between packages find familiar patterns.

4. **Scope-per-flow-run** — HexDi's scoping model maps naturally to SpecForge's flow run model. Each flow run gets its own container scope via `container.createScope(flowRunId)`, providing run-isolated adapter instances.

## Architecture

```typescript
// Graph builder wires all ports to adapters
const graph = GraphBuilder.create()
  .add(GraphStoreAdapter) // Neo4j implementation
  .add(GraphQueryAdapter) // Analytical queries
  .add(GraphSyncAdapter) // ACP session → graph sync
  .add(ClaudeCodeLLMAdapter) // Claude Code SDK
  .add(MessageExchangeAdapter) // ACP message exchange
  .add(SessionManagerAdapter) // Session lifecycle
  .add(FlowEngineAdapter) // Flow orchestration
  // ... all 23 ports have adapters
  .build();

// Container with compile-time validated graph
const container = createContainer(graph);

// Per-flow-run scope
const flowRunScope = container.createScope(flowRunId);
const messageExchange = flowRunScope.get(MessageExchangePort);
```

## Trade-offs

- **Tight coupling to HexDi API** — Acceptable because SpecForge is part of the ecosystem. If HexDi's API changes, SpecForge adapts alongside it.
- **Learning curve** — Contributors must understand port/adapter/graph concepts. Mitigated by comprehensive documentation and consistent patterns across the monorepo.

## References

- [overview § Built on HexDi](../overview.md)
- `packages/core/src/ports/` — Port factory and types
- `packages/graph/src/` — Graph builder
