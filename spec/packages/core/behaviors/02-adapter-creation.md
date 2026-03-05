# 02 — Adapter Creation

Unified adapter construction via `createAdapter()`. A single API accepts both factory functions and class constructors, producing a frozen `Adapter` value with branded type parameters for provides, requires, lifetime, factoryKind, clonable, and error channel.

## BEH-CO-02-001: createAdapter() with factory function

Creates an adapter that wraps a factory function. The factory receives resolved dependencies as a keyed object and returns the service instance (sync or async). Defaults: `requires: []`, `lifetime: "singleton"`, `clonable: false`.

```ts
function createAdapter<
  TProvides extends Port<string, unknown>,
  TFactory extends (deps: PortDeps<TRequires>) => InferService<TProvides> | Promise<...>,
>(config: {
  readonly provides: TProvides;
  readonly factory: TFactory;
  readonly requires?: TRequires;
  readonly lifetime?: Lifetime;
  readonly clonable?: boolean;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, TFactoryKind, TClonable, TRequires, TError>;
```

**Exported from**: `adapters/unified.ts`, re-exported from `index.ts`

**Algorithm**:

1. Validate mutual exclusion: `factory` XOR `class` must be provided. If both, throw `TypeError` (HEX020). If neither, throw `TypeError` (HEX019).
2. Apply defaults: `requires ?? []`, `lifetime ?? "singleton"`, `clonable ?? false`.
3. Detect async factory: check `config.factory.constructor.name === "AsyncFunction"`. Set `factoryKind` to `"async"` or `"sync"`.
4. For async factories, enforce `lifetime === "singleton"` at runtime. Non-singleton lifetime with async factory throws `TypeError` (HEX015).
5. Run `assertValidAdapterConfig()` -- validates `provides` is a port, `requires` is an array of ports, no self-dependency, no duplicate requires, factory is a function.
6. Build the adapter object with `provides`, `requires`, `lifetime`, `factoryKind`, `factory`, `clonable`.
7. If `finalizer` is provided, include it in the result.
8. `Object.freeze()` the adapter object and return it.

**Behavior Table**:

| Config                                                          | factoryKind                                 | lifetime      | TError                      |
| --------------------------------------------------------------- | ------------------------------------------- | ------------- | --------------------------- |
| `{ provides, factory: () => new Svc() }`                        | `"sync"`                                    | `"singleton"` | `never`                     |
| `{ provides, factory: async () => await connect() }`            | `"async"`                                   | `"singleton"` | `never`                     |
| `{ provides, factory: () => ok(svc) }` (returns Result)         | `"sync"`                                    | `"singleton"` | Inferred from `Err` variant |
| `{ provides, lifetime: "transient", factory: () => new Svc() }` | `"sync"`                                    | `"transient"` | `never`                     |
| `{ provides, lifetime: "scoped", factory: async () => ... }`    | compile-time error via `AsyncLifetimeError` | --            | --                          |

**Example**:

```ts
import { port, createAdapter } from "@hex-di/core";

interface Logger {
  log(msg: string): void;
}
const LoggerPort = port<Logger>()({ name: "Logger" });

const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => ({
    log: (msg: string) => console.log(msg),
  }),
});
// Type: Adapter<typeof LoggerPort, never, "singleton", "sync", false, readonly [], never>
```

**Design notes**:

- The factory receives `PortDeps<TRequires>`, which maps the port tuple to `{ [portName]: service }`. For empty requires, the deps parameter is `EmptyDeps` (a branded empty object that prevents arbitrary key access).
- Async detection uses `constructor.name === "AsyncFunction"` rather than checking the return type, because arrow functions returning Promises are not `AsyncFunction` instances. The type system separately tracks `IsAsyncFactory<TFactory>` via return type inspection.
- `FactoryResult<T, E>` (duck-typed `{ _tag: "Ok" | "Err" }`) enables factories to return `Result` values. The error type `E` flows to `TError` on the adapter and must be handled via `adapterOrDie`, `adapterOrElse`, or `adapterOrHandle` before the adapter can be used in a graph.
- Cross-ref: [INV-CO-7](../invariants.md#inv-co-7-factory-errors-flow-through-result).

## BEH-CO-02-002: createAdapter() with class constructor

Creates an adapter from a class constructor. The constructor receives service dependencies as positional arguments matching the order of the `requires` tuple. Class adapters are always synchronous.

```ts
function createAdapter<
  TProvides extends Port<string, unknown>,
  const TRequires extends readonly Port<string, unknown>[],
  TClass extends new (...args: PortsToServices<TRequires>) => InferService<TProvides>,
>(config: {
  readonly provides: TProvides;
  readonly class: TClass;
  readonly requires?: TRequires;
  readonly lifetime?: Lifetime;
  readonly clonable?: boolean;
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, "sync", TClonable, TRequires>;
```

**Exported from**: `adapters/unified.ts`, re-exported from `index.ts`

**Algorithm**:

1. Same mutual exclusion and default logic as BEH-CO-02-001.
2. `factoryKind` is always `"sync"` (class instantiation cannot be async).
3. Build an internal factory closure: `(deps) => new ClassConstructor(...extractServicesInOrder(deps, requires))`.
4. `extractServicesInOrder` maps the `requires` tuple to positional constructor arguments by reading `deps[port.__portName]` in tuple order.
5. Freeze and return the adapter.

**Behavior Table**:

| Config                                                      | Constructor args                    |
| ----------------------------------------------------------- | ----------------------------------- |
| `{ provides: P, class: C }`                                 | `new C()` (zero args)               |
| `{ provides: P, requires: [LoggerPort], class: C }`         | `new C(loggerInstance)`             |
| `{ provides: P, requires: [LoggerPort, DbPort], class: C }` | `new C(loggerInstance, dbInstance)` |

**Example**:

```ts
import { port, createAdapter } from "@hex-di/core";

interface UserService {
  getUser(id: string): Promise<User>;
}
interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): Promise<unknown>;
}

const UserServicePort = port<UserService>()({ name: "UserService", direction: "inbound" });
const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

class UserServiceImpl implements UserService {
  constructor(
    private db: Database,
    private logger: Logger
  ) {}
  async getUser(id: string) {
    /* ... */
  }
}

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort],
  lifetime: "scoped",
  class: UserServiceImpl,
});
```

**Design notes**:

- `PortsToServices<TRequires>` maps `[typeof DbPort, typeof LoggerPort]` to `[Database, Logger]`, ensuring the class constructor signature matches the requires tuple order.
- The `factory` and `class` properties are mutually exclusive at the type level: `FactoryConfig` declares `class?: never` and `ClassConfig` declares `factory?: never`. If both are provided, the implementation throws `TypeError` (HEX020).
- Class adapters cannot have `TError != never` because `new` expressions cannot return `Result`. Only factory-based adapters support fallible construction.

## BEH-CO-02-003: Lifetime configuration (SINGLETON, SCOPED, TRANSIENT)

The `lifetime` property controls when the container creates new instances vs. reuses cached ones.

```ts
type Lifetime = "singleton" | "scoped" | "transient";
```

**Exported from**: `adapters/types.ts` (type), `adapters/constants.ts` (literal constants)

**Algorithm**:

1. If `lifetime` is omitted from config, it defaults to `"singleton"`.
2. For async factories (`factoryKind === "async"`), lifetime is enforced to `"singleton"`. Non-singleton + async produces `AsyncLifetimeError<L>` at the type level, which is a template literal error string that makes the adapter unusable with `GraphBuilder`.
3. At runtime, `assertValidAdapterConfig` validates lifetime is one of `"singleton"`, `"scoped"`, `"transient"`.

**Behavior Table**:

| Lifetime      | Instance creation       | Cache scope                           |
| ------------- | ----------------------- | ------------------------------------- |
| `"singleton"` | Once per root container | Shared across all scopes              |
| `"scoped"`    | Once per scope          | Isolated to the scope that created it |
| `"transient"` | Every `resolve()` call  | No caching                            |

**Example**:

```ts
import { createAdapter, SINGLETON, SCOPED, TRANSIENT } from "@hex-di/core";

// Singleton (default)
const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  factory: () => loadConfig(),
});
// adapter.lifetime === "singleton"

// Scoped
const RequestContextAdapter = createAdapter({
  provides: RequestContextPort,
  lifetime: "scoped",
  factory: () => new RequestContext(),
});

// Transient
const UuidAdapter = createAdapter({
  provides: UuidPort,
  lifetime: "transient",
  factory: () => crypto.randomUUID(),
});
```

**Design notes**:

- `SINGLETON`, `SCOPED`, `TRANSIENT` are literal-typed constants exported from `adapters/constants.ts`. They carry their literal type (e.g., `typeof SINGLETON` is `"singleton"`, not `string`), enabling type narrowing without `as const`.
- The async+non-singleton constraint exists because async factories are resolved during `container.initialize()`, which runs once. Scoped/transient semantics require on-demand factory invocation, which conflicts with async initialization.
- `ScopeRequiredError` is thrown at runtime when resolving a scoped adapter from the root container (no scope boundary exists).

## BEH-CO-02-004: requires/provides tuple declarations

The `requires` array declares dependency ports as an ordered tuple. The `provides` property declares the output port. Both carry full type information.

```ts
// requires: tuple of port tokens
readonly requires: readonly [typeof LoggerPort, typeof DatabasePort];

// provides: single port token
readonly provides: typeof UserServicePort;
```

**Exported from**: Structural properties on `Adapter` type from `adapters/types.ts`

**Algorithm**:

1. `requires` is stored as a frozen array on the adapter. If omitted, defaults to `EMPTY_REQUIRES` (a frozen empty array).
2. `TupleToUnion<TRequires>` converts the tuple to a union for the adapter's `TRequires` type parameter.
3. `ResolvedDeps<TRequires>` maps the union to `{ [portName]: serviceType }` for the factory's `deps` parameter.
4. Runtime validation in `assertValidAdapterConfig` checks: (a) each element is a port-like object, (b) no duplicates (by `__portName`), (c) no self-dependency (`provides.__portName` not in `requires`).

**Behavior Table**:

| Validation                 | Error              |
| -------------------------- | ------------------ |
| Non-port in requires       | `TypeError` HEX013 |
| Duplicate port in requires | `TypeError` HEX017 |
| Self-dependency            | `TypeError` HEX006 |
| requires is not an array   | `TypeError` HEX012 |
| provides is missing        | `TypeError` HEX010 |
| provides is not a port     | `TypeError` HEX011 |

**Example**:

```ts
import { port, createAdapter } from "@hex-di/core";

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): Promise<unknown>;
}
interface UserService {
  getUser(id: string): Promise<User>;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserServicePort = port<UserService>()({ name: "UserService", direction: "inbound" });

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort],
  factory: deps => {
    // deps is typed as { Database: Database; Logger: Logger }
    return new UserServiceImpl(deps.Database, deps.Logger);
  },
});

// adapter.provides === UserServicePort
// adapter.requires === [DatabasePort, LoggerPort]
```

**Design notes**:

- The `requires` tuple preserves ordering. For class adapters, this ordering determines constructor parameter positions (BEH-CO-02-002). For factory adapters, ordering is irrelevant since deps are keyed by name.
- `PortDeps<TRequires>` composes `TupleToUnion` and `ResolvedDeps` to produce the typed deps object. For empty tuples, `PortDeps<readonly []>` yields `EmptyDeps`, a branded empty type that prevents accidental `deps.nonExistent` access.
- Cross-ref: [INV-CO-7](../invariants.md#inv-co-7-factory-errors-flow-through-result).
