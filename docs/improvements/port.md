# Port API Improvements

## Current State (v0.1.0)

Three separate functions for creating ports:

```typescript
// Basic port (no direction) — 2-arg string form
// createPort<"Logger", Logger>("Logger");  // removed in v0.2.0

// Directed ports (separate functions) — also removed
// createInboundPort<"UserService", UserService>({ name: "UserService" });
// createOutboundPort<"Logger", Logger>({ name: "Logger" });
```

**Problems:**

- 3 functions to learn
- Basic `Port` has no direction (doesn't enforce hexagonal thinking)
- Inconsistent API (string vs object config)

---

## Implemented API

Single unified function with rich configuration (implemented in v0.2.0):

```typescript
// Builder pattern (preferred — infers name as literal type)
import { port } from '@hex-di/core';
const LoggerPort = port<Logger>()({ name: 'Logger' });

// Alternative: explicit generics
import { createPort } from '@hex-di/core';
const LoggerPort = createPort<'Logger', Logger>({ name: 'Logger' });
```

Both accept the same config object:

```typescript
{
  name: TName,                         // Required
  direction?: 'inbound' | 'outbound',  // Default: 'outbound'
  description?: string,                // Optional
  category?: string,                   // Optional
  tags?: string[]                      // Optional
}
```

---

## Type Definitions

```typescript
type PortDirection = "inbound" | "outbound";

// Returned type is DirectedPort (not Port)
type DirectedPort<T, TName extends string, TDirection extends PortDirection = "outbound", TCategory extends string = string> = {
  readonly __portName: TName;
  readonly [__direction_brand]: TDirection;
  // Runtime accessible via getPortMetadata()
};

// createPort overloads
function createPort<TName extends string, TService>(
  config: { name: TName; direction?: PortDirection; description?: string; category?: string; tags?: readonly string[] }
): DirectedPort<TService, TName, "outbound">;

// Builder — preferred for literal name inference
function port<TService>(): (config: { name: string; direction?: PortDirection; ... }) => DirectedPort<TService, ...>;
```

---

## Type-Level Helpers

```typescript
// Extract direction from port
type InferDirection<P> = P extends Port<unknown, string, infer D> ? D : never;

// Filter ports by direction
type InboundPorts<P> = P extends Port<unknown, string, "inbound"> ? P : never;
type OutboundPorts<P> = P extends Port<unknown, string, "outbound"> ? P : never;

// Type aliases for convenience
type InboundPort<T, TName extends string> = Port<T, TName, "inbound">;
type OutboundPort<T, TName extends string> = Port<T, TName, "outbound">;
```

---

## Why Default to Outbound?

Typical application port distribution:

```
OUTBOUND (70-80%)              INBOUND (20-30%)
-----------------              ----------------
* Logger                       * CreateUser
* Config                       * UpdateUser
* Database                     * DeleteUser
* UserRepository               * GetUser
* OrderRepository              * ListUsers
* Cache                        * Checkout
* EmailService                 * ProcessPayment
* PaymentGateway
* MessageQueue
* FileStorage
* Metrics
```

- **Outbound = default** - Less boilerplate for common case
- **Inbound = explicit** - Intentional use case declaration

---

## Suggested Categories

### Inbound (Use Cases)

| Category        | Description                               |
| --------------- | ----------------------------------------- |
| `command`       | Write operations (CreateUser, DeletePost) |
| `query`         | Read operations (GetUser, ListPosts)      |
| `workflow`      | Multi-step processes (Checkout, Onboard)  |
| `event-handler` | React to domain events                    |

### Outbound (Infrastructure)

| Category        | Description               |
| --------------- | ------------------------- |
| `persistence`   | Repositories, databases   |
| `messaging`     | Queues, event buses       |
| `external-api`  | Third-party services      |
| `observability` | Logging, metrics, tracing |
| `configuration` | Config, feature flags     |
| `security`      | Auth, encryption          |
| `caching`       | Cache services            |
| `filesystem`    | File operations           |

---

## Usage Examples

### Outbound Ports (Common - No Direction Needed)

```typescript
import { port, createPort } from '@hex-di/core';

// Minimal (builder — preferred)
const ConfigPort = port<Config>()({ name: "Config" });

// With description
const LoggerPort = port<Logger>()({
  name: "Logger",
  description: "Structured JSON logging",
  category: "observability",
});

// Full metadata (explicit generics form)
const UserRepositoryPort = createPort<"UserRepository", UserRepository>({
  name: "UserRepository",
  description: "User persistence layer",
  category: "persistence",
  tags: ["postgres", "user"],
});

const EmailServicePort = createPort<"EmailService", EmailService>({
  name: "EmailService",
  description: "Transactional emails via SendGrid",
  category: "external-api",
  tags: ["sendgrid", "notifications"],
});

const CachePort = createPort<"Cache", CacheService>({
  name: "Cache",
  description: "Redis-backed caching layer",
  category: "caching",
  tags: ["redis", "performance"],
});
```

### Inbound Ports (Explicit Direction)

```typescript
import { port } from '@hex-di/core';

const CreateUserPort = port<CreateUserUseCase>()({
  name: "CreateUser",
  direction: "inbound",
  description: "Creates a new user account with email verification",
  category: "command",
  tags: ["user", "registration", "auth"],
});

const GetUserByIdPort = port<GetUserByIdQuery>()({
  name: "GetUserById",
  direction: "inbound",
  description: "Retrieves user profile by ID",
  category: "query",
  tags: ["user", "profile"],
});

const CheckoutWorkflowPort = port<CheckoutWorkflow>()({
  name: "CheckoutWorkflow",
  direction: "inbound",
  description: "Handles complete checkout process including payment",
  category: "workflow",
  tags: ["checkout", "payment", "order"],
});
```

---

## Runtime Access

```typescript
const port = CreateUserPort;

console.log(port.name); // 'CreateUser'
console.log(port.direction); // 'inbound'
console.log(port.description); // 'Creates a new user account...'
console.log(port.category); // 'command'
console.log(port.tags); // ['user', 'registration', 'auth']
```

---

## Graph Inspection Integration

```typescript
const inspection = inspectGraph(graph);

// Filter by direction
const inboundPorts = inspection.ports.filter(p => p.direction === "inbound");
const outboundPorts = inspection.ports.filter(p => p.direction === "outbound");

// Filter by category
const commands = inspection.ports.filter(p => p.category === "command");
const persistence = inspection.ports.filter(p => p.category === "persistence");

// Filter by tags
const userRelated = inspection.ports.filter(p => p.tags.includes("user"));

// Generate documentation
for (const port of inspection.ports) {
  console.log(`## ${port.name}`);
  console.log(`- Direction: ${port.direction}`);
  console.log(`- Category: ${port.category ?? "uncategorized"}`);
  console.log(`- Description: ${port.description ?? "No description"}`);
  console.log(`- Tags: ${port.tags.join(", ") || "none"}`);
}
```

---

## Visualization Benefits

Rich metadata enables better graph visualization:

```
+-------------------------------------------------------------------+
|                          INBOUND                                  |
|  +--------------------------------------------------------------+ |
|  | command                                                      | |
|  |  +------------+  +------------+  +------------+              | |
|  |  |CreateUser  |  |UpdateUser  |  |DeleteUser  |              | |
|  |  |[user,auth] |  |[user]      |  |[user,admin]|              | |
|  |  +------------+  +------------+  +------------+              | |
|  +--------------------------------------------------------------+ |
|  +--------------------------------------------------------------+ |
|  | query                                                        | |
|  |  +------------+  +------------+                              | |
|  |  |GetUserById |  |ListUsers   |                              | |
|  |  |[user]      |  |[user,admin]|                              | |
|  |  +------------+  +------------+                              | |
|  +--------------------------------------------------------------+ |
+-------------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------------+
|                          OUTBOUND                                 |
|  +----------------+  +----------------+  +----------------+       |
|  | persistence    |  | observability  |  | external-api   |       |
|  | +------------+ |  | +------------+ |  | +------------+ |       |
|  | |UserRepo    | |  | |Logger      | |  | |EmailService| |       |
|  | |[postgres]  | |  | |[logging]   | |  | |[sendgrid]  | |       |
|  | +------------+ |  | +------------+ |  | +------------+ |       |
|  +----------------+  +----------------+  +----------------+       |
+-------------------------------------------------------------------+
```

---

## Migration Path

```typescript
// Old API (removed)
// createPort<"Logger", Logger>("Logger");  // 2-arg string form
// createInboundPort<"UserService", UserService>({ name: "UserService" });
// createOutboundPort<"Logger", Logger>({ name: "Logger" });

// Current API — builder (preferred, literal name inference)
import { port } from '@hex-di/core';
const LoggerPort = port<Logger>()({ name: "Logger" });
const UserServicePort = port<UserService>()({ name: "UserService", direction: "inbound" });

// Current API — explicit generics
import { createPort } from '@hex-di/core';
const LoggerPort = createPort<"Logger", Logger>({ name: "Logger" });
const UserServicePort = createPort<"UserService", UserService>({ name: "UserService", direction: "inbound" });
```

---

## Breaking Changes

1. Remove `createInboundPort()` function
2. Remove `createOutboundPort()` function
3. Change `createPort()` signature from string to object config
4. Remove undirected `Port` type (all ports have direction)

---

## Benefits Summary

| Benefit              | Description                                         |
| -------------------- | --------------------------------------------------- |
| Single API           | One function to learn instead of three              |
| Enforced Direction   | Every port has a direction (hexagonal architecture) |
| Smart Default        | Outbound default reduces boilerplate                |
| Self-Documenting     | Description, category, tags for rich metadata       |
| Better Visualization | Direction and category enable grouped layouts       |
| Runtime Queryable    | Filter ports by any metadata field                  |
| Auto-Documentation   | Generate docs from port metadata                    |
