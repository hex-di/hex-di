# Technical Refinement: @hex-di/runtime GxP 10/10 Compliance

**Package:** `@hex-di/runtime`
**Current Score:** 7.9 / 10
**Target Score:** 10 / 10
**Constraint:** Tracing remains OPTIONAL. Emit warnings when tracing hooks are not configured, but never require them.

---

## 1. Current Score Breakdown

| #   | Criterion              | Current | Target | Delta | Primary Gaps                                                                       |
| --- | ---------------------- | ------- | ------ | ----- | ---------------------------------------------------------------------------------- |
| 1   | Deterministic Behavior | 8.5     | 10     | +1.5  | `Date.now()` non-monotonic timing; no scope depth limit                            |
| 2   | Error Traceability     | 8.5     | 10     | +1.5  | No correlation IDs; silent listener error swallowing hides failures                |
| 3   | State Immutability     | 8.0     | 10     | +2.0  | HooksRunner mutates context in-place; MemoMap internals mutable                    |
| 4   | Lifecycle Management   | 8.0     | 10     | +2.0  | No finalizer timeout; disposal flag race; no adapter de-registration               |
| 5   | Audit & Inspection     | 7.5     | 10     | +2.5  | No disposal progress reporting; no lifecycle error channel                         |
| 6   | Test Coverage          | 9.0     | 10     | +1.0  | No property-based tests; no timeout protection tests                               |
| 7   | Concurrency Safety     | 7.0     | 10     | +3.0  | MemoMap async race window; no disposal guard during async gaps                     |
| 8   | Input Validation       | 7.5     | 10     | +2.5  | No scope depth validation; WeakMap handler overwrite; no factory return validation |
| 9   | Documentation          | 8.0     | 10     | +2.0  | No ADRs for key design decisions                                                   |
| 10  | Failure Isolation      | 7.5     | 10     | +2.5  | Silent listener error swallowing; no bounded finalizer execution                   |

---

## 2. Gap Analysis

### Gap 2.1: No Finalizer Timeout Protection in MemoMap Disposal

**Criterion:** 4 (Lifecycle Management), 7 (Concurrency Safety), 10 (Failure Isolation)
**Severity:** Critical
**Current Score Impact:** -2.0 across criteria 4 and 10

**Location:** `packages/runtime/src/util/memo-map.ts`, lines 456-485

The `dispose()` method awaits each finalizer sequentially with no timeout:

```typescript
// Current: packages/runtime/src/util/memo-map.ts:468-471
await entry.finalizer(entry.instance); // May hang forever
```

A finalizer that never resolves (e.g., a database connection stuck in a closing handshake) blocks the entire disposal chain indefinitely. In GxP contexts, resource cleanup must complete within bounded time for operational recovery compliance.

**Impact:** The entire application shutdown can hang, preventing clean restarts. In containerized environments, this causes pod termination timeouts and forced kills that skip remaining finalizers.

---

### Gap 2.2: `Date.now()` Timestamp Precision

**Criterion:** 1 (Deterministic Behavior), 5 (Audit & Inspection)
**Severity:** Medium
**Current Score Impact:** -1.5 across criteria 1 and 5

**Locations:**

- `packages/runtime/src/resolution/hooks-runner.ts`, lines 170, 292
- `packages/runtime/src/util/memo-map.ts`, lines 215, 266, 322

`Date.now()` has millisecond granularity and is subject to system clock adjustments (NTP jumps, daylight saving). Consecutive calls during fast resolutions return identical values, producing `duration: 0` entries that are misleading in audit trails.

```typescript
// Current: packages/runtime/src/resolution/hooks-runner.ts:170
const startTime = Date.now();
// ... fast resolution ...
// hooks-runner.ts:292
context.duration = Date.now() - startTime; // Often 0
```

`performance.now()` provides microsecond precision and monotonic guarantees (never goes backward).

---

### Gap 2.3: MemoMap Async Race Window During Disposal

**Criterion:** 7 (Concurrency Safety)
**Severity:** Medium
**Current Score Impact:** -1.5 on criterion 7

**Location:** `packages/runtime/src/util/memo-map.ts`, lines 299-330

`getOrElseMemoizeAsync` does not deduplicate concurrent calls at the MemoMap level:

```typescript
// Current: packages/runtime/src/util/memo-map.ts:309-327
const cached = this.cache.get(port);
if (cached !== undefined && isEntryForPort(cached, port)) {
  return cached.instance; // Cache hit: OK
}
// ---- RACE WINDOW ----
// Another microtask could reach this point for the same port
// before the factory below resolves
const instance = await factory();
// ...
this.cache.set(port, entry);
```

The `AsyncResolutionEngine` mitigates this at a higher level via `pendingResolutions`, but direct MemoMap usage from custom wrappers or inheritance resolution is not protected. Two concurrent `getOrElseMemoizeAsync` calls for the same port execute the factory twice, violating the singleton invariant.

---

### Gap 2.4: Silent Listener Error Swallowing in Lifecycle Events

**Criterion:** 2 (Error Traceability), 10 (Failure Isolation)
**Severity:** Medium
**Current Score Impact:** -1.5 across criteria 2 and 10

**Location:** `packages/runtime/src/scope/lifecycle-events.ts`, lines 106-113

```typescript
// Current: packages/runtime/src/scope/lifecycle-events.ts:107-112
for (const listener of this.listeners) {
  try {
    listener(event);
  } catch {
    // Swallow listener errors to prevent disrupting disposal
  }
}
```

Listener errors are completely discarded. While the swallowing behavior is correct (listener bugs must not disrupt disposal), the complete absence of error reporting means:

- Bugs in monitoring hooks go undetected in production
- GxP audit requirements for error logging are not met
- Errors in tracing listeners silently corrupt observability data

---

### Gap 2.5: No Maximum Scope Depth Limit

**Criterion:** 1 (Deterministic Behavior), 8 (Input Validation)
**Severity:** Low-Medium
**Current Score Impact:** -1.0 across criteria 1 and 8

**Location:** `packages/runtime/src/scope/impl.ts`, line 170-180

```typescript
// Current: packages/runtime/src/scope/impl.ts:170-180
createScope(name?: string): Scope<TProvides, TAsyncPorts, TPhase> {
  const child = new ScopeImpl<TProvides, TAsyncPorts, TPhase>(
    this.container,
    this.container.getSingletonMemo(),
    this,
    undefined,
    name
  );
  this.childScopes.add(child);
  return createScopeWrapper(child);
}
```

Scopes can be nested to arbitrary depth. Each scope allocates a `MemoMap`, a `ScopeLifecycleEmitter`, and a `Set<ScopeImpl>`. Deeply nested scope trees consume memory and risk stack overflow during cascading disposal (each `dispose()` awaits its children recursively). No depth limit or guard exists.

---

### Gap 2.6: WeakMap Handler Potential Overwrite

**Criterion:** 8 (Input Validation), 1 (Deterministic Behavior)
**Severity:** Low
**Current Score Impact:** -0.5 across criteria 8 and 1

**Location:** `packages/runtime/src/container/factory.ts`, lines 212-213, 386

```typescript
// Current: packages/runtime/src/container/factory.ts:212-213
const handlerToUninstall = new WeakMap<AnyHookHandler, () => void>();
// ...
// factory.ts:386
handlerToUninstall.set(handler, uninstall); // Overwrites if same handler
```

If `addHook("beforeResolve", handler)` is called twice with the same function reference, the second `set()` overwrites the first uninstall callback. A subsequent `removeHook("beforeResolve", handler)` only removes the second installation, leaving the first one orphaned in `hookSources`.

---

### Gap 2.7: No Adapter De-Registration After Container Creation

**Criterion:** 4 (Lifecycle Management)
**Severity:** Low
**Current Score Impact:** -0.5 on criterion 4

**Location:** `packages/runtime/src/container/internal/adapter-registry.ts`

The `AdapterRegistry` provides `register()` but no `unregister()` or `replace()` method. Once registered, adapters are permanent. For long-running applications needing hot-swap (e.g., feature flag rollouts, A/B testing infrastructure), the only recourse is creating a new child container with overrides, which accumulates containers over time.

This is an architectural limitation, not a bug. The refinement acknowledges it as "by design with documented rationale" rather than requiring runtime adapter removal.

---

### Gap 2.8: HooksRunner Mutates Context In-Place

**Criterion:** 3 (State Immutability)
**Severity:** Low-Medium
**Current Score Impact:** -1.0 on criterion 3

**Location:** `packages/runtime/src/resolution/hooks-runner.ts`, lines 64-80, 282-296

```typescript
// Current: packages/runtime/src/resolution/hooks-runner.ts:64-80
interface MutableHookContext {
  port: Port<unknown, string>;
  portName: string;
  // ... all fields writable
  duration: number;
  error: Error | null;
  result?: unknown;
}

// hooks-runner.ts:282-296
private _emitAfterResolve(context: MutableHookContext, startTime: number, error: Error | null): void {
  // ...
  context.duration = Date.now() - startTime;
  context.error = error;
  this.hooks.afterResolve(context as ResolutionHookContext);
}
```

The context object exposed to `beforeResolve` is the same mutable reference that later gets `duration` and `error` mutated for `afterResolve`. A `beforeResolve` hook that stores the context reference could observe it change after the callback returns. The `ResolutionHookContext` interface declares `readonly` fields, but the underlying object is mutable.

---

## 3. Required Changes

### Change 3.1: Finalizer Timeout Protection in MemoMap

**File:** `packages/runtime/src/util/memo-map.ts`
**Rationale:** Prevent indefinite blocking during disposal. A finalizer timeout converts a potential hang into a logged, bounded error.

**Current signature:**

```typescript
async dispose(): Promise<void>
```

**New signature:**

```typescript
async dispose(options?: DisposalOptions): Promise<void>
```

**New interface in `memo-map.ts`:**

```typescript
export interface DisposalOptions {
  /** Maximum time in ms to wait for each finalizer. Default: 30_000 */
  readonly finalizerTimeoutMs?: number;
  /** Callback invoked when a finalizer times out. Optional. */
  readonly onFinalizerTimeout?: (portName: string, timeoutMs: number) => void;
}
```

**Implementation change in `dispose()`:**

```typescript
async dispose(options?: DisposalOptions): Promise<void> {
  this.disposed = true;
  const errors: unknown[] = [];
  const timeoutMs = options?.finalizerTimeoutMs ?? 30_000;

  for (let i = this.creationOrder.length - 1; i >= 0; i--) {
    const entry = this.creationOrder[i];
    if (entry !== undefined && entry.finalizer !== undefined) {
      try {
        await withTimeout(
          entry.finalizer(entry.instance),
          timeoutMs,
          entry.port.__portName
        );
      } catch (error) {
        if (error instanceof FinalizerTimeoutError) {
          options?.onFinalizerTimeout?.(entry.port.__portName, timeoutMs);
        }
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

**New helper function in `memo-map.ts`:**

```typescript
function withTimeout(
  maybePromise: void | Promise<void>,
  timeoutMs: number,
  portName: string
): Promise<void> {
  if (maybePromise === undefined || !(maybePromise instanceof Promise)) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new FinalizerTimeoutError(portName, timeoutMs));
    }, timeoutMs);

    maybePromise.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      err => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
```

**Propagation:** `ScopeImpl.dispose()` and `LifecycleManager.dispose()` must pass `DisposalOptions` down to `MemoMap.dispose()`.

**Files to modify:**

1. `packages/runtime/src/util/memo-map.ts` -- Add `DisposalOptions`, `FinalizerTimeoutError`, `withTimeout`, update `dispose()`
2. `packages/runtime/src/scope/impl.ts` -- Accept and propagate `DisposalOptions` in `ScopeImpl.dispose()`
3. `packages/runtime/src/container/internal/lifecycle-manager.ts` -- Accept and propagate `DisposalOptions` in `LifecycleManager.dispose()`
4. `packages/runtime/src/container/base-impl.ts` -- Pass disposal options from container config
5. `packages/runtime/src/types/options.ts` -- Add `finalizerTimeoutMs` to `RuntimePerformanceOptions`

---

### Change 3.2: Monotonic Timing via `performance.now()`

**File:** `packages/runtime/src/resolution/hooks-runner.ts`
**Rationale:** Provide sub-millisecond precision and monotonic guarantees for audit-quality timing data.

**New helper in `hooks-runner.ts`:**

```typescript
/**
 * Returns a monotonic high-resolution timestamp if available, falling back to Date.now().
 * @internal
 */
function monotonicNow(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}
```

**Changes in `HooksRunner`:**

- Replace `Date.now()` with `monotonicNow()` at lines 170, 292
- Update duration computation at line 292

**Changes in `MemoMap`:**

- Replace `Date.now()` with `monotonicNow()` at lines 215, 266, 322
- The `resolvedAt` field semantics shift from wall-clock ms to monotonic ms. Document this change.

**Files to modify:**

1. `packages/runtime/src/resolution/hooks-runner.ts` -- Add `monotonicNow()`, update timing calls
2. `packages/runtime/src/util/memo-map.ts` -- Import and use `monotonicNow()` for `resolvedAt`

**Note:** Extract `monotonicNow()` into a shared utility file `packages/runtime/src/util/monotonic-time.ts` to avoid duplication.

---

### Change 3.3: MemoMap Async Deduplication

**File:** `packages/runtime/src/util/memo-map.ts`
**Rationale:** Prevent double-factory-execution for the same port when two async resolution paths converge before either completes.

**New field in `MemoMap`:**

```typescript
private readonly pendingAsync: Map<Port<unknown, string>, Promise<unknown>> = new Map();
```

**Updated `getOrElseMemoizeAsync`:**

```typescript
async getOrElseMemoizeAsync<P extends Port<unknown, string>>(
  port: P,
  factory: () => Promise<InferService<P>>,
  finalizer?: Finalizer<InferService<P>>
): Promise<InferService<P>> {
  // Check parent cache first
  if (this.parent !== undefined && this.parent.has(port)) {
    return this.parent.getOrElseMemoizeAsync(port, factory, finalizer);
  }

  // Check own cache
  const cached = this.cache.get(port);
  if (cached !== undefined && isEntryForPort(cached, port)) {
    return cached.instance;
  }

  // Check pending (deduplication)
  const pending = this.pendingAsync.get(port);
  if (pending !== undefined) {
    return pending as Promise<InferService<P>>;
  }

  // Create and track the pending promise
  const promise = this._executeMemoizeAsync(port, factory, finalizer);
  this.pendingAsync.set(port, promise);

  try {
    return await promise;
  } finally {
    this.pendingAsync.delete(port);
  }
}

private async _executeMemoizeAsync<P extends Port<unknown, string>>(
  port: P,
  factory: () => Promise<InferService<P>>,
  finalizer?: Finalizer<InferService<P>>
): Promise<InferService<P>> {
  const instance = await factory();
  const entry: CacheEntry<P> = {
    port,
    instance,
    finalizer,
    resolvedAt: this.config.captureTimestamps !== false ? monotonicNow() : 0,
    resolutionOrder: this.resolutionCounter++,
  };
  this.cache.set(port, entry);
  this.creationOrder.push(entry);
  return instance;
}
```

**Files to modify:**

1. `packages/runtime/src/util/memo-map.ts` -- Add `pendingAsync` map, refactor `getOrElseMemoizeAsync`

---

### Change 3.4: Configurable Error Reporter for Lifecycle Events

**File:** `packages/runtime/src/scope/lifecycle-events.ts`
**Rationale:** Route swallowed listener errors to a configurable reporter instead of silently discarding them. Default: `console.warn` in development when no reporter is configured.

**New interface:**

```typescript
/**
 * Error reporter for swallowed lifecycle listener errors.
 * @internal
 */
export type LifecycleErrorReporter = (error: unknown, event: ScopeLifecycleEvent) => void;
```

**Updated `ScopeLifecycleEmitter` constructor:**

```typescript
export class ScopeLifecycleEmitter {
  private readonly listeners: Set<ScopeLifecycleListener> = new Set();
  private state: ScopeDisposalState = "active";
  private readonly errorReporter: LifecycleErrorReporter | undefined;

  constructor(errorReporter?: LifecycleErrorReporter) {
    this.errorReporter = errorReporter;
  }

  emit(event: ScopeLifecycleEvent): void {
    if (event === "disposing") {
      this.state = "disposing";
    } else if (event === "disposed") {
      this.state = "disposed";
    }

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        // Route to reporter if configured; never rethrow
        if (this.errorReporter !== undefined) {
          try {
            this.errorReporter(error, event);
          } catch {
            // Reporter itself failed; truly swallow to prevent infinite loops
          }
        }
      }
    }
  }
  // ... rest unchanged
}
```

**Propagation:** The error reporter must flow from `CreateContainerConfig` through to `ScopeImpl` constructors.

**Files to modify:**

1. `packages/runtime/src/scope/lifecycle-events.ts` -- Add `LifecycleErrorReporter`, update constructor and `emit()`
2. `packages/runtime/src/scope/impl.ts` -- Accept and pass `LifecycleErrorReporter` to `ScopeLifecycleEmitter`
3. `packages/runtime/src/types/options.ts` -- Add `onLifecycleError` to `RuntimePerformanceOptions` (or a new `RuntimeSafetyOptions`)
4. `packages/runtime/src/container/factory.ts` -- Wire error reporter from config to scope creation

---

### Change 3.5: Maximum Scope Depth Limit

**File:** `packages/runtime/src/scope/impl.ts`
**Rationale:** Prevent runaway scope nesting that exhausts memory or causes stack overflow during cascading disposal.

**New field in `ScopeImpl`:**

```typescript
private readonly depth: number;
private readonly maxDepth: number;
```

**Updated constructor:**

```typescript
constructor(
  container: ScopeContainerAccess<TProvides>,
  singletonMemo: MemoMap,
  parentScope: ScopeImpl<TProvides, TAsyncPorts, TPhase> | null = null,
  unregisterFromContainer?: () => void,
  name?: string,
  maxDepth: number = 64
) {
  // ...existing init...
  this.depth = parentScope !== null ? parentScope.depth + 1 : 0;
  this.maxDepth = maxDepth;
}
```

**Updated `createScope()`:**

```typescript
createScope(name?: string): Scope<TProvides, TAsyncPorts, TPhase> {
  if (this.depth + 1 > this.maxDepth) {
    throw new ScopeDepthExceededError(this.depth + 1, this.maxDepth);
  }
  const child = new ScopeImpl<TProvides, TAsyncPorts, TPhase>(
    this.container,
    this.container.getSingletonMemo(),
    this,
    undefined,
    name,
    this.maxDepth
  );
  this.childScopes.add(child);
  return createScopeWrapper(child);
}
```

**Files to modify:**

1. `packages/runtime/src/scope/impl.ts` -- Add depth tracking, depth check in `createScope()`
2. `packages/runtime/src/errors/index.ts` -- Add `ScopeDepthExceededError`
3. `packages/runtime/src/types/options.ts` -- Add `maxScopeDepth` to container options

---

### Change 3.6: WeakMap Handler Overwrite Guard

**File:** `packages/runtime/src/container/factory.ts`
**Rationale:** Prevent silent overwrite of uninstall callbacks when the same handler function is registered twice.

**Updated `addHook` in factory.ts:**

```typescript
addHook: <T extends HookType>(type: T, handler: HookHandler<T>): void => {
  const hooks: ResolutionHooks =
    type === "beforeResolve"
      ? { beforeResolve: handler as (ctx: ResolutionHookContext) => void }
      : { afterResolve: handler as (ctx: ResolutionResultContext) => void };

  // Guard: If same handler already registered, uninstall previous first
  const existingUninstall = handlerToUninstall.get(handler);
  if (existingUninstall !== undefined) {
    existingUninstall();
    handlerToUninstall.delete(handler);
  }

  const uninstall = (): void => {
    const idx = hooksHolder.hookSources.indexOf(hooks);
    if (idx !== -1) {
      hooksHolder.hookSources.splice(idx, 1);
    }
  };
  handlerToUninstall.set(handler, uninstall);
  hooksHolder.hookSources.push(hooks);
},
```

This must be applied in both `createUninitializedContainerWrapper` and `createInitializedContainerWrapper`.

**Files to modify:**

1. `packages/runtime/src/container/factory.ts` -- Update both `addHook` implementations (lines ~372-388 and ~616-632)

---

### Change 3.7: Immutable Hook Context for `beforeResolve`

**File:** `packages/runtime/src/resolution/hooks-runner.ts`
**Rationale:** The context passed to `beforeResolve` must be a frozen snapshot. The mutable copy is only used internally and for `afterResolve`.

**Updated `_emitAfterResolve`:**

```typescript
private _emitAfterResolve(
  context: MutableHookContext,
  startTime: number,
  error: Error | null
): void {
  this._parentPorts.pop();
  this._parentStartTimes.pop();

  if (this.hooks.afterResolve !== undefined) {
    context.duration = monotonicNow() - startTime;
    context.error = error;
    // Freeze before handing to external code
    Object.freeze(context);
    this.hooks.afterResolve(context as ResolutionHookContext);
  }
}
```

**Updated `runSync` and `runAsync`:**

For `beforeResolve`, pass a frozen snapshot:

```typescript
if (this.hooks.beforeResolve !== undefined) {
  // Freeze a snapshot for beforeResolve to prevent external mutation
  const snapshot = Object.freeze({ ...context });
  this.hooks.beforeResolve(snapshot as ResolutionHookContext);
}
```

The internal `context` continues to be mutated for `afterResolve` only.

**Files to modify:**

1. `packages/runtime/src/resolution/hooks-runner.ts` -- Freeze context before passing to hooks

---

### Change 3.8: Adapter De-Registration Documentation (ADR)

**Rationale:** Document that adapter de-registration is intentionally absent. This is a design decision, not a gap. The child container override pattern is the intended mechanism for runtime adapter replacement.

This gap does not require code changes. It requires an ADR document explaining:

1. Adapters are immutable after container creation by design
2. The child container pattern provides equivalent functionality
3. Runtime adapter mutation would violate the frozen-container invariant

**Files to create:**

1. `packages/runtime/docs/adr/001-immutable-adapter-registry.md`

---

## 4. New Code to Implement

### 4.1 `FinalizerTimeoutError` (new error class)

**File:** `packages/runtime/src/errors/index.ts`

```typescript
/**
 * Error thrown when a finalizer exceeds the configured timeout during disposal.
 *
 * This error is collected alongside other finalizer errors in the AggregateError
 * thrown by MemoMap.dispose(). It indicates a resource cleanup that hung.
 *
 * @remarks
 * - This is NOT a programming error - timeout failures are runtime conditions
 * - The finalizer may still be running in the background after timeout
 * - The port name identifies which service's cleanup hung
 */
export class FinalizerTimeoutError extends ContainerError {
  readonly code = "FINALIZER_TIMEOUT" as const;
  readonly isProgrammingError = false as const;

  /** The name of the port whose finalizer timed out */
  readonly portName: string;

  /** The timeout duration in milliseconds */
  readonly timeoutMs: number;

  constructor(portName: string, timeoutMs: number) {
    super(
      `Finalizer for port '${portName}' timed out after ${timeoutMs}ms. ` +
        `The resource may not have been properly cleaned up.`
    );
    this.portName = portName;
    this.timeoutMs = timeoutMs;
  }
}
```

---

### 4.2 `ScopeDepthExceededError` (new error class)

**File:** `packages/runtime/src/errors/index.ts`

````typescript
/**
 * Error thrown when creating a scope would exceed the maximum allowed nesting depth.
 *
 * @remarks
 * - This is a programming error - indicates runaway scope creation
 * - The default max depth is 64, configurable via container options
 * - Usually indicates a recursive createScope() call or missing scope reuse
 */
export class ScopeDepthExceededError extends ContainerError {
  readonly code = "SCOPE_DEPTH_EXCEEDED" as const;
  readonly isProgrammingError = true as const;

  /** The depth that was attempted */
  readonly attemptedDepth: number;

  /** The maximum allowed depth */
  readonly maxDepth: number;

  constructor(attemptedDepth: number, maxDepth: number) {
    super(
      `Cannot create scope at depth ${attemptedDepth}: maximum scope depth is ${maxDepth}. ` +
        `This usually indicates a recursive scope creation pattern.`
    );
    this.attemptedDepth = attemptedDepth;
    this.maxDepth = maxDepth;

    this.suggestion =
      "To fix excessive scope nesting:\n" +
      "1. Reuse existing scopes instead of creating new ones per operation\n" +
      "2. Use flat scope structures (sibling scopes instead of nested)\n" +
      "3. Increase maxScopeDepth in container options if deep nesting is intentional\n\n" +
      "Example - configure max depth:\n" +
      "```typescript\n" +
      "const container = createContainer({\n" +
      "  graph,\n" +
      "  name: 'App',\n" +
      "  safety: { maxScopeDepth: 128 },\n" +
      "});\n" +
      "```";
  }
}
````

---

### 4.3 `monotonicNow()` Utility

**File:** `packages/runtime/src/util/monotonic-time.ts` (new file)

```typescript
/**
 * Provides a monotonic high-resolution timestamp.
 *
 * Uses `performance.now()` when available (Node.js, browsers),
 * falling back to `Date.now()` in restricted environments.
 *
 * @returns Timestamp in milliseconds (monotonic, sub-millisecond precision when available)
 * @internal
 */
export function monotonicNow(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}
```

---

### 4.4 `DisposalOptions` Interface

**File:** `packages/runtime/src/util/memo-map.ts` (add to existing)

```typescript
/**
 * Options for controlling disposal behavior.
 * @internal
 */
export interface DisposalOptions {
  /** Maximum time in ms to wait for each individual finalizer. Default: 30_000 */
  readonly finalizerTimeoutMs?: number;
  /** Callback invoked when a finalizer exceeds the timeout. */
  readonly onFinalizerTimeout?: (portName: string, timeoutMs: number) => void;
}
```

---

### 4.5 `RuntimeSafetyOptions` Interface

**File:** `packages/runtime/src/types/options.ts` (add to existing)

```typescript
/**
 * Safety-related options for container runtime behavior.
 *
 * These options configure protective limits and error reporting
 * for GxP-compliant deployments.
 */
export interface RuntimeSafetyOptions {
  /**
   * Maximum allowed scope nesting depth.
   * Throws ScopeDepthExceededError when exceeded.
   *
   * @default 64
   */
  readonly maxScopeDepth?: number;

  /**
   * Maximum time in ms to wait for each finalizer during disposal.
   * Throws FinalizerTimeoutError when exceeded.
   *
   * @default 30_000
   */
  readonly finalizerTimeoutMs?: number;

  /**
   * Callback invoked when a lifecycle listener throws during event emission.
   * The error is swallowed after reporting to prevent disrupting disposal.
   *
   * When undefined, lifecycle listener errors are silently swallowed.
   *
   * @default undefined
   */
  readonly onLifecycleError?: (error: unknown, event: string) => void;

  /**
   * Callback invoked when a finalizer times out during disposal.
   *
   * @default undefined
   */
  readonly onFinalizerTimeout?: (portName: string, timeoutMs: number) => void;
}
```

**Updated `CreateContainerConfig`:** (add field)

```typescript
export interface CreateContainerConfig<
  TProvides extends Port<unknown, string>,
  _TAsyncPorts extends Port<unknown, string> = never,
> {
  // ... existing fields ...

  /**
   * Safety-related options for protective limits and error reporting.
   *
   * @default { maxScopeDepth: 64, finalizerTimeoutMs: 30_000 }
   */
  readonly safety?: RuntimeSafetyOptions;
}
```

---

### 4.6 `LifecycleErrorReporter` Type

**File:** `packages/runtime/src/scope/lifecycle-events.ts` (add to existing)

```typescript
/**
 * Callback for reporting lifecycle listener errors.
 * Called when a lifecycle event listener throws.
 * The error is reported but never re-thrown.
 * @internal
 */
export type LifecycleErrorReporter = (error: unknown, event: ScopeLifecycleEvent) => void;
```

---

## 5. Test Requirements

### 5.1 Finalizer Timeout Protection

**File:** `packages/runtime/tests/util/memo-map-timeout.test.ts` (new)

| Test Case                                                           | Description                                                            |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `should complete disposal within timeout when finalizers are fast`  | Normal disposal with fast finalizers completes without timeout         |
| `should throw FinalizerTimeoutError when finalizer exceeds timeout` | Hanging finalizer produces FinalizerTimeoutError in AggregateError     |
| `should continue disposing remaining entries after timeout`         | All finalizers run even if one times out (error aggregation preserved) |
| `should call onFinalizerTimeout callback on timeout`                | Custom callback invoked with port name and timeout                     |
| `should use default 30s timeout when no option provided`            | Verify default timeout is 30000ms                                      |
| `should respect custom timeout values`                              | Configure 100ms timeout, verify behavior                               |
| `should handle sync finalizers without timeout overhead`            | Sync finalizers bypass timeout wrapping                                |
| `should clear timeout timer on successful completion`               | No timer leak after fast finalizer                                     |

### 5.2 Monotonic Timing

**File:** `packages/runtime/tests/resolution/monotonic-timing.test.ts` (new)

| Test Case                                                                    | Description                                           |
| ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| `should produce non-zero duration for measurable resolutions`                | Factory with artificial delay shows positive duration |
| `should produce monotonically increasing resolvedAt values`                  | Sequential resolutions have non-decreasing timestamps |
| `should handle environments without performance.now`                         | Fallback to Date.now() works correctly                |
| `should produce sub-millisecond precision when performance.now is available` | Duration has fractional component                     |

### 5.3 MemoMap Async Deduplication

**File:** `packages/runtime/tests/util/memo-map-async-dedup.test.ts` (new)

| Test Case                                                                  | Description                                              |
| -------------------------------------------------------------------------- | -------------------------------------------------------- |
| `should call factory only once for concurrent getOrElseMemoizeAsync calls` | Two parallel calls, factory invoked once                 |
| `should return same instance to both callers`                              | Both callers receive identical reference                 |
| `should not leak pending promises after resolution`                        | pendingAsync map empty after completion                  |
| `should handle factory rejection correctly for both callers`               | Both callers receive same rejection                      |
| `should allow re-resolution after pending map cleanup`                     | Factory can be called again for same port in new context |

### 5.4 Lifecycle Error Reporter

**File:** `packages/runtime/tests/scope/lifecycle-error-reporter.test.ts` (new)

| Test Case                                                     | Description                                           |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| `should call error reporter when listener throws`             | Reporter receives error and event type                |
| `should not disrupt disposal when listener throws`            | Disposal completes despite listener error             |
| `should swallow reporter errors`                              | Reporter itself throwing does not propagate           |
| `should still swallow errors when no reporter configured`     | Backward compatible: no reporter means silent swallow |
| `should report errors for both disposing and disposed events` | Both event types trigger reporter                     |

### 5.5 Scope Depth Limit

**File:** `packages/runtime/tests/scope/scope-depth-limit.test.ts` (new)

| Test Case                                                      | Description                                   |
| -------------------------------------------------------------- | --------------------------------------------- |
| `should allow nesting up to maxDepth`                          | 64 nested scopes succeed with default config  |
| `should throw ScopeDepthExceededError when exceeding maxDepth` | Depth 65 throws with correct error code       |
| `should respect custom maxDepth from container options`        | Custom maxDepth=5 enforced                    |
| `should report correct attemptedDepth and maxDepth in error`   | Error properties match                        |
| `should count depth from root scope`                           | Root scope is depth 0, first child is depth 1 |

### 5.6 WeakMap Handler Guard

**File:** `packages/runtime/tests/container/hook-handler-overwrite.test.ts` (new)

| Test Case                                                           | Description                      |
| ------------------------------------------------------------------- | -------------------------------- |
| `should remove previous installation when same handler added twice` | No orphaned hooks in hookSources |
| `should allow re-adding after explicit removeHook`                  | Clean re-add works               |
| `should handle different handlers independently`                    | Two different handlers coexist   |

### 5.7 Hook Context Immutability

**File:** `packages/runtime/tests/resolution/hook-context-immutability.test.ts` (new)

| Test Case                                                    | Description                                            |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| `should pass frozen context to beforeResolve`                | Object.isFrozen returns true for beforeResolve context |
| `should pass frozen context to afterResolve`                 | Object.isFrozen returns true for afterResolve context  |
| `should populate duration and error on afterResolve context` | Fields are set correctly despite freeze                |
| `should prevent external mutation of context properties`     | Assignment throws in strict mode                       |

---

## 6. Migration Notes

### 6.1 Breaking: `MemoMap.dispose()` Signature Change

**Before:**

```typescript
async dispose(): Promise<void>
```

**After:**

```typescript
async dispose(options?: DisposalOptions): Promise<void>
```

**Impact:** Internal only. `MemoMap` is `@internal` and not exported publicly. No external consumers need to change. However, any internal test that calls `MemoMap.dispose()` directly will continue to work because the parameter is optional.

### 6.2 Breaking: `MemoMap.resolvedAt` Semantics Change

**Before:** `resolvedAt` uses `Date.now()` (wall-clock milliseconds since epoch).
**After:** `resolvedAt` uses `performance.now()` (monotonic milliseconds since process start).

**Impact:** Any code comparing `resolvedAt` to `Date.now()` will produce nonsensical results. Consumers must use the values only for relative comparisons (ordering, duration calculation), not for absolute timestamps.

**Affected internal consumers:**

- `packages/runtime/src/inspection/creation.ts` -- Snapshot display (informational only)
- `packages/runtime/src/scope/impl.ts` -- `createMemoMapSnapshot()` (informational only)
- `@hex-di/tracing` -- Trace display (already uses relative ordering)

**Mitigation:** Add a separate `resolvedAtWallClock: number` field to `CacheEntry` using `Date.now()` for consumers that need absolute timestamps, and keep `resolvedAt` as the monotonic value for duration calculations. This preserves backward compatibility while improving precision.

### 6.3 Breaking: New Error Types in AggregateError

**Before:** `AggregateError.errors` during disposal contains only errors thrown by finalizers.
**After:** `AggregateError.errors` may also contain `FinalizerTimeoutError` instances.

**Impact:** Code that pattern-matches on error types inside `AggregateError.errors` must handle the new `FinalizerTimeoutError`. Since the error extends `ContainerError`, generic `instanceof ContainerError` checks still work.

### 6.4 Non-Breaking: New `safety` Configuration Field

Adding `safety?: RuntimeSafetyOptions` to `CreateContainerConfig` is fully backward compatible. When omitted, defaults apply:

- `maxScopeDepth`: 64
- `finalizerTimeoutMs`: 30_000
- `onLifecycleError`: undefined (silent swallow, backward compatible)
- `onFinalizerTimeout`: undefined

### 6.5 Non-Breaking: Hook Context Freeze

Freezing the context before passing to `beforeResolve` and `afterResolve` is semantically backward compatible. Hooks that only _read_ context properties are unaffected. Hooks that _mutate_ context properties will throw `TypeError` in strict mode -- these hooks were already violating the `readonly` contract declared in `ResolutionHookContext`.

---

## 7. Tracing Warning Strategy

### Constraint Recap

Tracing must remain **OPTIONAL**. The runtime must never require tracing hooks to be configured. However, when tracing is not configured, the runtime should emit warnings to alert operators that observability is degraded.

### Strategy: Development-Time Warnings with Opt-Out

**When to warn:** At container creation time, if no hooks are configured.
**How to warn:** `console.warn` to stderr, once per container, only in non-production environments.
**How to opt out:** `performance.disableTracingWarnings: true` or `NODE_ENV=production`.

### Implementation

**File:** `packages/runtime/src/container/factory.ts`

Add a one-time warning check at the end of `createContainer()`:

```typescript
function emitTracingWarning(containerName: string, hooks: ResolutionHooks | undefined): void {
  // Never warn in production
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    return;
  }
  // Only warn if no hooks are configured at creation time
  if (hooks !== undefined) {
    return;
  }
  // Warn once per container
  console.warn(
    `[@hex-di/runtime] Container "${containerName}" created without resolution hooks. ` +
      `For GxP-compliant observability, configure hooks via createContainer({ hooks: ... }) ` +
      `or use @hex-di/tracing instrumentContainer(). ` +
      `Set performance.disableTracingWarnings to suppress this warning.`
  );
}
```

**Opt-out field in `RuntimePerformanceOptions`:**

```typescript
export interface RuntimePerformanceOptions {
  // ... existing fields ...

  /**
   * Suppress warnings about missing tracing hooks.
   *
   * When true, the runtime will not emit console.warn about missing
   * resolution hooks at container creation time.
   *
   * @default false
   */
  readonly disableTracingWarnings?: boolean;
}
```

**Updated warning check:**

```typescript
function emitTracingWarning(
  containerName: string,
  hooks: ResolutionHooks | undefined,
  performance: RuntimePerformanceOptions | undefined
): void {
  if (performance?.disableTracingWarnings === true) {
    return;
  }
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    return;
  }
  if (hooks !== undefined) {
    return;
  }
  console.warn(
    `[@hex-di/runtime] Container "${containerName}" created without resolution hooks. ` +
      `For GxP-compliant observability, configure hooks or use @hex-di/tracing. ` +
      `Set performance.disableTracingWarnings to suppress this warning.`
  );
}
```

### Warning Locations

| Location                       | Trigger                         | Message                                                     |
| ------------------------------ | ------------------------------- | ----------------------------------------------------------- |
| `createContainer()`            | No hooks configured             | Missing resolution hooks warning                            |
| `ScopeLifecycleEmitter.emit()` | Listener error with no reporter | (No warning; error silently swallowed per current behavior) |
| `MemoMap.dispose()`            | Finalizer timeout               | Handled via `onFinalizerTimeout` callback, not console.warn |

### Test Strategy for Warnings

| Test Case                                                     | Description                                     |
| ------------------------------------------------------------- | ----------------------------------------------- |
| `should emit warning when no hooks configured`                | Check console.warn called with expected message |
| `should not emit warning when hooks are configured`           | console.warn not called                         |
| `should not emit warning when disableTracingWarnings is true` | Opt-out works                                   |
| `should not emit warning in production NODE_ENV`              | Production suppression works                    |
| `should emit warning only once per container`                 | No duplicate warnings                           |

---

## Appendix: Implementation Order

The changes should be implemented in dependency order:

| Phase | Changes                       | Blocked By                                       |
| ----- | ----------------------------- | ------------------------------------------------ |
| 1     | 4.3 `monotonicNow()` utility  | None                                             |
| 1     | 4.1 `FinalizerTimeoutError`   | None                                             |
| 1     | 4.2 `ScopeDepthExceededError` | None                                             |
| 1     | 4.5 `RuntimeSafetyOptions`    | None                                             |
| 1     | 4.6 `LifecycleErrorReporter`  | None                                             |
| 2     | 3.2 Monotonic timing          | Phase 1 (monotonicNow)                           |
| 2     | 3.3 MemoMap async dedup       | Phase 1 (monotonicNow)                           |
| 2     | 3.1 Finalizer timeout         | Phase 1 (FinalizerTimeoutError, DisposalOptions) |
| 2     | 3.4 Error reporter            | Phase 1 (LifecycleErrorReporter)                 |
| 2     | 3.5 Scope depth limit         | Phase 1 (ScopeDepthExceededError)                |
| 2     | 3.6 WeakMap handler guard     | None                                             |
| 2     | 3.7 Hook context freeze       | Phase 1 (monotonicNow)                           |
| 3     | 3.8 ADR documentation         | None                                             |
| 3     | 7.0 Tracing warning strategy  | Phase 2 complete                                 |
| 4     | All tests (Section 5)         | Phases 1-3                                       |

---

## Appendix: File Modification Summary

| File Path                                                             | Type    | Changes                                                                                                                 |
| --------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| `packages/runtime/src/util/monotonic-time.ts`                         | **New** | `monotonicNow()` utility                                                                                                |
| `packages/runtime/src/util/memo-map.ts`                               | Modify  | Add `DisposalOptions`, `pendingAsync`, timeout in `dispose()`, dedup in `getOrElseMemoizeAsync()`, monotonic timestamps |
| `packages/runtime/src/errors/index.ts`                                | Modify  | Add `FinalizerTimeoutError`, `ScopeDepthExceededError`                                                                  |
| `packages/runtime/src/scope/lifecycle-events.ts`                      | Modify  | Add `LifecycleErrorReporter`, update `ScopeLifecycleEmitter` constructor and `emit()`                                   |
| `packages/runtime/src/scope/impl.ts`                                  | Modify  | Add depth tracking, depth check in `createScope()`, propagate `DisposalOptions` and error reporter                      |
| `packages/runtime/src/resolution/hooks-runner.ts`                     | Modify  | Use `monotonicNow()`, freeze context before passing to hooks                                                            |
| `packages/runtime/src/container/factory.ts`                           | Modify  | Add tracing warning, guard handler overwrite in `addHook`, wire safety options                                          |
| `packages/runtime/src/container/base-impl.ts`                         | Modify  | Propagate safety options to disposal                                                                                    |
| `packages/runtime/src/container/internal/lifecycle-manager.ts`        | Modify  | Accept and propagate `DisposalOptions`                                                                                  |
| `packages/runtime/src/types/options.ts`                               | Modify  | Add `RuntimeSafetyOptions`, `disableTracingWarnings`, update `CreateContainerConfig`                                    |
| `packages/runtime/docs/adr/001-immutable-adapter-registry.md`         | **New** | ADR documenting adapter de-registration design decision                                                                 |
| `packages/runtime/tests/util/memo-map-timeout.test.ts`                | **New** | 8 test cases for finalizer timeout                                                                                      |
| `packages/runtime/tests/util/memo-map-async-dedup.test.ts`            | **New** | 5 test cases for async deduplication                                                                                    |
| `packages/runtime/tests/resolution/monotonic-timing.test.ts`          | **New** | 4 test cases for monotonic timing                                                                                       |
| `packages/runtime/tests/scope/lifecycle-error-reporter.test.ts`       | **New** | 5 test cases for error reporter                                                                                         |
| `packages/runtime/tests/scope/scope-depth-limit.test.ts`              | **New** | 5 test cases for depth limit                                                                                            |
| `packages/runtime/tests/container/hook-handler-overwrite.test.ts`     | **New** | 3 test cases for handler guard                                                                                          |
| `packages/runtime/tests/resolution/hook-context-immutability.test.ts` | **New** | 4 test cases for context freeze                                                                                         |

**Total:** 11 files modified, 9 files created, 34 new test cases.

---

_End of Technical Refinement Document for @hex-di/runtime GxP 10/10 Compliance_
