---
id: TRACE-SF-004
title: "Canonical Type Files"
kind: traceability
status: active
scope: adr
---

## Canonical Type Files

The following type definition files comprise the complete type specification for SpecForge:

| Type File                                                   | Description                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| [types/acp.md](../types/acp.md)                             | ACP protocol types: messages, runs, sessions, manifests                  |
| [types/agent.md](../types/agent.md)                         | Agent types: roles, sessions, tools, test results                        |
| [types/audit.md](../types/audit.md)                         | Audit types: permission decisions, trust tiers                           |
| [types/auth.md](../types/auth.md)                           | Authentication types: identity, tokens, OAuth                            |
| [types/blackboard.md](../types/blackboard.md)               | _(Superseded)_ Blackboard types, retained for historical reference       |
| [types/cloud.md](../types/cloud.md)                         | Cloud/SaaS types: subscriptions, organizations                           |
| [types/errors.md](../types/errors.md)                       | All error types across all domains                                       |
| [types/extensibility.md](../types/extensibility.md)         | Extensibility types: plugins, events, hooks                              |
| [types/flow.md](../types/flow.md)                           | Flow types: definitions, phases, convergence, metrics                    |
| [types/graph.md](../types/graph.md)                         | Graph types: nodes, edges, queries                                       |
| [types/hooks.md](../types/hooks.md)                         | Hook pipeline types: pre/post tool use                                   |
| [types/import-export.md](../types/import-export.md)         | Import/export adapter types                                              |
| [types/mcp.md](../types/mcp.md)                             | MCP composition types: server config, role mapping                       |
| [types/memory.md](../types/memory.md)                       | Memory generation types: patterns, curation                              |
| [types/api.md](../types/api.md)                             | REST endpoint schemas, WebSocket envelope, SSE events, error wire format |
| [types/ports.md](../types/ports.md)                         | Port and adapter types: service interfaces, registry                     |
| [types/structured-output.md](../types/structured-output.md) | Structured output schema types                                           |
