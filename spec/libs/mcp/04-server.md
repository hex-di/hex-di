# 04 - MCP Server

_Previous: [03 - MCP Adapter Patterns](./03-mcp-adapters.md)_ | _Next: [05 - API Reference](./05-api-reference.md)_

---

## 13. createMcpServer()

The `createMcpServer()` factory is the primary entry point for creating an MCP server. It takes a built HexDI graph, discovers all MCP ports by category, registers them with the `@modelcontextprotocol/sdk`, and returns an `McpServer` handle.

### 13.1 Factory Signature

```typescript
function createMcpServer(graph: BuiltGraph, options?: McpServerOptions): McpServer;
```

### 13.2 McpServerOptions

```typescript
interface McpServerOptions {
  /** Server name reported to MCP clients during initialization. Default: "HexDI MCP Server". */
  readonly name?: string;

  /** Server version reported to MCP clients. Default: "0.1.0". */
  readonly version?: string;

  /**
   * Whether to discover and register tool ports.
   * When false (default), only resources and prompts are registered.
   * This prevents accidental exposure of mutating operations.
   */
  readonly enableTools?: boolean;

  /**
   * Transport configuration. If omitted, the server does not start
   * automatically -- the caller must connect a transport manually.
   */
  readonly transport?: McpTransport;
}
```

### 13.3 Server Creation Flow

```
createMcpServer(graph, options)
    |
    v
1. Create @modelcontextprotocol/sdk Server instance
    |
    v
2. Walk graph for "mcp-resource" category ports
   |  For each: extract URI, description, handler
   |  Register as MCP resource with SDK
    |
    v
3. Walk graph for "mcp-prompt" category ports
   |  For each: extract prompt name, description, arguments
   |  Register as MCP prompt with SDK
    |
    v
4. If enableTools === true:
   |  Walk graph for "mcp-tool" category ports
   |  For each: extract tool name, description, input schema
   |  Register as MCP tool with SDK
    |
    v
5. If transport provided:
   |  Connect transport to SDK server
   |  Begin accepting requests
    |
    v
6. Return McpServer handle
```

### 13.4 Container Resolution

When the server receives a request for a registered capability, it resolves the corresponding port from the graph's container to get the handler instance. For singleton adapters, the handler is resolved once and cached. For transient adapters, a new handler is created per request.

```
MCP Client Request: "Read resource ecommerce://products/catalog"
    |
    v
SDK routes to registered resource handler
    |
    v
Framework resolves ProductCatalogResource port from container
    |
    v
Container returns ResourceHandler<ProductCatalog> (cached if singleton)
    |
    v
Framework calls handler.handle(params)
    |
    v
Handler returns ProductCatalog data
    |
    v
Framework serializes to JSON and returns MCP response
```

---

## 14. Capability Discovery

The discovery engine walks the graph for ports in the MCP categories and extracts the metadata needed to register them with the MCP SDK.

### 14.1 Discovery Algorithm

```typescript
function discoverMcpCapabilities(graph: BuiltGraph, options: McpServerOptions): McpCapabilities {
  const resources = discoverByCategory(graph, "mcp-resource");
  const prompts = discoverByCategory(graph, "mcp-prompt");
  const tools = options.enableTools ? discoverByCategory(graph, "mcp-tool") : [];

  return { resources, prompts, tools };
}
```

The `discoverByCategory()` function:

1. Iterates over all ports provided by the graph.
2. Filters for ports whose category matches the target.
3. Extracts the port metadata (URI, name, description, schemas).
4. Returns a list of discovery records ready for SDK registration.

### 14.2 Dynamic Capabilities

Because discovery is graph-based, capabilities are determined at server creation time. Changing the graph changes the capabilities:

```typescript
// Version 1: only product resources
const graph1 = createGraphBuilder().provide(ProductCatalogAdapter).build();
const server1 = createMcpServer(graph1);
// server1 has 1 resource

// Version 2: products + orders
const graph2 = createGraphBuilder().merge(graph1).provide(OrderHistoryAdapter).build();
const server2 = createMcpServer(graph2);
// server2 has 2 resources
```

The server does not support hot-reloading of capabilities after creation. To change capabilities, create a new server with a new graph.

### 14.3 Discovery Metadata

Each discovered capability produces a metadata record:

```typescript
interface DiscoveredResource {
  readonly uri: string;
  readonly name: string;
  readonly description: string;
  readonly mimeType: string;
  readonly portName: string; // For resolving from container
}

interface DiscoveredTool {
  readonly toolName: string;
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly portName: string;
}

interface DiscoveredPrompt {
  readonly promptName: string;
  readonly name: string;
  readonly description: string;
  readonly arguments: readonly McpPromptArgument[];
  readonly portName: string;
}
```

### 14.4 Duplicate Detection

If two ports share the same URI (for resources) or name (for tools/prompts), the discovery engine produces a descriptive error at server creation time. Duplicates are not silently merged or overwritten.

---

## 15. Transport

Transport is the mechanism by which the MCP server communicates with clients. `@hex-di/mcp` models transport as a port/adapter pattern, with two built-in implementations.

### 15.1 Transport Port

```typescript
interface McpTransport {
  /**
   * Connects the transport to the MCP SDK server.
   * This starts listening for incoming requests.
   */
  connect(server: SdkServer): Promise<void>;

  /**
   * Disconnects the transport, stopping all communication.
   */
  disconnect(): Promise<void>;
}
```

### 15.2 StdioTransport

The default transport for CLI tools like Claude Code. Communication happens over stdin/stdout:

```typescript
interface StdioTransportOptions {
  /**
   * Input stream. Default: process.stdin
   */
  readonly input?: NodeJS.ReadableStream;

  /**
   * Output stream. Default: process.stdout
   */
  readonly output?: NodeJS.WritableStream;
}

function createStdioTransport(options?: StdioTransportOptions): McpTransport;
```

**Usage:**

```typescript
const server = createMcpServer(graph, {
  transport: createStdioTransport(),
});
await server.start();
```

StdioTransport wraps the `@modelcontextprotocol/sdk`'s `StdioServerTransport`. It is the recommended transport for:

- Claude Code CLI integration
- Cline / Continue / Cursor integrations
- Any MCP client that spawns the server as a child process

### 15.3 SseTransport

HTTP-based transport using Server-Sent Events. Suitable for web-based MCP clients:

```typescript
interface SseTransportOptions {
  /** HTTP port to listen on. Default: 3001 */
  readonly port?: number;

  /** Host to bind to. Default: "localhost" */
  readonly host?: string;

  /** URL path for the SSE endpoint. Default: "/sse" */
  readonly path?: string;

  /** URL path for the message endpoint. Default: "/message" */
  readonly messagePath?: string;
}

function createSseTransport(options?: SseTransportOptions): McpTransport;
```

**Usage:**

```typescript
const server = createMcpServer(graph, {
  transport: createSseTransport({ port: 3001 }),
});
await server.start();
// SSE endpoint at http://localhost:3001/sse
// Message endpoint at http://localhost:3001/message
```

SseTransport wraps the `@modelcontextprotocol/sdk`'s `SSEServerTransport`. It is the recommended transport for:

- Browser-based MCP clients
- Web dashboard integrations
- Environments where stdio is not available

### 15.4 Custom Transports

Because transport is defined as an interface, applications can implement custom transports:

```typescript
const customTransport: McpTransport = {
  connect: async server => {
    /* custom connection logic */
  },
  disconnect: async () => {
    /* custom disconnect logic */
  },
};

const server = createMcpServer(graph, { transport: customTransport });
```

### 15.5 No Transport (Manual)

When no transport is provided in options, the server is created but does not start automatically. The caller must connect a transport manually:

```typescript
const server = createMcpServer(graph);
// Server exists but is not listening

const transport = createStdioTransport();
await server.connectTransport(transport);
// Now listening
```

This is useful for testing and for environments where the transport lifecycle is managed externally.

---

## 16. Server Lifecycle

### 16.1 Lifecycle States

```
Created ──> Starting ──> Running ──> Stopping ──> Stopped
                                        |
                                        v
                                      Error
```

- **Created** -- Server is constructed but no transport is connected.
- **Starting** -- Transport is connecting.
- **Running** -- Server is accepting requests.
- **Stopping** -- Graceful shutdown in progress.
- **Stopped** -- Server is fully shut down.
- **Error** -- An unrecoverable error occurred.

### 16.2 Start

```typescript
const server = createMcpServer(graph, { transport: createStdioTransport() });
await server.start();
// Server is now in "Running" state
```

The `start()` method:

1. Validates that a transport is configured.
2. Calls `transport.connect(sdkServer)`.
3. Transitions to `Running` state.
4. Returns when the transport is ready to accept requests.

### 16.3 Stop

```typescript
await server.stop();
// Server is now in "Stopped" state
```

The `stop()` method:

1. Transitions to `Stopping` state.
2. Stops accepting new requests.
3. Waits for in-flight requests to complete (with a configurable timeout).
4. Calls `transport.disconnect()`.
5. Disposes the graph's container (releasing singleton instances).
6. Transitions to `Stopped` state.

### 16.4 Signal Handling (stdio)

When using `StdioTransport`, the server registers signal handlers for graceful shutdown:

- **SIGINT** (Ctrl+C) -- Triggers graceful shutdown.
- **SIGTERM** -- Triggers graceful shutdown.
- **stdin end** -- When the parent process closes stdin, the server shuts down.

Signal handlers are registered on `start()` and removed on `stop()`.

### 16.5 Error Handling

Errors during request processing are isolated per request:

- **Handler errors** -- Caught and returned as MCP error responses. The server continues running.
- **Transport errors** -- If the transport connection is lost, the server transitions to `Error` state. For `StdioTransport`, this means the parent process exited. For `SseTransport`, individual client disconnections do not affect the server.
- **Fatal errors** -- Unrecoverable errors (e.g., port already in use for SSE) transition the server to `Error` state and call `stop()`.

### 16.6 Shutdown Timeout

The server waits for in-flight requests to complete during shutdown:

```typescript
interface McpServerOptions {
  // ... other fields
  /** Maximum time to wait for in-flight requests during shutdown. Default: 5000ms. */
  readonly shutdownTimeout?: number;
}
```

If in-flight requests do not complete within the timeout, they are abandoned and the server proceeds with shutdown.

### 16.7 Server Events

The `McpServer` handle exposes lifecycle events:

```typescript
interface McpServer {
  // ... other methods
  on(event: "started", listener: () => void): void;
  on(event: "stopped", listener: () => void): void;
  on(event: "error", listener: (error: Error) => void): void;
  on(event: "request", listener: (request: McpRequestInfo) => void): void;
}
```

These events are primarily useful for logging and monitoring.

---

_Previous: [03 - MCP Adapter Patterns](./03-mcp-adapters.md)_ | _Next: [05 - API Reference](./05-api-reference.md)_
