# HexDi Runtime - Ecosystem Compatibility Report

## Executive Summary

`@hex-di/runtime` is the execution engine of HexDi, providing container creation, service resolution, scope management, lifecycle handling, and disposal. This report evaluates its compatibility with the ecosystem specs for Store, Query, Saga, Flow, and Tracing. The runtime is **well-designed for the ecosystem's needs**, with a few areas requiring attention for full harmonization.

**Overall verdict: COMPATIBLE with minor gaps.**

---

## 1. Container Resolution Patterns

### 1.1 Current Implementation

The runtime provides two resolution methods:

- **`resolve<P>(port: P): InferService<P>`** -- synchronous resolution (`container.ts:165-171`)
- **`resolveAsync<P>(port: P): Promise<InferService<P>>`** -- async resolution (`container.ts:188`)

Resolution delegates through `ResolutionEngine.resolve()` (`engine.ts:108-130`) which handles:

1. Optional hook invocation (beforeResolve/afterResolve)
2. Lifetime-based caching via `resolveWithMemo` (`core.ts:117-130`)
3. Dependency building via `buildDependencies` (`core.ts:174-183`)
4. Factory invocation with cycle detection via `ResolutionContext` (`context.ts`)

### 1.2 Compatibility with Ecosystem

**Store (spec/store/06-lifecycle.md):** Stores will typically be **singleton** or **scoped** services. The runtime's `resolveWithMemo` correctly routes singletons to `singletonMemo` and scoped instances to `scopedMemo`. Store selectors and middleware can be resolved as transient (fresh instance per resolution). **COMPATIBLE.**

**Query (spec/query/08-lifecycle.md, 09-query-client.md):** The `QueryClient` is expected to be a **singleton** that manages query cache across the application. Individual query handlers/ports would be scoped or transient. The runtime handles this well -- `QueryClient` as a singleton adapter is cached in `singletonMemo`, while per-request query resolvers can use scoped lifetime. **COMPATIBLE.**

**Saga (spec/saga/07-runtime.md):** The saga spec explicitly states that `SagaRunner` is a **scoped** service (Section 10.1, "SagaRunner Lifetime"). The runtime's scope system directly supports this:

- Scoped resolution via `ScopeImpl.resolve()` (`scope/impl.ts:145-151`)
- Child scope creation via `ScopeImpl.createScope()` (`scope/impl.ts:161-171`)
- Scope disposal with cascade (`scope/impl.ts:190-217`)

Step port resolution per invocation aligns with the runtime's resolution model -- each `scope.resolve(StepPort)` returns the correctly-scoped adapter. **COMPATIBLE.**

**Flow (spec/flow/08-runner.md):** The Flow `MachineRunner` requires a DI executor that resolves ports from the container. The runtime's `resolve()` method is synchronous (for `send()`) and the `resolveAsync()` handles the async path (for `sendAndExecute()`). The effect executor pattern (Section 10.5) maps cleanly to runtime resolution:

- `Invoke` effects resolve the port from the container, matching the runtime's `resolve<P>(port)` signature
- `Spawn` effects create `AbortController`-based activities, compatible with the scope disposal model

**COMPATIBLE.**

### 1.3 Identified Gaps

**GAP-R1: No `resolveAll` / batch resolution.** The Query spec (Section 9) describes a `QueryClient` that may need to resolve multiple query handlers. While each can be resolved individually, there is no batch resolution API. This is a minor convenience gap -- the current design of resolving one port at a time is architecturally sound but requires N calls for N ports.

---

## 2. Lifecycle Management (Singleton, Scoped, Transient)

### 2.1 Current Implementation

Lifetimes are managed via `getMemoForLifetime` (`core.ts:82-97`):

| Lifetime    | Cache Location    | Behavior                                    |
| ----------- | ----------------- | ------------------------------------------- |
| `singleton` | `singletonMemo`   | One instance per container, shared globally |
| `scoped`    | `scopedMemo`      | One instance per scope                      |
| `transient` | No cache (`null`) | Fresh instance on every `resolve()` call    |

Caching uses `MemoMap.getOrElseMemoize()` (`memo-map.ts`) which provides:

- Atomic check-and-create (no double-resolution)
- Finalizer registration for disposal
- Resolution order tracking (`resolutionOrder` metadata)

### 2.2 Compatibility with Ecosystem

**Store lifecycle:** Stores need singleton lifetime (application-wide state). The runtime supports this directly. Store subscriptions created in scoped contexts will be GC'd when the scope's store reference is released. **COMPATIBLE.**

**Query lifecycle:** QueryClient as singleton, individual queries as scoped or transient. The `resolveWithMemo` correctly handles both. Cache invalidation (a query concern) operates at the application layer, not the DI layer. **COMPATIBLE.**

**Saga step lifetimes (spec/saga/07-runtime.md, Section 10.6):**
The saga spec specifies three adapter lifetime behaviors during execution:

- Singleton: shared across all executions (OK -- resolved from `singletonMemo`)
- Scoped: tied to the executing scope (OK -- resolved from scope's `scopedMemo`)
- Transient: fresh per step invocation (OK -- no caching)

**COMPATIBLE.**

**Captive dependency detection:** The runtime provides compile-time captive dependency validation (`captive-dependency.ts:193-202`) via `ValidateCaptiveDependency` type. The saga spec references `CaptiveSagaDependencyError` for saga-specific validation. The runtime's generic `CaptiveDependencyError` from `@hex-di/graph/advanced` re-exported at `captive-dependency.ts:37-41` provides the foundation. The saga-specific error is an extension, not a runtime concern. **COMPATIBLE.**

### 2.3 Identified Gaps

**GAP-R2: No "request" lifetime alias.** The `captive-dependency.ts` comments mention `Request` lifetime (line 15-16: "Request (2): lives for duration of an HTTP request (same level as scoped)"), but the actual `Lifetime` type from `@hex-di/core` is `"singleton" | "scoped" | "transient"`. If the Query or Store specs refer to "request" lifetime, they must map it to "scoped". This is documented but could cause spec-to-implementation confusion.

---

## 3. Scope Creation and Disposal Patterns

### 3.1 Current Implementation

**Scope creation:**

- Root scopes: `container.createScope(name?)` creates a `ScopeImpl` registered with the container's `LifecycleManager` (`scope/impl.ts:116-143`)
- Child scopes: `scope.createScope(name?)` creates nested scopes tracked in `childScopes` Set (`scope/impl.ts:161-171`)

**Scope disposal (`scope/impl.ts:190-217`):**

1. Emits `'disposing'` synchronously (critical for React integration)
2. Marks scope as disposed
3. Cascades disposal to all child scopes
4. Disposes `scopedMemo` (runs finalizers in LIFO order)
5. Unregisters from parent scope or container
6. Emits `'disposed'` after async cleanup completes
7. Clears all listeners to prevent memory leaks

**Container disposal (`lifecycle-manager.ts:198-227`):**

1. Disposes child containers in LIFO order
2. Disposes child scopes
3. Disposes singleton memo (runs finalizers)
4. Unregisters from parent container

### 3.2 Compatibility with Ecosystem

**Saga scope disposal (spec/saga/07-runtime.md, Section 10.5):**
The saga spec describes scope-aware execution with `AbortSignal`-based cancellation:

```typescript
scope.subscribe(event => {
  if (event === "disposing") {
    abortController.abort(new ScopeDisposingError());
  }
});
```

The runtime's `ScopeLifecycleEmitter` (`lifecycle-events.ts:57-124`) provides exactly this:

- `subscribe(listener)` returns an unsubscribe function
- `'disposing'` event emitted synchronously before async disposal
- `'disposed'` event emitted after completion

The saga spec's disposal protocol (Section 10.6, "Disposal Protocol Implementation") works entirely with the existing `scope.subscribe()` API. **No changes to `@hex-di/runtime` are needed.** This is explicitly stated in the spec itself. **FULLY COMPATIBLE.**

**Flow runner disposal (spec/flow/08-runner.md, Section 10.3):**
`MachineRunner.dispose()` returns `ResultAsync<void, DisposeError>`, which includes stopping all activities. If the runner is scoped, its disposal is triggered by scope disposal. The runtime's cascade disposal pattern handles this. **COMPATIBLE.**

**Query lifecycle disposal (spec/query/08-lifecycle.md):**
Query cache cleanup on scope disposal aligns with the scoped memo finalizer pattern. When a scope is disposed, its `scopedMemo.dispose()` runs finalizers for all scoped query-related services. **COMPATIBLE.**

### 3.3 Identified Gaps

**GAP-R3: Scope disposal returns `Promise<void>`, not `ResultAsync`.** The Flow spec's `MachineRunner.dispose()` returns `ResultAsync<void, DisposeError>` which allows structured error handling. The scope's `dispose()` method (`scope/impl.ts:190`) returns `Promise<void>` and internally swallows listener errors (`lifecycle-events.ts:109`). If a finalizer throws during `scopedMemo.dispose()`, the error propagates as a rejected promise. There is no structured `DisposeError` type for scope disposal -- errors from scope finalizers are untyped. This is a minor inconsistency: the Flow runner returns typed errors, but the scope that triggers it does not.

---

## 4. Error Handling During Resolution

### 4.1 Current Implementation

The runtime has a comprehensive error hierarchy (`errors/index.ts`):

Resolution errors are thrown (not returned as `Result`) because resolution is synchronous and occurs at container/scope boundaries:

- `CircularDependencyError` -- detected via `ResolutionContext.enter()` (`context.ts`)
- `FactoryError` -- wraps factory exceptions (`engine.ts:188`)
- `DisposedScopeError` -- thrown when resolving from disposed scope/container
- `AsyncInitializationRequiredError` -- resolving async port before initialization
- `ScopeRequiredError` -- resolving scoped port from root container (not from a scope)
- `NonClonableForkedError` -- forked inheritance on non-clonable adapter

### 4.2 Compatibility with Ecosystem

**Saga error handling:** The saga spec uses `ResultAsync` for all operations. Saga step port invocations are `ResultAsync`-based, and the saga runtime wraps port resolution in `safeTry`. If resolution throws (e.g., `CircularDependencyError`), the saga runtime must catch and wrap it into a `SagaError`. This is the saga's responsibility, not the runtime's. **COMPATIBLE** (the runtime throws, the saga catches and wraps).

**Flow error handling:** Flow uses `Result` for `send()` and `ResultAsync` for `sendAndExecute()`. Port resolution within effects happens inside the DI executor, which would catch runtime errors and wrap them in `EffectExecutionError`. **COMPATIBLE.**

**Store error handling:** Store adapters are typically synchronous factories. Resolution errors during store creation would bubble as `FactoryError`. **COMPATIBLE.**

### 4.3 Identified Gaps

**GAP-R4: Resolution errors are thrown, not returned as `Result`.** The ecosystem specs heavily use `Result`/`ResultAsync` for error handling. The runtime uses `throw` for resolution errors. This is a deliberate architectural boundary: DI resolution is synchronous infrastructure, and wrapping every resolution in `Result` would add overhead. However, every consumer (Saga, Flow, Query) must wrap resolution calls in try/catch to convert to `Result`. This boundary is well-understood but creates a protocol mismatch between the DI layer (throw-based) and the application layer (Result-based).

---

## 5. Runtime Support for Ecosystem Runners

### 5.1 Store Runtime Support

Stores resolve from the container as singleton or scoped services. The runtime provides:

- Singleton caching for global stores
- Scoped caching for per-request stores (e.g., session store)
- Finalizer support for cleanup (e.g., closing subscriptions on disposal)

**Assessment: Fully supported.** No runtime changes needed for Store.

### 5.2 Query Runtime Support

The QueryClient resolves as a singleton, managing its own internal cache. Query handlers resolve as needed. The runtime provides:

- Singleton lifetime for QueryClient
- Scoped lifetime for per-request query contexts
- Async resolution for query handlers that need async initialization

**Assessment: Fully supported.** The runtime's async resolution path (`resolveAsync`) handles async-initialized query infrastructure.

### 5.3 Saga Runtime Support

The SagaRunner is the most demanding consumer. It requires:

1. **Scoped runner resolution** -- the runtime supports scoped resolution through `Scope.resolve()` (`scope/impl.ts:145-151`)
2. **Per-step port resolution within a scope** -- each step calls `scope.resolve(StepPort)`, fully supported
3. **Scope disposal triggering saga cancellation** -- the `ScopeLifecycleEmitter`'s synchronous `'disposing'` event enables the `AbortSignal` pattern documented in the saga spec (Section 10.6)
4. **Compensation running in the same scope** -- since the scope is not yet disposed when `'disposing'` fires (disposal is async and hasn't completed), compensation can still resolve ports from the scope
5. **Captive dependency validation** -- the graph-level validation prevents singleton sagas from capturing scoped ports

**Assessment: Fully supported.** The saga spec was explicitly designed to require no changes to `@hex-di/runtime`.

### 5.4 Flow Runtime Support

The MachineRunner requires:

1. **Port resolution for `Invoke` effects** -- the DI executor resolves ports via `container.resolve(port)`, fully supported
2. **Activity spawning with `AbortController`** -- activities are spawned outside the DI container, using standard `AbortController`. The container only resolves the port that provides the activity logic
3. **Subscriber notification pattern** -- the runner's `subscribe()` callback pattern mirrors the scope's `subscribe()` pattern. Both are synchronous and use `Set` for efficient iteration
4. **Disposal cascade** -- if the runner is scoped, scope disposal triggers runner disposal through the finalizer registered in `scopedMemo`

**Assessment: Fully supported.**

---

## 6. Tracing Integration Points

### 6.1 Current Integration Points

The runtime provides tracing hooks through the `HooksRunner` (`hooks-runner.ts:109-271`):

**beforeResolve/afterResolve hooks:**

- `HooksRunner.runSync()` (`hooks-runner.ts:146-173`) -- wraps synchronous resolution with hook calls
- `HooksRunner.runAsync()` (`hooks-runner.ts:189-216`) -- wraps async resolution with hook calls
- `ResolutionHookContext` includes: port, portName, lifetime, scopeId, parentPort, isCacheHit, depth, containerId, containerKind, inheritanceMode, parentContainerId, duration, error

**Container-level hook management:**

- `container.addHook(type, handler)` (`container.ts:452`)
- `container.removeHook(type, handler)` (`container.ts:471`)

**Inspector API:**

- `container.inspector` -- pull-based inspection (port listing, scope tree, resolution status)
- `INTERNAL_ACCESS` symbol for low-level state snapshots

**Child inspector tracking:**

- `childInspectorMap` in `lifecycle-manager.ts:33` -- tracks child container inspectors for tracing instrumentation

### 6.2 Compatibility with Tracing Spec

The tracing spec (`SPEC-TRACING.md`) defines:

1. **`instrumentContainer(container, tracer, options)`** (line 342-346) -- returns a cleanup function. This uses the `container.addHook()` API to install beforeResolve/afterResolve hooks. **COMPATIBLE.**

2. **`createTracingHook(tracer, options)`** (line 368) -- creates a `ResolutionHook` that uses the tracer to create spans. The `ResolutionHookContext` provides all needed data:
   - `portName` maps to `"hex-di.port.name"` span attribute
   - `lifetime` maps to `"hex-di.port.lifetime"`
   - `isCacheHit` maps to `"hex-di.resolution.cached"`
   - `scopeId` maps to `"hex-di.resolution.scope_id"`
   - `duration` maps to `"hex-di.resolution.duration_ms"`

   **COMPATIBLE.**

3. **W3C Trace Context propagation** -- The tracing spec defines `TraceContextVar` and `ActiveSpanVar` as context variables. These would be resolved from the container as scoped services, allowing per-request trace context. The runtime handles this via scoped lifetime. **COMPATIBLE.**

4. **Zero-cost when disabled** -- The `HooksRunner` is only created when hooks are configured. When no hooks exist (`this.hooksRunner === null`), the engine skips directly to `resolveCore` (`engine.ts:116-118`). The tracing spec's `NoOpTracerAdapter` as a singleton provides zero overhead at the tracer level. **COMPATIBLE.**

### 6.3 Identified Gaps

**GAP-R5: Hook context does not include trace/span IDs.** The `ResolutionHookContext` (`hooks-runner.ts:64-78`) does not carry `traceId` or `spanId`. The tracing integration must manage its own span stack independently from the hook context. This is acceptable since the tracing package is a separate concern, but it means the tracing hook must maintain `AsyncLocalStorage` or similar mechanism for span correlation. The runtime provides `depth` and `parentPort` for basic correlation, but not distributed tracing correlation.

**GAP-R6: No scope-level hooks.** Hooks are attached to containers via `addHook()`, but scopes do not have their own hooks. Scope resolution delegates to the container's resolution engine, so container-level hooks cover scope resolutions. However, scope creation and disposal are not observable via hooks -- only via the `ScopeLifecycleEmitter`'s `subscribe()`. The tracing spec may want span creation around scope lifecycle (e.g., "scope created", "scope disposed"). This would require either:

- A new scope-level hook mechanism, or
- The tracing package subscribing to scope lifecycle events directly

---

## 7. Summary of Gaps

| ID     | Area       | Severity | Description                                                                            |
| ------ | ---------- | -------- | -------------------------------------------------------------------------------------- |
| GAP-R1 | Resolution | Low      | No batch `resolveAll()` API for resolving multiple ports at once                       |
| GAP-R2 | Lifetime   | Low      | No "request" lifetime alias (must use "scoped", already documented)                    |
| GAP-R3 | Disposal   | Low      | Scope disposal returns `Promise<void>` not `ResultAsync`, errors are untyped           |
| GAP-R4 | Errors     | Medium   | Resolution errors thrown (not Result), every ecosystem consumer must wrap in try/catch |
| GAP-R5 | Tracing    | Low      | Hook context lacks trace/span IDs, tracing must manage its own span correlation        |
| GAP-R6 | Tracing    | Low      | No scope-level hooks for tracing scope creation/disposal                               |

---

## 8. Recommendations

1. **GAP-R4 (Medium):** Consider providing a `Result`-returning resolution helper in a shared utility, e.g.:

   ```typescript
   function safeResolve<P>(scope: Scope, port: P): Result<InferService<P>, ContainerError>;
   ```

   This does not require changing the runtime's core resolution -- it's a wrapper that ecosystem packages can use.

2. **GAP-R3 (Low):** Consider adding a `ScopeDisposeError` type that aggregates finalizer errors, similar to Flow's `DisposeError`. This would make scope disposal error handling consistent with the ecosystem's typed error patterns.

3. **GAP-R6 (Low):** Consider adding scope lifecycle to the container hook system. A `'scopeCreated'` and `'scopeDisposing'` hook type would enable the tracing package to create spans around scope lifecycle without directly subscribing to each scope.

4. **No action needed for GAP-R1, GAP-R2, GAP-R5.** These are minor convenience/documentation items, not architectural gaps.

---

## 9. Conclusion

The `@hex-di/runtime` package is well-architected for the ecosystem. Its scope system, lifecycle management, and hook infrastructure provide the foundation that Store, Query, Saga, Flow, and Tracing all need. The saga spec was specifically designed to work with the existing runtime API without modifications. The main area for improvement is the throw-vs-Result boundary (GAP-R4), which affects every ecosystem consumer but can be addressed with a wrapper utility rather than a core API change.
