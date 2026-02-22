# @hex-di/hono

Hono integration for HexDI - per-request scopes, typed helpers, distributed tracing middleware, and context utilities.

## Features

- **Per-request scopes** - Automatic scope creation/disposal via `createScopeMiddleware`
- **Distributed tracing** - W3C Trace Context propagation via `tracingMiddleware`
- **Typed helpers** - Type-safe port resolution from Hono context
- **Context utilities** - Access containers and scopes from handlers
- **Type-safe** - Full TypeScript inference, no type casts

## Installation

```bash
pnpm add @hex-di/hono hono
```

## Quick Start

```typescript
import { Hono } from "hono";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { createScopeMiddleware, resolvePort } from "@hex-di/hono";
import { LoggerPort } from "./ports.js";

const app = new Hono();
const graph = GraphBuilder.create().provide(/* adapters */).build();
const container = createContainer({ graph, name: "App" });

// Add per-request scope middleware
app.use("*", createScopeMiddleware(container));

app.get("/hello", c => {
  const logger = resolvePort(c, LoggerPort);
  logger.info("Request received");
  return c.text("Hello!");
});
```

## Per-Request Scopes

The `createScopeMiddleware` creates a fresh DI scope for each request, automatically disposing it after the response:

```typescript
import { createScopeMiddleware } from "@hex-di/hono";
import type { HexHonoEnv } from "@hex-di/hono";

type Env = HexHonoEnv<AppPorts>;

const app = new Hono<Env>();

app.use("*", createScopeMiddleware(container));

app.get("/users/:id", c => {
  // Scope is available in context
  const scope = c.get("hexScope");

  // Resolve ports directly
  const userService = resolvePort(c, UserServicePort);
  const user = userService.getById(c.req.param("id"));

  return c.json({ user });
});
```

## Distributed Tracing Middleware

The `tracingMiddleware` integrates distributed tracing with W3C Trace Context propagation:

### Basic Setup

```typescript
import { Hono } from "hono";
import { tracingMiddleware } from "@hex-di/hono";
import { createConsoleTracer } from "@hex-di/tracing";

const app = new Hono();
const tracer = createConsoleTracer();

// Add tracing middleware
app.use("*", tracingMiddleware({ tracer }));

app.get("/api/users", async c => {
  // Trace context is automatically extracted from incoming traceparent header
  // A root server span is created for this request
  // Response includes traceparent header for downstream services
  return c.json({ users: [] });
});
```

### TracingMiddlewareOptions

All configuration options for tracing behavior:

```typescript
interface TracingMiddlewareOptions {
  // Required: Tracer instance (Memory, Console, NoOp, or custom)
  readonly tracer: Tracer;

  // Optional: Custom span name generator
  // Default: "${method} ${path}" (e.g., "GET /api/users")
  readonly spanName?: (context: Context) => string;

  // Optional: Extract trace context from request headers
  // Default: true
  readonly extractContext?: boolean;

  // Optional: Inject trace context into response headers
  // Default: true
  readonly injectContext?: boolean;

  // Optional: Custom attributes for span metadata
  readonly attributes?: (context: Context) => Attributes;
}
```

### W3C Trace Context Propagation

The middleware automatically handles W3C Trace Context headers:

**Incoming requests:**

- Extracts `traceparent` header (e.g., `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`)
- Records trace ID, span ID, and flags as span attributes
- Creates root server span for the request

**Outgoing responses:**

- Injects `traceparent` header with current span context
- Enables distributed tracing across service boundaries

**Example with W3C Trace Context:**

```typescript
// Client sends request with traceparent header
const response = await fetch("http://api.example.com/users", {
  headers: {
    traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  },
});

// Server middleware:
// 1. Extracts traceparent from incoming request
// 2. Creates server span with extracted trace ID
// 3. Injects new traceparent into response
const traceparentResponse = response.headers.get("traceparent");
// '00-4bf92f3577b34da6a3ce929d0e0e4736-<new-span-id>-01'
```

### Custom Span Name

Provide a custom span name function for different naming conventions:

```typescript
app.use(
  "*",
  tracingMiddleware({
    tracer,
    spanName: c => {
      // Use route pattern instead of actual path
      return `${c.req.method} ${c.req.routePath || c.req.path}`;
    },
  })
);

// Span name: "GET /users/:id" instead of "GET /users/123"
```

### Custom Attributes

Add request-specific metadata to spans:

```typescript
app.use(
  "*",
  tracingMiddleware({
    tracer,
    attributes: c => ({
      "user.id": c.get("userId"),
      "tenant.id": c.get("tenantId"),
      "request.id": c.req.header("x-request-id"),
    }),
  })
);
```

### Complete Example

Full setup with custom options:

```typescript
import { Hono } from "hono";
import { tracingMiddleware } from "@hex-di/hono";
import { createConsoleTracer } from "@hex-di/tracing";

const app = new Hono();
const tracer = createConsoleTracer({ colorize: true });

app.use(
  "*",
  tracingMiddleware({
    tracer,
    spanName: c => `${c.req.method} ${c.req.routePath || c.req.path}`,
    extractContext: true, // Extract traceparent from requests
    injectContext: true, // Inject traceparent into responses
    attributes: c => ({
      "http.user_agent": c.req.header("user-agent") ?? "unknown",
      "http.client_ip": c.req.header("x-forwarded-for") ?? "unknown",
    }),
  })
);

app.get("/api/users/:id", async c => {
  // Span automatically created with:
  // - Name: "GET /api/users/:id"
  // - Attributes: http.method, http.url, http.user_agent, etc.
  // - Parent context from traceparent header (if present)

  const userId = c.req.param("id");
  return c.json({ id: userId, name: "Alice" });
});

app.notFound(c => {
  // 404 responses also traced
  return c.json({ error: "Not found" }, 404);
});

app.onError((err, c) => {
  // Errors automatically recorded to span with error status
  return c.json({ error: err.message }, 500);
});
```

### Automatic Error Handling

The middleware automatically handles errors:

- **5xx responses** - Sets span status to `error`
- **Exceptions** - Records exception details via `span.recordException()`
- **Always ends span** - Uses try/catch/finally to ensure proper cleanup

### Integration with Existing Middleware

Combine with `createScopeMiddleware` for DI + tracing:

```typescript
import { createScopeMiddleware, tracingMiddleware, resolvePort } from "@hex-di/hono";
import { createContainer } from "@hex-di/runtime";
import { TracerPort } from "@hex-di/tracing";

const graph = GraphBuilder.create().provide(/* adapters */).build();
const container = createContainer({ graph, name: "App" });

const app = new Hono();

// 1. Add per-request scope
app.use("*", createScopeMiddleware(container));

// 2. Add tracing (resolve tracer from container)
app.use("*", (c, next) => {
  const tracer = resolvePort(c, TracerPort);
  return tracingMiddleware({ tracer })(c, next);
});

// 3. Your routes
app.get("/api/data", c => {
  // Has both DI scope and distributed tracing
  return c.json({ data: [] });
});
```

## Helpers

Type-safe port resolution from Hono context:

```typescript
import { resolvePort, resolvePortAsync } from "@hex-di/hono";

// Synchronous resolution
const logger = resolvePort(c, LoggerPort);

// Async resolution (for lazy/async services)
const db = await resolvePortAsync(c, DatabasePort);
```

Direct container/scope access:

```typescript
import { getScope, getContainer } from "@hex-di/hono";

const scope = getScope(c); // Get current request scope
const container = getContainer(c); // Get root container
```

## Type Safety

Use `HexHonoEnv` to type your Hono application:

```typescript
import type { HexHonoEnv } from "@hex-di/hono";
import type { LoggerPort, UserServicePort } from "./ports.js";

type AppPorts = typeof LoggerPort | typeof UserServicePort;
type Env = HexHonoEnv<AppPorts>;

const app = new Hono<Env>();

app.get("/users", c => {
  // Fully typed context with HexDI scope
  const userService = resolvePort(c, UserServicePort);
  return c.json({ users: userService.list() });
});
```

## Error Handling

The package includes specific errors for better debugging:

```typescript
import { MissingScopeError, MissingContainerError } from "@hex-di/hono";

try {
  const scope = getScope(c);
} catch (error) {
  if (error instanceof MissingScopeError) {
    // Forgot to add createScopeMiddleware
  }
}
```

## License

MIT
