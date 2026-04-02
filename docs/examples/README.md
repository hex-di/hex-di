---
title: Examples
description: Real-world code examples for HexDI — basic setup, scoped services, testing patterns, and framework integration.
sidebar_position: 5
---

# Examples

Real-world examples and code references for HexDI.

## React Showcase

A complete example application in the repository demonstrating all three lifetime scopes, React integration with typed hooks, and automatic scope lifecycle management.

```bash
cd examples/react-showcase
pnpm install
pnpm dev
```

### Key files

| File                 | Description             |
| -------------------- | ----------------------- |
| `src/di/ports.ts`    | Port definitions        |
| `src/di/adapters.ts` | Adapter implementations |
| `src/di/graph.ts`    | Graph composition       |
| `src/di/hooks.ts`    | Typed React hooks       |
| `src/App.tsx`        | Main application        |

---

## Hono Todo API

A REST API example with per-request DI scopes, bearer auth, distributed tracing, and auto-generated OpenAPI documentation.

```bash
cd examples/hono-todo
pnpm install
pnpm dev          # starts on http://localhost:3000
```

### API endpoints

| Endpoint                   | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `GET /openapi`             | OpenAPI 3.1.0 JSON spec (generated from Zod schemas) |
| `GET /reference`           | Interactive API explorer (Scalar UI, Saturn theme)   |
| `GET /me`                  | Current authenticated user                           |
| `GET /todos`               | List todos for authenticated user                    |
| `POST /todos`              | Create a todo                                        |
| `PATCH /todos/{id}/toggle` | Toggle todo completion                               |

All endpoints except `/openapi` and `/reference` require `Authorization: Bearer <token>`.

**Auth tokens**: `Bearer user-token` (regular user), `Bearer admin-token` (admin).

### Key patterns

| Pattern             | Implementation                                                           |
| ------------------- | ------------------------------------------------------------------------ |
| OpenAPI from Zod    | `@hono/zod-openapi` — schemas defined once, used for validation and docs |
| Per-request scopes  | `createScopeMiddleware(container)` from `@hex-di/hono`                   |
| Port resolution     | `resolvePort(c, TodoServicePort)` in route handlers                      |
| Distributed tracing | `tracingMiddleware()` with W3C Trace Context                             |

See the [full example README](https://github.com/leaderiop/hex-di/blob/main/examples/hono-todo/README.md) for curl examples and DDD layer mapping.

---

## Observability Baseline

Each example demonstrates different observability features from the HexDI ecosystem:

| Feature                 | hono-todo                       | pokenerve/api                   | react-showcase               |
| ----------------------- | ------------------------------- | ------------------------------- | ---------------------------- |
| **Logger**              | `@hex-di/logger` (console JSON) | `@hex-di/logger` + Pino handler | Local `LoggerPort` (console) |
| **Health endpoint**     | `GET /health`                   | `GET /api/health`               | N/A (SPA)                    |
| **Distributed tracing** | Console middleware              | Jaeger export + W3C propagation | Console + DI instrumentation |
| **Error tracking**      | No-op adapter                   | Sentry (optional via DSN)       | None                         |
| **Diagnostics**         | `createDiagnosticRoutes()`      | `createDiagnosticRoutes()`      | None                         |
| **Request ID**          | `x-request-id` header           | W3C trace context               | N/A                          |

**Minimum baseline for new server examples:** wire a `LoggerPort` adapter (even console-based), add a `GET /health` endpoint, and optionally mount `createDiagnosticRoutes()` from `@hex-di/hono`.

---

## Code Snippets

### Basic Setup

```typescript
// ports.ts
import { port } from "@hex-di/core";

interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

interface Config {
  apiUrl: string;
  debug: boolean;
}

export const LoggerPort = port<Logger>()({ name: "Logger" });
export const ConfigPort = port<Config>()({ name: "Config" });

export type AppPorts = typeof LoggerPort | typeof ConfigPort;
```

```typescript
// adapters.ts
import { createAdapter } from "@hex-di/core";
import { LoggerPort, ConfigPort } from "./ports";

export const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: msg => console.log(`[INFO] ${msg}`),
    warn: msg => console.warn(`[WARN] ${msg}`),
    error: msg => console.error(`[ERROR] ${msg}`),
  }),
});

export const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    apiUrl: process.env.API_URL ?? "http://localhost:3000",
    debug: process.env.NODE_ENV !== "production",
  }),
});
```

```typescript
// graph.ts
import { GraphBuilder } from "@hex-di/graph";
import { LoggerAdapter, ConfigAdapter } from "./adapters";

export const appGraph = GraphBuilder.create().provide(LoggerAdapter).provide(ConfigAdapter).build();
```

```typescript
// main.ts
import { createContainer } from "@hex-di/runtime";
import { appGraph } from "./graph";
import { LoggerPort, ConfigPort } from "./ports";

const container = createContainer({ graph: appGraph, name: "App" });

const loggerResult = container.tryResolve(LoggerPort);
const configResult = container.tryResolve(ConfigPort);

if (loggerResult.isOk() && configResult.isOk()) {
  loggerResult.value.log(`API URL: ${configResult.value.apiUrl}`);
}
```

---

### Scoped User Session

```typescript
// ports.ts
export const UserSessionPort = port<UserSession>()({ name: 'UserSession' });
export const ChatServicePort = port<ChatService>()({ name: 'ChatService' });

// adapters.ts
let currentUserId = 'guest';

export function setCurrentUser(userId: string) {
  currentUserId = userId;
}

export const UserSessionAdapter = createAdapter({
  provides: UserSessionPort,
  requires: [],
  lifetime: 'scoped',
  factory: () => ({
    userId: currentUserId,
    startedAt: new Date()
  })
});

export const ChatServiceAdapter = createAdapter({
  provides: ChatServicePort,
  requires: [LoggerPort, UserSessionPort],
  lifetime: 'scoped',
  factory: (deps) => ({
    sendMessage: (content: string) => {
      deps.Logger.log(`${deps.UserSession.userId}: ${content}`);
    }
  })
});

// Usage with React
function ChatRoom() {
  return (
    <AutoScopeProvider key={currentUserId}>
      <ChatInterface />
    </AutoScopeProvider>
  );
}
```

---

### Mock Adapter Testing

```typescript
// tests/chat-service.test.ts
import { describe, it, expect, vi } from "vitest";
import { createAdapterTest, createMockAdapter, TestGraphBuilder } from "@hex-di/testing";
import { createContainer } from "@hex-di/runtime";

describe("ChatService", () => {
  it("sends message with user info", () => {
    const mockLogger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const mockSession = { userId: "test-user", startedAt: new Date() };

    const harness = createAdapterTest(ChatServiceAdapter, {
      Logger: mockLogger,
      UserSession: mockSession,
    });

    const chat = harness.invoke();
    chat.sendMessage("Hello!");

    expect(mockLogger.log).toHaveBeenCalledWith("test-user: Hello!");
  });

  it("integrates with overridden logger", () => {
    const mockLogger = createMockAdapter(LoggerPort, {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    });

    const testGraph = TestGraphBuilder.from(appGraph).override(mockLogger).build();
    const container = createContainer({ graph: testGraph, name: "Test" });
    const scope = container.createScope();

    const chat = scope.resolve(ChatServicePort);
    chat.sendMessage("Test message");

    // assertions...
  });
});
```

---

### Express.js Integration

```typescript
// server.ts
import express from "express";
import { createContainer } from "@hex-di/runtime";
import { appGraph } from "./di/graph";
import { UserServicePort, RequestContextPort } from "./di/ports";

const container = createContainer({ graph: appGraph, name: "App" });
const app = express();

// One scope per request
app.use((req, res, next) => {
  const scope = container.createScope();
  req.scope = scope;

  scope.tryResolve(RequestContextPort).match(
    context => {
      context.requestId = (req.headers["x-request-id"] as string) ?? crypto.randomUUID();
      context.userId = req.user?.id;
    },
    error => {
      console.error("Failed to resolve RequestContext:", error);
    }
  );

  res.on("finish", () => {
    void scope.tryDispose();
  });
  next();
});

app.get("/users/:id", async (req, res) => {
  const userServiceResult = req.scope.tryResolve(UserServicePort);
  if (userServiceResult.isErr()) {
    res.status(500).json({ error: "Service unavailable" });
    return;
  }
  const user = await userServiceResult.value.getUser(req.params.id);
  res.json(user);
});

process.on("SIGTERM", async () => {
  server.close();
  await container.tryDispose();
  process.exit(0);
});
```

---

### Environment-Specific Configuration

```typescript
// adapters/logger.ts
export const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: msg => console.log(msg),
    warn: msg => console.warn(msg),
    error: msg => console.error(msg),
  }),
});

export const CloudLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [ConfigPort],
  lifetime: "singleton",
  factory: deps =>
    new CloudWatchLogger({
      region: deps.Config.awsRegion,
      logGroup: deps.Config.logGroup,
    }),
});

// graph.ts
const baseBuilder = GraphBuilder.create()
  .provide(ConfigAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter);

// Same base graph, different implementations per environment
export const devGraph = baseBuilder
  .provide(ConsoleLoggerAdapter)
  .provide(InMemoryCacheAdapter)
  .build();
export const prodGraph = baseBuilder.provide(CloudLoggerAdapter).provide(RedisCacheAdapter).build();

export const appGraph = process.env.NODE_ENV === "production" ? prodGraph : devGraph;
```

---

## Learning Resources

### Recommended reading order

1. **[Core Concepts](../getting-started/core-concepts.md)** — Understand the fundamentals
2. **[First Application](../getting-started/first-application.md)** — Build step by step
3. **[Lifetimes](../getting-started/lifetimes.md)** — Master service scopes
4. **[React Integration](../guides/react-integration.md)** — Add React hooks
5. **[Testing Strategies](../guides/testing-strategies.md)** — Write effective tests

### Quick reference

| Task               | Documentation                                    |
| ------------------ | ------------------------------------------------ |
| Create a port      | [Core API](../api/core.md)                       |
| Create an adapter  | [Graph API](../api/graph.md)                     |
| Build a graph      | [Graph API](../api/graph.md)                     |
| Create a container | [Runtime API](../api/runtime.md)                 |
| Use in React       | [React Guide](../guides/react-integration.md)    |
| Write tests        | [Testing Guide](../guides/testing-strategies.md) |

---

Have you built something with HexDI? [Open an issue](https://github.com/hex-di/hex-di/issues) to share your example!
