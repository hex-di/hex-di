# Architecture Overview

**Scope:** Navigation index for all C4 architecture diagrams in the SpecForge specification.

**Purpose:** Provides a structured guide through the system architecture at all C4 levels -- from system context down to deployment topologies and dynamic runtime flows.

> **Convention (M66):** Space-separated names in tables and ASCII diagrams (e.g., "Flow Engine"). CamelCase in Mermaid component IDs (e.g., `flowEngine`).

---

## Diagram Inventory

| #   | File                                                               | C4 Level      | Description                                                                                                                                   |
| --- | ------------------------------------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [c1-system-context.md](./c1-system-context.md)                     | L1 Context    | SpecForge in its environment -- users, external systems, API boundaries                                                                       |
| 2   | [c2-containers.md](./c2-containers.md)                             | L2 Container  | Internal containers (Server, Desktop App, Web Dashboard, VS Code Extension, CLI) and their interconnections                                   |
| 3   | [c3-server.md](./c3-server.md)                                     | L3 Component  | SpecForge Server internals -- engines, managers, sync layers                                                                                  |
| 4   | [c3-cli.md](./c3-cli.md)                                           | L3 Component  | CLI internals -- command router, server connector, flow executor, graph query client                                                          |
| 5   | [c3-desktop-app.md](./c3-desktop-app.md)                           | L3 Component  | Desktop App internals -- Tauri shell, IPC bridge, server lifecycle manager, file watcher, auto-update                                         |
| 6   | [c3-web-dashboard.md](./c3-web-dashboard.md)                       | L3 Component  | Web Dashboard internals -- React SPA, views, WebSocket client                                                                                 |
| 7   | [c3-vscode-extension.md](./c3-vscode-extension.md)                 | L3 Component  | VS Code Extension internals -- TreeView providers, Webview panels                                                                             |
| 8   | [c3-knowledge-graph.md](./c3-knowledge-graph.md)                   | L3 Component  | Neo4j graph schema -- node types, relationships, query surface                                                                                |
| 9   | [c3-hooks.md](./c3-hooks.md)                                       | L3 Component  | Hooks Pipeline internals -- registry, pre/post pipelines, compliance gates, behavior monitor                                                  |
| 10  | [c3-agent-system.md](./c3-agent-system.md)                         | L3 Component  | Agent system internals -- ClaudeCodeAdapter, role registry, session manager, dynamic roles, skill injection                                   |
| 11  | [c3-memory-generation.md](./c3-memory-generation.md)               | L3 Component  | Memory generation pipeline -- graph querier, template engine, hash comparison, artifact tracker                                               |
| 12  | [c3-cost-optimization.md](./c3-cost-optimization.md)               | L3 Component  | Cost optimization -- model router, budget zones, cost prediction, compaction, behavior correction                                             |
| 13  | [c3-mcp-composition.md](./c3-mcp-composition.md)                   | L3 Component  | MCP composition -- config generation, role mapping, health gates, tool discovery, credential resolution                                       |
| 14  | [c3-permission-governance.md](./c3-permission-governance.md)       | L3 Component  | Permission governance -- access matrix, trust tiers, blast radius, sandbox, GxP compliance                                                    |
| 15  | [c3-structured-output.md](./c3-structured-output.md)               | L3 Component  | Structured output pipeline -- schema registry, validation, streaming adapter, error reporting                                                 |
| 16  | [c3-import-export.md](./c3-import-export.md)                       | L3 Component  | Import/export pipeline -- format adapter registry, markdown/OpenAPI adapters, round-trip validation                                           |
| 17  | [c3-cloud-services.md](./c3-cloud-services.md)                     | L3 Component  | Cloud services -- tenant management, Neo4j provisioning, OAuth, Stripe billing, marketplace                                                   |
| 18  | [c3-extensibility.md](./c3-extensibility.md)                       | L3 Component  | Extensibility -- plugin discovery, agent packs, custom flows, conventions, event protocol                                                     |
| 19  | [c3-acp-layer.md](./c3-acp-layer.md)                               | L3 Component  | ACP protocol layer -- server, client, handler registry, backend execution, message translation, session state, run lifecycle (BEH-SF-209–248) |
| 20  | [dynamic-flow-execution.md](./dynamic-flow-execution.md)           | Dynamic       | Runtime flow from `startFlow()` through phase execution to completion                                                                         |
| 21  | [dynamic-session-composition.md](./dynamic-session-composition.md) | Dynamic       | Session context assembly pipeline -- query, rank, trim, inject                                                                                |
| 22  | [dynamic-memory-generation.md](./dynamic-memory-generation.md)     | Dynamic       | Memory generation pipeline -- graph query, template render, hash check, file write                                                            |
| 23  | [dynamic-hook-event-flow.md](./dynamic-hook-event-flow.md)         | Dynamic       | Hook event flow -- single tool invocation through pre/post hook pipelines                                                                     |
| 24  | [deployment-solo.md](./deployment-solo.md)                         | Deployment    | Solo mode -- single machine, local Neo4j, desktop app + web dashboard + CLI                                                                   |
| 25  | [deployment-saas.md](./deployment-saas.md)                         | Deployment    | SaaS mode -- cloud deployment with managed infrastructure                                                                                     |
| 26  | [ports-and-adapters.md](./ports-and-adapters.md)                   | Cross-cutting | Complete port registry, adapter mapping, mode-switching logic                                                                                 |

## How to Read These Diagrams

Each diagram file contains:

1. A **Mermaid** code block for rendering in compatible tools
2. An **ASCII fallback** for terminal/plain-text review
3. **Cross-references** to behavioral specs, type definitions, and architectural decisions

## Diagram Relationships

```
c1-system-context
       |
       v
c2-containers
       |
  +----+-------+---------------+------------------+------------------+
  |    |       |               |                  |                  |
  v    v       v               v                  v                  v
c3-   c3-    c3-desktop-app  c3-web-dashboard  c3-vscode-extension  c3-knowledge-graph
server cli
  |
  +----+----+----+----+----+----+----+----+----+
  |    |    |    |    |    |    |    |    |    |
  v    v    v    v    v    v    v    v    v    v
c3-  c3-  c3-  c3-  c3-  c3-  c3-  c3-  c3-  c3-
agent mem  cost mcp  perm struc imp  cloud ext  hooks
system gen  opt  comp gov  out  exp  svc  ble
  |    |
  |    v
  |  dynamic-memory-generation
  |
  +---+
  |   |
  v   v
dynamic-flow-execution
dynamic-session-composition
  |         |
  +---+     v
  |   |   dynamic-hook-event-flow
  v   v
deployment  deployment
  -solo      -saas

ports-and-adapters (cross-cutting, referenced by all deployment diagrams)
```

## Behavior Coverage

Every behavior file (01-33) is referenced by at least one architecture diagram:

| Behavior File                                  | Referencing Architecture Diagram(s)                       |
| ---------------------------------------------- | --------------------------------------------------------- |
| 01-graph-operations                            | c3-server, c3-knowledge-graph                             |
| 02-session-materialization                     | c3-server, dynamic-session-composition                    |
| 03-agent-roles                                 | **c3-agent-system**                                       |
| 04-agent-sessions                              | **c3-agent-system**                                       |
| 05-blackboard (superseded — see ACP messaging) | c3-server                                                 |
| 06-agent-communication                         | **c3-structured-output**                                  |
| 07-flow-definitions                            | c3-server, dynamic-flow-execution                         |
| 08-flow-execution                              | c3-server, dynamic-flow-execution                         |
| 09-flow-lifecycle                              | c3-server, dynamic-flow-execution                         |
| 10-token-budgeting                             | **c3-cost-optimization**                                  |
| 11-tool-isolation                              | **c3-permission-governance**                              |
| 12-extensibility                               | **c3-extensibility**                                      |
| 13-deployment-modes                            | deployment-solo, deployment-saas                          |
| 14-authentication                              | **c3-cloud-services**                                     |
| 15-cloud-services                              | **c3-cloud-services**                                     |
| 16-cli                                         | **c3-cli**                                                |
| 17-human-in-the-loop                           | c3-server, c3-cli                                         |
| 18-import-export                               | **c3-import-export**                                      |
| 19-web-dashboard                               | c3-web-dashboard                                          |
| 20-vscode-extension                            | c3-vscode-extension                                       |
| 21-collaboration                               | c3-server                                                 |
| 22-claude-code-adapter                         | **c3-agent-system**                                       |
| 23-hook-pipeline                               | c3-hooks, **dynamic-hook-event-flow**                     |
| 24-cost-optimization                           | **c3-cost-optimization**                                  |
| 25-memory-generation                           | **c3-memory-generation**, **dynamic-memory-generation**   |
| 26-dynamic-agents                              | **c3-agent-system**                                       |
| 27-mcp-composition                             | **c3-mcp-composition**                                    |
| 28-permission-governance                       | **c3-permission-governance**, **dynamic-hook-event-flow** |
| 29-desktop-app                                 | c3-desktop-app                                            |
| 30-acp-server                                  | **c3-acp-layer**                                          |
| 31-acp-client                                  | **c3-acp-layer**                                          |
| 32-acp-messaging                               | **c3-acp-layer**                                          |
| 33-agent-backend                               | **c3-acp-layer**, **c3-agent-system**                     |

_Bold_ entries indicate diagrams added in this architecture completion pass.

## Dynamic Diagrams

Dynamic diagrams show runtime interaction sequences within specific subsystems:

| Dynamic Diagram                                                    | Related C3 Subsystem                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| [dynamic-flow-execution.md](./dynamic-flow-execution.md)           | Flow Engine ([c3-server.md](./c3-server.md))                             |
| [dynamic-hook-event-flow.md](./dynamic-hook-event-flow.md)         | Hooks Pipeline ([c3-hooks.md](./c3-hooks.md))                            |
| [dynamic-memory-generation.md](./dynamic-memory-generation.md)     | Memory Generation ([c3-memory-generation.md](./c3-memory-generation.md)) |
| [dynamic-session-composition.md](./dynamic-session-composition.md) | Session Composition ([c3-mcp-composition.md](./c3-mcp-composition.md))   |

## Cross-References

- [../overview.md](../overview.md) -- Product overview and deployment mode descriptions
- [../types/](../types/) -- TypeScript type definitions for all ports and domain objects
- [../decisions/](../decisions/) -- Architectural Decision Records (ADRs)
- [../behaviors/](../behaviors/) -- Behavioral specifications (Given/When/Then)
- [../glossary.md](../glossary.md) -- Terminology glossary
