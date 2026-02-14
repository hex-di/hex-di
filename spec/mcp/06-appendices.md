# 06 - Appendices

_Previous: [05 - API Reference](./05-api-reference.md)_ | _Next: [07 - Definition of Done](./07-definition-of-done.md)_

---

## Appendix A: Design Decisions

### A1: Why MCP Capabilities as HexDI Ports (Not Just Handler Functions)

**Decision:** MCP resources, tools, and prompts are modeled as typed HexDI ports with category-based auto-discovery, rather than as plain handler functions registered imperatively.

**Alternatives Considered:**

1. **Imperative registration** -- `server.resource("uri", handler)`. Simple, but loses type safety and requires manual registration of every capability.
2. **Configuration object** -- `{ resources: [...], tools: [...] }`. Centralized, but creates a single point of change and loses dependency injection.
3. **Decorator-based** -- `@McpResource("uri")`. Requires reflection, violates HexDI's no-decorator philosophy.

**Rationale:**

- Ports carry type information at compile time. `McpResourcePort<ProductCatalog>` enforces that the adapter returns `ResourceHandler<ProductCatalog>`.
- Ports participate in the graph. Adapters can depend on domain service ports and receive them through dependency injection.
- Port categories enable automatic discovery. Adding an adapter to the graph is sufficient -- no registration code needed.
- Ports compose. Multiple adapter sets can be merged via `graph.merge()`.
- The pattern mirrors the existing `LibraryInspector` protocol, which uses the `"library-inspector"` category for auto-discovery.

### A2: Why Framework-Only (Inspection Adapters in DevTools, Not Here)

**Decision:** `@hex-di/mcp` provides only the port types, adapter contracts, server factory, and transport. It ships zero domain-specific adapters. The 34 resources, 18 tools, and 5 prompts for HexDI inspection live in `@hex-di/devtools`.

**Alternatives Considered:**

1. **Ship inspection adapters in `@hex-di/mcp`** -- Makes `@hex-di/mcp` immediately useful but couples it to `@hex-di/runtime`, `@hex-di/tracing`, and every library package.
2. **Split into `@hex-di/mcp` (framework) + `@hex-di/mcp-inspection` (adapters)** -- Cleaner than option 1 but creates an extra package that conceptually belongs with DevTools.

**Rationale:**

- The framework should have no dependency on `@hex-di/runtime`, `@hex-di/tracing`, or any library package. Its only peers are `@hex-di/core` (for port types) and `@hex-di/graph` (for graph building).
- Inspection adapters are a consumer of the framework, not part of it. The DevTools standalone server uses the MCP framework alongside its WebSocket dashboard. Putting inspection adapters in `@hex-di/devtools` keeps them co-located with the other DevTools infrastructure.
- Any domain (e-commerce, healthcare, DevOps) can use `@hex-di/mcp` to build custom MCP servers without pulling in HexDI inspection dependencies.

### A3: Why Dynamic Discovery vs. Static Registration

**Decision:** The server discovers capabilities by walking the graph for categorized ports at creation time, rather than requiring explicit registration.

**Alternatives Considered:**

1. **Static registration** -- `createMcpServer({ resources: [ProductCatalogResource], tools: [SearchTool] })`. Explicit, but duplicates information already present in the graph.
2. **Annotation-based** -- Use decorators or metadata on adapter factories. Requires runtime reflection.

**Rationale:**

- The graph already contains all the information: which ports exist, what categories they belong to, and what metadata they carry.
- Discovery eliminates registration as a separate step. Adding an adapter to the graph automatically registers the capability.
- This pattern is proven by the `LibraryInspector` protocol, where library inspectors are discovered through the `"library-inspector"` category without explicit registration.

### A4: Why Tools Require Opt-In

**Decision:** Tool ports are only discovered when `enableTools: true` is passed to `createMcpServer()`. Resources and prompts are always discovered.

**Alternatives Considered:**

1. **Always discover all categories** -- Simplest, but risks exposing mutating operations unintentionally.
2. **Per-tool opt-in** -- Each tool port carries an `enabled` flag. More granular but complex.
3. **Separate factory** -- `createReadOnlyMcpServer()` vs `createFullMcpServer()`. Redundant.

**Rationale:**

- Resources are read-only and safe to expose. Tools can have side effects (creating scopes, invalidating caches, resolving ports).
- A single `enableTools` flag provides a clear security boundary at the server level.
- The same graph can be used for both read-only and full-access servers without modification.

### A5: Why `hexdi://` URI Scheme

**Decision:** The framework convention (not requirement) is `hexdi://` for HexDI inspection resources. Custom applications use their own schemes.

**Alternatives Considered:**

1. **No convention** -- Every application chooses its own scheme. Too unstructured for the DevTools ecosystem.
2. **Standard scheme like `app://`** -- Generic but not specific to HexDI.
3. **URL-based like `https://localhost/hexdi/`** -- Misleading, implies HTTP endpoint.

**Rationale:**

- `hexdi://` clearly identifies resources as HexDI-specific when used by DevTools inspection adapters.
- Custom applications are not constrained -- `ecommerce://`, `myapp://`, or any other scheme is valid.
- The URI scheme is metadata on the port, not enforced by the framework. Validation only checks for structural correctness (scheme + path).

### A6: Why stdio as Default Transport

**Decision:** `StdioTransport` is the primary transport, with `SseTransport` as an alternative.

**Rationale:**

- Claude Code, Cline, Continue, and Cursor all spawn MCP servers as child processes and communicate over stdio. This is the most common MCP deployment model.
- SSE is needed for web-based MCP clients but is less common in practice.
- Both transports are first-class. The "default" designation means stdio is the recommended starting point, not that SSE is second-class.

---

## Appendix B: Glossary

### MCP Terms

| Term           | Definition                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| **Resource**   | A read-only data endpoint identified by a URI. Returns structured data when queried.                    |
| **Tool**       | A callable operation that accepts input, performs an action, and returns output. May have side effects. |
| **Prompt**     | A template that generates contextual messages for AI interactions. Accepts arguments.                   |
| **Transport**  | The communication channel between MCP server and client (stdio, SSE, etc.).                             |
| **Server**     | The process that hosts resources, tools, and prompts and responds to MCP client requests.               |
| **Client**     | The AI tool or agent that queries the MCP server (Claude Code, Cursor, etc.).                           |
| **Capability** | A resource, tool, or prompt that the server exposes to clients.                                         |

### HexDI Terms

| Term          | Definition                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| **Port**      | A typed contract declaring a dependency or capability. Identified by name and category.                  |
| **Adapter**   | An implementation of a port. Provides the concrete behavior for the contract.                            |
| **Graph**     | A composed set of adapters and their dependency relationships. Built with `createGraphBuilder()`.        |
| **Category**  | A string tag on a port used for automatic discovery (e.g., `"mcp-resource"`, `"library-inspector"`).     |
| **Container** | The runtime that resolves ports to their adapter implementations. Manages lifetimes and scopes.          |
| **Lifetime**  | How long an adapter instance lives: `singleton` (once), `scoped` (per scope), `transient` (per resolve). |

### Combined Terms (as used in @hex-di/mcp)

| Term                     | Definition                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------- |
| **McpResourcePort**      | A HexDI port with category `"mcp-resource"` that wraps a `ResourceHandler<T>`.          |
| **McpToolPort**          | A HexDI port with category `"mcp-tool"` that wraps a `ToolHandler<I, O>`.               |
| **McpPromptPort**        | A HexDI port with category `"mcp-prompt"` that wraps a `PromptHandler<A>`.              |
| **Capability Discovery** | The process of walking the graph for MCP-categorized ports to populate the server.      |
| **MCP Adapter**          | A standard HexDI adapter that provides an MCP port (resource, tool, or prompt handler). |

---

## Appendix C: Comparison

### vs. Raw `@modelcontextprotocol/sdk`

| Aspect               | Raw SDK                                              | @hex-di/mcp                                                   |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| Registration         | Imperative: `server.resource("uri", handler)`        | Automatic: graph discovery by category                        |
| Type Safety          | JSON Schema for inputs; response types are `unknown` | Typed ports: `McpResourcePort<ProductCatalog>`                |
| Dependency Injection | None -- handler closures capture dependencies        | Full HexDI DI: adapters declare `requires` ports              |
| Composition          | Single server object, manual capability listing      | Graph merging: `graph.merge(productGraph).merge(orderGraph)`  |
| Testing              | Mock transport, manual setup                         | `@hex-di/mcp-testing`: mock dependencies, in-memory transport |
| Discovery            | Manual -- caller lists capabilities                  | Automatic -- graph walk for categorized ports                 |

### vs. Prisma MCP Server

| Aspect        | Prisma MCP                                   | @hex-di/mcp                              |
| ------------- | -------------------------------------------- | ---------------------------------------- |
| Scope         | Database-specific (Prisma schema inspection) | General-purpose framework                |
| Capabilities  | Fixed set (schema resources, query tools)    | User-defined (any domain)                |
| Architecture  | Monolithic server with built-in capabilities | Framework + adapters pattern             |
| Extensibility | Limited to Prisma schema operations          | Extensible via custom ports and adapters |
| Type Safety   | Prisma-generated types                       | User-defined typed ports                 |

### vs. Custom MCP Implementations

| Aspect      | Custom Implementation                                 | @hex-di/mcp                                                   |
| ----------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| Boilerplate | High -- manual server setup, capability registration  | Low -- define ports, write adapters, call `createMcpServer()` |
| Consistency | Varies per implementation                             | Consistent port/adapter pattern                               |
| Testing     | Ad-hoc testing strategies                             | `@hex-di/mcp-testing` with mock client and assertions         |
| Composition | Difficult to merge capabilities from multiple sources | Graph merging is built in                                     |
| Discovery   | Manual capability listing                             | Automatic from graph                                          |

---

## Appendix D: Custom MCP Server Example

This end-to-end example builds an MCP server for a hypothetical **e-commerce product catalog** domain using `@hex-di/mcp`. This demonstrates that the framework is general-purpose and not tied to HexDI inspection.

### D.1 Domain Ports

```typescript
// domain/ports.ts
import { createPort } from "@hex-di/core";

interface Product {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly category: string;
  readonly inStock: boolean;
}

interface ProductRepository {
  findAll(limit?: number): readonly Product[];
  findByCategory(category: string, limit?: number): readonly Product[];
  findById(id: string): Product | undefined;
  search(query: string, limit?: number): readonly Product[];
}

interface OrderService {
  getRecentOrders(limit?: number): Promise<readonly Order[]>;
  getOrdersForProduct(productId: string): Promise<readonly Order[]>;
}

interface Order {
  readonly id: string;
  readonly productId: string;
  readonly quantity: number;
  readonly status: "pending" | "shipped" | "delivered";
  readonly createdAt: number;
}

const ProductRepositoryPort = createPort<ProductRepository>("ProductRepository");
const OrderServicePort = createPort<OrderService>("OrderService");
```

### D.2 MCP Resource Ports

```typescript
// mcp/resource-ports.ts
import { createMcpResourcePort } from "@hex-di/mcp";

interface ProductCatalog {
  readonly products: readonly Product[];
  readonly total: number;
}

interface OrderHistory {
  readonly orders: readonly Order[];
  readonly total: number;
}

const ProductCatalogResource = createMcpResourcePort<ProductCatalog>({
  uri: "ecommerce://products/catalog",
  name: "ProductCatalog",
  description: "Returns the product catalog, optionally filtered by category.",
});

const OrderHistoryResource = createMcpResourcePort<OrderHistory>({
  uri: "ecommerce://orders/recent",
  name: "OrderHistory",
  description: "Returns recent orders, optionally filtered by product.",
});
```

### D.3 MCP Tool Port

```typescript
// mcp/tool-ports.ts
import { createMcpToolPort } from "@hex-di/mcp";

interface SearchInput {
  readonly query: string;
  readonly limit?: number;
}

interface SearchOutput {
  readonly results: readonly {
    readonly id: string;
    readonly name: string;
    readonly score: number;
  }[];
  readonly total: number;
}

const SearchProductsTool = createMcpToolPort<SearchInput, SearchOutput>({
  toolName: "search-products",
  name: "SearchProducts",
  description: "Searches the product catalog by query string.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      limit: { type: "number", description: "Max results", default: 10 },
    },
    required: ["query"],
  },
});
```

### D.4 MCP Prompt Port

```typescript
// mcp/prompt-ports.ts
import { createMcpPromptPort } from "@hex-di/mcp";

interface DebugProductArgs {
  readonly productId: string;
}

const DebugProductPrompt = createMcpPromptPort<DebugProductArgs>({
  promptName: "debug-product",
  name: "DebugProduct",
  description: "Generates debugging context for a specific product with inventory and order data.",
  arguments: [{ name: "productId", description: "The product ID to debug", required: true }],
});
```

### D.5 Adapters

```typescript
// mcp/adapters.ts
import { createAdapter } from "@hex-di/core";

const ProductCatalogAdapter = createAdapter({
  port: ProductCatalogResource,
  requires: [ProductRepositoryPort],
  factory: (repo: ProductRepository): ResourceHandler<ProductCatalog> => ({
    handle: params => {
      const category = params["category"];
      const limit = params["limit"] ? Number(params["limit"]) : undefined;
      const products = category ? repo.findByCategory(category, limit) : repo.findAll(limit);
      return { products, total: products.length };
    },
  }),
});

const OrderHistoryAdapter = createAdapter({
  port: OrderHistoryResource,
  requires: [OrderServicePort],
  factory: (orderService: OrderService): ResourceHandler<OrderHistory> => ({
    handle: async params => {
      const productId = params["productId"];
      const limit = params["limit"] ? Number(params["limit"]) : 50;
      const orders = productId
        ? await orderService.getOrdersForProduct(productId)
        : await orderService.getRecentOrders(limit);
      return { orders, total: orders.length };
    },
  }),
});

const SearchProductsAdapter = createAdapter({
  port: SearchProductsTool,
  requires: [ProductRepositoryPort],
  factory: (repo: ProductRepository): ToolHandler<SearchInput, SearchOutput> => ({
    execute: input => {
      const results = repo.search(input.query, input.limit ?? 10).map((p, i) => ({
        id: p.id,
        name: p.name,
        score: 1 - i * 0.1, // Simple relevance scoring
      }));
      return { results, total: results.length };
    },
  }),
});

const DebugProductAdapter = createAdapter({
  port: DebugProductPrompt,
  requires: [ProductRepositoryPort, OrderServicePort],
  factory: (
    repo: ProductRepository,
    orderService: OrderService
  ): PromptHandler<DebugProductArgs> => ({
    generate: async args => {
      const product = repo.findById(args.productId);
      const orders = await orderService.getOrdersForProduct(args.productId);

      if (!product) {
        return [
          {
            role: "user",
            content: {
              type: "text",
              text: `Product ${args.productId} not found. Check if the ID is correct.`,
            },
          },
        ];
      }

      return [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Debug product: ${product.name} (${product.id})`,
              "",
              "Product Details:",
              `  Price: $${product.price}`,
              `  Category: ${product.category}`,
              `  In Stock: ${product.inStock}`,
              "",
              `Order History (${orders.length} orders):`,
              ...orders.map(o => `  - ${o.id}: ${o.quantity} units, status=${o.status}`),
              "",
              "Analyze this product's status and suggest actions.",
            ].join("\n"),
          },
        },
      ];
    },
  }),
});
```

### D.6 Server Composition

```typescript
// server.ts
import { createGraphBuilder } from "@hex-di/graph";
import { createMcpServer, createStdioTransport } from "@hex-di/mcp";

// Domain adapters (implementations of ProductRepository and OrderService)
import { PostgresProductRepoAdapter } from "./infra/product-repo.js";
import { HttpOrderServiceAdapter } from "./infra/order-service.js";

// MCP adapters
import {
  ProductCatalogAdapter,
  OrderHistoryAdapter,
  SearchProductsAdapter,
  DebugProductAdapter,
} from "./mcp/adapters.js";

// Build the graph
const graph = createGraphBuilder()
  // Domain infrastructure
  .provide(PostgresProductRepoAdapter)
  .provide(HttpOrderServiceAdapter)
  // MCP capabilities
  .provide(ProductCatalogAdapter) // Resource: ecommerce://products/catalog
  .provide(OrderHistoryAdapter) // Resource: ecommerce://orders/recent
  .provide(SearchProductsAdapter) // Tool: search-products
  .provide(DebugProductAdapter) // Prompt: debug-product
  .build();

// Create and start the server
const server = createMcpServer(graph, {
  name: "E-Commerce MCP Server",
  version: "1.0.0",
  enableTools: true,
  transport: createStdioTransport(),
});

await server.start();

// The server now exposes:
// - 2 resources: ecommerce://products/catalog, ecommerce://orders/recent
// - 1 tool: search-products
// - 1 prompt: debug-product
//
// AI tools (Claude Code, Cursor, etc.) can:
// - Query the product catalog
// - Search for products
// - Get debugging context for specific products
```

### D.7 Claude Code Configuration

To use this server with Claude Code, add it to the MCP settings:

```json
{
  "mcpServers": {
    "ecommerce": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "DATABASE_URL": "postgres://localhost:5432/ecommerce"
      }
    }
  }
}
```

Claude Code can then query the product catalog, search for products, and get debugging context -- all through the MCP protocol, with data sourced from the application's own domain services via HexDI dependency injection.

---

_Previous: [05 - API Reference](./05-api-reference.md)_ | _Next: [07 - Definition of Done](./07-definition-of-done.md)_
