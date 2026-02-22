# HexDI MCP Framework Specification

**Package:** `@hex-di/mcp`
**Version:** 0.1.0
**Status:** Draft
**Created:** 2026-02-11

---

## Summary

`@hex-di/mcp` is a **general-purpose framework** for building MCP (Model Context Protocol) servers using HexDI's port/adapter architecture. MCP resources, tools, and prompts are modeled as typed HexDI ports. Their implementations are adapters. The MCP server is composed from a dependency graph and discovers capabilities automatically.

This package is **framework-only** -- it provides the typed port definitions, adapter patterns, server factory, and transport abstractions. It does not ship any domain-specific adapters. The inspection-specific MCP adapters (resources exposing container state, graph topology, tracing data, and library-specific state) are part of `@hex-di/devtools`, which uses `@hex-di/mcp` as its MCP layer.

```
@hex-di/mcp (Framework -- spec/libs/mcp/)        @hex-di/devtools (Server -- spec/tooling/devtools/)
+-------------------------+                  +------------------------------+
| McpResourcePort<T>      |  <------------ | GraphTopologyAdapter         |
| McpToolPort<I,O>        |  <------------ | RuntimeSnapshotAdapter       |
| McpPromptPort<A>        |  <------------ | TracingRecentAdapter...      |
|                         |                 |                              |
| createMcpServer()       |                 | DevTools Server provides:    |
| StdioTransport          |                 |   WebSocket -> Dashboard UI  |
| SseTransport            |                 |   MCP -> AI Dev Tools        |
+-------------------------+                 +------------------------------+
```

## Packages

| Package               | Description                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `@hex-di/mcp`         | MCP server framework. Typed port definitions, adapter patterns, server factory, transport abstraction. |
| `@hex-di/mcp-testing` | Test utilities. In-memory transport, mock MCP client, assertion helpers for MCP adapters.              |

## Dependencies

### `@hex-di/mcp`

| Package                     | Type | Description                                    |
| --------------------------- | ---- | ---------------------------------------------- |
| `@modelcontextprotocol/sdk` | peer | MCP protocol SDK for server implementation     |
| `@hex-di/core`              | peer | Port definitions, directed ports, categories   |
| `@hex-di/graph`             | peer | Graph builder for composing MCP adapter graphs |

### `@hex-di/mcp-testing`

| Package       | Type | Description                |
| ------------- | ---- | -------------------------- |
| `@hex-di/mcp` | peer | Framework types under test |
| `vitest`      | peer | Test runner                |

## Cross-References

- **`spec/tooling/devtools/`** -- The DevTools standalone server uses `@hex-di/mcp` to provide MCP capabilities alongside the visual dashboard. The 34 resources, 18 tools, and 5 prompts that expose container/library inspection data are defined in `spec/tooling/devtools/`, not here.
- **`spec/inspection/`** -- The `LibraryInspector` protocol and auto-discovery pattern that `@hex-di/mcp` port categories are modeled after.
- **`vision/phase-4/PHASE-4-COMMUNICATION.md`** -- Phase 4 roadmap describing `@hex-di/mcp` as the MCP framework package.

## Table of Contents

### [01 - Overview & Philosophy](./01-overview.md)

1. [Overview](./01-overview.md#1-overview)
2. [Philosophy](./01-overview.md#2-philosophy)
3. [Package Structure](./01-overview.md#3-package-structure)

### [02 - MCP Port Types](./02-mcp-ports.md)

4. [McpResourcePort](./02-mcp-ports.md#4-mcpresourceport)
5. [McpToolPort](./02-mcp-ports.md#5-mcptoolport)
6. [McpPromptPort](./02-mcp-ports.md#6-mcppromptport)
7. [Port Categories](./02-mcp-ports.md#7-port-categories)
8. [URI Scheme](./02-mcp-ports.md#8-uri-scheme)

### [03 - MCP Adapter Patterns](./03-mcp-adapters.md)

9. [Resource Adapters](./03-mcp-adapters.md#9-resource-adapters)
10. [Tool Adapters](./03-mcp-adapters.md#10-tool-adapters)
11. [Prompt Adapters](./03-mcp-adapters.md#11-prompt-adapters)
12. [Adapter Composition](./03-mcp-adapters.md#12-adapter-composition)

### [04 - MCP Server](./04-server.md)

13. [createMcpServer()](./04-server.md#13-createmcpserver)
14. [Capability Discovery](./04-server.md#14-capability-discovery)
15. [Transport](./04-server.md#15-transport)
16. [Server Lifecycle](./04-server.md#16-server-lifecycle)

### [05 - API Reference](./05-api-reference.md)

17. [Port Factories](./05-api-reference.md#17-port-factories)
18. [Server Factory](./05-api-reference.md#18-server-factory)
19. [Transport Types](./05-api-reference.md#19-transport-types)
20. [McpServer Handle](./05-api-reference.md#20-mcpserver-handle)
21. [Handler Interfaces](./05-api-reference.md#21-handler-interfaces)
22. [Error Types](./05-api-reference.md#22-error-types)

### [06 - Appendices](./06-appendices.md)

- [Appendix A: Design Decisions](./06-appendices.md#appendix-a-design-decisions)
- [Appendix B: Glossary](./06-appendices.md#appendix-b-glossary)
- [Appendix C: Comparison](./06-appendices.md#appendix-c-comparison)
- [Appendix D: Custom MCP Server Example](./06-appendices.md#appendix-d-custom-mcp-server-example)

### [07 - Definition of Done](./07-definition-of-done.md)

- [DoD 1-9: Test Suites](./07-definition-of-done.md#dod-1-port-creation)
- [Verification Checklist](./07-definition-of-done.md#verification-checklist)

---

## Release Scope

All sections (1-22) ship in version 0.1.0. Sections cover the framework only -- no inspection-specific adapters.

---

_End of Table of Contents_
