# Inspection Specifications

Cross-cutting specifications for the HexDI inspection and introspection system. These specs define how the DI container becomes the application's nervous system by aggregating knowledge from all ecosystem libraries.

## Context

The container's `InspectorAPI` provides structural, state, and behavioral awareness (Phase 2). However, ecosystem libraries (Flow, Store, Query, Saga, Agent, Logger) each have their own domain-specific inspectors that the container cannot discover or aggregate. This spec directory defines the protocol and runtime machinery that bridges this gap.

## Specifications

| #   | Specification                                                    | Status | Packages Affected                                                   |
| --- | ---------------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| 01  | [Library Inspector Protocol](./01-library-inspector-protocol.md) | Draft  | `@hex-di/core`, `@hex-di/runtime`, `@hex-di/flow`, `@hex-di/logger` |
| 02  | [Definition of Done](./02-definition-of-done.md)                 | Draft  | All above                                                           |

## Vision Alignment

This work is the **foundation of Phase 3 (Reporting)** and a prerequisite for:

- Phase 3.2: Flow Reporting (FlowInspector registers via the protocol)
- Phase 3.5: Store Library (StoreInspector registers via the protocol)
- Phase 3.6: Query Library (QueryInspector registers via the protocol)
- Phase 3.7: Saga Library (SagaInspector registers via the protocol)
- Phase 3.8: Agent Library (AgentInspector registers via the protocol)
- Phase 3.9: Unified Knowledge Model (built on top of `getUnifiedSnapshot()`)
- Phase 4: Communication (MCP/A2A expose unified snapshots)

Without this protocol, each library's inspector is isolated and the container cannot fulfill the VISION's "nervous system" role.

## Architecture

```
  Container Inspector (InspectorAPI)
  ├── getSnapshot()              ── existing (container state)
  ├── getScopeTree()             ── existing (scope hierarchy)
  ├── subscribe()                ── existing (container events)
  ├── getResultStatistics()      ── existing (error tracking)
  │
  ├── registerLibrary()          ── NEW (library inspector registration)
  ├── getLibraryInspectors()     ── NEW (query all libraries)
  ├── getLibraryInspector(name)  ── NEW (query specific library)
  └── getUnifiedSnapshot()       ── NEW (aggregated snapshot)
        │
        ├── container: ContainerSnapshot
        └── libraries:
            ├── flow:   { machineCount, machines, healthEvents, ... }
            ├── store:  { ports, totalSubscribers, pendingEffects, ... }
            ├── query:  { cacheEntries, staleness, pendingRequests, ... }
            ├── saga:   { runningWorkflows, compensationState, ... }
            ├── agent:  { tools, activeConversations, approvalQueue, ... }
            └── logger: { totalEntries, entriesByLevel, errorRate, handlers, ... }
```
