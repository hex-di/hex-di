# 03 - MCP Adapter Patterns

_Previous: [02 - MCP Port Types](./02-mcp-ports.md)_ | _Next: [04 - MCP Server](./04-server.md)_

---

## 9. Resource Adapters

A resource adapter provides a `McpResourcePort<TResponse>` by implementing a `ResourceHandler<TResponse>`. The adapter is a standard HexDI adapter -- it can depend on other ports and receives them through dependency injection.

### 9.1 ResourceHandler Interface

```typescript
interface ResourceHandler<TResponse> {
  /**
   * Handles a resource query and returns the response data.
   *
   * @param params - Parsed query parameters from the resource URI
   * @returns The response data matching TResponse
   */
  handle(params: Readonly<Record<string, string>>): TResponse | Promise<TResponse>;
}
```

The `params` argument contains query parameters parsed from the URI (e.g., `?limit=50` becomes `{ limit: "50" }`). All parameter values are strings -- the handler is responsible for parsing numbers, booleans, etc.

### 9.2 Adapter Pattern

```typescript
import { createAdapter } from "@hex-di/core";
import { createMcpResourcePort } from "@hex-di/mcp";

// 1. Define the response type
interface ProductCatalog {
  readonly products: readonly {
    readonly id: string;
    readonly name: string;
    readonly price: number;
  }[];
  readonly total: number;
}

// 2. Create the resource port
const ProductCatalogResource = createMcpResourcePort<ProductCatalog>({
  uri: "ecommerce://products/catalog",
  name: "ProductCatalog",
  description: "Returns the product catalog, optionally filtered by category.",
});

// 3. Define a domain dependency
const ProductRepositoryPort = createPort<ProductRepository>("ProductRepository");

// 4. Write the adapter
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
```

### 9.3 Reference Pattern

This adapter pattern follows the same structure as `createStoreMcpResourceHandler()` in `libs/store/core/src/integration/mcp-resources.ts`. That module defines:

- A `StoreMcpResourceMap` mapping URI strings to response types.
- A `StoreMcpResourceHandler` with methods like `resolveSnapshot()`, `resolvePorts()`.
- A factory `createStoreMcpResourceHandler(inspector)` that receives the domain dependency and returns the handler.

The `@hex-di/mcp` framework generalizes this pattern: instead of hand-written handler objects, the framework uses typed ports and adapters with automatic discovery.

### 9.4 Async Handlers

Resource handlers can return promises for async data fetching:

```typescript
const OrderHistoryAdapter = createAdapter({
  port: OrderHistoryResource,
  requires: [OrderServicePort],
  factory: (orderService: OrderService): ResourceHandler<OrderHistory> => ({
    handle: async params => {
      const limit = params["limit"] ? Number(params["limit"]) : 100;
      const orders = await orderService.getRecentOrders(limit);
      return { orders, total: orders.length };
    },
  }),
});
```

---

## 10. Tool Adapters

A tool adapter provides a `McpToolPort<TInput, TOutput>` by implementing a `ToolHandler<TInput, TOutput>`. Tools perform operations that may have side effects.

### 10.1 ToolHandler Interface

```typescript
interface ToolHandler<TInput, TOutput> {
  /**
   * Executes the tool with the given input.
   *
   * @param input - Validated input matching the tool's input schema
   * @returns The execution result
   */
  execute(input: TInput): TOutput | Promise<TOutput>;
}
```

The `input` argument is already validated against the tool's JSON Schema by the MCP SDK before the handler is called. The handler can assume the input conforms to `TInput`.

### 10.2 Adapter Pattern

```typescript
import { createAdapter } from "@hex-di/core";
import { createMcpToolPort } from "@hex-di/mcp";

// 1. Define input/output types
interface AddToCartInput {
  readonly productId: string;
  readonly quantity: number;
}

interface AddToCartOutput {
  readonly success: boolean;
  readonly cartId: string;
  readonly itemCount: number;
}

// 2. Create the tool port
const AddToCartTool = createMcpToolPort<AddToCartInput, AddToCartOutput>({
  toolName: "add-to-cart",
  name: "AddToCart",
  description: "Adds a product to the shopping cart.",
  inputSchema: {
    type: "object",
    properties: {
      productId: { type: "string", description: "Product ID to add" },
      quantity: { type: "number", description: "Quantity to add", minimum: 1 },
    },
    required: ["productId", "quantity"],
  },
});

// 3. Write the adapter
const AddToCartAdapter = createAdapter({
  port: AddToCartTool,
  requires: [CartServicePort],
  factory: (cartService: CartService): ToolHandler<AddToCartInput, AddToCartOutput> => ({
    execute: async input => {
      const result = await cartService.addItem(input.productId, input.quantity);
      return {
        success: result.isOk(),
        cartId: result.isOk() ? result.value.cartId : "",
        itemCount: result.isOk() ? result.value.itemCount : 0,
      };
    },
  }),
});
```

### 10.3 Opt-In Enforcement

Tool adapters are registered in the graph like any other adapter, but the `createMcpServer()` factory only discovers them when `enableTools: true` is passed. This is enforced at the server level, not the adapter level:

```typescript
// This graph contains tool adapters, but they are NOT exposed:
const server = createMcpServer(graph); // Resources + prompts only

// This graph contains tool adapters, and they ARE exposed:
const server = createMcpServer(graph, { enableTools: true });
```

This design means the same graph can be used for both read-only and full-access servers. The decision of which tools to expose is made at server creation time, not graph composition time.

### 10.4 Error Handling

Tool handlers that encounter errors should throw or return error results. The framework catches handler exceptions and converts them to MCP error responses:

- Thrown errors become MCP `InternalError` responses with the error message.
- Handlers can also return structured error data as part of `TOutput` (e.g., a `success: false` field).

---

## 11. Prompt Adapters

A prompt adapter provides a `McpPromptPort<TArgs>` by implementing a `PromptHandler<TArgs>`. The handler receives arguments and injected dependencies, then returns a list of prompt messages that provide contextual information to AI tools.

### 11.1 PromptHandler Interface

```typescript
interface PromptHandler<TArgs> {
  /**
   * Generates prompt messages from the given arguments.
   *
   * @param args - Arguments matching the prompt's argument schema
   * @returns Array of prompt messages
   */
  generate(args: TArgs): readonly McpPromptMessage[] | Promise<readonly McpPromptMessage[]>;
}
```

### 11.2 Adapter Pattern

```typescript
import { createAdapter } from "@hex-di/core";
import { createMcpPromptPort } from "@hex-di/mcp";

// 1. Define argument type
interface DebugProductArgs {
  readonly productId: string;
}

// 2. Create the prompt port
const DebugProductPrompt = createMcpPromptPort<DebugProductArgs>({
  promptName: "debug-product",
  name: "DebugProduct",
  description: "Generates debugging context for a specific product.",
  arguments: [{ name: "productId", description: "The product ID to debug", required: true }],
});

// 3. Write the adapter
const DebugProductAdapter = createAdapter({
  port: DebugProductPrompt,
  requires: [ProductRepositoryPort, OrderServicePort],
  factory: (
    productRepo: ProductRepository,
    orderService: OrderService
  ): PromptHandler<DebugProductArgs> => ({
    generate: async args => {
      const product = await productRepo.findById(args.productId);
      const recentOrders = await orderService.getOrdersForProduct(args.productId);

      return [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `You are debugging product: ${product.name} (ID: ${args.productId})`,
              "",
              "Product Details:",
              `- Name: ${product.name}`,
              `- Price: $${product.price}`,
              `- Category: ${product.category}`,
              `- In Stock: ${product.inStock}`,
              "",
              `Recent Orders (${recentOrders.length}):`,
              ...recentOrders.map(o => `- Order ${o.id}: ${o.quantity} units, ${o.status}`),
              "",
              "Please analyze this product and suggest debugging steps.",
            ].join("\n"),
          },
        },
      ];
    },
  }),
});
```

### 11.3 Embedding Resource Data

Prompt handlers can embed MCP resource data directly in the prompt messages:

```typescript
generate: async args => {
  const catalog = await productRepo.getCatalog();
  return [
    {
      role: "user",
      content: {
        type: "resource",
        resource: {
          uri: "ecommerce://products/catalog",
          text: JSON.stringify(catalog),
          mimeType: "application/json",
        },
      },
    },
    {
      role: "user",
      content: {
        type: "text",
        text: `Given the product catalog above, find product ${args.productId} and explain its pricing.`,
      },
    },
  ];
};
```

This pattern allows prompts to provide structured data alongside natural language instructions, giving AI tools rich context for their responses.

---

## 12. Adapter Composition

MCP adapters are standard HexDI adapters and compose like any other adapter in a graph. This section describes patterns for composing MCP adapter sets.

### 12.1 Single-Domain Graph

The simplest case is a single application building an MCP server from its own domain:

```typescript
import { createGraphBuilder } from "@hex-di/graph";

const graph = createGraphBuilder()
  .provide(ProductRepositoryAdapter)
  .provide(OrderServiceAdapter)
  .provide(ProductCatalogAdapter) // McpResourcePort
  .provide(OrderHistoryAdapter) // McpResourcePort
  .provide(SearchProductsAdapter) // McpToolPort
  .provide(DebugProductAdapter) // McpPromptPort
  .build();

const server = createMcpServer(graph, { enableTools: true });
```

### 12.2 Multi-Domain Merging

Multiple adapter sets from different domains can be merged into a single graph:

```typescript
// Products team provides their MCP adapters
const productGraph = createGraphBuilder()
  .provide(ProductCatalogAdapter)
  .provide(SearchProductsAdapter)
  .build();

// Orders team provides their MCP adapters
const orderGraph = createGraphBuilder()
  .provide(OrderHistoryAdapter)
  .provide(CancelOrderAdapter)
  .build();

// Compose into a single MCP server
const fullGraph = createGraphBuilder()
  .merge(productGraph)
  .merge(orderGraph)
  .provide(SharedDependencyAdapter) // Shared across both domains
  .build();

const server = createMcpServer(fullGraph, { enableTools: true });
```

### 12.3 Resource Adapters Depending on Domain Ports

MCP adapters typically depend on domain service ports, not on concrete implementations. This keeps the MCP layer thin and testable:

```
+---------------------+
| McpResourceAdapter  |
| (MCP layer)         |
+----------+----------+
           |
           | depends on (port)
           v
+---------------------+
| ProductRepository   |
| (domain port)       |
+----------+----------+
           |
           | provided by (adapter)
           v
+---------------------+
| PostgresProductRepo  |
| (infrastructure)    |
+---------------------+
```

The MCP adapter declares a dependency on `ProductRepositoryPort`. The graph provides the concrete implementation. In tests, a mock repository can be provided instead.

### 12.4 DevTools Example

The DevTools standalone server (`@hex-di/devtools`) composes its MCP server by merging inspection adapter graphs:

```
// Conceptual composition (implemented in @hex-di/devtools, not @hex-di/mcp)
const inspectionGraph = createGraphBuilder()
  .merge(graphMcpAdapters)        // hexdi://graph/* resources
  .merge(runtimeMcpAdapters)      // hexdi://runtime/* resources
  .merge(tracingMcpAdapters)      // hexdi://tracing/* resources
  .merge(libraryMcpAdapters)      // hexdi://flow/*, hexdi://store/*, etc.
  .merge(inspectionToolAdapters)  // resolve, inspect, createScope tools
  .merge(debugPromptAdapters)     // debug-service, analyze-error prompts
  .build();

const mcpServer = createMcpServer(inspectionGraph, { enableTools: true });
```

Each adapter set is independent and can be tested in isolation. The DevTools server merges them all and passes the combined graph to `createMcpServer()`.

### 12.5 Testing MCP Adapters

MCP adapters are tested like any HexDI adapter -- by providing mock dependencies:

```typescript
import { createGraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { InMemoryTransport, MockMcpClient } from "@hex-di/mcp-testing";

// Build graph with mock dependencies
const testGraph = createGraphBuilder()
  .provide(createMockAdapter(ProductRepositoryPort, mockProductRepo))
  .provide(ProductCatalogAdapter)
  .build();

// Create server with in-memory transport
const server = createMcpServer(testGraph, {
  transport: new InMemoryTransport(),
});

// Use mock client to query
const client = new MockMcpClient(server);
const result = await client.readResource("ecommerce://products/catalog");
expect(result.products).toHaveLength(3);
```

---

_Previous: [02 - MCP Port Types](./02-mcp-ports.md)_ | _Next: [04 - MCP Server](./04-server.md)_
