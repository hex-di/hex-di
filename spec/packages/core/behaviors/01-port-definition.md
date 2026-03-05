# 01 — Port Definition

Typed port token creation for hexagonal architecture. Ports are branded, frozen value+type duals that serve as compile-time contracts between services and their implementations. See [ADR-CO-001](../decisions/001-frozen-port-references.md).

## BEH-CO-01-001: port\<T\>()(config) — builder pattern

Creates a typed port token using the builder pattern. The service type `T` is supplied as an explicit generic, while the port name is inferred as a literal type from the config object. Direction defaults to `'outbound'`.

```ts
function port<TService>(): <const TConfig extends PortConfig>(
  config: TConfig
) => DirectedPort<
  TConfig["name"],
  TService,
  TConfig extends { direction: infer D extends PortDirection } ? D : "outbound",
  TConfig extends { category: infer C extends string } ? C : string
>;
```

**Exported from**: `ports/factory.ts`, re-exported from `index.ts`

**Algorithm**:

1. Outer call captures `TService` and returns a closure.
2. Inner call receives `config` with `name`, optional `direction`, `category`, `tags`, `description`.
3. Delegates to `createPort(config)` internally.
4. Returns the result cast to preserve the `TService` type parameter and inferred literal types.

**Behavior Table**:

| Config                                        | Inferred Type                                                |
| --------------------------------------------- | ------------------------------------------------------------ |
| `{ name: "Logger" }`                          | `DirectedPort<"Logger", TService, "outbound", string>`       |
| `{ name: "Request", direction: "inbound" }`   | `DirectedPort<"Request", TService, "inbound", string>`       |
| `{ name: "Cache", category: "persistence" }`  | `DirectedPort<"Cache", TService, "outbound", "persistence">` |
| `{ name: "Logger", tags: ["observability"] }` | `DirectedPort<"Logger", TService, "outbound", string>`       |

**Example**:

```ts
import { port } from "@hex-di/core";

interface Logger {
  log(message: string): void;
}

const LoggerPort = port<Logger>()({
  name: "Logger",
  direction: "outbound",
  category: "logging",
  tags: ["observability"],
});
// Type: DirectedPort<"Logger", Logger, "outbound", "logging">
```

**Design notes**:

- The double-call `port<T>()({...})` is necessary because TypeScript cannot partially infer generic parameters. The first call fixes `TService`, the second infers `TName` and `TDirection` from the config.
- This is the recommended API. It avoids repeating the port name as both a generic parameter and a config value.
- Cross-ref: [INV-CO-1](../invariants.md#inv-co-1-frozen-port-definitions).

## BEH-CO-01-002: createPort(config) — explicit generics

Creates a typed port token with explicit generic parameters for name and service type. Direction defaults to `'outbound'` at both the type and runtime level.

```ts
// Overload 1: Name + Service explicit, direction defaults
function createPort<
  const TName extends string,
  TService,
  const TCategory extends string = string,
>(
  config: PortConfig & { name: TName; category?: TCategory }
): DirectedPort<TName, TService, "outbound", TCategory>;

// Overload 2: Name + Service + Direction explicit
function createPort<
  const TName extends string,
  TService,
  const TDirection extends PortDirection,
  const TCategory extends string = string,
>(
  config: PortConfig & { name: TName; direction: TDirection; category?: TCategory }
): DirectedPort<TName, TService, TDirection, TCategory>;

// Overload 3: Full inference (TService = unknown)
function createPort<const TConfig extends PortConfig>(
  config: TConfig
): DirectedPort<TConfig["name"], unknown, ...>;
```

**Exported from**: `ports/factory.ts`, re-exported from `index.ts`

**Algorithm**:

1. Read `direction` from config, defaulting to `"outbound"` if absent.
2. Build `PortMetadata` from `description`, `category`, and `tags` (defaulting `tags` to `[]`).
3. `Object.freeze()` the metadata object.
4. Build `DirectedPortRuntime` with `__portName`, `[DIRECTION_BRAND]`, `[METADATA_KEY]`.
5. `Object.freeze()` the runtime object.
6. Return the frozen runtime via `createDirectedPortImpl()` which provides the phantom type bridge.

**Behavior Table**:

| Call                                                                       | Result Type                                           |
| -------------------------------------------------------------------------- | ----------------------------------------------------- |
| `createPort<"Logger", Logger>({ name: "Logger" })`                         | `DirectedPort<"Logger", Logger, "outbound", string>`  |
| `createPort<"Req", Req, "inbound">({ name: "Req", direction: "inbound" })` | `DirectedPort<"Req", Req, "inbound", string>`         |
| `createPort({ name: "Config" })`                                           | `DirectedPort<"Config", unknown, "outbound", string>` |

**Example**:

```ts
import { createPort } from "@hex-di/core";

interface UserRepository {
  findById(id: string): Promise<User | null>;
}

const UserRepoPort = createPort<"UserRepository", UserRepository>({
  name: "UserRepository",
  direction: "outbound",
  category: "persistence",
  tags: ["user", "database"],
});
```

**Design notes**:

- The name must be repeated as both a generic parameter (`"UserRepository"`) and a config value (`name: "UserRepository"`). Use `port<T>()({...})` (BEH-CO-01-001) to avoid this duplication.
- Overload 3 infers `TService` as `unknown` -- use this when the port is a pure token without a service contract.
- Cross-ref: [INV-CO-1](../invariants.md#inv-co-1-frozen-port-definitions).

## BEH-CO-01-003: Port metadata (direction, category, tags, description)

Ports carry structured metadata accessible at runtime via accessor functions. Metadata is stored in a frozen object under the `[METADATA_KEY]` symbol.

```ts
function getPortDirection(port: Port<string, unknown>): PortDirection | undefined;
function getPortMetadata(port: Port<string, unknown>): PortMetadata | undefined;

interface PortMetadata {
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}
```

**Exported from**: `ports/directed.ts`, re-exported from `index.ts`

**Algorithm**:

1. `getPortDirection(port)`: Check if `DIRECTION_BRAND in port`. If yes, return `port[DIRECTION_BRAND]`. Otherwise return `undefined`.
2. `getPortMetadata(port)`: Check if `METADATA_KEY in port`. If yes, return `port[METADATA_KEY]`. Otherwise return `undefined`.

**Behavior Table**:

| Config property | Runtime value when omitted          |
| --------------- | ----------------------------------- |
| `direction`     | `"outbound"`                        |
| `tags`          | `[]` (empty array, not `undefined`) |
| `description`   | `undefined`                         |
| `category`      | `undefined`                         |

**Example**:

```ts
import { port, getPortDirection, getPortMetadata } from "@hex-di/core";

interface Logger {
  log(msg: string): void;
}

const LoggerPort = port<Logger>()({
  name: "Logger",
  description: "Application logging",
  category: "logging",
  tags: ["observability", "core"],
});

getPortDirection(LoggerPort); // "outbound"
getPortMetadata(LoggerPort);
// { description: "Application logging", category: "logging", tags: ["observability", "core"] }
```

**Design notes**:

- `tags` normalizes to `[]` rather than `undefined` to enable safe iteration without null checks.
- `SuggestedCategory` provides IDE autocomplete for common values (`"persistence"`, `"messaging"`, `"domain"`, etc.) while accepting any `string` via the `(string & {})` escape hatch.
- Runtime symbols use `Symbol.for()` to ensure consistent identity across module boundaries (e.g., bundler deduplication).
- Type guards `isInboundPort()`, `isOutboundPort()`, and `isDirectedPort()` provide runtime narrowing.

## BEH-CO-01-004: Port immutability (Object.freeze)

All port objects are deeply frozen at creation time. Both the runtime object and its metadata are independently frozen.

```ts
function assertPortFrozen(port: Port<string, unknown>): void;
```

**Exported from**: `ports/directed.ts`, re-exported from `index.ts`

**Algorithm**:

1. In `createPort()`: call `Object.freeze(metadata)` on the metadata object.
2. Call `Object.freeze(runtime)` on the `DirectedPortRuntime` object containing `__portName`, `[DIRECTION_BRAND]`, and `[METADATA_KEY]`.
3. `assertPortFrozen(port)`: calls `Object.isFrozen(port)`. If `false`, throws `TypeError` with code `HEX028`.

**Behavior Table**:

| Operation                                | Result                                                  |
| ---------------------------------------- | ------------------------------------------------------- |
| `port.name = "other"`                    | `TypeError` in strict mode, silent no-op in sloppy mode |
| `delete port.__portName`                 | `TypeError` in strict mode                              |
| `Object.isFrozen(port)`                  | `true`                                                  |
| `Object.isFrozen(getPortMetadata(port))` | `true`                                                  |
| `assertPortFrozen(manuallyCreatedPort)`  | throws `TypeError("ERROR[HEX028]: ...")`                |

**Example**:

```ts
import { port, assertPortFrozen } from "@hex-di/core";

interface Logger {
  log(msg: string): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });

Object.isFrozen(LoggerPort); // true

// Attempting mutation in strict mode:
// LoggerPort.__portName = "Modified"; // TypeError: Cannot assign to read only property

// Verification guard:
assertPortFrozen(LoggerPort); // passes silently
```

**Design notes**:

- Freezing is applied in two layers: the metadata object and the runtime wrapper. This prevents mutation even through retained references to the metadata.
- `assertPortFrozen` is a development-time guard. It is not called on every resolution -- it exists for test assertions and defensive checks.
- The frozen guarantee underpins the entire adapter system: adapter `provides` and `requires` references are immutable port tokens, ensuring that the dependency graph cannot be silently modified after construction.
- Cross-ref: [INV-CO-1](../invariants.md#inv-co-1-frozen-port-definitions).
