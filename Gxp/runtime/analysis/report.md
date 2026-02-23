# GxP Compliance Analysis Report: @hex-di/runtime

**Package:** `@hex-di/runtime`
**Version:** Current (main branch)
**Analysis Date:** 2026-02-10
**Overall GxP Score:** 7.9 / 10

---

## 1. Executive Summary

The `@hex-di/runtime` package is the container runtime engine for the hex-di dependency injection framework. It is responsible for service resolution, lifetime management (singleton/scoped/transient), scope hierarchy, disposal orchestration, and inspection capabilities. The runtime sits at the critical execution path of all DI operations.

**Overall GxP Assessment: 7.9/10**

The runtime demonstrates strong compliance across most GxP criteria, particularly in deterministic behavior, error traceability, immutability guarantees, and lifecycle management. The LIFO disposal with error aggregation pattern, O(1) cycle detection, sealed hooks via `Object.freeze`, and comprehensive test coverage (64,765 lines across 125 test files against 15,091 lines of source in 59 files) form a solid compliance foundation. The primary areas for improvement are the absence of finalizer timeout protection and limited observability into the disposal pipeline itself.

### Score Summary

| Criterion                 | Score | Weight | Weighted |
| ------------------------- | ----- | ------ | -------- |
| 1. Deterministic Behavior | 8.5   | High   | 8.5      |
| 2. Error Traceability     | 8.5   | High   | 8.5      |
| 3. State Immutability     | 8.0   | High   | 8.0      |
| 4. Lifecycle Management   | 8.0   | High   | 8.0      |
| 5. Audit & Inspection     | 7.5   | Medium | 7.5      |
| 6. Test Coverage          | 9.0   | High   | 9.0      |
| 7. Concurrency Safety     | 7.0   | Medium | 7.0      |
| 8. Input Validation       | 7.5   | Medium | 7.5      |
| 9. Documentation          | 8.0   | Medium | 8.0      |
| 10. Failure Isolation     | 7.5   | High   | 7.5      |

---

## 2. Package Overview

### Purpose

`@hex-di/runtime` is the execution engine that transforms a statically-declared dependency graph into a live container capable of resolving services, managing their lifetimes, and orchestrating cleanup. It is the runtime half of the hex-di framework's separation of concerns (graph definition vs. graph execution).

### Architecture

The runtime is organized into five major subsystems:

1. **Container Layer** (`container/`) -- Root and child container implementations, factory functions, override builders, and wrapper utilities
2. **Resolution Layer** (`resolution/`) -- Sync and async resolution engines, cycle detection via `ResolutionContext`, hooks runner for instrumentation
3. **Scope Layer** (`scope/`) -- Scope implementation with hierarchical disposal, lifecycle event emission, and ID generation
4. **Inspection Layer** (`inspection/`) -- Symbol-based internal state access, snapshot creation, built-in inspector API, library registry
5. **Utility Layer** (`util/`) -- `MemoMap` for instance caching with LIFO disposal, string similarity for error suggestions, type guards

### Key Metrics

| Metric                      | Value                           |
| --------------------------- | ------------------------------- |
| Source files                | 59                              |
| Source lines                | 15,091                          |
| Test files                  | 125                             |
| Test lines                  | 64,765                          |
| Test-to-source ratio        | 4.3:1                           |
| Error classes               | 7 (ContainerError + 6 concrete) |
| Public symbols (Symbol.for) | 5                               |

---

## 3. GxP Compliance Matrix

| #   | Criterion              | Score | Evidence Summary                                                                                                                                                                |
| --- | ---------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Deterministic Behavior | 8.5   | Counter-based ID generation, O(1) cycle detection via Set, LIFO disposal ordering via creation-order array                                                                      |
| 2   | Error Traceability     | 8.5   | 7-class error hierarchy with stable `.code` strings, `.isProgrammingError` flags, `.suggestion` fields, full dependency chain in CircularDependencyError                        |
| 3   | State Immutability     | 8.0   | `Object.freeze` on all public wrappers (containers, scopes, inspectors, snapshots), `sealHooks()` + freeze for hooks, defensive copies on dependency chains                     |
| 4   | Lifecycle Management   | 8.0   | LIFO disposal with AggregateError, idempotent disposal, cascading child disposal, lifecycle events (`disposing`/`disposed`), listener cleanup                                   |
| 5   | Audit & Inspection     | 7.5   | Symbol-based INTERNAL_ACCESS protocol, frozen snapshots, inspector with `snapshot()`/`listPorts()`/`isResolved()`/`getScopeTree()`, resolution hooks for external observability |
| 6   | Test Coverage          | 9.0   | 64,765 lines of tests, 125 test files, mutation killer suites, type-level tests, extended edge-case suites                                                                      |
| 7   | Concurrency Safety     | 7.0   | Async resolution deduplication via pending promise tracking, topological async initialization with Kahn's algorithm, no shared mutable state across async boundaries            |
| 8   | Input Validation       | 7.5   | Port existence checks with "did you mean?" suggestions, scope-required enforcement, async-init-required checks, clonable validation for forked mode                             |
| 9   | Documentation          | 8.0   | TSDoc on all public and internal APIs, `@internal` tags on implementation details, `@example` blocks with runnable code, architectural doc comments on classes                  |
| 10  | Failure Isolation      | 7.5   | Error aggregation during disposal (all finalizers run even if some throw), listener errors swallowed during lifecycle emission, ContainerError propagation without wrapping     |

---

## 4. Detailed Analysis

### 4.1 Deterministic Behavior (8.5/10)

The runtime exhibits strong deterministic properties through counter-based ID generation and order-tracked data structures.

**Scope ID Generation:** Uses a closure-based counter pattern that produces predictable `"scope-N"` identifiers. Each generator maintains isolated state, enabling test isolation.

```typescript
// From: packages/runtime/src/scope/impl.ts

export function createScopeIdGenerator(): ScopeIdGenerator {
  let counter = 0;

  return (name?: string): string => {
    if (name !== undefined) {
      return name;
    }
    return `scope-${counter++}`;
  };
}
```

**Container ID Generation:** Follows the same pattern for child container IDs:

```typescript
// From: packages/runtime/src/container/id-generator.ts

export function createContainerIdGenerator(): ContainerIdGenerator {
  let counter = 0;

  return (): string => {
    return `child-${++counter}`;
  };
}
```

**O(1) Cycle Detection:** The `ResolutionContext` uses a dual data structure -- a `Set<string>` for O(1) membership checks and an `Array<string>` for ordered path preservation:

```typescript
// From: packages/runtime/src/resolution/context.ts

export class ResolutionContext {
  private readonly path: Set<string> = new Set();
  private readonly pathArray: string[] = [];

  enter(portName: string): void {
    if (this.path.has(portName)) {
      const chain = [...this.pathArray, portName];
      throw new CircularDependencyError(chain);
    }

    this.path.add(portName);
    this.pathArray.push(portName);
  }

  exit(portName: string): void {
    this.path.delete(portName);
    this.pathArray.pop();
  }
}
```

**LIFO Disposal Ordering:** MemoMap tracks creation order in a separate array and iterates it in reverse during disposal:

```typescript
// From: packages/runtime/src/util/memo-map.ts

async dispose(): Promise<void> {
    this.disposed = true;
    const errors: unknown[] = [];

    // Iterate in reverse order (LIFO - last created first disposed)
    for (let i = this.creationOrder.length - 1; i >= 0; i--) {
      const entry = this.creationOrder[i];
      if (entry !== undefined && entry.finalizer !== undefined) {
        try {
          await entry.finalizer(entry.instance);
        } catch (error) {
          errors.push(error);
        }
      }
    }

    this.cache.clear();

    if (errors.length > 0) {
      throw new AggregateError(errors, `${errors.length} finalizer(s) failed during disposal`);
    }
  }
```

**Lifetime-Based Cache Routing:** Resolution deterministically routes to the correct cache based on adapter lifetime:

```typescript
// From: packages/runtime/src/resolution/core.ts

export function getMemoForLifetime(
  lifetime: Lifetime,
  singletonMemo: MemoMap,
  scopedMemo: MemoMap
): MemoMap | null {
  switch (lifetime) {
    case "singleton":
      return singletonMemo;
    case "scoped":
      return scopedMemo;
    case "transient":
      return null;
    default:
      throw new Error(`Unknown lifetime: ${lifetime}`);
  }
}
```

**Gap:** Resolution timing uses `Date.now()` which has millisecond granularity and is not monotonic. For GxP audit trails requiring sub-millisecond precision, `performance.now()` would be preferable.

---

### 4.2 Error Traceability (8.5/10)

The runtime implements a structured error hierarchy rooted in the abstract `ContainerError` class. Every error carries a stable `code` string for programmatic handling and an `isProgrammingError` boolean distinguishing developer mistakes from runtime conditions.

**Error Hierarchy:**

```typescript
// From: packages/runtime/src/errors/index.ts

export abstract class ContainerError extends Error {
  abstract readonly code: string;
  abstract readonly isProgrammingError: boolean;
  suggestion?: string;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    const ErrorWithCapture: V8ErrorConstructor = Error;
    if (typeof ErrorWithCapture.captureStackTrace === "function") {
      ErrorWithCapture.captureStackTrace(this, new.target);
    }
  }

  override get name(): string {
    return this.constructor.name;
  }
}
```

**Concrete Error Classes:**

| Error Class                        | Code                   | isProgramming | Purpose                                       |
| ---------------------------------- | ---------------------- | ------------- | --------------------------------------------- |
| `CircularDependencyError`          | `CIRCULAR_DEPENDENCY`  | true          | Cycle in dependency graph                     |
| `FactoryError`                     | `FACTORY_FAILED`       | false         | Factory threw during sync creation            |
| `AsyncFactoryError`                | `ASYNC_FACTORY_FAILED` | false         | Factory threw during async creation           |
| `DisposedScopeError`               | `DISPOSED_SCOPE`       | true          | Resolution from disposed scope/container      |
| `ScopeRequiredError`               | `SCOPE_REQUIRED`       | true          | Scoped port resolved from root container      |
| `AsyncInitializationRequiredError` | `ASYNC_INIT_REQUIRED`  | true          | Async port resolved synchronously before init |
| `NonClonableForkedError`           | `NON_CLONABLE_FORKED`  | true          | Forked inheritance on non-clonable adapter    |
| `DisposalError`                    | `DISPOSAL_FAILED`      | false         | Finalizer(s) failed during disposal           |

**Circular Dependency Chains:** The full dependency path is captured and frozen for forensic analysis:

```typescript
// From: packages/runtime/src/errors/index.ts

export class CircularDependencyError extends ContainerError {
  readonly code = "CIRCULAR_DEPENDENCY" as const;
  readonly isProgrammingError = true as const;
  readonly dependencyChain: readonly string[];

  constructor(dependencyChain: readonly string[]) {
    const formattedChain = dependencyChain.join(" -> ");
    super(`Circular dependency detected: ${formattedChain}`);
    this.dependencyChain = Object.freeze([...dependencyChain]);
  }
}
```

**Actionable Suggestions:** Programming errors include copy-paste-ready fix suggestions:

````typescript
// From: packages/runtime/src/errors/index.ts (ScopeRequiredError)

this.suggestion =
  "Create a scope before resolving scoped services:\n\n" +
  "Example:\n" +
  "```typescript\n" +
  "const scope = container.createScope();\n" +
  `const service = scope.resolve(${portName});\n` +
  "await scope.dispose();\n" +
  "```";
````

**Error Aggregation in Disposal:** DisposalError aggregates multiple finalizer failures with factory methods for different error shapes:

```typescript
// From: packages/runtime/src/errors/index.ts

export class DisposalError extends ContainerError {
  readonly causes: readonly unknown[];

  static fromAggregateError(err: AggregateError): DisposalError {
    return new DisposalError(
      `Disposal failed: ${err.errors.length} finalizer(s) threw`,
      err.errors,
      err
    );
  }

  static fromUnknown(err: unknown): DisposalError {
    if (err instanceof AggregateError) {
      return DisposalError.fromAggregateError(err);
    }
    const message = extractErrorMessage(err);
    return new DisposalError(`Disposal failed: ${message}`, [err], err);
  }
}
```

**Gap:** No correlation ID is generated per resolution chain. In distributed or multi-tenant systems, tracing a resolution failure back to its initiating request requires external instrumentation.

---

### 4.3 State Immutability (8.0/10)

The runtime enforces immutability at multiple layers: public API objects are frozen, inspection snapshots are deep-frozen, hooks can be sealed, and internal state uses defensive copies.

**Container Wrapper Freezing:** All public container objects are frozen after construction:

```typescript
// From: packages/runtime/src/container/factory.ts

// After building the container object literal...
Object.freeze(container);
return container;
```

**Scope Wrapper Freezing:**

```typescript
// From: packages/runtime/src/scope/impl.ts

export function createScopeWrapper<...>(impl: ScopeImpl<...>): Scope<...> {
  const scope: Scope<TProvides, TAsyncPorts, TPhase> = {
    resolve,
    resolveAsync: port => impl.resolveAsync(port),
    tryResolve: <P extends ...>(port: P) => { /* ... */ },
    // ... all methods
  };
  Object.freeze(scope);
  return scope;
}
```

**Sealed Hooks:** The `sealHooks()` function creates an immutable hooks configuration using `Object.freeze`:

```typescript
// From: packages/runtime/src/resolution/hooks.ts

export function sealHooks(hooks: ResolutionHooks): ImmutableHooksConfig {
  const sealed: ImmutableHooksConfig = {
    beforeResolve: hooks.beforeResolve,
    afterResolve: hooks.afterResolve,
    sealed: true,
  };
  return Object.freeze(sealed);
}
```

**Inspection Snapshot Immutability:** Internal state snapshots are recursively frozen:

```typescript
// From: packages/runtime/src/inspection/creation.ts

function deepFreeze<T>(obj: T): T {
  if (!isRecord(obj)) {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (isRecord(value) && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}
```

**Scope Internal State Snapshots:**

```typescript
// From: packages/runtime/src/scope/impl.ts

getInternalState(): ScopeInternalState {
    // ...
    const state: ScopeInternalState = {
      id: this.id,
      disposed: this.disposed,
      scopedMemo: createMemoMapSnapshot(this.scopedMemo),
      childScopes: Object.freeze(childSnapshots),
    };
    return Object.freeze(state);
  }
```

**Defensive Copies on Error Data:**

```typescript
// From: packages/runtime/src/errors/index.ts (DisposalError)

constructor(message: string, causes: readonly unknown[], originalError?: unknown) {
    super(message);
    this.causes = Object.freeze([...causes]);
}
```

**Gap:** Internal `MemoMap.cache` and `MemoMap.creationOrder` are mutable `Map` and `Array`. While not publicly exposed, a compromised internal reference could mutate state. There is no runtime seal on the `MemoMap` instance itself after construction.

---

### 4.4 Lifecycle Management (8.0/10)

Lifecycle management is the runtime's most critical GxP concern. The implementation covers idempotent disposal, cascading child cleanup, LIFO ordering, and lifecycle event emission.

**Idempotent Disposal:** Both `ScopeImpl.dispose()` and `LifecycleManager.dispose()` check and set a disposal flag before executing cleanup:

```typescript
// From: packages/runtime/src/scope/impl.ts

async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.lifecycleEmitter.emit("disposing");
    this.disposed = true;
    for (const child of this.childScopes) {
      await child.dispose();
    }
    this.childScopes.clear();
    await this.scopedMemo.dispose();
    if (this.parentScope !== null) {
      this.parentScope.childScopes.delete(this);
    } else if (this.unregisterFromContainer !== undefined) {
      this.unregisterFromContainer();
    }
    this.lifecycleEmitter.emit("disposed");
    this.lifecycleEmitter.clear();
  }
```

**Cascading Container Disposal:** The `LifecycleManager` orchestrates disposal of child containers (LIFO), then child scopes, then singletons, then parent unregistration:

```typescript
// From: packages/runtime/src/container/internal/lifecycle-manager.ts

async dispose(singletonMemo: MemoMap, parentUnregister?: ParentUnregisterFn): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    // Dispose child containers in LIFO order
    const children = Array.from(this.childContainers.values());
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child) {
        await child.dispose();
      }
    }
    this.childContainers.clear();

    // Dispose child scopes
    for (const scope of this.childScopes) {
      await scope.dispose();
    }
    this.childScopes.clear();

    // Dispose singleton memo
    await singletonMemo.dispose();

    // Unregister from parent if provided
    if (parentUnregister !== undefined) {
      parentUnregister();
    }
  }
```

**Lifecycle Event Emission:** Scopes emit `disposing` and `disposed` events with state tracking compatible with React's `useSyncExternalStore`:

```typescript
// From: packages/runtime/src/scope/lifecycle-events.ts

export class ScopeLifecycleEmitter {
  private readonly listeners: Set<ScopeLifecycleListener> = new Set();
  private state: ScopeDisposalState = "active";

  emit(event: ScopeLifecycleEvent): void {
    if (event === "disposing") {
      this.state = "disposing";
    } else if (event === "disposed") {
      this.state = "disposed";
    }

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Swallow listener errors to prevent disrupting disposal
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
```

**Use-After-Dispose Protection:** Resolution from disposed containers/scopes throws a typed error:

```typescript
// From: packages/runtime/src/scope/impl.ts

resolve<P extends TProvides>(port: P): InferService<P> {
    const portName = port.__portName;
    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }
    return this.container.resolveInternal(port, this.scopedMemo, this.id, this.name);
  }
```

**Gap:** No finalizer timeout protection. A hanging finalizer (e.g., a database connection that never closes) will block the entire disposal chain indefinitely. There is no `AbortSignal` or configurable timeout on finalizer execution.

---

### 4.5 Audit & Inspection (7.5/10)

The runtime provides a layered inspection architecture using Symbol-based access patterns for cross-realm compatibility.

**Symbol-Based Access Encapsulation:**

```typescript
// From: packages/runtime/src/inspection/symbols.ts

export const INTERNAL_ACCESS = Symbol.for("hex-di/internal-access");
export const TRACING_ACCESS = Symbol.for("hex-di/tracing-access");
export const ADAPTER_ACCESS = Symbol.for("hex-di/adapter-access");
export const HOOKS_ACCESS = Symbol.for("hex-di/hooks-access");
export const INSPECTOR = Symbol.for("hex-di/inspector");
```

The use of `Symbol.for()` ensures that DevTools bundled separately from the application can access the same symbols across JavaScript realms.

**Inspector Creation with Frozen Output:**

```typescript
// From: packages/runtime/src/inspection/creation.ts

export function createInspector(container: InternalAccessible): ContainerInspector {
  const containerRef = container;
  const getAccessor = () => getInternalAccessor(containerRef);

  function snapshot(): ContainerSnapshot {
    const accessor = getAccessor();
    const state = accessor();
    // ... builds singletons, scope tree from internal state
    return deepFreeze(result);
  }

  function listPorts(): readonly string[] {
    const accessor = getAccessor();
    const state = accessor();
    const portNames: string[] = [];
    for (const [, adapterInfo] of state.adapterMap) {
      portNames.push(adapterInfo.portName);
    }
    portNames.sort();
    return Object.freeze(portNames);
  }

  const inspector: ContainerInspector = {
    snapshot,
    listPorts,
    isResolved,
    getScopeTree,
  };

  return Object.freeze(inspector);
}
```

**Resolution Hooks for External Observability:** The hooks system provides `beforeResolve` and `afterResolve` callbacks with rich context:

```typescript
// From: packages/runtime/src/resolution/hooks.ts

export interface ResolutionHookContext {
  readonly port: Port<unknown, string>;
  readonly portName: string;
  readonly lifetime: Lifetime;
  readonly scopeId: string | null;
  readonly scopeName: string | undefined;
  readonly parentPort: Port<unknown, string> | null;
  readonly isCacheHit: boolean;
  readonly depth: number;
  readonly containerId: string;
  readonly containerKind: ContainerKind;
  readonly inheritanceMode: InheritanceMode | null;
  readonly parentContainerId: string | null;
  readonly duration: number;
  readonly error: Error | null;
  readonly result?: unknown;
}
```

**MemoMap Entry Metadata:** Each cached entry records resolution timing and order:

```typescript
// From: packages/runtime/src/util/memo-map.ts

interface CacheEntry<P extends Port<unknown, string>> {
  readonly port: P;
  readonly instance: InferService<P>;
  readonly finalizer: Finalizer<InferService<P>>;
  readonly resolvedAt: number;
  readonly resolutionOrder: number;
}
```

**Gap:** No built-in audit log or event journal. While hooks enable external observability, the runtime itself does not persist resolution events. A GxP-compliant deployment would need to implement an `afterResolve` hook that writes to a tamper-evident log.

---

### 4.6 Test Coverage (9.0/10)

The runtime has the highest test-to-source ratio of any package in the monorepo, with extensive mutation-killing test suites that go beyond simple coverage metrics.

**Coverage Metrics:**

| Metric               | Value  |
| -------------------- | ------ |
| Source lines         | 15,091 |
| Test lines           | 64,765 |
| Test-to-source ratio | 4.3:1  |
| Test files           | 125    |
| Source files         | 59     |

**Test Categories (sample from 125 files):**

- **Unit tests:** `memo-map.test.ts`, `resolution-context.test.ts`, `resolution-engine.test.ts`, `scope-impl.test.ts`, `lifecycle-manager.test.ts`, `adapter-registry.test.ts`
- **Integration tests:** `container.test.ts`, `child-container.test.ts`, `async-resolution.test.ts`, `scope.test.ts`
- **Mutation killer suites:** `mutation-killers.test.ts`, `mutation-killers-2.test.ts`, `mutation-killers-3.test.ts`, `mutation-killers-4.test.ts`, `mutation-killers-5.test.ts`, `mutation-killers-final.test.ts`, `mutation-killers-nocov.test.ts`
- **Deep mutation suites:** `base-impl-deep-mutants.test.ts`, `child-impl-deep-mutants.test.ts`, `root-impl-deep-mutants.test.ts`, `builtin-api-deep-mutants.test.ts`, `wrappers-deep-mutants.test.ts`
- **Component-level mutation suites:** `resolution-engine-mutants.test.ts`, `scope-impl-mutants.test.ts`, `container-factory-mutants.test.ts`, `container-wrappers-mutants.test.ts`
- **Type-level tests:** `type-level-error-examples.test.ts`, `type-utilities.test.ts`, `port-resolution-type-safety.test.ts`
- **Lifecycle tests:** `scope-lifecycle.test.ts`, `scope-lifecycle-events.test.ts`, `library-lifecycle.test.ts`, `memory-cleanup.test.ts`
- **Extended coverage:** `container-factory-extended.test.ts`, `memo-map-extended.test.ts`, `resolution-core.test.ts`, `unified-inspection.test.ts`, `unified-snapshot.test.ts`

**Gap:** No formal property-based testing (e.g., fast-check). While the mutation-killing suites provide strong boundary coverage, property-based tests would strengthen confidence in invariants like "disposal order is always the reverse of creation order" across arbitrary service graphs.

---

### 4.7 Concurrency Safety (7.0/10)

JavaScript's single-threaded event loop simplifies concurrency, but the runtime must still handle concurrent async operations correctly.

**Async Resolution Deduplication:** The `AsyncResolutionEngine` tracks pending promises to prevent duplicate resolution of the same port+scope combination:

```typescript
// From: packages/runtime/src/resolution/async-engine.ts

export class AsyncResolutionEngine {
  private readonly pendingResolutions: Map<
    Port<unknown, string>,
    Map<string | null, Promise<unknown>>
  > = new Map();

  private resolveCore<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    inheritanceMode: InheritanceMode | null,
    scopeName?: string
  ): Promise<InferService<P>> {
    const memo = this.getMemoCached(adapter.lifetime, scopedMemo);
    const cached = memo?.getIfPresent(port);
    if (cached !== undefined) {
      return Promise.resolve(cached as InferService<P>);
    }

    let scopePending = this.pendingResolutions.get(port);
    if (scopePending === undefined) {
      scopePending = new Map();
      this.pendingResolutions.set(port, scopePending);
    }

    const pending = scopePending.get(scopeId);
    if (pending !== undefined) {
      return pending as Promise<InferService<P>>;
    }

    const promise = this.createPendingResolutionPromise(
      port,
      adapter,
      scopedMemo,
      scopeId,
      memo,
      inheritanceMode,
      scopeName
    );
    scopePending.set(scopeId, promise);
    return promise;
  }
}
```

**Cleanup of Pending Resolutions:**

```typescript
// From: packages/runtime/src/resolution/async-engine.ts

private cleanupPending(port: Port<unknown, string>, scopeId: string | null): void {
    const currentPending = this.pendingResolutions.get(port);
    if (currentPending) {
      currentPending.delete(scopeId);
      if (currentPending.size === 0) {
        this.pendingResolutions.delete(port);
      }
    }
  }
```

**Topological Async Initialization:** Uses Kahn's algorithm for parallel initialization of async adapters at the same dependency level:

```typescript
// From: packages/runtime/src/container/internal/async-initializer.ts

private async executeInitialization(resolveAsync: AsyncInitializationResolver): Promise<void> {
    const totalAdapters = this.asyncAdapters.length;
    let completedCount = 0;

    for (const level of this.initLevels) {
      const levelPromises = level.map(async adapter => {
        const portName = adapter.provides.__portName;
        try {
          await resolveAsync(adapter.provides);
        } catch (error) {
          if (error instanceof AsyncFactoryError) {
            throw error;
          }
          const contextMessage =
            error instanceof Error
              ? `${error.message} (initialization step ${completedCount + 1}/${totalAdapters})`
              : String(error);
          throw new AsyncFactoryError(portName, new Error(contextMessage));
        }
      });
      await Promise.all(levelPromises);
      completedCount += level.length;
    }
    this.initialized = true;
  }
```

**Idempotent Initialization:**

```typescript
// From: packages/runtime/src/container/internal/async-initializer.ts

async initialize(resolveAsync: AsyncInitializationResolver): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initializationPromise !== null) {
      await this.initializationPromise;
      return;
    }
    this.initializationPromise = this.executeInitialization(resolveAsync);
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }
```

**Gap:** The `MemoMap.getOrElseMemoizeAsync` method does not deduplicate concurrent calls for the same port within the same memo. If two async resolution paths converge on the same singleton before either completes, the factory could be called twice. The `AsyncResolutionEngine` mitigates this at a higher level, but direct `MemoMap` usage (e.g., from custom wrappers) is not protected.

---

### 4.8 Input Validation (7.5/10)

The runtime validates inputs at resolution boundaries and provides developer-friendly error messages.

**Port Existence with "Did You Mean?" Suggestions:**

```typescript
// From: packages/runtime/src/inspection/creation.ts

function isResolved(portName: string): boolean | "scope-required" {
  // ...
  if (adapterInfo === undefined) {
    const availablePorts: string[] = [];
    for (const [, info] of state.adapterMap) {
      availablePorts.push(info.portName);
    }
    const suggestion = suggestSimilarPort(portName, availablePorts);
    const didYouMean = suggestion ? ` Did you mean '${suggestion}'?` : "";
    throw new Error(
      `Port '${portName}' is not registered in this container.${didYouMean} ` +
        `Use listPorts() to see available ports.`
    );
  }
  // ...
}
```

**Scoped Port from Root Enforcement:**

```typescript
// From: packages/runtime/src/container/base-impl.ts

resolve<P extends TProvides | TExtends>(port: P): InferService<P> {
    // ...
    if (adapter.lifetime === "scoped") {
      throw new ScopeRequiredError(portName);
    }
    if (!this.asyncInitializer.isInitialized && this.asyncInitializer.hasAsyncPort(port)) {
      throw new AsyncInitializationRequiredError(portName);
    }
    // ...
  }
```

**Clonable Validation for Forked Inheritance:**

```typescript
// From: packages/runtime/src/container/internal/inheritance-resolver.ts

private resolveForked<P extends TProvides>(port: P, portName: string): InferService<P> {
    // ...
    const adapter = this.parentContainer[ADAPTER_ACCESS](port);
    if (adapter === undefined || !adapter.clonable) {
      throw new NonClonableForkedError(portName);
    }
    // ...
  }
```

**Compile-Time Captive Dependency Prevention:** The runtime includes type-level captive dependency validation that prevents mismatched lifetimes at compile time with zero runtime cost:

```typescript
// From: packages/runtime/src/captive-dependency.ts

export type ValidateCaptiveDependency<
  TAdapter extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>,
  TRequiredAdapter extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>,
> =
  IsCaptive<
    GraphLifetimeLevel<InferAdapterLifetime<TAdapter>>,
    GraphLifetimeLevel<InferAdapterLifetime<TRequiredAdapter>>
  > extends true
    ? CaptiveDependencyErrorLegacy<`...`>
    : TAdapter;
```

**Gap:** No runtime validation that factory return values match the expected port type. If a factory returns `null` or a structurally incompatible object, the error surfaces at the consumer rather than at the resolution boundary.

---

### 4.9 Documentation (8.0/10)

The runtime is thoroughly documented with TSDoc comments on all public and internal APIs, including `@internal` tags, `@example` blocks, and architectural `@remarks` sections.

**Class-Level Architecture Documentation:**

```typescript
// From: packages/runtime/src/util/memo-map.ts

/**
 * Internal class for managing instance caching with LIFO disposal ordering.
 *
 * MemoMap provides:
 * - Lazy instantiation via getOrElseMemoize
 * - Parent chain lookup for singleton inheritance
 * - Creation order tracking for LIFO disposal
 * - Error aggregation during disposal
 *
 * @internal This class is an implementation detail and should not be exported.
 */
```

**Method-Level Documentation with Execution Semantics:**

```typescript
// From: packages/runtime/src/resolution/hooks.ts

/**
 * Called after each resolution completes (success or failure).
 *
 * **Execution Order:**
 * - Fires AFTER factory execution and cache storage
 * - ALWAYS invoked, even when resolution throws an error
 * - For multiple hooks, fires in LIFO order (last installed, first executed)
 *
 * **Context Information:**
 * - All properties from `beforeResolve` context (portName, lifetime, etc.)
 * - `duration`: Time taken to resolve (milliseconds, includes nested deps)
 * - `error`: Error if resolution failed, or `null` on success
 */
afterResolve?: (context: ResolutionResultContext) => void;
```

**Module-Level Documentation:**

```typescript
// From: packages/runtime/src/scope/lifecycle-events.ts

/**
 * Scope lifecycle event types and subscription infrastructure.
 *
 * This module provides the event mechanism that enables React components
 * to reactively respond to scope disposal, supporting use cases like:
 * - Logout/session end: dispose user scope -> unmount user UI
 * - Resource cleanup: connection closes -> show reconnect UI
 * - Multi-tenant switching: dispose workspace scope -> swap UI trees
 */
```

**Gap:** No standalone architecture document (ADR) explaining the split between ResolutionEngine/AsyncResolutionEngine, why MemoMap uses a separate creation-order array instead of relying on Map insertion order, or the rationale for Symbol.for() vs. private Symbol().

---

### 4.10 Failure Isolation (7.5/10)

The runtime isolates failures at multiple levels to prevent cascading damage during error conditions.

**Error Aggregation During Disposal:** All finalizers execute even when some throw, with errors collected into an AggregateError:

```typescript
// From: packages/runtime/src/util/memo-map.ts

// (See full dispose() method in Section 4.1)
// Key pattern: try/catch inside the loop, errors.push(error), continue iterating
```

**Listener Error Swallowing During Lifecycle Events:**

```typescript
// From: packages/runtime/src/scope/lifecycle-events.ts

emit(event: ScopeLifecycleEvent): void {
    // ...
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Swallow listener errors to prevent disrupting disposal
      }
    }
  }
```

**ContainerError Propagation Without Double-Wrapping:** The resolution engine re-throws ContainerErrors directly and only wraps non-ContainerErrors:

```typescript
// From: packages/runtime/src/resolution/engine.ts

private createInstance<P extends Port<string, unknown>>(
    port: P, adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap, scopeId: string | null, scopeName?: string
  ): InferService<P> {
    const portName = port.__portName;

    this.resolutionContext.enter(portName);

    try {
      assertSyncAdapter(adapter, portName);

      try {
        const deps = buildDependencies(adapter.requires, requiredPort =>
          this.resolveDependency(requiredPort, scopedMemo, scopeId, scopeName)
        );
        const raw = adapter.factory(deps);

        return unwrapResultDefense(raw) as InferService<P>;
      } catch (e) {
        if (e instanceof ContainerError) {
          throw e;
        }
        throw new FactoryError(portName, e);
      }
    } finally {
      this.resolutionContext.exit(portName);
    }
  }
```

**Result-Based Error Handling:** The runtime provides `tryResolve`, `tryResolveAsync`, and `tryDispose` methods that return `Result` types instead of throwing, enabling functional error handling:

```typescript
// From: packages/runtime/src/container/result-helpers.ts

export function mapToContainerError(err: unknown): ContainerError {
  if (err instanceof ContainerError) {
    return err;
  }
  return new FactoryError("unknown", err);
}

export function mapToDisposalError(err: unknown): DisposalError {
  return DisposalError.fromUnknown(err);
}
```

**Listener Cleanup to Prevent Memory Leaks:**

```typescript
// From: packages/runtime/src/scope/impl.ts (dispose)

// Clear listeners to prevent memory leaks
this.lifecycleEmitter.clear();
```

**Gap:** Swallowed listener errors during lifecycle emission are silently discarded. In a GxP context, these should be routed to an error reporter for post-mortem analysis, even if they do not disrupt the disposal flow.

---

## 5. Code Examples

### 5.1 Complete Resolution Flow (Sync)

The sync resolution path flows through `BaseContainerImpl.resolve()` -> `ResolutionEngine.resolve()` -> `resolveWithMemo()`:

```typescript
// From: packages/runtime/src/container/base-impl.ts

resolve<P extends TProvides | TExtends>(port: P): InferService<P> {
    const portName = port.__portName;
    if (this.lifecycleManager.isDisposed) {
      throw new DisposedScopeError(portName);
    }
    if (this.adapterRegistry.shouldResolveLocally(port, this.isRoot)) {
      const adapter = this.adapterRegistry.getLocal(port);
      if (adapter === undefined || !isAdapterForPort(adapter, port)) {
        throw new Error(`No adapter registered for port '${portName}'`);
      }
      if (adapter.lifetime === "scoped") {
        throw new ScopeRequiredError(portName);
      }
      if (!this.asyncInitializer.isInitialized && this.asyncInitializer.hasAsyncPort(port)) {
        throw new AsyncInitializationRequiredError(portName);
      }
      return this.resolveWithAdapter(port, adapter, this.singletonMemo, null);
    }
    return this.resolveWithInheritance(port);
  }
```

### 5.2 Hooks Runner with In-Place Context Mutation

The `HooksRunner` avoids per-resolution object allocation by mutating the context in place:

```typescript
// From: packages/runtime/src/resolution/hooks-runner.ts

runSync<T>(
    port: Port<unknown, string>,
    adapter: AdapterInfo,
    scopeId: string | null,
    isCacheHit: boolean,
    inheritanceMode: InheritanceMode | null,
    action: () => T,
    scopeName?: string
  ): T {
    const context = this._createContext(port, adapter, scopeId, isCacheHit, inheritanceMode, scopeName);
    if (this.hooks.beforeResolve !== undefined) {
      this.hooks.beforeResolve(context);
    }
    const startTime = Date.now();
    this._parentPorts.push(port);
    this._parentStartTimes.push(startTime);
    let error: Error | null = null;
    try {
      const result = action();
      context.result = result;
      return result;
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      throw e;
    } finally {
      this._emitAfterResolve(context, startTime, error);
    }
  }
```

### 5.3 Late-Binding Hooks Composition

Hooks are composed at runtime using an array of hook sources, supporting dynamic installation via wrappers:

```typescript
// From: packages/runtime/src/container/factory.ts

function createLateBindingHooks(holder: HooksHolder): ResolutionHooks {
  return {
    beforeResolve(ctx: ResolutionHookContext): void {
      for (const source of holder.hookSources) {
        source.beforeResolve?.(ctx);
      }
    },
    afterResolve(ctx: ResolutionResultContext): void {
      for (let i = holder.hookSources.length - 1; i >= 0; i--) {
        holder.hookSources[i].afterResolve?.(ctx);
      }
    },
  };
}
```

### 5.4 Inheritance Resolution with Three Modes

```typescript
// From: packages/runtime/src/container/internal/inheritance-resolver.ts

resolveWithCallback<P extends TProvides>(
    port: P,
    createIsolated: IsolatedInstanceCreator<TProvides>
  ): InferService<P> {
    const portName = port.__portName;
    const mode = this.getMode(portName);

    switch (mode) {
      case "shared":
        return this.resolveShared(port);
      case "forked":
        return this.resolveForked(port, portName);
      case "isolated":
        return this.resolveIsolated(port, createIsolated);
      default:
        throw new Error(`Unknown inheritance mode: ${mode}`);
    }
  }
```

### 5.5 MemoMap Parent Chain Lookup

```typescript
// From: packages/runtime/src/util/memo-map.ts

getOrElseMemoize<P extends Port<unknown, string>>(
    port: P,
    factory: () => InferService<P>,
    finalizer?: Finalizer<InferService<P>>
  ): InferService<P> {
    // Check parent cache first (for singleton inheritance)
    if (this.parent !== undefined && this.parent.has(port)) {
      return this.parent.getOrElseMemoize(port, factory, finalizer);
    }
    // Check own cache
    const cached = this.cache.get(port);
    if (cached !== undefined && isEntryForPort(cached, port)) {
      return cached.instance;
    }
    // Create new instance
    const instance = factory();
    const entry: CacheEntry<P> = {
      port, instance, finalizer,
      resolvedAt: this.config.captureTimestamps !== false ? Date.now() : 0,
      resolutionOrder: this.resolutionCounter++,
    };
    this.cache.set(port, entry);
    this.creationOrder.push(entry);
    return instance;
  }
```

---

## 6. Edge Cases & Known Limitations

### 6.1 No Finalizer Timeout Protection

**Severity: High**

If a finalizer hangs (e.g., a database connection close that never resolves), the entire disposal chain blocks indefinitely. There is no `AbortSignal` integration or configurable timeout on individual finalizer execution.

```typescript
// MemoMap.dispose() awaits each finalizer sequentially:
await entry.finalizer(entry.instance); // May hang forever
```

**GxP Impact:** In regulated environments, resource cleanup must complete within bounded time. An unresponsive finalizer could prevent application shutdown and violate operational recovery requirements.

### 6.2 Date.now() for Resolution Timing

**Severity: Medium**

Resolution duration is measured with `Date.now()`, which has millisecond granularity and is subject to system clock adjustments. On some platforms, consecutive calls can return the same value, making sub-millisecond resolutions appear to take 0ms.

```typescript
// From: hooks-runner.ts
const startTime = Date.now();
// ... resolution ...
context.duration = Date.now() - startTime; // May be 0 for fast resolutions
```

**GxP Impact:** Audit trails requiring accurate performance metrics may record misleading zero-duration entries. `performance.now()` would provide microsecond precision and monotonic guarantees.

### 6.3 MemoMap Async Race Condition Window

**Severity: Medium**

The `getOrElseMemoizeAsync` method does not deduplicate concurrent calls at the MemoMap level:

```typescript
// From: memo-map.ts
async getOrElseMemoizeAsync<P>(port, factory, finalizer): Promise<InferService<P>> {
    if (this.parent !== undefined && this.parent.has(port)) {
      return this.parent.getOrElseMemoizeAsync(port, factory, finalizer);
    }
    const cached = this.cache.get(port);
    if (cached !== undefined) { return cached.instance; }
    // Between check and cache.set, another caller could start the same factory
    const instance = await factory();
    this.cache.set(port, entry);
    // ...
}
```

The `AsyncResolutionEngine` mitigates this at a higher level with its pending-promise tracking, but direct MemoMap usage from custom wrappers is not protected.

### 6.4 Silent Listener Error Swallowing

**Severity: Medium**

Lifecycle event listeners that throw are silently swallowed:

```typescript
// From: scope/lifecycle-events.ts
try {
  listener(event);
} catch {
  // Swallow listener errors to prevent disrupting disposal
}
```

While this correctly prevents listener bugs from disrupting disposal, the complete absence of error reporting means bugs in listener code may go undetected in production.

### 6.5 Disposed-Flag Race in Async Disposal

**Severity: Low-Medium**

The `ScopeImpl.dispose()` method sets `this.disposed = true` before awaiting child disposal. During the async gap, scope state is partially disposed (flag set, but services still alive). Code checking `isDisposed` during this window sees "disposed" even though finalizers have not run.

```typescript
// From: scope/impl.ts
async dispose(): Promise<void> {
    if (this.disposed) { return; }
    this.lifecycleEmitter.emit("disposing");
    this.disposed = true; // <-- Set before async work
    for (const child of this.childScopes) {
      await child.dispose(); // <-- Async work happens here
    }
    // ...
}
```

This is mitigated by the `disposing`/`disposed` lifecycle events which provide finer-grained state tracking.

### 6.6 No Maximum Scope Depth Limit

**Severity: Low**

Scopes can be nested to arbitrary depth (`scope.createScope().createScope()...`). Deeply nested scope trees consume memory for MemoMap instances and risk stack overflow during cascading disposal. No configurable depth limit exists.

### 6.7 WeakMap Handler-to-Uninstall Mapping

**Severity: Low**

The container factory uses a `WeakMap<AnyHookHandler, () => void>` for hook handler-to-uninstall mapping. If the same function reference is used for multiple `addHook` calls, only the last uninstall function is retained:

```typescript
// From: container/factory.ts
const handlerToUninstall = new WeakMap<AnyHookHandler, () => void>();
// ...
handlerToUninstall.set(handler, uninstall); // Overwrites previous entry for same handler
```

### 6.8 No Adapter De-Registration

**Severity: Low**

Once an adapter is registered (via graph or child container creation), it cannot be removed from the `AdapterRegistry`. The only way to replace an adapter is to create a child container with an override. For long-running applications that need to hot-swap implementations, this requires creating new child containers rather than modifying existing registrations.

---

## 7. Recommendations

### Tier 1 -- Critical (GxP Compliance Blockers)

1. **Implement Finalizer Timeout Protection**
   Add a configurable timeout (defaulting to 30s) on individual finalizer execution in `MemoMap.dispose()`. Use `Promise.race` with an `AbortSignal` or timeout promise. Log timeout events as errors rather than silently hanging.

2. **Route Swallowed Errors to Configurable Reporter**
   Replace silent `catch {}` blocks in lifecycle event emission with a configurable error reporter callback. Default to `console.error` in development, allow injection of production error reporters (Sentry, DataDog, etc.).

### Tier 2 -- High Priority (GxP Best Practices)

3. **Switch to Monotonic Timing**
   Replace `Date.now()` with `performance.now()` in `HooksRunner` duration measurement and optionally in `MemoMap.resolvedAt`. Fall back to `Date.now()` in environments where `performance.now()` is unavailable.

4. **Add MemoMap-Level Async Deduplication**
   Implement pending-promise tracking within `getOrElseMemoizeAsync` to prevent double-factory-execution when the same port is resolved concurrently. This protects direct MemoMap consumers, not just the `AsyncResolutionEngine` path.

5. **Introduce Resolution Correlation IDs**
   Generate a unique correlation ID per top-level `resolve()` or `resolveAsync()` call and propagate it through the `ResolutionHookContext`. This enables end-to-end tracing of resolution chains in distributed systems.

### Tier 3 -- Medium Priority (Operational Excellence)

6. **Add Scope Depth Limit**
   Introduce an optional `maxScopeDepth` configuration (default: unlimited) that throws a descriptive error when exceeded. This prevents runaway scope nesting in production.

7. **Implement Property-Based Testing**
   Add fast-check property tests for core invariants: "LIFO disposal order", "cycle detection is complete", "idempotent disposal", "parent cache lookup before own cache".

8. **Architecture Decision Records**
   Document key design decisions (dual Set+Array in ResolutionContext, MemoMap parent chain vs. flat inheritance, Symbol.for vs. private Symbol) in ADR format for audit trail purposes.

### Tier 4 -- Low Priority (Polish)

9. **Factory Return Value Validation**
   Add optional runtime validation that factory return values are non-null and structurally compatible with port expectations. This could be gated behind a development-only flag.

10. **Disposal Progress Reporting**
    Extend the disposal pipeline with progress callbacks reporting which finalizer is currently executing, enabling monitoring dashboards to track shutdown progress.

---

## 8. File Reference Guide

### Container Layer

| File                            | Purpose                                                                  | Lines |
| ------------------------------- | ------------------------------------------------------------------------ | ----- |
| `container/factory.ts`          | Public `createContainer()` factory, late-binding hooks, wrapper creation | ~893  |
| `container/base-impl.ts`        | Abstract base class for root and child container implementations         | ~509  |
| `container/root-impl.ts`        | Root container implementation (graph processing, initialization)         | --    |
| `container/child-impl.ts`       | Child container implementation (inheritance, overrides, extensions)      | --    |
| `container/lazy-impl.ts`        | Lazy-loading child container (deferred graph loading)                    | --    |
| `container/id-generator.ts`     | Counter-based container ID generation with factory pattern               | ~101  |
| `container/internal-types.ts`   | Internal type definitions for adapters, configs, and container access    | --    |
| `container/helpers.ts`          | Shared helpers (shallow clone, memo map snapshot)                        | --    |
| `container/override-builder.ts` | Fluent API for building child containers with overrides                  | --    |
| `container/wrappers.ts`         | Child container wrapper creation with full API surface                   | --    |
| `container/wrapper-utils.ts`    | Utilities for parsing graphs, inheritance modes, attaching inspector     | --    |
| `container/result-helpers.ts`   | Error mapping for try\* methods and Result event emission                | ~155  |

### Container Internal Layer

| File                                         | Purpose                                                                     | Lines |
| -------------------------------------------- | --------------------------------------------------------------------------- | ----- |
| `container/internal/lifecycle-manager.ts`    | Child scope/container registration and LIFO disposal orchestration          | ~265  |
| `container/internal/adapter-registry.ts`     | Centralized adapter lookup with local/parent fallback and override tracking | ~211  |
| `container/internal/async-initializer.ts`    | Topological async initialization using Kahn's algorithm                     | ~298  |
| `container/internal/inheritance-resolver.ts` | Shared/forked/isolated inheritance mode resolution for child containers     | ~228  |

### Resolution Layer

| File                         | Purpose                                                                         | Lines |
| ---------------------------- | ------------------------------------------------------------------------------- | ----- |
| `resolution/engine.ts`       | Synchronous resolution engine with lifetime caching and hook integration        | ~193  |
| `resolution/async-engine.ts` | Async resolution engine with deduplication and concurrent dependency resolution | ~303  |
| `resolution/context.ts`      | O(1) cycle detection using dual Set+Array structure                             | ~85   |
| `resolution/hooks.ts`        | Resolution hook types, sealed hooks, container options                          | ~481  |
| `resolution/hooks-runner.ts` | Hook execution with parent stack tracking and in-place context mutation         | ~331  |
| `resolution/core.ts`         | Shared resolution utilities (lifetime routing, dependency building)             | ~215  |

### Scope Layer

| File                        | Purpose                                                              | Lines |
| --------------------------- | -------------------------------------------------------------------- | ----- |
| `scope/impl.ts`             | Scope implementation with hierarchical disposal and lifecycle events | ~344  |
| `scope/lifecycle-events.ts` | Event emitter for disposing/disposed events with React compatibility | ~125  |

### Inspection Layer

| File                                 | Purpose                                                               | Lines |
| ------------------------------------ | --------------------------------------------------------------------- | ----- |
| `inspection/symbols.ts`              | Symbol.for definitions for cross-realm access (INTERNAL_ACCESS, etc.) | ~136  |
| `inspection/creation.ts`             | Inspector factory with snapshot, listPorts, isResolved, getScopeTree  | ~416  |
| `inspection/api.ts`                  | Inspector API type definitions                                        | --    |
| `inspection/builtin-api.ts`          | Built-in inspector attached to containers                             | --    |
| `inspection/internal-state-types.ts` | Internal state types for snapshots and DevTools                       | --    |
| `inspection/internal-helpers.ts`     | Helpers for building typed snapshots from internal state              | --    |
| `inspection/helpers.ts`              | Shared inspection helpers                                             | --    |
| `inspection/library-registry.ts`     | Registry for library inspectors (auto-discovered via hooks)           | --    |
| `inspection/type-guards.ts`          | Type guards for inspection types                                      | --    |
| `inspection/types.ts`                | InspectorAPI, InspectorEvent, and related types                       | --    |

### Utility Layer

| File                        | Purpose                                                              | Lines |
| --------------------------- | -------------------------------------------------------------------- | ----- |
| `util/memo-map.ts`          | Instance caching with LIFO disposal, parent chain, and async support | ~503  |
| `util/string-similarity.ts` | Levenshtein distance for "did you mean?" error suggestions           | --    |
| `util/type-guards.ts`       | Runtime type guard utilities                                         | --    |
| `util/unreachable.ts`       | Unreachable code assertion for brand properties                      | --    |

### Error Layer

| File              | Purpose                                                                     | Lines |
| ----------------- | --------------------------------------------------------------------------- | ----- |
| `errors/index.ts` | 7-class error hierarchy with codes, suggestions, and V8 stack trace support | ~711  |

### Top-Level

| File                    | Purpose                                                                    | Lines |
| ----------------------- | -------------------------------------------------------------------------- | ----- |
| `index.ts`              | Public API barrel exports                                                  | --    |
| `internal.ts`           | Internal API exports for sibling packages                                  | --    |
| `types.ts`              | Re-exports from types/ subdirectory                                        | ~12   |
| `inspect.ts`            | Standalone `inspect()` function for container state inspection             | ~72   |
| `captive-dependency.ts` | Type-level captive dependency prevention (compile-time, zero runtime cost) | ~247  |

### Types Subdirectory

| File                         | Purpose                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `types/index.ts`             | Types barrel                                             |
| `types/container.ts`         | Container, ContainerMembers, CreateContainerConfig types |
| `types/scope.ts`             | Scope type definitions                                   |
| `types/options.ts`           | ContainerOptions, CreateChildOptions types               |
| `types/inheritance.ts`       | InheritanceMode ("shared" / "forked" / "isolated")       |
| `types/override-types.ts`    | Override builder types                                   |
| `types/helpers.ts`           | Utility types for container operations                   |
| `types/inference.ts`         | Type inference helpers                                   |
| `types/brands.ts`            | Brand symbols (ContainerBrand, ScopeBrand)               |
| `types/branded-types.ts`     | Branded type definitions                                 |
| `types/type-guards.ts`       | Runtime type guards for container/scope checks           |
| `types/validation-errors.ts` | Validation error types                                   |

---

_End of GxP Compliance Analysis Report for @hex-di/runtime_
