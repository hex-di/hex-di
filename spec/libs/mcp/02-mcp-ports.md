# 02 - MCP Port Types

_Previous: [01 - Overview & Philosophy](./01-overview.md)_ | _Next: [03 - MCP Adapter Patterns](./03-mcp-adapters.md)_

---

## 4. McpResourcePort

An MCP resource is a read-only data endpoint identified by a URI. In `@hex-di/mcp`, each resource is a typed HexDI port that carries its URI template, description, and response type as compile-time metadata.

### 4.1 Type Definition

```typescript
/**
 * A branded HexDI port representing an MCP resource.
 *
 * The type parameter TResponse defines the shape of the data returned
 * when this resource is queried. The port carries the URI template and
 * description as metadata fields, available both at the type level and
 * at runtime.
 */
type McpResourcePort<TResponse> = DirectedPort<
  ResourceHandler<TResponse>,
  string, // Port name (derived from URI)
  "outbound",
  "mcp-resource" // Category for auto-discovery
>;
```

The `McpResourcePort<TResponse>` wraps a `ResourceHandler<TResponse>` -- the adapter provides the handler, and the handler is what the MCP server calls when a client queries the resource.

### 4.2 Port Metadata

Each `McpResourcePort` carries additional metadata beyond what a standard `DirectedPort` provides:

```typescript
interface McpResourcePortMetadata {
  /** URI template for this resource (e.g., "hexdi://store/snapshot"). */
  readonly uri: string;

  /** Human-readable description for MCP client discovery. */
  readonly description: string;

  /** Optional MIME type for the response. Default: "application/json". */
  readonly mimeType?: string;
}
```

This metadata is stored in the port's `tags` or a dedicated metadata field and is extracted by the server during capability discovery.

### 4.3 Factory: createMcpResourcePort()

````typescript
/**
 * Creates a typed MCP resource port.
 *
 * @param config - Resource configuration
 * @returns A DirectedPort with the "mcp-resource" category
 *
 * @example
 * ```typescript
 * interface ProductCatalog {
 *   readonly products: readonly { readonly id: string; readonly name: string }[];
 *   readonly total: number;
 * }
 *
 * const ProductCatalogResource = createMcpResourcePort<ProductCatalog>({
 *   uri: "myapp://products/catalog",
 *   name: "ProductCatalog",
 *   description: "Returns the full product catalog with item count.",
 * });
 * ```
 */
function createMcpResourcePort<TResponse>(config: {
  readonly uri: string;
  readonly name: string;
  readonly description: string;
  readonly mimeType?: string;
  readonly tags?: readonly string[];
}): McpResourcePort<TResponse>;
````

The factory:

1. Creates a `DirectedPort` with category `"mcp-resource"`.
2. Stores the URI template, description, and MIME type as port metadata.
3. The port name defaults to the `name` parameter, which should be a PascalCase identifier.
4. Additional tags can be provided for filtering during discovery.

### 4.4 Type Safety

TypeScript enforces that the adapter providing this port must return a `ResourceHandler<TResponse>`:

```typescript
// Compile error: adapter must return ResourceHandler<ProductCatalog>
const wrong = createAdapter(ProductCatalogResource, {
  provides: ProductCatalogResource,
  factory: () => ({ handle: () => "not a ProductCatalog" }), // Type error
});

// Correct: adapter returns the right shape
const correct = createAdapter(ProductCatalogResource, {
  provides: ProductCatalogResource,
  factory: () => ({
    handle: () => ({ products: [], total: 0 }),
  }),
});
```

---

## 5. McpToolPort

An MCP tool is a callable operation that accepts input, performs an action, and returns output. Tools can have side effects (resolving a port, creating a scope, invalidating a cache). In `@hex-di/mcp`, each tool is a typed port with input and output schemas.

### 5.1 Type Definition

```typescript
/**
 * A branded HexDI port representing an MCP tool.
 *
 * TInput defines the shape of the tool's input parameters.
 * TOutput defines the shape of the tool's return value.
 */
type McpToolPort<TInput, TOutput> = DirectedPort<
  ToolHandler<TInput, TOutput>,
  string, // Port name
  "outbound",
  "mcp-tool" // Category for auto-discovery
>;
```

### 5.2 Port Metadata

```typescript
interface McpToolPortMetadata {
  /** Tool name as exposed to MCP clients (e.g., "resolve-port"). */
  readonly toolName: string;

  /** Human-readable description for MCP client discovery. */
  readonly description: string;

  /** JSON Schema describing the input parameters. */
  readonly inputSchema: Readonly<Record<string, unknown>>;
}
```

The `inputSchema` is a standard JSON Schema object that MCP clients use for input validation and UI generation. The output type is inferred from the handler's return type.

### 5.3 Factory: createMcpToolPort()

````typescript
/**
 * Creates a typed MCP tool port.
 *
 * @param config - Tool configuration
 * @returns A DirectedPort with the "mcp-tool" category
 *
 * @example
 * ```typescript
 * interface SearchInput {
 *   readonly query: string;
 *   readonly limit?: number;
 * }
 *
 * interface SearchOutput {
 *   readonly results: readonly { readonly id: string; readonly score: number }[];
 *   readonly total: number;
 * }
 *
 * const SearchTool = createMcpToolPort<SearchInput, SearchOutput>({
 *   toolName: "search-products",
 *   name: "SearchProducts",
 *   description: "Searches the product catalog by query string.",
 *   inputSchema: {
 *     type: "object",
 *     properties: {
 *       query: { type: "string", description: "Search query" },
 *       limit: { type: "number", description: "Max results", default: 10 },
 *     },
 *     required: ["query"],
 *   },
 * });
 * ```
 */
function createMcpToolPort<TInput, TOutput>(config: {
  readonly toolName: string;
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly tags?: readonly string[];
}): McpToolPort<TInput, TOutput>;
````

### 5.4 Input Validation

The framework validates tool input against the `inputSchema` before calling the handler. If validation fails, the server returns an MCP error response without invoking the handler. The validation uses the JSON Schema provided in the port metadata -- no runtime schema library is bundled. The `@modelcontextprotocol/sdk` handles schema validation internally.

### 5.5 Tool Opt-In

Tool ports are only discovered when the server is created with `enableTools: true`:

```typescript
// Resources and prompts only -- tools are NOT registered
const readOnlyServer = createMcpServer(graph);

// Resources, prompts, AND tools
const fullServer = createMcpServer(graph, { enableTools: true });
```

This prevents accidental exposure of mutating operations. See [Section 13](./04-server.md#13-createmcpserver) for details.

---

## 6. McpPromptPort

An MCP prompt is a template that generates contextual messages for AI interactions. The template function receives arguments and injected dependencies, then returns a list of prompt messages. In `@hex-di/mcp`, each prompt is a typed port with an argument schema.

### 6.1 Type Definition

```typescript
/**
 * A branded HexDI port representing an MCP prompt.
 *
 * TArgs defines the shape of the arguments the prompt template accepts.
 */
type McpPromptPort<TArgs> = DirectedPort<
  PromptHandler<TArgs>,
  string, // Port name
  "outbound",
  "mcp-prompt" // Category for auto-discovery
>;
```

### 6.2 Port Metadata

```typescript
interface McpPromptPortMetadata {
  /** Prompt name as exposed to MCP clients. */
  readonly promptName: string;

  /** Human-readable description for MCP client discovery. */
  readonly description: string;

  /** Argument definitions for the prompt template. */
  readonly arguments: readonly McpPromptArgument[];
}

interface McpPromptArgument {
  /** Argument name (e.g., "serviceName"). */
  readonly name: string;

  /** Human-readable description of the argument. */
  readonly description: string;

  /** Whether this argument is required. */
  readonly required: boolean;
}
```

### 6.3 Factory: createMcpPromptPort()

````typescript
/**
 * Creates a typed MCP prompt port.
 *
 * @param config - Prompt configuration
 * @returns A DirectedPort with the "mcp-prompt" category
 *
 * @example
 * ```typescript
 * interface DebugProductArgs {
 *   readonly productId: string;
 * }
 *
 * const DebugProductPrompt = createMcpPromptPort<DebugProductArgs>({
 *   promptName: "debug-product",
 *   name: "DebugProduct",
 *   description: "Generates a debugging context for a specific product.",
 *   arguments: [
 *     { name: "productId", description: "The product ID to debug", required: true },
 *   ],
 * });
 * ```
 */
function createMcpPromptPort<TArgs>(config: {
  readonly promptName: string;
  readonly name: string;
  readonly description: string;
  readonly arguments: readonly McpPromptArgument[];
  readonly tags?: readonly string[];
}): McpPromptPort<TArgs>;
````

### 6.4 Prompt Messages

The `PromptHandler<TArgs>` returns an array of MCP prompt messages:

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

Prompt handlers can embed resource data directly in the prompt messages, providing rich context to AI tools.

---

## 7. Port Categories

`@hex-di/mcp` defines three port categories that the server uses for automatic capability discovery:

| Category         | Port Type            | Discovery                                |
| ---------------- | -------------------- | ---------------------------------------- |
| `"mcp-resource"` | `McpResourcePort<T>` | Always discovered                        |
| `"mcp-tool"`     | `McpToolPort<I,O>`   | Discovered only when `enableTools: true` |
| `"mcp-prompt"`   | `McpPromptPort<A>`   | Always discovered                        |

### 7.1 Category Constants

```typescript
const MCP_RESOURCE_CATEGORY = "mcp-resource" as const;
const MCP_TOOL_CATEGORY = "mcp-tool" as const;
const MCP_PROMPT_CATEGORY = "mcp-prompt" as const;
```

### 7.2 Relationship to Existing Categories

HexDI already uses port categories for auto-discovery:

- `"library-inspector"` -- Used by the `LibraryInspector` protocol for automatic registration with the container's inspector registry.

The MCP categories follow the same pattern. The `createMcpServer()` factory walks the graph for ports in these categories, just as the container walks the graph for `"library-inspector"` ports to populate the inspector registry.

### 7.3 Category Type Guards

```typescript
function isMcpResourcePort(
  port: DirectedPort<unknown, string, string, string>
): port is McpResourcePort<unknown>;
function isMcpToolPort(
  port: DirectedPort<unknown, string, string, string>
): port is McpToolPort<unknown, unknown>;
function isMcpPromptPort(
  port: DirectedPort<unknown, string, string, string>
): port is McpPromptPort<unknown>;
```

These guards check the port's category field and are used internally by the discovery engine.

---

## 8. URI Scheme

### 8.1 URI Pattern

MCP resources use URI templates to identify data endpoints. `@hex-di/mcp` defines a convention (not a requirement) for URI structure:

```
{scheme}://{namespace}/{resource}
```

- **scheme** -- Protocol identifier. The framework convention is `hexdi://` for HexDI-specific resources. Custom applications should use their own scheme (e.g., `myapp://`, `ecommerce://`).
- **namespace** -- Logical grouping (e.g., `store`, `graph`, `products`).
- **resource** -- Specific data endpoint (e.g., `snapshot`, `topology`, `catalog`).

Examples:

```
hexdi://graph/topology       -- Graph topology (DevTools adapter)
hexdi://runtime/snapshot     -- Container snapshot (DevTools adapter)
hexdi://tracing/recent       -- Recent spans (DevTools adapter)
ecommerce://products/catalog -- Product catalog (custom adapter)
ecommerce://orders/recent    -- Recent orders (custom adapter)
```

### 8.2 Query Parameters

URI templates can include query parameters for filtering:

```
hexdi://tracing/recent?limit=50&port=AuthService
ecommerce://products/catalog?category=electronics&limit=20
```

Query parameters are parsed by the framework and passed to the `ResourceHandler` as a typed params object. The handler interface receives both the parsed URI and the query parameters.

### 8.3 Response Envelope

All resource responses are returned as JSON. The framework does not impose an envelope format -- the response is the raw `TResponse` type defined by the port. Consumers (MCP clients) receive the data as the resource's `contents` field in the MCP response:

```json
{
  "contents": [
    {
      "uri": "ecommerce://products/catalog",
      "mimeType": "application/json",
      "text": "{\"products\":[...],\"total\":42}"
    }
  ]
}
```

The framework handles serialization of the `TResponse` value to JSON text automatically.

### 8.4 URI Validation

The `createMcpResourcePort()` factory validates the URI template at creation time:

1. Must contain a scheme (protocol) followed by `://`.
2. Must contain at least one path segment after the authority.
3. Must not contain fragment identifiers (`#`).
4. Invalid URIs produce a descriptive error at graph build time.

---

_Previous: [01 - Overview & Philosophy](./01-overview.md)_ | _Next: [03 - MCP Adapter Patterns](./03-mcp-adapters.md)_
