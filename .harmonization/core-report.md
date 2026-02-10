# HexDi Core Ecosystem Compatibility Report

**Reviewer:** Core Specialist
**Package:** `@hex-di/core` (packages/core/src/)
**Date:** 2026-02-07

---

## Executive Summary

The `@hex-di/core` package provides a solid foundation for the ecosystem. Its port/adapter type system, `ResolvedDeps` mapping, `DirectedPort` direction branding, `PortMetadata`, and `VisualizableAdapter` inspection types are well-designed and consistently used by the new library specs. However, several gaps and inconsistencies exist that need resolution before the ecosystem libraries ship.

**Overall Assessment:** Core is ~85% ready. The fundamental patterns (Port, Adapter, createAdapter, port()) are sound and the new libraries extend them correctly. The issues below are addressable without breaking the core API.

---

## 1. Port Definition Patterns

### What Core Provides

Core defines ports via two primary mechanisms:

- **`Port<T, TName>`** -- branded phantom type with `__brand` and `__portName` (`packages/core/src/ports/types.ts:76-88`)
- **`DirectedPort<TService, TName, TDirection>`** -- extends Port with direction and metadata brands (`packages/core/src/ports/types.ts:301-307`)
- **`port<TService>()(config)`** -- curried builder factory (`packages/core/src/ports/factory.ts:149-163`)
- **`createPort(config)`** -- direct factory with overloads (`packages/core/src/ports/factory.ts:76-118`)

### Ecosystem Consistency

**COMPATIBLE:** All new libraries correctly extend `DirectedPort`:

| Library             | Port Pattern                                                      | Extends DirectedPort? | Direction        |
| ------------------- | ----------------------------------------------------------------- | --------------------- | ---------------- |
| Store (StatePort)   | `DirectedPort<StateService<T,A>, TName, "outbound">`              | Yes                   | outbound         |
| Store (AtomPort)    | `DirectedPort<AtomService<T>, TName, "outbound">`                 | Yes                   | outbound         |
| Store (DerivedPort) | `DirectedPort<DerivedService<T>, TName, "outbound">`              | Yes                   | outbound         |
| Store (EffectPort)  | `Port<ActionEffect>` with `direction: "inbound"`                  | Yes                   | inbound          |
| Query               | `createQueryPort`                                                 | Yes (implied)         | outbound         |
| Saga (domain)       | `SagaPort<TName, TInput, TOutput, TError>`                        | Yes (implied)         | outbound         |
| Saga (mgmt)         | `SagaManagementPort<TName, TOutput, TError>`                      | Yes (implied)         | outbound         |
| Flow                | `Port<FlowService<TState, TEvent, TContext>, TName>` via `port()` | Yes                   | default outbound |

**ISSUE FOUND: Curried factory pattern inconsistency**

Store uses a curried form for its port factories (`createStatePort<TState, TActions>()(config)`) which mirrors core's `port<TService>()(config)` pattern. This is consistent. However, the spec mentions the curried form is needed because "TypeScript cannot partially infer generic parameters." Core already solves this with `port()`, so store's `createStatePort` should ideally delegate to core's curried pattern internally rather than reimplementing it.

**RECOMMENDATION:** Document in core that the `port<TService>()(config)` curried pattern is the canonical approach for ecosystem libraries that need to fix some type parameters while inferring others.

### Phantom Type Branding Pattern

Store introduces additional phantom brands using `unique symbol`:

```
[__stateType]: TState
[__actionsType]: TActions
[__atomType]: TValue
[__asyncDerivedErrorType]: E
```

These extend the `DirectedPort` type with extra branded properties. This is **compatible** with core because `DirectedPort` is an intersection type -- adding more branded fields preserves assignability to the base `Port<T, TName>` type. The new fields enable `InferStateType<P>`, `InferActionsType<P>`, etc.

**OBSERVATION:** Core should consider exporting a pattern or utility for "extending DirectedPort with additional phantom brands" since multiple libraries (store, flow, potentially saga) use this pattern. Currently each library independently declares `unique symbol` brands.

---

## 2. Adapter Registration Patterns

### What Core Provides

- **`Adapter<TProvides, TRequires, TLifetime, TFactoryKind, TClonable, TRequiresTuple>`** -- branded adapter type (`packages/core/src/adapters/types.ts:147-219`)
- **`createAdapter(config)`** -- unified factory with factory/class variants and extensive overloads (`packages/core/src/adapters/unified.ts`)
- **`AdapterConstraint`** -- structural interface for type-safe collections (`packages/core/src/adapters/types.ts:252-291`)

### Ecosystem Consistency

**COMPATIBLE:** All new libraries return standard `Adapter<...>` types from their factory functions:

| Library | Factory                             | Returns                                                                    |
| ------- | ----------------------------------- | -------------------------------------------------------------------------- |
| Store   | `createStateAdapter(config)`        | `Adapter<TPort, TupleToUnion<TRequires>, "singleton" \| "scoped", "sync">` |
| Store   | `createAtomAdapter(config)`         | `Adapter<TPort, never, "singleton" \| "scoped", "sync">`                   |
| Store   | `createDerivedAdapter(config)`      | `Adapter<TPort, TupleToUnion<TRequires>, "singleton" \| "scoped", "sync">` |
| Store   | `createAsyncDerivedAdapter(config)` | `Adapter<TPort, TupleToUnion<TRequires>, "singleton", "async">`            |
| Store   | `createEffectAdapter(config)`       | `Adapter<...> & EffectAdapterBrand`                                        |
| Query   | `createQueryAdapter(port, config)`  | `Adapter<...>`                                                             |
| Saga    | saga adapter                        | `Adapter<...>`                                                             |
| Flow    | `createFlowAdapter(config)`         | `Result<Adapter<...>, FlowAdapterError>`                                   |

**ISSUE FOUND: `createEffectAdapter` brand extension**

Store's `createEffectAdapter` returns `Adapter<...> & EffectAdapterBrand` where `EffectAdapterBrand = { readonly [__effectBrand]: true }`. This uses an intersection type to brand the adapter. Core's `AdapterConstraint` does not account for this additional property -- since `AdapterConstraint` is structural, branded adapters ARE assignable to it. However, graph iteration code that checks for the brand at runtime needs to know about this property. The brand check is `typeof adapter[__effectBrand] === 'boolean'`.

**COMPATIBILITY STATUS:** Compatible. The runtime brand check is store-internal and doesn't require core changes. The store runtime inspects adapters after resolution.

**ISSUE FOUND: Flow's `createFlowAdapter` returns `Result`**

Flow's `createFlowAdapter(config)` returns `Result<FlowAdapter, FlowAdapterError>`, not a plain `FlowAdapter`. This means the adapter needs to be unwrapped before being passed to `GraphBuilder.provide()`. This is different from how store, query, and saga factories return plain adapters.

**RECOMMENDATION:** This is intentional design (validation at adapter creation time), but core's `GraphBuilder.provide()` needs to accept only `AdapterConstraint`, not `Result<AdapterConstraint, E>`. Flow users must unwrap first. Document this as a deliberate design choice in the flow spec.

### Config Patterns

All ecosystem adapter configs follow the `{ provides, requires?, lifetime?, factory }` pattern from core's `BaseUnifiedConfig`. The key properties are consistent:

- `provides: TPort` -- port token
- `requires: readonly Port[]` -- dependency array with `as const`
- `lifetime: Lifetime` -- singleton/scoped/transient
- `factory: (deps: ResolvedDeps<...>) => T` -- factory function

Store introduces domain-specific config fields (`initial`, `actions`, `effects`, `onEffectError`) which extend the base pattern without conflicting.

---

## 3. Service Tag Patterns and Naming Conventions

### Port Naming

Core uses PascalCase port names: `"Logger"`, `"UserService"`, `"UserRepository"`. The convention is:

```typescript
const LoggerPort = port<Logger>()({ name: "Logger" });
```

**Ecosystem consistency check:**

| Library       | Example Names                                              | Convention                    |
| ------------- | ---------------------------------------------------------- | ----------------------------- |
| Store         | `"Todo"`, `"Auth"`, `"Theme"`, `"CartTotal"`               | PascalCase -- consistent      |
| Store Effects | `"ActionLogger"`, `"StatePersister"`, `"AnalyticsTracker"` | PascalCase -- consistent      |
| Query         | `"Users"`, `"Products"`, `"Orders"`                        | PascalCase -- consistent      |
| Saga          | `"OrderSaga"`, `"OrderSagaManagement"`                     | PascalCase -- consistent      |
| Flow          | `"order"` (machine id)                                     | lowercase -- **inconsistent** |

**ISSUE FOUND: Flow machine IDs vs port names**

The flow spec shows `id: "order"` for machine definitions, which is lowercase. Port names throughout the ecosystem use PascalCase. The flow spec's `createFlowPort` delegates to core's `port()`, which creates the port with the given name. The machine `id` is separate from the port name. However, the flow metadata stores `machineId` which may be displayed alongside port names in graph visualization. A naming convention should be established.

**RECOMMENDATION:** Clarify that `machineId` is an internal flow concept (lowercase ok), while port names must follow PascalCase convention.

### Tag Conventions

Core's `PortMetadata` defines `tags?: readonly string[]` for filtering/discovery. Store ports use tags like `["domain", "crud"]`, `["security", "session"]`. Categories use strings like `"auth"`, `"todo"`, `"infrastructure"`.

Core provides `SuggestedCategory` with IDE autocomplete (`packages/core/src/ports/types.ts:480-488`):

- `"persistence"`, `"messaging"`, `"external-api"`, `"logging"`, `"configuration"`, `"domain"`, `"infrastructure"`

**ISSUE FOUND: Missing store/query/saga/flow categories**

Store ports use `category: "auth"`, `category: "todo"` -- these are domain-specific, not in `SuggestedCategory`. This is fine (the escape hatch `string & {}` allows any string), but the suggested list could be expanded to include common ecosystem categories like `"state"`, `"query"`, `"saga"`, `"flow"`, `"effect"`.

**RECOMMENDATION:** Add ecosystem-aware categories to `SuggestedCategory`:

- `"state"` -- for store state ports
- `"query"` -- for query data ports
- `"saga"` -- for saga orchestration ports
- `"flow"` -- for flow state machine ports
- `"effect"` -- for cross-cutting effect ports

---

## 4. Type-Level Contracts and Generic Patterns

### `ResolvedDeps<TRequires>` Mapping

Core defines `ResolvedDeps<TRequires>` at `packages/core/src/adapters/types.ts:98-102`:

```typescript
type ResolvedDeps<TRequires> = [TRequires] extends [never]
  ? EmptyDeps
  : { [TPort in TRequires as InferPortName<TPort> & string]: InferService<TPort> };
```

**All ecosystem libraries use this correctly:**

- Store's adapter configs accept `deps: ResolvedDeps<TupleToUnion<TRequires>>`
- Store's `DerivedDeps<TRequires>` is explicitly documented as a local alias for the same mapping
- Query adapters use the same `ResolvedDeps` pattern through their factory configs
- Saga step invocations resolve ports via `container.resolve()` using the same type mapping
- Flow's `DIEffectExecutor` receives `ResolvedDeps` through the adapter factory

**COMPATIBLE:** No issues found.

### `TupleToUnion` Utility

Core defines `TupleToUnion<T>` at `packages/core/src/utils/type-utilities.ts`. All ecosystem libraries use `TupleToUnion<TRequires>` to convert the `readonly Port[]` tuple into a union for `ResolvedDeps`. This is consistent.

### `InferService<P>` and `InferPortName<P>`

Core's inference utilities (`packages/core/src/ports/types.ts:164,199`) are used throughout:

- Store uses `InferService<TPort>` for adapter type inference
- Store adds `InferStateType<P>`, `InferActionsType<P>`, `InferAtomType<P>` that follow the same pattern
- Query uses `InferService<TPort>` for query fetcher type extraction
- All inference utilities return `NotAPortError<T>` on invalid input

**COMPATIBLE:** The pattern is well-established and consistently followed.

### Lifetime Constraints

Core defines `Lifetime = "singleton" | "scoped" | "transient"` (`packages/core/src/adapters/types.ts:50`).

Ecosystem lifetime usage:

| Library               | Allowed Lifetimes                        | Reason                                  |
| --------------------- | ---------------------------------------- | --------------------------------------- |
| Store (state)         | `"singleton" \| "scoped"`                | No transient (defeats reactive sharing) |
| Store (atom)          | `"singleton" \| "scoped"`                | Same reasoning                          |
| Store (derived)       | `"singleton" \| "scoped"`                | Follows source lifetime rule            |
| Store (async derived) | `"singleton"`                            | Always singleton                        |
| Store (effect)        | `"singleton"`                            | Always singleton (cached at init)       |
| Query                 | `"singleton" \| "scoped"`                | Standard DI lifetimes                   |
| Saga                  | `"scoped"` (default)                     | Per-request isolation                   |
| Flow                  | `"singleton" \| "scoped" \| "transient"` | Full range                              |

**COMPATIBLE:** All libraries restrict lifetime to subsets of core's `Lifetime` union, which is type-safe. Core's `EnforceAsyncLifetime` utility handles async-to-singleton enforcement.

---

## 5. Error Types and Error Handling Conventions

### Core Error System

Core uses **two error paradigms**:

1. **Exception-based** (`packages/core/src/errors/`): `ContainerError` base class, concrete subclasses (`CircularDependencyError`, `FactoryError`, etc.), numeric codes (`HEX001`-`HEX025`), and `ParsedError` discriminated union for structured parsing.

2. **Type-level errors**: Template literal error strings in lifetime position (`AsyncLifetimeError<L>`), branded error types (`NotAPortError<T>`, `BothFactoryAndClassError`).

### Ecosystem Error Patterns

**CRITICAL FINDING: Two competing error paradigms**

The ecosystem specs introduce a **third** error paradigm: tagged union error objects with `_tag` discriminants, following the `@hex-di/result` convention:

| Library            | Error Style  | Example `_tag` values                                                                                     |
| ------------------ | ------------ | --------------------------------------------------------------------------------------------------------- |
| Result integration | Tagged union | `"MissingAdapter"`, `"CircularDependency"`, `"LifetimeMismatch"`, `"FactoryError"`, `"DisposedContainer"` |
| Store              | Tagged union | `"EffectFailed"`, `"EffectErrorHandlerError"`, `"ScopeRequired"`                                          |
| Query              | Tagged union | `"QueryAdapterMissing"`, `"QueryDisposed"`, `"QueryResolutionError"`                                      |
| Saga               | Tagged union | `"StepFailed"`, `"CompensationFailed"`                                                                    |
| Flow               | Tagged union | `"DuplicateActivityPort"`, `"ActivityNotFrozen"`, `"MetadataInvalid"`, `"Disposed"`                       |

**ISSUE: Core's `ContainerError` hierarchy vs ecosystem's tagged unions**

Core's runtime errors are exception classes (`ContainerError` subclasses with numeric `HEX` codes). The `@hex-di/result` spec bridges this with `resolveResult()` which catches exceptions and converts to `ResolutionError` tagged union. But there is no unified error taxonomy.

For example:

- Core throws `ScopeRequiredError` (class, code `HEX023`)
- Store's spec references `ScopeRequiredError` (same exception)
- Result spec maps it to `ResolutionError` with `_tag: "LifetimeMismatch"`

The mapping between core exception classes and ecosystem tagged unions is ad-hoc. The `ResolutionError` type (`spec/result/12-hexdi-integration.md`) has 5 variants, but core has 25+ error codes.

**RECOMMENDATION:**

1. Core should export a canonical `ResolutionError` tagged union type alongside the exception classes
2. Each core exception class should have a corresponding `_tag` value
3. The `toResolutionError()` mapping function should be part of core, not result

### Error Namespace Conventions

The ecosystem uses `hex-di.*` namespace for tracing span attributes:

| Library | Prefix           | Examples                                        |
| ------- | ---------------- | ----------------------------------------------- |
| Query   | `hex-di.query.*` | `hex-di.query.port.name`, `hex-di.query.result` |
| Saga    | `hex-di.saga.*`  | `hex-di.saga.name`, `hex-di.saga.error._tag`    |
| Store   | `hex-di.store.*` | (implied by action tracing)                     |

**COMPATIBLE:** The `hex-di.*` namespace convention is consistent across all specs.

---

## 6. How Core's API Surface Supports the New Libraries

### What Works Well

1. **`port()` curried factory** -- Provides the foundation for all ecosystem port factories. Store, query, saga, and flow all build on this.

2. **`createAdapter()` with overloads** -- The extensive overload set handles all ecosystem use cases (factory vs class, sync vs async, lifetime variations).

3. **`ResolvedDeps<TRequires>` and `TupleToUnion`** -- Clean, consistent dependency resolution type mapping used uniformly across all libraries.

4. **`DirectedPort` with metadata** -- `PortMetadata` (description, category, tags) propagates well to graph visualization. All ecosystem ports correctly use this.

5. **`VisualizableAdapter` for inspection** -- Provides the foundation for graph visualization. Flow extends it with `metadata?: Record<string, unknown>`.

6. **`AdapterConstraint`** -- Universal adapter matching works correctly with all ecosystem adapter types.

7. **Lifetime system** -- `singleton | scoped | transient` with captive dependency detection covers all ecosystem needs.

### Gaps Requiring Core Changes

#### Gap 1: `VisualizableAdapter.metadata` is missing

The flow spec (`spec/flow/07-ports-and-adapters.md`) states:

> "The existing `VisualizableAdapter` interface in `packages/core/src/inspection/` must be extended to support an optional `metadata?: Record<string, unknown>` property"

Currently `VisualizableAdapter` (`packages/core/src/inspection/inspector-types.ts:67-92`) does NOT have a `metadata` field. This needs to be added for flow (and potentially store/query) to attach domain-specific metadata to adapters for graph introspection.

**REQUIRED CHANGE:**

```typescript
// packages/core/src/inspection/inspector-types.ts
export interface VisualizableAdapter {
  // ... existing fields ...
  readonly metadata?: Readonly<Record<string, unknown>>;
}
```

#### Gap 2: `resolveResult` is not on the Container interface

The result spec (`spec/result/12-hexdi-integration.md`) shows `container.resolveResult(port)` as a method on Container. But core does not define a Container interface -- that lives in `@hex-di/runtime`. The result spec proposes this as a thin wrapper:

```typescript
function resolveResult<T>(container: Container, port: Port<T, string>): Result<T, ResolutionError>;
```

Core needs to export at minimum a `ContainerLike` interface that the ecosystem can depend on, or the `resolveResult` extension point needs to be clearly documented as a runtime concern.

#### Gap 3: No `ResolutionError` tagged union in core

As noted in the error section, core exports exception classes but not a tagged union `ResolutionError` type. Every ecosystem library that uses `resolveResult()` references this type. It should be exported from either core or a shared types package.

#### Gap 4: Inspector API doesn't support `ResultStatistics`

The result spec (`spec/result/12-hexdi-integration.md:150-172`) proposes `getResultStatistics()`, `getAllResultStatistics()`, and `getHighErrorRatePorts()` on the Inspector. Core's `InspectorAPI` (`packages/core/src/inspection/inspector-types.ts:182-285`) does not include these methods. Either:

1. Core's `InspectorAPI` should be extensible (add a generic extension point), or
2. The result package should extend the inspector separately (augmentation pattern)

**RECOMMENDATION:** Use module augmentation from `@hex-di/result` to extend `InspectorAPI`, keeping core independent of result types.

#### Gap 5: Query spec's `BuilderInternals` extension

The query spec (`spec/query/10-integration.md:288-346`) proposes adding `TQueryDepGraph` as an 8th type parameter to `BuilderInternals` (which lives in `@hex-di/graph`, not core). This is a graph-level concern, not a core concern, but it references core's type utilities.

**ASSESSMENT:** No core change needed. This is a graph package concern.

---

## 7. Summary of Required Actions

### Critical (Must fix before ecosystem ships)

| #   | Issue                                   | Location                                             | Action                                                      |
| --- | --------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| C1  | Add `metadata` to `VisualizableAdapter` | `packages/core/src/inspection/inspector-types.ts:67` | Add `readonly metadata?: Readonly<Record<string, unknown>>` |
| C2  | Export `ResolutionError` tagged union   | New file or existing errors module                   | Define and export canonical tagged union                    |

### Important (Should fix for consistency)

| #   | Issue                                         | Location                               | Action                                                                |
| --- | --------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| I1  | Expand `SuggestedCategory`                    | `packages/core/src/ports/types.ts:480` | Add `"state"`, `"query"`, `"saga"`, `"flow"`, `"effect"`              |
| I2  | Document curried factory as canonical pattern | Core docs/README                       | Explain `port<T>()(config)` is the ecosystem standard                 |
| I3  | Document phantom brand extension pattern      | Core docs/README                       | Guide libraries on extending DirectedPort with `unique symbol` brands |

### Nice to Have

| #   | Issue                     | Location              | Action                                                |
| --- | ------------------------- | --------------------- | ----------------------------------------------------- |
| N1  | Unify error taxonomy      | Core errors module    | Map all 25+ HEX codes to `_tag` values                |
| N2  | ContainerLike interface   | Core types            | Export minimal container interface for ecosystem libs |
| N3  | Inspector extension point | Core inspection types | Support optional extension via module augmentation    |

---

## 8. Cross-Reference Matrix

How each ecosystem spec references core types:

| Core Type                   | Result         | Store          | Query         | Saga | Flow           |
| --------------------------- | -------------- | -------------- | ------------- | ---- | -------------- |
| `Port<T, TName>`            | Yes            | Yes            | Yes           | Yes  | Yes            |
| `DirectedPort`              | -              | Yes (extended) | Yes (implied) | -    | Yes            |
| `Adapter<...>`              | -              | Yes            | Yes           | Yes  | Yes            |
| `createAdapter()`           | -              | Yes (base)     | Yes           | Yes  | Yes            |
| `port()`                    | -              | -              | -             | -    | Yes            |
| `ResolvedDeps<T>`           | -              | Yes            | Yes           | Yes  | Yes            |
| `TupleToUnion<T>`           | -              | Yes            | Yes           | Yes  | Yes            |
| `InferService<P>`           | -              | Yes            | Yes           | Yes  | Yes            |
| `InferPortName<P>`          | -              | Yes            | Yes           | -    | Yes            |
| `Lifetime`                  | -              | Yes            | Yes           | Yes  | Yes            |
| `PortMetadata`              | -              | Yes            | Yes           | -    | Yes            |
| `VisualizableAdapter`       | -              | -              | -             | -    | Yes (extended) |
| `InspectorAPI`              | Yes (extended) | -              | -             | -    | -              |
| `ContainerError`            | Yes (mapped)   | Yes (thrown)   | -             | -    | -              |
| `GraphBuilder.provide()`    | -              | Yes            | Yes           | Yes  | Yes            |
| `container.resolve()`       | Yes            | Yes            | Yes           | Yes  | Yes            |
| `container.resolveResult()` | Yes (proposed) | -              | Yes           | Yes  | Yes            |
| `container.createScope()`   | -              | Yes            | Yes           | Yes  | Yes            |

---

_End of Core Compatibility Report_
