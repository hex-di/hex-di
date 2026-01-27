# Runtime Integration Guide

> **Connecting @hex-di/graph to the Runtime Container**

This guide explains how to integrate the compile-time validated graph with the runtime DI container from `@hex-di/runtime`.

## Table of Contents

1. [Overview](#overview)
2. [End-to-End Example](#end-to-end-example)
3. [Testing Patterns with Overrides](#testing-patterns-with-overrides)
4. [Async Initialization](#async-initialization)
5. [Child Containers and Scoping](#child-containers-and-scoping)
6. [Disposal and Cleanup](#disposal-and-cleanup)
7. [Best Practices](#best-practices)

---

## Overview

The `@hex-di/graph` package provides **compile-time validation** while `@hex-di/runtime` provides **runtime resolution**:

```
┌─────────────────────────────────────────────────────────────┐
│ @hex-di/graph (Compile Time)                                │
│                                                             │
│  GraphBuilder.create()                                      │
│    .provide(LoggerAdapter)                                  │
│    .provide(DatabaseAdapter)    →  Compile-time validation  │
│    .provide(UserServiceAdapter)                             │
│    .build()                     →  Graph object             │
└────────────────────────────────────┬────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────┐
│ @hex-di/runtime (Runtime)                                   │
│                                                             │
│  Container.from(graph)          →  Creates container        │
│    .resolve(UserServicePort)    →  Resolves service         │
└─────────────────────────────────────────────────────────────┘
```

---

## End-to-End Example

### Step 1: Define Ports

```typescript
// ports.ts
import { createPort } from "@hex-di/ports";

export interface Logger {
  log(message: string): void;
  error(message: string): void;
}

export interface Database {
  query<T>(sql: string): Promise<T>;
  close(): Promise<void>;
}

export interface UserService {
  getUser(id: string): Promise<User>;
  createUser(data: UserData): Promise<User>;
}

export const LoggerPort = createPort<Logger>("Logger");
export const DatabasePort = createPort<Database>("Database");
export const UserServicePort = createPort<UserService>("UserService");
```

### Step 2: Create Adapters

```typescript
// adapters.ts
import { createAdapter, createAsyncAdapter } from "@hex-di/graph";
import { LoggerPort, DatabasePort, UserServicePort } from "./ports.js";

export const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({
    log: msg => console.log(`[INFO] ${msg}`),
    error: msg => console.error(`[ERROR] ${msg}`),
  }),
});

export const DatabaseAdapter = createAsyncAdapter({
  provides: DatabasePort,
  requires: [LoggerPort] as const,
  factory: async ({ Logger }) => {
    Logger.log("Connecting to database...");
    const pool = await connectToDatabase();
    Logger.log("Database connected");
    return {
      query: sql => pool.query(sql),
      close: () => pool.end(),
    };
  },
  finalizer: async db => {
    await db.close();
  },
});

export const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort] as const,
  lifetime: "scoped",
  factory: ({ Logger, Database }) => ({
    getUser: async id => {
      Logger.log(`Fetching user ${id}`);
      return Database.query(`SELECT * FROM users WHERE id = $1`, [id]);
    },
    createUser: async data => {
      Logger.log(`Creating user ${data.name}`);
      return Database.query(`INSERT INTO users...`);
    },
  }),
});
```

### Step 3: Build the Graph

```typescript
// graph.ts
import { GraphBuilder } from "@hex-di/graph";
import { LoggerAdapter, DatabaseAdapter, UserServiceAdapter } from "./adapters.js";

export const appGraph = GraphBuilder.create()
  .provideAsync(DatabaseAdapter) // Async adapter
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter)
  .build();

// Type of appGraph:
// Graph<LoggerPort | DatabasePort | UserServicePort, DatabasePort, never>
//       ^-- provided ports          ^-- async ports   ^-- no overrides
```

### Step 4: Create Container and Resolve

```typescript
// main.ts
import { Container } from "@hex-di/runtime";
import { appGraph } from "./graph.js";
import { UserServicePort, LoggerPort } from "./ports.js";

async function main() {
  // Create container from validated graph
  const container = Container.from(appGraph);

  // Initialize async adapters (required before resolving async ports)
  await container.initialize();

  // Resolve services
  const logger = container.resolve(LoggerPort);
  const userService = container.resolve(UserServicePort);

  // Use services
  logger.log("Application started");
  const user = await userService.getUser("123");

  // Cleanup when done
  await container.dispose();
}

main();
```

---

## Testing Patterns with Overrides

### Create Mock Adapters

```typescript
// test-doubles.ts
import { createAdapter } from "@hex-di/graph";
import { LoggerPort, DatabasePort } from "./ports.js";
import { vi } from "vitest";

export const MockLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({
    log: vi.fn(),
    error: vi.fn(),
  }),
});

export const MockDatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({
    query: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
  }),
});
```

### Test with Overrides

```typescript
// user-service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphBuilder } from "@hex-di/graph";
import { Container } from "@hex-di/runtime";
import { UserServicePort, DatabasePort } from "./ports.js";
import { UserServiceAdapter } from "./adapters.js";
import { MockLoggerAdapter, MockDatabaseAdapter } from "./test-doubles.js";

describe("UserService", () => {
  let container: Container;

  beforeEach(async () => {
    // Build test graph with mocks
    const testGraph = GraphBuilder.create()
      .provide(MockLoggerAdapter)
      .provide(MockDatabaseAdapter)
      .provide(UserServiceAdapter)
      .build();

    container = Container.from(testGraph);
  });

  it("fetches user by id", async () => {
    // Arrange
    const mockUser = { id: "123", name: "Test User" };
    const database = container.resolve(DatabasePort);
    vi.mocked(database.query).mockResolvedValue(mockUser);

    // Act
    const userService = container.resolve(UserServicePort);
    const result = await userService.getUser("123");

    // Assert
    expect(result).toEqual(mockUser);
    expect(database.query).toHaveBeenCalledWith(expect.stringContaining("SELECT"), ["123"]);
  });
});
```

### Test Fixture Pattern

```typescript
// test-fixtures.ts
import { GraphBuilder, Graph } from "@hex-di/graph";
import { Container } from "@hex-di/runtime";
import { MockLoggerAdapter, MockDatabaseAdapter } from "./test-doubles.js";
import { UserServiceAdapter } from "./adapters.js";

interface TestFixture {
  container: Container;
  cleanup: () => Promise<void>;
}

export async function createTestFixture(overrides?: {
  logger?: typeof MockLoggerAdapter;
  database?: typeof MockDatabaseAdapter;
}): Promise<TestFixture> {
  const graph = GraphBuilder.create()
    .provide(overrides?.logger ?? MockLoggerAdapter)
    .provide(overrides?.database ?? MockDatabaseAdapter)
    .provide(UserServiceAdapter)
    .build();

  const container = Container.from(graph);
  await container.initialize();

  return {
    container,
    cleanup: () => container.dispose(),
  };
}

// Usage in tests
describe("UserService with fixture", () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await createTestFixture();
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  it("works with default mocks", () => {
    const userService = fixture.container.resolve(UserServicePort);
    // ...
  });
});
```

---

## Async Initialization

### Automatic Topological Order

Async adapter initialization order is automatically determined by the dependency graph using topological sort. Adapters with no async dependencies initialize first, and independent adapters at the same level initialize in parallel for maximum performance.

```typescript
// Initialization order is automatic based on dependencies

const ConfigAdapter = createAsyncAdapter({
  provides: ConfigPort,
  requires: [], // No deps: level 0 (first)
  factory: async () => loadConfig(),
});

const DatabaseAdapter = createAsyncAdapter({
  provides: DatabasePort,
  requires: [ConfigPort], // Depends on Config: level 1
  factory: async ({ Config }) => connectDB(Config.dbUrl),
});

const CacheAdapter = createAsyncAdapter({
  provides: CachePort,
  requires: [ConfigPort], // Also level 1, parallel with DB
  factory: async ({ Config }) => connectRedis(Config.redisUrl),
});

const MigrationAdapter = createAsyncAdapter({
  provides: MigrationPort,
  requires: [DatabasePort], // Depends on DB: level 2
  factory: async ({ Database }) => runMigrations(Database),
});

// Initialization: Config -> [Database, Cache in parallel] -> Migration
```

### Initialization Flow

```typescript
const container = Container.from(graph);

// Must call initialize() before resolving async ports
await container.initialize();
// Initialization order:
// 1. ConfigAdapter (priority 10)
// 2. DatabaseAdapter, CacheAdapter (priority 20, parallel)
// 3. MigrationAdapter (priority 30)

// Now safe to resolve any port
const db = container.resolve(DatabasePort);
```

### Handling Initialization Errors

```typescript
try {
  await container.initialize();
} catch (error) {
  if (error instanceof InitializationError) {
    console.error(`Failed to initialize ${error.portName}:`, error.cause);
    // Partial initialization - some adapters may have initialized
    await container.dispose(); // Clean up initialized adapters
  }
  throw error;
}
```

---

## Child Containers and Scoping

### Request-Scoped Services

```typescript
// Web application pattern

const RequestContextAdapter = createAdapter({
  provides: RequestContextPort,
  requires: [] as const,
  lifetime: "scoped", // New instance per scope
  factory: () => ({
    requestId: crypto.randomUUID(),
    startTime: Date.now(),
  }),
});

const UserSessionAdapter = createAdapter({
  provides: UserSessionPort,
  requires: [RequestContextPort] as const,
  lifetime: "scoped",
  factory: ({ RequestContext }) => ({
    contextId: RequestContext.requestId,
    user: null,
  }),
});
```

### Creating Child Containers

```typescript
// Parent container (singleton scope)
const parentContainer = Container.from(appGraph);
await parentContainer.initialize();

// Handle each request with a child container
app.use(async (req, res, next) => {
  // Build child graph with request-specific adapters
  const requestGraph = GraphBuilder.forParent(appGraph)
    .provide(RequestContextAdapter)
    .provide(UserSessionAdapter)
    .buildFragment();

  // Create scoped child container
  const requestContainer = parentContainer.createChild(requestGraph);

  // Attach to request for downstream handlers
  req.container = requestContainer;

  try {
    await next();
  } finally {
    // Clean up scoped services
    await requestContainer.dispose();
  }
});

// In a route handler
app.get("/users/:id", async (req, res) => {
  const userService = req.container.resolve(UserServicePort);
  const context = req.container.resolve(RequestContextPort);

  console.log(`Request ${context.requestId}: fetching user ${req.params.id}`);
  const user = await userService.getUser(req.params.id);
  res.json(user);
});
```

### Overriding Parent Services in Tests

```typescript
// Override parent's logger in child for testing
const parentGraph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

const parentContainer = Container.from(parentGraph);

// Child overrides Logger
const childGraph = GraphBuilder.forParent(parentGraph)
  .override(MockLoggerAdapter) // Replace parent's Logger
  .buildFragment();

const childContainer = parentContainer.createChild(childGraph);

// Child gets MockLogger, parent keeps real Logger
const childLogger = childContainer.resolve(LoggerPort); // MockLogger
const parentLogger = parentContainer.resolve(LoggerPort); // Real Logger
```

---

## Disposal and Cleanup

### Finalizers

Register cleanup logic when creating adapters:

```typescript
const DatabaseAdapter = createAsyncAdapter({
  provides: DatabasePort,
  requires: [] as const,
  factory: async () => {
    const pool = await createPool();
    return { pool, query: sql => pool.query(sql) };
  },
  finalizer: async db => {
    console.log("Closing database connection pool...");
    await db.pool.end();
    console.log("Database pool closed");
  },
});

const FileHandleAdapter = createAdapter({
  provides: FileHandlePort,
  requires: [] as const,
  lifetime: "scoped",
  factory: () => {
    const handle = fs.openSync("data.txt", "r");
    return { handle, read: () => fs.readFileSync(handle) };
  },
  finalizer: fh => {
    fs.closeSync(fh.handle); // Sync finalizer
  },
});
```

### Disposal Order

Disposal happens in reverse initialization order:

```typescript
// Initialization: Config -> Database -> Cache -> App
// Disposal:       App -> Cache -> Database -> Config

await container.dispose();
// 1. App finalizer (if any)
// 2. Cache finalizer (close Redis)
// 3. Database finalizer (close pool)
// 4. Config finalizer (if any)
```

### Graceful Shutdown

```typescript
// Handle shutdown signals
const signals = ["SIGINT", "SIGTERM"];

for (const signal of signals) {
  process.on(signal, async () => {
    console.log(`Received ${signal}, shutting down gracefully...`);

    try {
      await container.dispose();
      console.log("Cleanup complete");
      process.exit(0);
    } catch (error) {
      console.error("Error during cleanup:", error);
      process.exit(1);
    }
  });
}
```

### Disposal Error Handling

```typescript
try {
  await container.dispose();
} catch (error) {
  if (error instanceof DisposalError) {
    // Disposal continues even if some finalizers fail
    console.error("Some finalizers failed:");
    for (const failure of error.failures) {
      console.error(`  ${failure.portName}: ${failure.error}`);
    }
  }
}
```

---

## Best Practices

### 1. Validate Early

```typescript
// Build and validate graph at startup, not lazily
const graph = GraphBuilder.create()
  .provide(...)
  .build();

// Validation happens here (compile time + runtime safety net)
const container = Container.from(graph);

// Initialize all async adapters upfront
await container.initialize();

// Now the application is fully ready
startServer();
```

### 2. Use Type-Safe Resolution

```typescript
// Good: Type-safe resolution
const logger = container.resolve(LoggerPort);
// TypeScript knows logger is type Logger

// Avoid: String-based resolution (if supported)
const logger = container.resolve("Logger"); // No type safety
```

### 3. Prefer Scoped Over Transient

```typescript
// Scoped: One instance per scope (request), efficient
lifetime: "scoped";

// Transient: New instance every resolution, can be expensive
lifetime: "transient";
```

### 4. Keep Singletons Stateless or Thread-Safe

```typescript
// Good: Stateless singleton
const LoggerAdapter = createAdapter({
  ...
  lifetime: "singleton",
  factory: () => ({
    log: (msg) => console.log(msg), // No shared state
  }),
});

// Caution: Singleton with state
const CounterAdapter = createAdapter({
  ...
  lifetime: "singleton",
  factory: () => {
    let count = 0;  // Shared mutable state!
    return {
      increment: () => ++count, // Race condition in async code
    };
  },
});
```

### 5. Test at Multiple Levels

```typescript
// Unit test: Mock all dependencies
const unit = GraphBuilder.create()
  .provide(MockLogger)
  .provide(MockDatabase)
  .provide(UserServiceAdapter)
  .build();

// Integration test: Real infra, mock external services
const integration = GraphBuilder.create()
  .provide(LoggerAdapter) // Real
  .provide(TestDatabaseAdapter) // Real but test DB
  .provide(MockEmailAdapter) // Mock external service
  .provide(UserServiceAdapter)
  .build();

// E2E test: Everything real
const e2e = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(EmailAdapter)
  .provide(UserServiceAdapter)
  .build();
```

---

## See Also

- [DESIGN.md](./DESIGN.md) - Architecture and patterns
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - API cheat sheet
- [DEBUGGING.md](./DEBUGGING.md) - Type-level debugging
- [PATTERNS_LARGE_APPS.md](./PATTERNS_LARGE_APPS.md) - Scaling patterns
