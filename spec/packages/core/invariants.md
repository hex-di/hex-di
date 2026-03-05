# Invariants

Runtime guarantees and contracts enforced by the `@hex-di/core` implementation.

## INV-CO-1: Frozen Port Definitions

All port objects created by `port()` and `createPort()` are `Object.freeze()`d immediately after construction. No property can be added, removed, or modified after creation.

**Source**: `ports/factory.ts` — `Object.freeze()` applied in both `port()` and `createPort()`.

**Implication**: Port contracts are immutable. A port passed to an adapter cannot be modified to change the expected service interface.

## INV-CO-2: Frozen Resolved Services

Resolved service instances returned by the container are `Object.freeze()`d before injection. Consumers receive immutable capabilities.

**Source**: Container resolution pipeline — `Object.freeze()` applied after factory invocation.

**Implication**: Injected services cannot be mutated by consumers. This prevents capability tampering where one consumer modifies a shared service to affect others. See [BEH-CO-05](behaviors/05-frozen-port-references.md).

**Referenced from**: [ADR-CO-001](decisions/001-frozen-port-references.md), [BEH-CO-05](behaviors/05-frozen-port-references.md).

## INV-CO-3: Blame Context on All Errors

Every `ContainerError` includes a `BlameContext` structure identifying which adapter violated which contract. No error is raised without attribution.

**Source**: Error construction pipeline — `BlameContext` is a required field on all container error types.

**Implication**: Debugging resolution failures always identifies the responsible adapter and the specific contract violation, even in deep dependency chains. See [BEH-CO-06](behaviors/06-blame-aware-errors.md).

**Referenced from**: [ADR-CO-002](decisions/002-blame-context-model.md), [BEH-CO-06](behaviors/06-blame-aware-errors.md).

## INV-CO-4: Blame Propagation Through Chains

When a resolution failure occurs in a transitive dependency, the blame context includes the full resolution path from the initial resolve call to the failing adapter.

**Source**: Resolution engine — resolution path is accumulated during recursive resolution and attached to errors.

**Implication**: Consumers can trace errors to their root cause even when the failure is several levels deep in the dependency graph. See [BEH-CO-06](behaviors/06-blame-aware-errors.md).

**Referenced from**: [ADR-CO-002](decisions/002-blame-context-model.md), [BEH-CO-06](behaviors/06-blame-aware-errors.md).

## INV-CO-5: Phantom Disposal Prevention

A container or adapter handle branded with phantom type `"disposed"` does not expose `resolve()` or service access methods at the type level. Attempting to resolve from a disposed container is a compile-time error.

**Source**: `Container<TProvides, TPhase>` type — `resolve()` method is conditionally available only when `TPhase extends "active"`.

**Implication**: Use-after-dispose bugs are caught by the TypeScript compiler rather than at runtime. See [BEH-CO-07](behaviors/07-disposal-state-branding.md).

**Referenced from**: [ADR-CO-003](decisions/003-disposal-state-phantom-types.md), [BEH-CO-07](behaviors/07-disposal-state-branding.md).

## INV-CO-6: Error Objects Are Frozen

All error objects returned from adapter factories and container operations are `Object.freeze()`d. Error values are immutable.

**Source**: Error construction — `Object.freeze()` applied to all error instances.

**Implication**: Error objects cannot be mutated after creation. Consistent with `@hex-di/result`'s [INV-7](../result/invariants.md#inv-7-createerror-output-is-frozen).

## INV-CO-7: Factory Errors Flow Through Result

No factory function (`createAdapter`, `adapterOrDie`, `adapterOrElse`, `adapterOrHandle`) throws exceptions for construction errors. All construction failures are returned as `Err` variants of `Result<T, E>`.

**Source**: `adapters/unified.ts` — all factory functions return `Result<Adapter, FactoryError>`.

**Implication**: Consumers can handle construction errors using the `Result` API (`match`, `catchTag`, `mapErr`) without try/catch blocks. Throwing is reserved for truly unrecoverable invariant violations (bugs).

**Referenced from**: [BEH-CO-02](behaviors/02-adapter-creation.md), [BEH-CO-03](behaviors/03-adapter-error-handling.md).
