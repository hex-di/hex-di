# 06 — Blame-Aware Errors

Every container error includes a `BlameContext` identifying which adapter violated which contract, the violation type, and the full resolution path. See [ADR-CO-002](../decisions/002-blame-context-model.md) and [RES-06](../../../research/RES-06-contracts-blame-gradual-typing.md).

## BEH-CO-06-001: BlameContext Structure

All container errors carry a `blame` property with structured attribution information.

```ts
interface BlameContext {
  readonly adapterFactory: {
    readonly name: string;
    readonly sourceLocation?: string;
  };
  readonly portContract: {
    readonly name: string;
    readonly direction: PortDirection;
  };
  readonly violationType: BlameViolationType;
  readonly resolutionPath: ReadonlyArray<string>;
}

type BlameViolationType =
  | { readonly _tag: "FactoryError"; readonly error: unknown }
  | { readonly _tag: "LifetimeViolation"; readonly expected: string; readonly actual: string }
  | { readonly _tag: "MissingDependency"; readonly missingPort: string }
  | { readonly _tag: "DisposalError"; readonly error: unknown }
  | { readonly _tag: "ContractViolation"; readonly details: string };
```

**Exported from**: `errors/types.ts`.

**Algorithm**:

1. When an error occurs during resolution, construct a `BlameContext`
2. Capture the adapter name and source location (if available via stack trace)
3. Capture the port name and direction from the port being resolved
4. Classify the violation into one of the discriminated tags
5. Attach the current resolution path (accumulated during recursive resolution)
6. `Object.freeze()` the entire `BlameContext` object
7. Attach to the error as the `blame` property

**Behavior Table**:

| Error Scenario                 | `violationType._tag`  | `resolutionPath`                    |
| ------------------------------ | --------------------- | ----------------------------------- |
| Factory returns `Err`          | `"FactoryError"`      | `["UserService", "UserRepo", "DB"]` |
| Singleton depends on transient | `"LifetimeViolation"` | `["AppRoot", "CacheService"]`       |
| Required port has no provider  | `"MissingDependency"` | `["UserService"]`                   |
| Dispose method throws          | `"DisposalError"`     | `["DBConnection"]`                  |
| Runtime contract check fails   | `"ContractViolation"` | `["AuthService", "TokenValidator"]` |

**Example**:

```ts
import { GraphBuilder, createAdapter, port, SINGLETON, ok, err } from "@hex-di/core";

const DBPort = port<Database>()({ name: "Database", direction: "outbound" });
const RepoPort = port<Repository>()({ name: "Repository", direction: "outbound" });
const ServicePort = port<Service>()({ name: "UserService" });

const dbAdapter = createAdapter({
  provides: [DBPort],
  factory: () => err({ _tag: "ConnectionFailed", host: "localhost:5432" }),
  lifetime: SINGLETON,
});

const repoAdapter = createAdapter({
  provides: [RepoPort],
  requires: [DBPort],
  factory: db => ok(new Repository(db)),
  lifetime: SINGLETON,
});

const serviceAdapter = createAdapter({
  provides: [ServicePort],
  requires: [RepoPort],
  factory: repo => ok(new UserService(repo)),
  lifetime: SINGLETON,
});

// Resolution error includes blame:
// {
//   _tag: "ResolutionError",
//   blame: {
//     adapterFactory: { name: "dbAdapter" },
//     portContract: { name: "Database", direction: "outbound" },
//     violationType: { _tag: "FactoryError", error: { _tag: "ConnectionFailed", ... } },
//     resolutionPath: ["UserService", "Repository", "Database"]
//   }
// }
```

**Design notes**:

- `BlameContext` is frozen ([INV-CO-6](../invariants.md#inv-co-6-error-objects-are-frozen)).
- `violationType._tag` enables `catchTag`-based selective error recovery from `@hex-di/result`.
- Resolution path reads left-to-right: the first element is the initially requested port, the last is where the failure occurred.
- Cross-ref: [INV-CO-3](../invariants.md#inv-co-3-blame-context-on-all-errors), [INV-CO-4](../invariants.md#inv-co-4-blame-propagation-through-chains).

## BEH-CO-06-002: Resolution Path Accumulation

The resolution engine maintains a path stack during recursive dependency resolution. Each `resolve()` call pushes its port name onto the stack. On error, the stack is captured as `resolutionPath`.

```ts
// Internal resolution with path tracking
resolveInternal<T>(
  port: Port<N, T>,
  path: ReadonlyArray<string>
): Result<T, ContainerError>
```

**Algorithm**:

1. Push `port.name` onto the path
2. For each dependency in `adapter.requires`:
   a. Recursively call `resolveInternal(dep, updatedPath)`
   b. If the recursive call returns `Err`, return it immediately (blame already attached)
3. Invoke the adapter factory with resolved dependencies
4. If factory returns `Err`, construct `BlameContext` with the current path and return error
5. If factory returns `Ok`, freeze the service (per [BEH-CO-05](05-frozen-port-references.md)) and return it

**Behavior Table**:

| Depth | Resolution                      | Path State                                                  |
| ----- | ------------------------------- | ----------------------------------------------------------- |
| 0     | `resolve(ServicePort)`          | `["UserService"]`                                           |
| 1     | Resolving dependency `RepoPort` | `["UserService", "Repository"]`                             |
| 2     | Resolving dependency `DBPort`   | `["UserService", "Repository", "Database"]`                 |
| 2     | DB factory returns `Err`        | Error with path `["UserService", "Repository", "Database"]` |

**Design notes**:

- Path is accumulated as an immutable array (each level creates a new array with the spread operator).
- Path accumulation adds O(n) allocation where n is the depth of the dependency chain. For typical graphs (depth < 20), this is negligible.
- Cross-ref: [INV-CO-4](../invariants.md#inv-co-4-blame-propagation-through-chains).

## BEH-CO-06-003: Blame-Enhanced Error Formatting

Error messages include human-readable blame information with ASCII formatting for terminal output.

```ts
// Formatted error message example:
// ┌─ Resolution Error ────────────────────────────────
// │ Port: "Database" (outbound)
// │ Adapter: DatabaseAdapter
// │ Violation: FactoryError — ConnectionFailed
// │ Path: UserService → Repository → Database
// └───────────────────────────────────────────────────
```

**Algorithm**:

1. Extract blame context from the error
2. Format port name and direction
3. Format adapter name and source location (if available)
4. Format violation type with tag and details
5. Format resolution path as `→`-separated names
6. Compose into box-drawn ASCII format

**Design notes**:

- ASCII formatting uses Unicode box-drawing characters for visual clarity in terminals.
- Source location is optional — only present when the adapter factory can be traced via stack inspection.
- Cross-ref: [ADR-GR-002](../../graph/decisions/002-ascii-cycle-diagrams.md) for shared ASCII diagram conventions.
