# 05 — Frozen Port References

Extend existing immutability guarantees to resolved service instances. Services are `Object.freeze()`d before injection, preventing capability tampering. See [ADR-CO-001](../decisions/001-frozen-port-references.md) and [RES-04](../../../research/RES-04-capability-based-security.md).

## BEH-CO-05-001: Freeze Resolved Services

Resolved service instances are `Object.freeze()`d by the container before being returned to the consumer. This is the default behavior; adapters can opt out with `freeze: false`.

```ts
// Container resolution pipeline (internal)
resolve<T>(port: Port<Name, T>): T {
  const instance = factory(resolvedDependencies);
  // Freeze by default unless adapter opts out
  return adapterConfig.freeze !== false
    ? Object.freeze(instance)
    : instance;
}
```

**Exported from**: Container resolution pipeline (internal).

**Algorithm**:

1. Resolve all dependencies for the adapter
2. Invoke the adapter factory with resolved dependencies
3. If the adapter config has `freeze: false`, return the instance as-is
4. Otherwise, apply `Object.freeze()` to the instance
5. Return the frozen instance

**Behavior Table**:

| Adapter Config             | Factory Result             | Returned Instance                                                       |
| -------------------------- | -------------------------- | ----------------------------------------------------------------------- |
| `freeze` omitted (default) | `{ hello: () => "world" }` | `Object.freeze({ hello: () => "world" })`                               |
| `freeze: true`             | `{ hello: () => "world" }` | `Object.freeze({ hello: () => "world" })`                               |
| `freeze: false`            | `{ count: 0 }`             | `{ count: 0 }` (mutable)                                                |
| `freeze` omitted           | Singleton (cached)         | Frozen on first resolution, cached frozen reference returned thereafter |

**Example**:

```ts
import { port, createAdapter, SINGLETON, TRANSIENT, ok } from "@hex-di/core";

interface Logger {
  log(message: string): void;
}

const LoggerPort = port<Logger>()({ name: "Logger", direction: "outbound" });

// Default: frozen service
const loggerAdapter = createAdapter({
  provides: [LoggerPort],
  factory: () => ok({ log: (msg: string) => console.log(msg) }),
  lifetime: SINGLETON,
});

// After resolution:
const logger = container.resolve(LoggerPort);
// logger is Object.freeze()'d
// logger.log = () => {} → TypeError in strict mode

// Opt-out for mutable services
interface Cache {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}
const CachePort = port<Cache>()({ name: "Cache", direction: "outbound" });

const cacheAdapter = createAdapter({
  provides: [CachePort],
  factory: () => ok(new Map()),
  lifetime: SINGLETON,
  freeze: false, // Cache needs mutable internal state
});
```

**Design notes**:

- Shallow freeze only — consistent with `@hex-di/result`'s [INV-1](../../result/invariants.md#inv-1-frozen-result-instances). Deep freeze is too expensive and breaks circular references, Proxy-based services, and services with lazy getters.
- Singleton services are frozen once and the frozen reference is cached. Subsequent resolutions return the same frozen reference.
- Transient services are frozen on every resolution (each consumer gets a unique frozen instance).
- Scoped services are frozen once per scope.
- Cross-ref: [INV-CO-1](../invariants.md#inv-co-1-frozen-port-definitions), [INV-CO-2](../invariants.md#inv-co-2-frozen-resolved-services).

## BEH-CO-05-002: Port Definition Immutability

Port definitions created by `port()` and `createPort()` are `Object.freeze()`d at creation. This is existing behavior, documented here for completeness.

```ts
// port() builder
port<T>()(config: PortConfig): DirectedPort<Name, T, Direction, Category>
// Internally: Object.freeze({ ...config, __brand: PORT_BRAND })
```

**Exported from**: `ports/factory.ts`.

**Algorithm**:

1. Validate port config (name is required)
2. Apply defaults (direction → `"outbound"`)
3. Construct port object with brand symbol
4. `Object.freeze()` the port object
5. Return frozen port

**Behavior Table**:

| Input                                                               | Output                                              |
| ------------------------------------------------------------------- | --------------------------------------------------- |
| `port<Logger>()({ name: "Logger" })`                                | Frozen `DirectedPort<"Logger", Logger, "outbound">` |
| `createPort<"DB", Database>({ name: "DB", direction: "outbound" })` | Frozen `DirectedPort<"DB", Database, "outbound">`   |

**Design notes**:

- Port name is a literal type (e.g., `"Logger"` not `string`), enabling type-level port identification.
- Cross-ref: [INV-CO-1](../invariants.md#inv-co-1-frozen-port-definitions), [BEH-CO-01](01-port-definition.md).
