# 07 — Disposal State Branding

Compile-time prevention of resolve-after-dispose via phantom type parameters on `Container`. See [ADR-CO-003](../decisions/003-disposal-state-phantom-types.md) and [RES-03](../../../research/RES-03-linear-affine-types-resource-lifecycle.md).

## BEH-CO-07-001: Container Phase Type Parameter

The `Container` type carries a phantom `TPhase` parameter that tracks lifecycle state. Methods are conditionally available based on the phase.

```ts
interface Container<TProvides, TPhase extends ContainerPhase = "active"> {
  resolve: TPhase extends "active"
    ? <N extends keyof TProvides>(port: Port<N, TProvides[N]>) => TProvides[N]
    : never;
  createScope: TPhase extends "active" ? () => Container<TProvides, "active"> : never;
  dispose: TPhase extends "active" ? () => Promise<Container<TProvides, "disposed">> : never;
  readonly phase: TPhase;
  readonly isDisposed: TPhase extends "disposed" ? true : false;
}

type ContainerPhase = "active" | "disposed";
```

**Algorithm**:

1. `buildContainer(graph)` returns `Container<TProvides, "active">`
2. `container.resolve(port)` is available only when `TPhase extends "active"`
3. `container.dispose()` transitions the type: returns `Container<TProvides, "disposed">`
4. On a `"disposed"` container, `resolve` and `createScope` are `never` — calling them is a type error
5. Runtime still checks phase as a fallback for aliased references

**Behavior Table**:

| Container Phase | `resolve()`          | `createScope()`      | `dispose()`                             | `isDisposed` |
| --------------- | -------------------- | -------------------- | --------------------------------------- | ------------ |
| `"active"`      | Available            | Available            | Available (transitions to `"disposed"`) | `false`      |
| `"disposed"`    | `never` (type error) | `never` (type error) | `never` (type error)                    | `true`       |

**Example**:

```ts
import { buildContainer, GraphBuilder, port } from "@hex-di/core";

const LoggerPort = port<Logger>()({ name: "Logger" });

// Build returns active container
const container = buildContainer(graph);
// Type: Container<{ Logger: Logger }, "active">

const logger = container.resolve(LoggerPort); // OK

// Dispose transitions the type
const disposed = await container.dispose();
// Type: Container<{ Logger: Logger }, "disposed">

disposed.resolve(LoggerPort);
// ^^^^^^^ Type error: resolve is never on disposed container

// Function signatures communicate requirements
function useContainer(c: Container<{ Logger: Logger }, "active">) {
  c.resolve(LoggerPort); // Guaranteed to be active at the type level
}

useContainer(disposed);
// ^^^^^^^^^ Type error: "disposed" is not assignable to "active"
```

**Design notes**:

- Default `TPhase = "active"` ensures backward compatibility — `Container<TProvides>` is equivalent to `Container<TProvides, "active">`.
- The aliasing limitation is documented in [ADR-CO-003](../decisions/003-disposal-state-phantom-types.md): phantom types cannot prevent use-after-dispose through separate references to the same container.
- Runtime `resolve()` still throws on disposed containers as a safety net.
- Cross-ref: [INV-CO-5](../invariants.md#inv-co-5-phantom-disposal-prevention).

## BEH-CO-07-002: Scope Containers Inherit Phase

Child containers created via `createScope()` inherit the `"active"` phase. Disposing a parent container also disposes all child scopes, transitioning their types to `"disposed"`.

```ts
createScope: TPhase extends "active"
  ? () => Container<TProvides, "active">
  : never;
```

**Algorithm**:

1. `createScope()` is only available on `"active"` containers
2. The returned child container has phase `"active"`
3. When the parent is disposed, all child containers are disposed in reverse creation order
4. Each child's phase transitions to `"disposed"`

**Behavior Table**:

| Parent Phase | `createScope()`                          | Child Phase |
| ------------ | ---------------------------------------- | ----------- |
| `"active"`   | Returns `Container<TProvides, "active">` | `"active"`  |
| `"disposed"` | `never` (type error)                     | N/A         |

**Example**:

```ts
const parent = buildContainer(graph);
// Type: Container<Ports, "active">

const child = parent.createScope();
// Type: Container<Ports, "active">

const childLogger = child.resolve(LoggerPort); // OK — child is active

await parent.dispose();
// Both parent and child are now disposed at runtime
// child.resolve(LoggerPort) throws at runtime
// (compile-time protection requires using the returned disposed reference)
```

**Design notes**:

- Child container disposal is covered in detail in [BEH-CO-04-003](04-container-lifecycle.md).
- The type system cannot enforce that disposing a parent invalidates child references (aliasing limitation). Runtime checks remain the safety net.
- Cross-ref: [BEH-CO-14](14-formal-disposal-ordering.md) for formal disposal ordering guarantees.
