# Large-Scale Application Patterns

> **Scaling @hex-di/graph for Enterprise Applications**

This guide covers patterns for using `@hex-di/graph` in large applications with 100+ adapters, multiple teams, and complex deployment scenarios.

## Table of Contents

1. [Modular Graph Composition](#modular-graph-composition)
2. [Performance Considerations](#performance-considerations)
3. [Microservices Patterns](#microservices-patterns)
4. [Monorepo Package Structure](#monorepo-package-structure)
5. [build() vs buildFragment()](#build-vs-buildfragment)
6. [Team Collaboration](#team-collaboration)
7. [Migration Strategies](#migration-strategies)

---

## Modular Graph Composition

### Domain-Driven Module Structure

Organize adapters by domain/bounded context:

```
src/
├── modules/
│   ├── auth/
│   │   ├── ports.ts
│   │   ├── adapters.ts
│   │   └── graph.ts
│   ├── users/
│   │   ├── ports.ts
│   │   ├── adapters.ts
│   │   └── graph.ts
│   ├── orders/
│   │   ├── ports.ts
│   │   ├── adapters.ts
│   │   └── graph.ts
│   └── payments/
│       ├── ports.ts
│       ├── adapters.ts
│       └── graph.ts
├── infrastructure/
│   ├── ports.ts
│   ├── adapters.ts
│   └── graph.ts
└── main.ts
```

### Module Graph Pattern

Each module exports its own graph builder:

```typescript
// modules/users/graph.ts
import { GraphBuilder } from "@hex-di/graph";
import { UserServiceAdapter, UserRepositoryAdapter, UserValidatorAdapter } from "./adapters.js";

/**
 * Users module graph.
 * Requires: LoggerPort, DatabasePort from infrastructure
 */
export const usersModule = GraphBuilder.create()
  .provide(UserServiceAdapter)
  .provide(UserRepositoryAdapter)
  .provide(UserValidatorAdapter);
// Note: Not calling build() - this is a fragment
```

```typescript
// modules/orders/graph.ts
import { GraphBuilder } from "@hex-di/graph";
import { OrderServiceAdapter, OrderRepositoryAdapter } from "./adapters.js";

/**
 * Orders module graph.
 * Requires: LoggerPort, DatabasePort, UserServicePort
 */
export const ordersModule = GraphBuilder.create()
  .provide(OrderServiceAdapter)
  .provide(OrderRepositoryAdapter);
```

### Composing the Full Application Graph

```typescript
// main.ts
import { GraphBuilder } from "@hex-di/graph";
import { infrastructureGraph } from "./infrastructure/graph.js";
import { usersModule } from "./modules/users/graph.js";
import { ordersModule } from "./modules/orders/graph.js";
import { paymentsModule } from "./modules/payments/graph.js";
import { authModule } from "./modules/auth/graph.js";

// Compose all modules
const appGraph = infrastructureGraph
  .merge(authModule)
  .merge(usersModule)
  .merge(ordersModule)
  .merge(paymentsModule)
  .build(); // Validate the complete graph

// Type: Graph<
//   LoggerPort | DatabasePort | CachePort |  // infrastructure
//   AuthServicePort | TokenServicePort |      // auth
//   UserServicePort | UserRepositoryPort |    // users
//   OrderServicePort | OrderRepositoryPort |  // orders
//   PaymentServicePort | PaymentGatewayPort,  // payments
//   DatabasePort | CachePort,                 // async ports
//   never                                     // no overrides
// >
```

### Feature Flags with Conditional Modules

```typescript
// Conditionally include modules based on feature flags
function buildAppGraph(config: AppConfig) {
  let builder = infrastructureGraph.merge(authModule).merge(usersModule);

  if (config.features.orders) {
    builder = builder.merge(ordersModule);
  }

  if (config.features.payments) {
    builder = builder.merge(paymentsModule);
  }

  if (config.features.analytics) {
    builder = builder.merge(analyticsModule);
  }

  return builder.build();
}
```

---

## Performance Considerations

### Compile-Time Performance

Large graphs with many adapters can slow down TypeScript:

```typescript
// For graphs approaching 50+ adapters, use provideFast()
const builder = GraphBuilder.create()
  .provideFast(Adapter1) // Short-circuit: stops at first error
  .provideFast(Adapter2) // Faster type checking
  .provideFast(Adapter3);

// vs provide() which collects ALL errors
const builder = GraphBuilder.create()
  .provide(Adapter1) // Multi-error: evaluates all checks
  .provide(Adapter2) // Better DX but slower compilation
  .provide(Adapter3);
```

### Custom MaxDepth for Deep Graphs

```typescript
// Default maxDepth is 30. For deep dependency chains:
const builder = GraphBuilder.withMaxDepth<50>().create();

// For very deep graphs (use with caution):
const builder = GraphBuilder.withMaxDepth<100>().create();
```

### Batch Adapter Registration

```typescript
// Instead of chaining many provide() calls:
const builder = GraphBuilder.create()
  .provide(A1)
  .provide(A2)
  .provide(A3)
  .provide(A4)
  .provide(A5)
  .provide(A6)
  .provide(A7)
  .provide(A8);

// Use provideMany() for slightly better performance:
const builder = GraphBuilder.create().provideMany([A1, A2, A3, A4, A5, A6, A7, A8]);
```

### Module-Level Caching

Pre-build module graphs to avoid repeated type evaluation:

```typescript
// infrastructure/graph.ts
import { GraphBuilder } from "@hex-di/graph";

// Cached at module load time
export const infrastructureGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  .provideAsync(DatabaseAdapter)
  .provideAsync(CacheAdapter);

// Type is computed once, reused across imports
```

### Runtime Performance

The graph structure has minimal runtime overhead:

```typescript
// Graph is just a frozen array of adapters
// No runtime validation overhead after build()
const graph = builder.build();
// { adapters: readonly AdapterAny[], overridePortNames: ReadonlySet<string> }

// Container resolution is O(1) hash lookup
const service = container.resolve(ServicePort);
```

---

## Microservices Patterns

### Service-Per-Graph Pattern

Each microservice has its own graph:

```typescript
// user-service/src/graph.ts
export const userServiceGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  .provideAsync(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .provide(UserRepositoryAdapter)
  .build();

// order-service/src/graph.ts
export const orderServiceGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  .provideAsync(DatabaseAdapter)
  .provideAsync(MessageQueueAdapter)
  .provide(OrderServiceAdapter)
  .provide(OrderRepositoryAdapter)
  .build();
```

### Shared Infrastructure Package

```typescript
// packages/shared-infra/src/index.ts
export { LoggerPort, LoggerAdapter } from "./logger.js";
export { ConfigPort, ConfigAdapter } from "./config.js";
export { TracingPort, TracingAdapter } from "./tracing.js";
export { MetricsPort, MetricsAdapter } from "./metrics.js";

// Each service imports and includes shared adapters
import { LoggerAdapter, ConfigAdapter, TracingAdapter, MetricsAdapter } from "@myorg/shared-infra";

const serviceGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  .provide(TracingAdapter)
  .provide(MetricsAdapter)
  // ... service-specific adapters
  .build();
```

### Inter-Service Communication Adapters

```typescript
// Adapter for calling other services
const UserServiceClientAdapter = createAdapter({
  provides: UserServiceClientPort,
  requires: [ConfigPort, TracingPort] as const,
  lifetime: "singleton",
  factory: ({ Config, Tracing }) => ({
    getUser: async (id: string) => {
      const span = Tracing.startSpan("user-service.getUser");
      try {
        const response = await fetch(`${Config.userServiceUrl}/users/${id}`, {
          headers: { "x-trace-id": span.traceId },
        });
        return response.json();
      } finally {
        span.end();
      }
    },
  }),
});

// Order service uses the client
const OrderServiceAdapter = createAdapter({
  provides: OrderServicePort,
  requires: [UserServiceClientPort, OrderRepositoryPort] as const,
  lifetime: "scoped",
  factory: ({ UserServiceClient, OrderRepository }) => ({
    createOrder: async (userId, items) => {
      const user = await UserServiceClient.getUser(userId);
      // ... create order
    },
  }),
});
```

---

## Monorepo Package Structure

### Recommended Structure

```
packages/
├── ports/                    # Port definitions only
│   ├── src/
│   │   ├── auth.ts          # AuthPort, TokenPort
│   │   ├── users.ts         # UserServicePort, etc.
│   │   ├── orders.ts        # OrderServicePort, etc.
│   │   └── index.ts
│   └── package.json
│
├── adapters/                 # Adapter implementations
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── orders/
│   │   └── index.ts
│   └── package.json
│
├── graphs/                   # Graph composition
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   └── orders.ts
│   │   ├── app.ts           # Full app graph
│   │   └── index.ts
│   └── package.json
│
├── app-web/                  # Web application
│   ├── src/
│   │   ├── main.ts          # Uses graphs/app
│   │   └── routes/
│   └── package.json
│
└── app-worker/               # Background worker
    ├── src/
    │   ├── main.ts          # Uses graphs/app + worker adapters
    │   └── jobs/
    └── package.json
```

### Package Dependencies

```json
// packages/adapters/package.json
{
  "name": "@myorg/adapters",
  "dependencies": {
    "@myorg/ports": "workspace:*",
    "@hex-di/graph": "^1.0.0"
  }
}

// packages/graphs/package.json
{
  "name": "@myorg/graphs",
  "dependencies": {
    "@myorg/ports": "workspace:*",
    "@myorg/adapters": "workspace:*",
    "@hex-di/graph": "^1.0.0"
  }
}

// packages/app-web/package.json
{
  "name": "@myorg/app-web",
  "dependencies": {
    "@myorg/ports": "workspace:*",
    "@myorg/graphs": "workspace:*",
    "@hex-di/runtime": "^1.0.0"
  }
}
```

### Separate Test Adapters Package

```typescript
// packages/test-doubles/src/index.ts
export { MockLoggerAdapter } from "./mock-logger.js";
export { MockDatabaseAdapter } from "./mock-database.js";
export { MockCacheAdapter } from "./mock-cache.js";
// ... all mock adapters

// Test files import from test-doubles
import { MockLoggerAdapter, MockDatabaseAdapter } from "@myorg/test-doubles";
```

---

## build() vs buildFragment()

### When to Use build()

Use `build()` when creating a **complete, standalone graph**:

```typescript
// Application entry point - must be complete
const appGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build(); // Validates all dependencies satisfied

// Error if UserServiceAdapter requires a port not provided:
// "ERROR: Missing adapters for CachePort. Call .provide() first."
```

### When to Use buildFragment()

Use `buildFragment()` for **incomplete graphs that will be completed later**:

```typescript
// 1. Child containers - dependencies come from parent
const parentGraph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

const childFragment = GraphBuilder.create()
  .provide(RequestScopedAdapter) // Requires Logger from parent
  .buildFragment(); // OK - parent will provide Logger

const childContainer = parentContainer.createChild(childFragment);
```

```typescript
// 2. Module graphs - will be merged later
const usersModule = GraphBuilder.create()
  .provide(UserServiceAdapter) // Requires Logger, Database
  .provide(UserRepositoryAdapter);
// Don't build() - this fragment requires infrastructure

const appGraph = infrastructureGraph
  .merge(usersModule) // Now has Logger, Database
  .build(); // Validates complete graph
```

```typescript
// 3. Test fixtures with partial mocks
const testFragment = GraphBuilder.create()
  .provide(MockDatabaseAdapter)
  .provide(ServiceUnderTestAdapter)
  .buildFragment(); // OK - some deps may be mocked elsewhere
```

### Decision Matrix

| Scenario                | Method            | Reason                 |
| ----------------------- | ----------------- | ---------------------- |
| App entry point         | `build()`         | Must be complete       |
| Module graph            | Don't build yet   | Will merge with others |
| Child container graph   | `buildFragment()` | Parent provides deps   |
| Test with partial mocks | `buildFragment()` | Flexibility in tests   |
| Library graph export    | Either            | Document requirements  |

---

## Team Collaboration

### Module Ownership

```typescript
// Each team owns their module's graph
// teams/auth/graph.ts - owned by Auth team
export const authModule = GraphBuilder.create()
  .provide(AuthServiceAdapter)
  .provide(TokenServiceAdapter)
  .provide(SessionAdapter);

// Document external dependencies
/**
 * Auth Module
 *
 * @requires LoggerPort - from infrastructure
 * @requires DatabasePort - from infrastructure
 * @requires CachePort - from infrastructure
 *
 * @provides AuthServicePort
 * @provides TokenServicePort
 * @provides SessionPort
 */
```

### Interface Contracts

Define ports as the contract between teams:

```typescript
// packages/ports/src/auth.ts
// Owned by: Auth team
// Consumed by: Users team, Orders team

export interface AuthService {
  validateToken(token: string): Promise<TokenPayload>;
  refreshToken(refreshToken: string): Promise<TokenPair>;
  revokeToken(token: string): Promise<void>;
}

export const AuthServicePort = createPort<AuthService>("AuthService");

// Other teams depend on the PORT, not the implementation
// Auth team can change implementation without breaking others
```

### Code Review Guidelines

```markdown
## Graph Change Checklist

- [ ] New adapters have explicit lifetime specified
- [ ] Async adapter dependencies are correctly declared
- [ ] Finalizers are added for resources that need cleanup
- [ ] Module graph documents its required/provided ports
- [ ] No circular dependencies introduced
- [ ] No captive dependencies introduced
- [ ] Tests use appropriate mock adapters
```

---

## Migration Strategies

### Gradual Adoption

Start with new features, migrate existing code incrementally:

```typescript
// Phase 1: New feature uses DI
const newFeatureGraph = GraphBuilder.create().provide(NewFeatureAdapter).buildFragment();

// Legacy code still uses direct instantiation
const legacyService = new LegacyService(config);

// Phase 2: Wrap legacy as adapter
const LegacyServiceAdapter = createAdapter({
  provides: LegacyServicePort,
  requires: [ConfigPort] as const,
  lifetime: "singleton",
  factory: ({ Config }) => new LegacyService(Config),
});

// Phase 3: New code depends on LegacyServicePort
const NewConsumerAdapter = createAdapter({
  provides: NewConsumerPort,
  requires: [LegacyServicePort] as const,
  factory: ({ LegacyService }) => new NewConsumer(LegacyService),
});
```

### Strangler Fig Pattern

Gradually replace the old system:

```typescript
// Step 1: Create port for the capability
const UserLookupPort = createPort<UserLookup>("UserLookup");

// Step 2: Adapter wrapping legacy implementation
const LegacyUserLookupAdapter = createAdapter({
  provides: UserLookupPort,
  requires: [LegacyDatabasePort] as const,
  lifetime: "singleton",
  factory: ({ LegacyDatabase }) => ({
    findUser: id => LegacyDatabase.query(`SELECT * FROM users WHERE id = ?`, [id]),
  }),
});

// Step 3: New adapter with modern implementation
const ModernUserLookupAdapter = createAdapter({
  provides: UserLookupPort,
  requires: [UserRepositoryPort] as const,
  lifetime: "singleton",
  factory: ({ UserRepository }) => ({
    findUser: id => UserRepository.findById(id),
  }),
});

// Step 4: Switch adapters via configuration
const userLookupAdapter = config.useModernUserLookup
  ? ModernUserLookupAdapter
  : LegacyUserLookupAdapter;

const graph = GraphBuilder.create()
  .provide(userLookupAdapter)
  // ... rest of graph
  .build();
```

### Testing Migration

```typescript
// Dual-run tests during migration
describe("UserLookup", () => {
  const implementations = [
    { name: "legacy", adapter: LegacyUserLookupAdapter },
    { name: "modern", adapter: ModernUserLookupAdapter },
  ];

  for (const { name, adapter } of implementations) {
    describe(`${name} implementation`, () => {
      let container: Container;

      beforeEach(() => {
        const graph = GraphBuilder.create().provide(adapter).provide(TestDatabaseAdapter).build();
        container = Container.from(graph);
      });

      it("finds user by id", async () => {
        const lookup = container.resolve(UserLookupPort);
        const user = await lookup.findUser("123");
        expect(user).toBeDefined();
      });

      // Both implementations must pass all tests
    });
  }
});
```

---

## See Also

- [DESIGN.md](./DESIGN.md) - Architecture and patterns
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - API cheat sheet
- [RUNTIME_INTEGRATION.md](./RUNTIME_INTEGRATION.md) - Container integration
- [DEBUGGING.md](./DEBUGGING.md) - Type-level debugging
