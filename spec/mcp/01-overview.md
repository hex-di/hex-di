# 01 - Overview & Philosophy

## 1. Overview

`@hex-di/mcp` is a general-purpose framework for building MCP (Model Context Protocol) servers using HexDI's port/adapter architecture. It maps MCP's three capability types -- resources, tools, and prompts -- to typed HexDI ports. Implementations of those capabilities are adapters. The MCP server is composed from a dependency graph and discovers its capabilities automatically by walking the graph for ports in the `mcp-resource`, `mcp-tool`, and `mcp-prompt` categories.

```
MCP Concept          @hex-di/mcp Equivalent
-----------          ----------------------
Resource             McpResourcePort<TResponse>  + adapter
Tool                 McpToolPort<TInput, TOutput> + adapter
Prompt               McpPromptPort<TArgs>         + adapter
Server               createMcpServer(graph)
Transport            StdioTransport / SseTransport (port/adapter)
Discovery            Graph walk by port category
```

The framework ships no domain-specific adapters. Building an MCP server means:

1. **Define ports** -- Declare `McpResourcePort`, `McpToolPort`, and `McpPromptPort` for your capabilities.
2. **Write adapters** -- Implement handlers that satisfy those ports, injecting whatever domain dependencies they need.
3. **Build a graph** -- Compose adapters into a HexDI graph with `createGraphBuilder()`.
4. **Start the server** -- Call `createMcpServer(graph)` to discover all MCP ports and register them with the `@modelcontextprotocol/sdk`.

The DevTools standalone server (`@hex-di/devtools`) uses this framework to expose 34 resources, 18 tools, and 5 prompts for container inspection. But `@hex-di/mcp` itself knows nothing about containers, graphs, tracing, or inspection. It is a general-purpose MCP server framework that any HexDI application can use to expose arbitrary domain capabilities through MCP.

### 1.1 Goals

1. **Type-safe MCP definitions via ports** -- MCP resources, tools, and prompts are declared as branded HexDI ports with typed response, input/output, and argument schemas. TypeScript catches mismatches at compile time.

2. **Automatic discovery from graph** -- The server discovers available capabilities by walking the graph for ports in the `mcp-resource`, `mcp-tool`, and `mcp-prompt` categories. Adding a new adapter to the graph automatically registers a new MCP capability. No manual registration.

3. **Transport-agnostic** -- The framework supports stdio (for CLI tools like Claude Code) and SSE (for web-based tools) out of the box. Transport is itself a port/adapter, so custom transports can be added.

4. **Composable adapter graphs** -- MCP adapters are standard HexDI adapters that can depend on other ports. A resource adapter can depend on a domain service port, a repository port, or any other port in the graph. Multiple adapter sets can be merged into a single graph.

5. **Framework, not batteries** -- The package provides the structural patterns (port types, adapter contracts, server factory, transport) but no domain-specific implementations. Bring your own adapters.

### 1.2 Non-Goals

1. **Not an MCP SDK wrapper** -- This is not a thin wrapper around `@modelcontextprotocol/sdk`. It models MCP capabilities as HexDI ports and provides automatic discovery. Applications that want raw SDK access should use `@modelcontextprotocol/sdk` directly.

2. **Not an A2A server** -- A2A (Agent-to-Agent) protocol support is planned for `@hex-di/a2a`, not this package.

3. **Not a REST API framework** -- REST diagnostic endpoints are provided by `integrations/hono`, not this package.

4. **Does not ship inspection adapters** -- The 34 resources, 18 tools, and 5 prompts that expose HexDI container/library inspection data live in `@hex-di/devtools`. This package is the framework they are built on.

---

## 2. Philosophy

> "MCP capabilities are ports. Implementations are adapters. The server discovers them from the graph."

### 2.1 Core Principles

**Principle 1: Ports and Adapters All the Way Down**

MCP resources, tools, and prompts are HexDI ports. Their implementations are adapters. The MCP server itself is composed from a graph. This is not a metaphor -- it is the literal implementation strategy.

A `McpResourcePort<StoreSnapshot>` is a directed port with the `mcp-resource` category. An adapter provides a handler function that returns `StoreSnapshot` data when the resource is queried. The port carries the URI template, description, and response type as compile-time metadata. The adapter carries the runtime implementation.

This means MCP capabilities inherit all HexDI graph properties: lifetime management, dependency injection, composition, validation, and inspection. A resource adapter can be singleton (computed once), scoped (per-session), or transient (per-request). It can depend on other ports and receive them via dependency injection.

**Principle 2: Discovery over Registration**

Traditional MCP servers require explicit registration:

```
server.resource("hexdi://graph/topology", handler);
server.tool("resolve", handler);
```

`@hex-di/mcp` replaces this with automatic discovery. The `createMcpServer()` factory walks the graph for all ports in the `mcp-resource`, `mcp-tool`, and `mcp-prompt` categories and registers them automatically. Adding a new adapter to the graph is sufficient to expose a new MCP capability. Removing it removes the capability.

This mirrors how the `LibraryInspector` protocol works: libraries register inspectors through the `library-inspector` port category, and the container discovers them automatically via the `afterResolve` hook. MCP ports use the same pattern.

**Principle 3: Read-Heavy by Default, Tools Opt-In**

MCP resources are read-only queries -- they expose data without side effects. Tools are write operations that modify state (resolve a port, create a scope, invalidate a cache). The framework treats resources as the default and requires explicit opt-in for tools.

The `createMcpServer()` factory discovers all resource and prompt ports automatically. Tool ports are only discovered when `enableTools: true` is passed in the server options. This prevents accidental exposure of mutating operations.

**Principle 4: Composition over Configuration**

Instead of a configuration object that lists capabilities, the server's capabilities are determined by the graph it receives. Composing different adapter sets is done by merging graphs:

```
const inspectionGraph = createInspectionMcpAdapters(inspector);
const domainGraph = createDomainMcpAdapters(services);
const fullGraph = graphBuilder.merge(inspectionGraph).merge(domainGraph).build();
const server = createMcpServer(fullGraph);
```

This follows HexDI's composition model where graphs are the unit of composition.

**Principle 5: Framework, Not Batteries**

`@hex-di/mcp` provides the port types, adapter contracts, server factory, and transport abstractions. It does not provide any concrete MCP resources, tools, or prompts. This separation ensures:

- The framework has no dependency on `@hex-di/runtime`, `@hex-di/tracing`, or any library package.
- Any domain (e-commerce, healthcare, DevOps) can use it to build MCP servers.
- The DevTools inspection adapters are just one consumer of the framework, not a privileged one.

---

## 3. Package Structure

### 3.1 `@hex-di/mcp`

```
packages/mcp/
+-- src/
|   +-- index.ts                    # Public API exports
|   +-- ports/
|   |   +-- resource-port.ts       # McpResourcePort type + createMcpResourcePort()
|   |   +-- tool-port.ts           # McpToolPort type + createMcpToolPort()
|   |   +-- prompt-port.ts         # McpPromptPort type + createMcpPromptPort()
|   |   +-- categories.ts          # Port category constants
|   |   +-- types.ts               # Shared port metadata types
|   +-- server/
|   |   +-- create-server.ts       # createMcpServer() factory
|   |   +-- discovery.ts           # Graph walk for MCP ports by category
|   |   +-- registration.ts        # Registers discovered ports with MCP SDK
|   |   +-- types.ts               # McpServerOptions, McpServer handle
|   +-- transport/
|   |   +-- stdio.ts               # StdioTransport adapter
|   |   +-- sse.ts                 # SseTransport adapter
|   |   +-- types.ts               # McpTransport port + types
|   +-- handlers/
|   |   +-- resource-handler.ts    # ResourceHandler interface
|   |   +-- tool-handler.ts        # ToolHandler interface
|   |   +-- prompt-handler.ts      # PromptHandler interface
|   +-- errors/
|   |   +-- codes.ts               # MCP error codes
|   |   +-- classes.ts             # McpServerError, McpHandlerError, etc.
|   +-- types.ts                    # Re-exported aggregate types
+-- tests/
|   +-- ports/
|   |   +-- resource-port.test.ts
|   |   +-- resource-port.test-d.ts
|   |   +-- tool-port.test.ts
|   |   +-- tool-port.test-d.ts
|   |   +-- prompt-port.test.ts
|   |   +-- prompt-port.test-d.ts
|   +-- server/
|   |   +-- discovery.test.ts
|   |   +-- create-server.test.ts
|   |   +-- registration.test.ts
|   +-- transport/
|   |   +-- stdio.test.ts
|   |   +-- sse.test.ts
|   +-- handlers/
|   |   +-- resource-handler.test.ts
|   |   +-- tool-handler.test.ts
|   |   +-- prompt-handler.test.ts
|   +-- integration/
|   |   +-- e2e.test.ts
|   |   +-- lifecycle.test.ts
+-- package.json
+-- tsconfig.json
+-- tsconfig.build.json
+-- vitest.config.ts
+-- eslint.config.js
```

### 3.2 `@hex-di/mcp-testing`

```
packages/mcp-testing/
+-- src/
|   +-- index.ts                    # Public API exports
|   +-- in-memory-transport.ts     # In-memory transport for testing
|   +-- mock-mcp-client.ts        # Mock MCP client that sends requests
|   +-- assertion-helpers.ts       # Matchers for MCP responses
+-- package.json
+-- tsconfig.json
```

### 3.3 Dependency Graph

```
@hex-di/mcp
    |
    +--- @hex-di/core (peer)          Port types, DirectedPort, categories
    +--- @hex-di/graph (peer)         Graph builder, graph walking
    +--- @modelcontextprotocol/sdk (peer)  MCP SDK server implementation

@hex-di/mcp-testing
    |
    +--- @hex-di/mcp (peer)           Framework types under test
    +--- vitest (peer)                 Test runner

@hex-di/devtools (consumer, not a dependency)
    |
    +--- @hex-di/mcp (direct)          Uses the framework to build inspection MCP server
    +--- @hex-di/runtime (direct)      Container inspection data
    +--- @hex-di/tracing (direct)      Tracing data
```

### 3.4 What Exists Today vs. What is New

```
EXISTING INFRASTRUCTURE             NEW in @hex-di/mcp
+-----------------------------------+-----------------------------------+
| @hex-di/core                      | @hex-di/mcp (framework)           |
|   DirectedPort<S, N, D, C>       |   McpResourcePort<TResponse>     |
|   Port categories ("library-      |   McpToolPort<TInput, TOutput>   |
|   inspector")                     |   McpPromptPort<TArgs>           |
|   createPort() / createAdapter()  |   createMcpResourcePort()        |
|                                   |   createMcpToolPort()            |
| @hex-di/graph                     |   createMcpPromptPort()          |
|   createGraphBuilder()            |   createMcpServer()              |
|   graph.build()                   |   StdioTransport                 |
|   graph.merge()                   |   SseTransport                   |
|                                   |   ResourceHandler                |
| @modelcontextprotocol/sdk         |   ToolHandler                    |
|   Server class                    |   PromptHandler                  |
|   StdioServerTransport            |   Capability discovery            |
|   SSEServerTransport              |   Error types + codes            |
|                                   |                                   |
| libs/store/core/src/integration/  | @hex-di/mcp-testing              |
|   mcp-resources.ts                |   InMemoryTransport              |
|   (reference pattern for MCP      |   MockMcpClient                  |
|    resource handlers)             |   Assertion helpers              |
+-----------------------------------+-----------------------------------+
```

The key insight: `@hex-di/core` already has the `DirectedPort` type with category support, and `@hex-di/graph` already has graph building and merging. `@hex-di/mcp` adds MCP-specific port types that carry URI templates, JSON schemas, and descriptions as type-level metadata, plus the server factory that bridges the graph to the MCP SDK.

---

_Next: [02 - MCP Port Types](./02-mcp-ports.md)_
