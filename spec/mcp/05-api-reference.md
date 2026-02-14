# 05 - API Reference

_Previous: [04 - MCP Server](./04-server.md)_ | _Next: [06 - Appendices](./06-appendices.md)_

---

Consolidated type signatures for `@hex-di/mcp`. See individual spec sections for detailed explanations and examples.

---

## 17. Port Factories

### createMcpResourcePort

Creates a typed MCP resource port for automatic discovery by `createMcpServer()`.

```typescript
function createMcpResourcePort<TResponse>(
  config: McpResourcePortConfig
): McpResourcePort<TResponse>;
```

```typescript
interface McpResourcePortConfig {
  /**
   * URI template for this resource.
   * Must contain a scheme followed by "://".
   *
   * @example "ecommerce://products/catalog"
   * @example "hexdi://graph/topology"
   */
  readonly uri: string;

  /**
   * Port name. Used as the HexDI port identifier.
   * Should be PascalCase.
   *
   * @example "ProductCatalog"
   */
  readonly name: string;

  /** Human-readable description exposed to MCP clients. */
  readonly description: string;

  /**
   * MIME type for the response.
   *
   * @default "application/json"
   */
  readonly mimeType?: string;

  /** Optional tags for filtering during discovery. */
  readonly tags?: readonly string[];
}
```

### createMcpToolPort

Creates a typed MCP tool port. Only discovered when `enableTools: true`.

```typescript
function createMcpToolPort<TInput, TOutput>(
  config: McpToolPortConfig
): McpToolPort<TInput, TOutput>;
```

```typescript
interface McpToolPortConfig {
  /**
   * Tool name as exposed to MCP clients.
   * Should be kebab-case.
   *
   * @example "search-products"
   * @example "add-to-cart"
   */
  readonly toolName: string;

  /**
   * Port name. Used as the HexDI port identifier.
   * Should be PascalCase.
   *
   * @example "SearchProducts"
   */
  readonly name: string;

  /** Human-readable description exposed to MCP clients. */
  readonly description: string;

  /**
   * JSON Schema describing the tool's input parameters.
   * Used by MCP clients for validation and UI generation.
   */
  readonly inputSchema: Readonly<Record<string, unknown>>;

  /** Optional tags for filtering during discovery. */
  readonly tags?: readonly string[];
}
```

### createMcpPromptPort

Creates a typed MCP prompt port for automatic discovery.

```typescript
function createMcpPromptPort<TArgs>(config: McpPromptPortConfig): McpPromptPort<TArgs>;
```

```typescript
interface McpPromptPortConfig {
  /**
   * Prompt name as exposed to MCP clients.
   * Should be kebab-case.
   *
   * @example "debug-product"
   * @example "analyze-order"
   */
  readonly promptName: string;

  /**
   * Port name. Used as the HexDI port identifier.
   * Should be PascalCase.
   *
   * @example "DebugProduct"
   */
  readonly name: string;

  /** Human-readable description exposed to MCP clients. */
  readonly description: string;

  /** Argument definitions for the prompt template. */
  readonly arguments: readonly McpPromptArgument[];

  /** Optional tags for filtering during discovery. */
  readonly tags?: readonly string[];
}

interface McpPromptArgument {
  /** Argument name (e.g., "productId"). */
  readonly name: string;

  /** Human-readable description. */
  readonly description: string;

  /** Whether this argument is required. */
  readonly required: boolean;
}
```

---

## 18. Server Factory

### createMcpServer

Creates an MCP server from a built HexDI graph.

```typescript
function createMcpServer(graph: BuiltGraph, options?: McpServerOptions): McpServer;
```

```typescript
interface McpServerOptions {
  /**
   * Server name reported to MCP clients during capability negotiation.
   *
   * @default "HexDI MCP Server"
   */
  readonly name?: string;

  /**
   * Server version reported to MCP clients.
   *
   * @default "0.1.0"
   */
  readonly version?: string;

  /**
   * Whether to discover and register tool ports (category "mcp-tool").
   * When false, only resources and prompts are registered.
   *
   * @default false
   */
  readonly enableTools?: boolean;

  /**
   * Transport to use for communication with MCP clients.
   * If omitted, the server is created but does not start automatically.
   * A transport can be connected later via `server.connectTransport()`.
   */
  readonly transport?: McpTransport;

  /**
   * Maximum time in milliseconds to wait for in-flight requests
   * during graceful shutdown.
   *
   * @default 5000
   */
  readonly shutdownTimeout?: number;
}
```

---

## 19. Transport Types

### McpTransport

The transport interface that connects the MCP SDK server to a communication channel.

```typescript
interface McpTransport {
  /** Connects the transport to the SDK server and begins listening. */
  connect(server: SdkServer): Promise<void>;

  /** Disconnects the transport, stopping all communication. */
  disconnect(): Promise<void>;
}
```

### createStdioTransport

Creates a transport that communicates over stdin/stdout.

```typescript
function createStdioTransport(options?: StdioTransportOptions): McpTransport;
```

```typescript
interface StdioTransportOptions {
  /**
   * Input stream.
   *
   * @default process.stdin
   */
  readonly input?: NodeJS.ReadableStream;

  /**
   * Output stream.
   *
   * @default process.stdout
   */
  readonly output?: NodeJS.WritableStream;
}
```

### createSseTransport

Creates a transport that communicates over HTTP with Server-Sent Events.

```typescript
function createSseTransport(options?: SseTransportOptions): McpTransport;
```

```typescript
interface SseTransportOptions {
  /**
   * HTTP port to listen on.
   *
   * @default 3001
   */
  readonly port?: number;

  /**
   * Host to bind to.
   *
   * @default "localhost"
   */
  readonly host?: string;

  /**
   * URL path for the SSE endpoint.
   *
   * @default "/sse"
   */
  readonly path?: string;

  /**
   * URL path for the message endpoint.
   *
   * @default "/message"
   */
  readonly messagePath?: string;
}
```

---

## 20. McpServer Handle

The `McpServer` handle returned by `createMcpServer()`.

```typescript
interface McpServer {
  /**
   * Starts the server. Connects the transport and begins accepting requests.
   * Throws if no transport is configured.
   */
  start(): Promise<void>;

  /**
   * Stops the server. Waits for in-flight requests (up to shutdownTimeout),
   * disconnects the transport, and disposes the container.
   */
  stop(): Promise<void>;

  /**
   * Connects a transport to the server. Use when no transport was provided
   * in the constructor options.
   */
  connectTransport(transport: McpTransport): Promise<void>;

  /**
   * Returns the set of capabilities discovered from the graph.
   */
  getCapabilities(): McpCapabilities;

  /**
   * Returns the list of registered resource URIs.
   */
  getRegisteredResources(): readonly string[];

  /**
   * Returns the list of registered tool names.
   */
  getRegisteredTools(): readonly string[];

  /**
   * Returns the list of registered prompt names.
   */
  getRegisteredPrompts(): readonly string[];

  /**
   * Current server lifecycle state.
   */
  readonly state: McpServerState;

  /**
   * Registers a lifecycle event listener.
   */
  on(event: "started", listener: () => void): void;
  on(event: "stopped", listener: () => void): void;
  on(event: "error", listener: (error: Error) => void): void;
  on(event: "request", listener: (info: McpRequestInfo) => void): void;
}

type McpServerState = "created" | "starting" | "running" | "stopping" | "stopped" | "error";

interface McpCapabilities {
  readonly resources: readonly DiscoveredResource[];
  readonly tools: readonly DiscoveredTool[];
  readonly prompts: readonly DiscoveredPrompt[];
}

interface McpRequestInfo {
  readonly type: "resource" | "tool" | "prompt";
  readonly name: string;
  readonly timestamp: number;
  readonly durationMs?: number;
  readonly error?: string;
}
```

---

## 21. Handler Interfaces

### ResourceHandler

Handler provided by adapters for `McpResourcePort<TResponse>`.

```typescript
interface ResourceHandler<TResponse> {
  /**
   * Handles a resource query.
   *
   * @param params - Query parameters parsed from the URI (all string values)
   * @returns Response data or a Promise of response data
   */
  handle(params: Readonly<Record<string, string>>): TResponse | Promise<TResponse>;
}
```

### ToolHandler

Handler provided by adapters for `McpToolPort<TInput, TOutput>`.

```typescript
interface ToolHandler<TInput, TOutput> {
  /**
   * Executes the tool with validated input.
   *
   * @param input - Input data validated against the tool's JSON Schema
   * @returns Execution result or a Promise of the result
   */
  execute(input: TInput): TOutput | Promise<TOutput>;
}
```

### PromptHandler

Handler provided by adapters for `McpPromptPort<TArgs>`.

```typescript
interface PromptHandler<TArgs> {
  /**
   * Generates prompt messages from the given arguments.
   *
   * @param args - Arguments matching the prompt's argument definitions
   * @returns Array of prompt messages or a Promise of the array
   */
  generate(args: TArgs): readonly McpPromptMessage[] | Promise<readonly McpPromptMessage[]>;
}
```

### McpPromptMessage

```typescript
interface McpPromptMessage {
  readonly role: "user" | "assistant";
  readonly content: McpPromptContent;
}

type McpPromptContent =
  | { readonly type: "text"; readonly text: string }
  | {
      readonly type: "resource";
      readonly resource: {
        readonly uri: string;
        readonly text: string;
        readonly mimeType?: string;
      };
    };
```

---

## 22. Error Types

### Error Codes

```typescript
const McpErrorCode = {
  /** Server failed to start (transport error, port in use). */
  SERVER_START_FAILED: "MCP_SERVER_START_FAILED",

  /** Server failed to stop gracefully. */
  SERVER_STOP_FAILED: "MCP_SERVER_STOP_FAILED",

  /** Resource handler threw an error. */
  RESOURCE_HANDLER_ERROR: "MCP_RESOURCE_HANDLER_ERROR",

  /** Tool handler threw an error. */
  TOOL_HANDLER_ERROR: "MCP_TOOL_HANDLER_ERROR",

  /** Prompt handler threw an error. */
  PROMPT_HANDLER_ERROR: "MCP_PROMPT_HANDLER_ERROR",

  /** Resource URI not found in the registered resources. */
  RESOURCE_NOT_FOUND: "MCP_RESOURCE_NOT_FOUND",

  /** Tool name not found in the registered tools. */
  TOOL_NOT_FOUND: "MCP_TOOL_NOT_FOUND",

  /** Prompt name not found in the registered prompts. */
  PROMPT_NOT_FOUND: "MCP_PROMPT_NOT_FOUND",

  /** Tool input failed JSON Schema validation. */
  TOOL_INPUT_INVALID: "MCP_TOOL_INPUT_INVALID",

  /** Duplicate URI or name detected during discovery. */
  DUPLICATE_CAPABILITY: "MCP_DUPLICATE_CAPABILITY",

  /** Invalid URI template in resource port. */
  INVALID_URI: "MCP_INVALID_URI",

  /** Transport connection failed. */
  TRANSPORT_ERROR: "MCP_TRANSPORT_ERROR",

  /** Shutdown timeout exceeded. */
  SHUTDOWN_TIMEOUT: "MCP_SHUTDOWN_TIMEOUT",
} as const;

type McpErrorCode = (typeof McpErrorCode)[keyof typeof McpErrorCode];
```

### Error Classes

```typescript
/**
 * Base error for all MCP framework errors.
 */
class McpError extends Error {
  readonly code: McpErrorCode;
  readonly cause?: Error;
}

/**
 * Error during server lifecycle (start, stop).
 */
class McpServerError extends McpError {
  readonly serverState: McpServerState;
}

/**
 * Error during handler execution (resource, tool, or prompt).
 */
class McpHandlerError extends McpError {
  readonly handlerType: "resource" | "tool" | "prompt";
  readonly handlerName: string;
}

/**
 * Error during capability discovery (duplicate URIs, invalid ports).
 */
class McpDiscoveryError extends McpError {
  readonly duplicates?: readonly string[];
}
```

### MCP Error Mapping

Framework errors are mapped to MCP SDK error types for proper client communication:

| Framework Error          | MCP SDK Error      | HTTP-like Status |
| ------------------------ | ------------------ | ---------------- |
| `RESOURCE_NOT_FOUND`     | `ResourceNotFound` | 404              |
| `TOOL_NOT_FOUND`         | `MethodNotFound`   | 404              |
| `PROMPT_NOT_FOUND`       | `MethodNotFound`   | 404              |
| `TOOL_INPUT_INVALID`     | `InvalidParams`    | 400              |
| `RESOURCE_HANDLER_ERROR` | `InternalError`    | 500              |
| `TOOL_HANDLER_ERROR`     | `InternalError`    | 500              |
| `PROMPT_HANDLER_ERROR`   | `InternalError`    | 500              |

---

_Previous: [04 - MCP Server](./04-server.md)_ | _Next: [06 - Appendices](./06-appendices.md)_
