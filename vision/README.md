# HexDI Vision — Phase Documentation

> From Container to Consciousness: The Roadmap to Self-Aware Applications

---

## Overview

This directory contains detailed documentation for each phase of the HexDI vision roadmap. Each document provides verified implementation details, gap analysis, and actionable plans to reach 100% completion.

## Phases

```
Phase 1: PLUMBING       ████████████████████ 100%  1200 lines of docs
Phase 2: AWARENESS       ████████████████████ 100%  1046 lines of docs
Phase 3: REPORTING       ██████████████████░░  ~90%  2062 lines of docs
Phase 4: COMMUNICATION   ████████░░░░░░░░░░░░  40%  2173 lines of docs
Phase 5: AUTONOMY        ░░░░░░░░░░░░░░░░░░░░   0%  1389 lines of docs
```

| Phase | Document                                                     | Status | Description                                                                                                            |
| ----- | ------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| 1     | [PHASE-1-PLUMBING.md](phase-1/PHASE-1-PLUMBING.md)           | 100%   | Container wires services. Ports, adapters, lifetimes, resolution engine, scopes, errors.                               |
| 2     | [PHASE-2-AWARENESS.md](phase-2/PHASE-2-AWARENESS.md)         | 100%   | Container knows itself. Graph inspection, runtime snapshots, tracing spans, Inspector API.                             |
| 3     | [PHASE-3-REPORTING.md](phase-3/PHASE-3-REPORTING.md)         | ~90%   | Every library reports back. Tracing queries, flow registry, logger, store, query, saga, agent. **THE CRITICAL PHASE.** |
| 4     | [PHASE-4-COMMUNICATION.md](phase-4/PHASE-4-COMMUNICATION.md) | 40%    | Application speaks externally. MCP server, A2A protocol, REST API, DevTools dashboard. OTel export done.               |
| 5     | [PHASE-5-AUTONOMY.md](phase-5/PHASE-5-AUTONOMY.md)           | 0%     | Application acts on knowledge. Auto-healing, auto-optimization, MAPE-K loop, health assessment.                        |

## Execution Strategy

```
Wave 1 ─── Phase 3.1-3.4 ─── Make existing libraries report back ──── DONE
Wave 2 ─── Phase 3.5-3.8 ─── Build new libraries (store/query/saga done; agent pending)
Wave 3 ─── Phase 3.9     ─── Unified knowledge model
Wave 4 ─── Phase 4.2-4.4 ─── MCP + A2A + REST
Wave 5 ─── Phase 4.5     ─── DevTools dashboard
Wave 6 ─── Phase 5.1-5.2 ─── Auto-healing + optimization
Wave 7 ─── Phase 5.3-5.4 ─── MAPE-K loop + health
```

## Specifications

| Spec              | Location                                                             | Description                                                      |
| ----------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| DevTools          | [`spec/devtools/`](../spec/devtools/README.md)                       | Standalone web dashboard for inspecting HexDI applications       |
| MCP Framework     | [`spec/mcp/`](../spec/mcp/README.md)                                 | General-purpose MCP server framework using port/adapter patterns |
| Library Inspector | [`spec/inspection/`](../spec/inspection/README.md)                   | Extensible inspection protocol for library inspectors            |
| Guard             | [`spec/guard/`](../spec/guard/README.md)                             | Authorization with guard(), policies, audit trail                |
| Agent             | [`spec/agent/`](../spec/agent/README.md)                             | AI agent framework with tool ports                               |
| Stream            | [`spec/stream/`](../spec/stream/README.md)                           | Reactive stream processing                                       |
| Flow              | [`spec/flow/`](../spec/flow/README.md)                               | State machine runtime with activities                            |
| Store             | [`spec/store/`](../spec/store/README.md)                             | Reactive state with signals and inspection                       |
| Query             | [`spec/query/`](../spec/query/README.md)                             | Data fetching and caching with observers                         |
| Saga              | [`spec/saga/`](../spec/saga/README.md)                               | Workflow orchestration with compensation                         |
| Result            | [`spec/result/`](../spec/result/README.md)                           | Typed Result/ResultAsync with pattern matching                   |
| Logger            | [`spec/logger/`](../spec/logger/README.md)                           | Structured logging with inspection                               |
| Integration       | [`spec/integration/`](../spec/integration/README.md)                 | Cross-library integration test suites                            |
| Tracing & Logging | [`spec/tracing-and-logging/`](../spec/tracing-and-logging/README.md) | Tracing and logging integration                                  |

## Total Documentation

**7,870 lines** across 5 phase documents covering:

- Verified implementation details with file paths
- Interface designs with TypeScript type definitions
- ASCII architecture diagrams
- Dependency graphs between tasks
- Effort estimates for every task
- Execution order recommendations
