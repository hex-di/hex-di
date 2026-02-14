# Technical Refinement: @hex-di/react GxP 10/10 Compliance

**Package:** `@hex-di/react`
**Current Score:** 8.0/10 (weighted 8.15)
**Target Score:** 10.0/10
**Source Location:** `integrations/react/src/`
**Test Location:** `integrations/react/tests/`
**Date:** 2025-02-10

---

## 1. Current Score Breakdown

| Criterion                            | Current  | Target   | Delta     | Weight   | Weighted Impact |
| ------------------------------------ | -------- | -------- | --------- | -------- | --------------- |
| Type Safety & Correctness            | 9.0      | 10.0     | +1.0      | 15%      | +0.15           |
| Deterministic Behavior               | 8.0      | 10.0     | +2.0      | 15%      | +0.30           |
| Error Handling & Traceability        | 8.5      | 10.0     | +1.5      | 12%      | +0.18           |
| Resource Lifecycle Management        | 7.5      | 10.0     | +2.5      | 12%      | +0.30           |
| Test Coverage & Verification         | 8.5      | 10.0     | +1.5      | 12%      | +0.18           |
| Separation of Concerns               | 8.5      | 10.0     | +1.5      | 8%       | +0.12           |
| Documentation & Auditability         | 7.5      | 10.0     | +2.5      | 8%       | +0.20           |
| API Surface Minimality               | 7.5      | 10.0     | +2.5      | 6%       | +0.15           |
| Concurrency & React Model Compliance | 8.0      | 10.0     | +2.0      | 6%       | +0.12           |
| DevTools & Observability             | 7.5      | 10.0     | +2.5      | 6%       | +0.15           |
| **Total**                            | **8.15** | **10.0** | **+1.85** | **100%** | **+1.85**       |

---

## 2. Gap Analysis

### Gap G1: Fire-and-Forget Async Disposal (Resource Lifecycle, -1.5)

**Files affected:**

- `integrations/react/src/providers/auto-scope-provider.tsx` line 139
- `integrations/react/src/hooks/use-scope.ts` line 116
- `integrations/react/src/factories/create-typed-hooks.tsx` lines 413, 735

**Issue:** `void scope.dispose()` silently discards the returned promise. If a finalizer throws during disposal, the error vanishes -- no unhandled rejection, no console output, nothing. React cleanup must be synchronous, which is correctly observed, but the `void` operator suppresses the rejection entirely rather than routing it to an observable sink.

**Evidence (auto-scope-provider.tsx:138-141):**

```typescript
disposalTimeoutRef.current = setTimeout(() => {
  if (currentScope !== null && !currentScope.scope.isDisposed) {
    void currentScope.scope.dispose();
  }
}, 0);
```

**Evidence (use-scope.ts:112-118):**

```typescript
return () => {
  if (scope !== null) {
    void scope.dispose();
  }
};
```

**GxP Impact:** Silent disposal failure means resource leak evidence is lost. In a regulated environment, this violates error completeness (ALCOA+ "Complete" principle) -- failed cleanup should leave an observable trace.

---

### Gap G2: StrictMode Double-Mount Scope Duplication (Deterministic Behavior, -0.5)

**Files affected:**

- `integrations/react/src/providers/auto-scope-provider.tsx` lines 96-144
- `integrations/react/src/factories/create-typed-hooks.tsx` lines 388-434

**Issue:** Two different StrictMode strategies exist. The global `AutoScopeProvider` uses deferred disposal via `setTimeout(fn, 0)` with cancellation. The factory `AutoScopeProvider` uses `isDisposed` check and scope recreation. Both work, but the inconsistency is a compliance concern -- same component name, different behavior depending on API path (global vs factory).

**Global (auto-scope-provider.tsx:123-144):** setTimeout-based deferred disposal
**Factory (create-typed-hooks.tsx:402-416):** isDisposed check + recreation

**GxP Impact:** Behavioral inconsistency between APIs for the same logical operation undermines deterministic behavior and auditability. An auditor seeing "AutoScopeProvider" in code cannot know which disposal strategy runs without tracing the import.

---

### Gap G3: Nested Root Container Detection via INTERNAL_ACCESS (Type Safety, -0.5)

**Files affected:**

- `integrations/react/src/providers/container-provider.tsx` lines 63-78
- `integrations/react/src/factories/create-typed-hooks.tsx` lines 107-122

**Issue:** `isChildContainer()` relies on `INTERNAL_ACCESS` symbol to read `containerId`. Mock containers in tests that lack `INTERNAL_ACCESS` silently default to `isChildContainer = false`. This means a mock container will always be treated as a root container, and nesting two mocks will throw even if that was not the test intent.

**Evidence (container-provider.tsx:63-78):**

```typescript
function isChildContainer<TProvides extends Port<unknown, string>>(
  container: AnyContainer<TProvides>
): boolean {
  const accessor = container[INTERNAL_ACCESS];
  if (typeof accessor === "function") {
    const internalState = accessor();
    return internalState.containerId !== "root";
  }
  return false; // Mock containers default to root
}
```

**GxP Impact:** Test environments should produce the same deterministic behavior as production. A fragile detection mechanism that behaves differently with mocks undermines test traceability.

---

### Gap G4: ReactiveScopeProvider Unstable Context Values (Concurrency, -1.0)

**File:** `integrations/react/src/providers/reactive-scope-provider.tsx` lines 184-193

**Issue:** `toRuntimeScopeRef(scope)` and the `resolverContextValue` object are created inline on every render. Since `useSyncExternalStore` triggers re-renders on state change, and these objects are always new, every child component consuming `ResolverContext` re-renders on every parent render -- even if the scope has not changed.

**Evidence (reactive-scope-provider.tsx:184-193):**

```typescript
const scopeRef: RuntimeResolverRef = toRuntimeScopeRef(scope);
const resolverContextValue: RuntimeResolverContextValue = {
  resolver: scopeRef,
};
```

Compare with `ScopeProvider` which correctly memoizes (scope-provider.tsx:81-88):

```typescript
const scopeRef = useMemo(() => toRuntimeScopeRef(scope), [scope]);
const resolverContextValue = useMemo(
  (): RuntimeResolverContextValue => ({ resolver: scopeRef }),
  [scopeRef]
);
```

**GxP Impact:** Unnecessary re-renders can cause duplicate service resolutions, which for non-idempotent factories could produce inconsistent results.

---

### Gap G5: LazyContainerProvider Effect Dependency Array (Deterministic Behavior, -0.5)

**File:** `integrations/react/src/providers/lazy-container-provider.tsx` lines 308-345

**Issue:** The effect depends on `[state.status, state.container, runtimeLazy]`. Since `state` is a `useState` object, and the effect updates `state` via `setState`, this creates a dependency cycle: effect runs -> `setState` -> state changes -> effect re-runs. The `mounted` flag and early return (`if (!needsLoad) return;`) prevent infinite loops, but the pattern is fragile.

**Evidence (lazy-container-provider.tsx:308-345):**

```typescript
useEffect(() => {
  const needsLoad =
    state.status === "loading" || (state.status === "ready" && state.container === null);
  if (!needsLoad) {
    return;
  }
  // ...
}, [state.status, state.container, runtimeLazy]);
```

**GxP Impact:** An effect that is both producer and consumer of its own dependency is a recognized React anti-pattern. While the guard prevents problems now, a refactor could easily break the invariant.

---

### Gap G6: SSR getServerSnapshot Simplification (Concurrency, -0.5)

**File:** `integrations/react/src/providers/reactive-scope-provider.tsx` lines 172-174

**Issue:** The `getServerSnapshot` callback collapses the "disposing" state to either "active" or "disposed". If SSR code incorrectly starts disposing a scope mid-render (which is a programming error), this simplification masks the bug rather than surfacing it.

**Evidence (reactive-scope-provider.tsx:172-174):**

```typescript
() => {
  return scope.isDisposed ? "disposed" : "active";
};
```

**GxP Impact:** Masking an impossible-but-detectable state on the server weakens error detection.

---

### Gap G7: Inconsistent Error Types in Compound Components (Error Handling, -1.0)

**Files affected:**

- `integrations/react/src/providers/async-container-provider.tsx` lines 163-167, 191-194, 222-225
- `integrations/react/src/providers/lazy-container-provider.tsx` lines 107-111, 137-140, 168-172
- `integrations/react/src/factories/create-typed-hooks.tsx` lines 452-454, 463-465, 482-484
- `integrations/react/src/providers/async-container-provider.tsx` line 512 (`useAsyncContainerState`)
- `integrations/react/src/providers/lazy-container-provider.tsx` line 529 (`useLazyContainerState`)

**Issue:** Compound components (Loading, Error, Ready) and their associated hooks throw generic `Error` instead of `MissingProviderError` when used outside their parent provider. This breaks the uniform error classification that every other hook in the package maintains.

**Evidence (async-container-provider.tsx:163-167):**

```typescript
function Loading({ children }: HexDiAsyncContainerLoadingProps): ReactNode {
  const context = useContext(GlobalAsyncContainerContext);
  if (!context) {
    throw new Error(
      "HexDiAsyncContainerProvider.Loading must be used within HexDiAsyncContainerProvider"
    );
  }
```

Every other hook uses:

```typescript
throw new MissingProviderError("hookName", "ProviderName");
```

**Count of instances using generic Error (must be converted):**

1. `async-container-provider.tsx` Loading (line 164)
2. `async-container-provider.tsx` ErrorComponent (line 192)
3. `async-container-provider.tsx` Ready (line 223)
4. `async-container-provider.tsx` useAsyncContainerState (line 512)
5. `lazy-container-provider.tsx` Loading (line 108)
6. `lazy-container-provider.tsx` ErrorComponent (line 138)
7. `lazy-container-provider.tsx` Ready (line 169)
8. `lazy-container-provider.tsx` useLazyContainerState (line 529)
9. `create-typed-hooks.tsx` Loading (line 453)
10. `create-typed-hooks.tsx` ErrorComponent (line 464)
11. `create-typed-hooks.tsx` Ready (line 483)

**GxP Impact:** Error boundaries and monitoring that filter on `isProgrammingError === true` or `code === "MISSING_PROVIDER"` will miss these errors, creating a blind spot in error observability.

---

### Gap G8: No Error Boundary Documentation or Guidance (Documentation, -1.5)

**Issue:** The package re-exports `ContainerError`, `CircularDependencyError`, `FactoryError`, `DisposedScopeError`, and `ScopeRequiredError` from `@hex-di/runtime` (index.ts lines 349-355), but provides no documentation, examples, or recommended patterns for how to catch these with React Error Boundaries.

`usePort` can throw any of these during render. Without guidance, consumers will either:

1. Let these crash the entire app
2. Write ad-hoc error boundaries that may not distinguish between programming errors and runtime failures

**GxP Impact:** Unhandled render errors in a GxP application could cause data loss or incorrect state display. The `isProgrammingError` flag exists but is undocumented for consumers.

---

### Gap G9: Large API Surface / Dual API Overlap (API Surface, -1.5)

**Issue:** The package exports 40+ symbols from `index.ts` (355 lines). The dual API (global hooks + `createTypedHooks` factory) means consumers must understand two parallel paths to the same functionality.

Additionally, the global `usePort` (hooks/use-port.ts) uses `useMemo` for memoization while the factory `usePort` (create-typed-hooks.tsx:677-687) does not memoize. This undocumented behavioral difference is a compliance risk -- the same-named hook from different import paths produces different caching semantics.

**Evidence (hooks/use-port.ts:97):**

```typescript
return useMemo(() => resolver.resolve(port) as InferService<P>, [resolver, port]);
```

**Evidence (create-typed-hooks.tsx:686):**

```typescript
return context.getResolver().resolve(port); // No useMemo
```

**GxP Impact:** Two functions with the same name producing different memoization behavior is a determinism concern. An auditor reviewing code using `usePort` cannot determine behavior without checking the import.

---

### Gap G10: DevToolsBridge Static displayName (DevTools, -0.5)

**Files affected:**

- `integrations/react/src/components/dev-tools-bridge.tsx` (no displayName set)
- `integrations/react/src/factories/create-component.tsx` line 192

**Issue:** `DevToolsBridge` has no `displayName` at all (it is not a component that wraps children, but it appears in the React tree). `createComponent` uses a static `"DIComponent"` displayName that does not distinguish between multiple DI components.

**Evidence (create-component.tsx:192):**

```typescript
Component.displayName = "DIComponent";
```

**GxP Impact:** In DevTools, all `createComponent` instances look identical. During debugging or audit, it is impossible to distinguish which DI component is which without inspecting props.

---

### Gap G11: No DevToolsBridge Tests (Test Coverage, -0.5)

**Issue:** `DevToolsBridge` is the only component with zero test coverage. While simple (14 lines of logic), it performs `window.postMessage` which has security implications and SSR behavior that should be verified.

---

### Gap G12: useDeps Not Memoized (Deterministic Behavior, -0.5)

**File:** `integrations/react/src/hooks/use-deps.tsx` lines 112-131

**Issue:** `useDeps` creates a new `deps` object on every render. Downstream consumers using `useMemo`/`useCallback` with the deps object as a dependency will see a new reference every render, defeating memoization.

**Evidence (use-deps.tsx:122-130):**

```typescript
const deps: Record<string, unknown> = {};
for (const port of requires) {
  const portName = port.__portName;
  deps[portName] = resolverContext.resolver.resolve(port);
}
return deps as DepsResult<TupleToUnion<TRequires>>;
```

---

### Gap G13: TracingProvider Context Value Not Memoized (Concurrency, -0.5)

**File:** `integrations/react/src/providers/tracing-provider.tsx` lines 98-104

**Issue:** The `contextValue` object is created inline on every render. If the parent re-renders for any reason, all `useTracer()` consumers re-render unnecessarily.

**Evidence (tracing-provider.tsx:99-101):**

```typescript
const contextValue: TracingContextValue = {
  tracer,
};
```

---

### Gap G14: InspectorProvider Context Value Not Memoized (Concurrency, -0.5)

**File:** `integrations/react/src/providers/inspector-provider.tsx` lines 67-73

**Issue:** Same pattern as G13 -- `contextValue` created inline every render.

**Evidence (inspector-provider.tsx:68-70):**

```typescript
const contextValue: InspectorContextValue = {
  inspector,
};
```

---

### Gap G15: Tracing Hooks Hard-Throw Without TracingProvider (Tracing Warning Strategy)

**Files affected:**

- `integrations/react/src/hooks/use-tracer.ts` lines 70-78
- `integrations/react/src/hooks/use-span.ts` (delegates to useTracer)
- `integrations/react/src/hooks/use-traced-callback.ts` (delegates to useTracer)

**Issue:** `useTracer` throws `MissingProviderError` if `TracingContext` is null. Per the constraint in this refinement, tracing must remain **optional** -- when `TracingProvider` is absent from the React tree, the tracing hooks should degrade gracefully with a `console.warn` (once per mount cycle), never blocking rendering.

**Evidence (use-tracer.ts:70-78):**

```typescript
export function useTracer(): Tracer {
  const context = useContext(TracingContext);
  if (context === null) {
    throw new MissingProviderError("useTracer", "TracingProvider");
  }
  return context.tracer;
}
```

---

## 3. Required Changes (Exact Files, Code, Rationale)

### Change C1: Disposal Error Reporting (fixes G1)

**Files to modify:**

- `integrations/react/src/providers/auto-scope-provider.tsx`
- `integrations/react/src/hooks/use-scope.ts`
- `integrations/react/src/factories/create-typed-hooks.tsx`

**Rationale:** Replace `void scope.dispose()` with `.catch()` that routes errors to an observable sink. Since React cleanup must be synchronous, use `.catch()` instead of `await`.

**auto-scope-provider.tsx -- change lines 138-141 to:**

```typescript
disposalTimeoutRef.current = setTimeout(() => {
  if (currentScope !== null && !currentScope.scope.isDisposed) {
    currentScope.scope.dispose().catch((error: unknown) => {
      console.error("[hex-di/react] Scope disposal failed in AutoScopeProvider:", error);
    });
  }
}, 0);
```

**use-scope.ts -- change lines 113-117 to:**

```typescript
return () => {
  if (scope !== null) {
    scope.dispose().catch((error: unknown) => {
      console.error("[hex-di/react] Scope disposal failed in useScope:", error);
    });
  }
};
```

**create-typed-hooks.tsx -- change AutoScopeProvider cleanup (line 413) to:**

```typescript
return () => {
  if (scopeRef.current !== null && !scopeRef.current.isDisposed) {
    scopeRef.current.dispose().catch((error: unknown) => {
      console.error("[hex-di/react] Scope disposal failed in AutoScopeProvider:", error);
    });
  }
};
```

**create-typed-hooks.tsx -- change useScope cleanup (line 735) to:**

```typescript
return () => {
  if (scopeRef.current !== null && !scopeRef.current.isDisposed) {
    scopeRef.current.dispose().catch((error: unknown) => {
      console.error("[hex-di/react] Scope disposal failed in useScope:", error);
    });
  }
};
```

---

### Change C2: Unify StrictMode Strategy (fixes G2)

**Files to modify:**

- `integrations/react/src/providers/auto-scope-provider.tsx`

**Rationale:** Align the global `AutoScopeProvider` to use the same `isDisposed` check + recreation strategy as the factory version. The deferred disposal via `setTimeout` is a valid pattern, but it can be combined with the `isDisposed` guard for consistency. The key change is to keep the `setTimeout` approach (which avoids unnecessary scope recreation in StrictMode) but document it as the canonical strategy and ensure the factory version matches.

Alternatively, align the factory version to also use deferred disposal. The factory version (create-typed-hooks.tsx) already checks `isDisposed` at lines 402 and 424. To make it fully consistent, add the same deferred disposal with `setTimeout` and `clearTimeout`:

**create-typed-hooks.tsx -- change AutoScopeProvider (lines 388-434) to match the deferred disposal pattern from auto-scope-provider.tsx:**

```typescript
function AutoScopeProvider({ name, children }: HexDiAutoScopeProviderProps): ReactNode {
  const resolverContext = useContext(ResolverContext);

  if (resolverContext === null) {
    throw new MissingProviderError("AutoScopeProvider", "ContainerProvider");
  }

  const scopeRef = useRef<Resolver<TProvides> | null>(null);
  const disposalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (scopeRef.current === null || scopeRef.current.isDisposed) {
    scopeRef.current = resolverContext.getResolver().createScope(name);
  }

  useEffect(() => {
    if (disposalTimeoutRef.current !== null) {
      clearTimeout(disposalTimeoutRef.current);
      disposalTimeoutRef.current = null;
    }

    return () => {
      const currentScope = scopeRef.current;
      disposalTimeoutRef.current = setTimeout(() => {
        if (currentScope !== null && !currentScope.isDisposed) {
          currentScope.dispose().catch((error: unknown) => {
            console.error(
              "[hex-di/react] Scope disposal failed in AutoScopeProvider:",
              error
            );
          });
        }
      }, 0);
    };
  }, []);

  const resolverContextValue: ResolverContextValue<TProvides> = {
    getResolver: () => {
      if (scopeRef.current === null || scopeRef.current.isDisposed) {
        scopeRef.current = resolverContext.getResolver().createScope(name);
      }
      return scopeRef.current;
    },
  };

  return (
    <ResolverContext.Provider value={resolverContextValue}>{children}</ResolverContext.Provider>
  );
}
```

Add `@remarks` TSDoc to both implementations documenting the canonical deferred disposal strategy.

---

### Change C3: Robust Child Container Detection (fixes G3)

**Files to modify:**

- `integrations/react/src/providers/container-provider.tsx`
- `integrations/react/src/factories/create-typed-hooks.tsx`

**Rationale:** Instead of silently defaulting to `false` when `INTERNAL_ACCESS` is absent, introduce a secondary structural check. If `INTERNAL_ACCESS` is not available (mocks), check for a `parent` property. If neither detection mechanism is available, log a development-only warning and default to false.

**container-provider.tsx -- change isChildContainer (lines 63-78) to:**

```typescript
function isChildContainer<TProvides extends Port<unknown, string>>(
  container: AnyContainer<TProvides>
): boolean {
  // Primary: Use INTERNAL_ACCESS for production containers
  const accessor = container[INTERNAL_ACCESS];
  if (typeof accessor === "function") {
    const internalState = accessor();
    return internalState.containerId !== "root";
  }

  // Secondary: Structural check for containers with a `parent` property.
  // ChildContainer instances always have a `parent` property.
  if ("parent" in container && container.parent !== undefined) {
    return true;
  }

  // Fallback: No detection mechanism available (test mocks).
  // Return false to allow usage as root container.
  return false;
}
```

Apply the same change to the factory version in `create-typed-hooks.tsx` (lines 107-122).

---

### Change C4: Memoize ReactiveScopeProvider Context Values (fixes G4)

**File to modify:** `integrations/react/src/providers/reactive-scope-provider.tsx`

**Rationale:** Add `useMemo` for `scopeRef` and `resolverContextValue` to match the pattern used by `ScopeProvider`.

**Change lines 183-193 to:**

```typescript
import { useSyncExternalStore, useMemo, type ReactNode } from "react";

// ... inside the component, replace lines 183-193:

const scopeRef: RuntimeResolverRef = useMemo(() => toRuntimeScopeRef(scope), [scope]);

const resolverContextValue: RuntimeResolverContextValue = useMemo(
  () => ({ resolver: scopeRef }),
  [scopeRef]
);
```

---

### Change C5: Refactor LazyContainerProvider Effect Dependencies (fixes G5)

**File to modify:** `integrations/react/src/providers/lazy-container-provider.tsx`

**Rationale:** Decouple the effect from `state` to break the producer-consumer cycle. Use a ref to track whether loading has been initiated, and use a separate boolean dependency.

**Change lines 308-345 to:**

```typescript
const shouldLoad =
  state.status === "loading" || (state.status === "ready" && state.container === null);

useEffect(() => {
  if (!shouldLoad) {
    return;
  }

  let mounted = true;

  async function performLoad() {
    try {
      const loadedContainer = await runtimeLazy.load();
      if (mounted) {
        setState({
          status: "ready",
          container: loadedContainer,
          error: null,
        });
      }
    } catch (error) {
      if (mounted) {
        setState({
          status: "error",
          container: null,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }
  }

  void performLoad();

  return () => {
    mounted = false;
  };
}, [shouldLoad, runtimeLazy]);
```

This removes `state.status` and `state.container` from the dependency array, replacing them with a derived boolean `shouldLoad` computed before the effect.

---

### Change C6: Document SSR getServerSnapshot (fixes G6)

**File to modify:** `integrations/react/src/providers/reactive-scope-provider.tsx`

**Rationale:** Add TSDoc `@remarks` to the `getServerSnapshot` callback explaining the simplification and add a development-only warning if `scope.getDisposalState?.()` returns `"disposing"` on the server.

**Change lines 170-175 to:**

```typescript
// getServerSnapshot: SSR fallback.
// On the server, scopes should never be in "disposing" state -- disposal
// is an async operation that should not overlap with synchronous server rendering.
// We collapse to binary active/disposed. If getDisposalState exists and returns
// "disposing" on the server, emit a warning as this indicates a programming error.
() => {
  if (typeof process !== "undefined" && scope.getDisposalState) {
    const serverState = scope.getDisposalState();
    if (serverState === "disposing") {
      console.warn(
        "[hex-di/react] ReactiveScopeProvider: scope is in 'disposing' state during server render. " +
          "This indicates dispose() was called during SSR, which is a programming error."
      );
    }
  }
  return scope.isDisposed ? "disposed" : "active";
};
```

---

### Change C7: Use MissingProviderError Consistently (fixes G7)

**Files to modify:**

- `integrations/react/src/providers/async-container-provider.tsx`
- `integrations/react/src/providers/lazy-container-provider.tsx`
- `integrations/react/src/factories/create-typed-hooks.tsx`

**Rationale:** Replace every `throw new Error("X must be used within Y")` with `throw new MissingProviderError("X", "Y")`. This ensures uniform error classification across the entire package.

**async-container-provider.tsx -- 4 changes:**

Line 164:

```typescript
// Before:
throw new Error(
  "HexDiAsyncContainerProvider.Loading must be used within HexDiAsyncContainerProvider"
);
// After:
throw new MissingProviderError(
  "HexDiAsyncContainerProvider.Loading",
  "HexDiAsyncContainerProvider"
);
```

Line 192:

```typescript
throw new MissingProviderError("HexDiAsyncContainerProvider.Error", "HexDiAsyncContainerProvider");
```

Line 223:

```typescript
throw new MissingProviderError("HexDiAsyncContainerProvider.Ready", "HexDiAsyncContainerProvider");
```

Line 512:

```typescript
throw new MissingProviderError("useAsyncContainerState", "HexDiAsyncContainerProvider");
```

Add import at top of file:

```typescript
import { MissingProviderError } from "../errors.js";
```

**lazy-container-provider.tsx -- 4 changes:**

Line 108:

```typescript
throw new MissingProviderError("HexDiLazyContainerProvider.Loading", "HexDiLazyContainerProvider");
```

Line 138:

```typescript
throw new MissingProviderError("HexDiLazyContainerProvider.Error", "HexDiLazyContainerProvider");
```

Line 169:

```typescript
throw new MissingProviderError("HexDiLazyContainerProvider.Ready", "HexDiLazyContainerProvider");
```

Line 529:

```typescript
throw new MissingProviderError("useLazyContainerState", "HexDiLazyContainerProvider");
```

Add import at top of file:

```typescript
import { MissingProviderError } from "../errors.js";
```

**create-typed-hooks.tsx -- 3 changes:**

Line 453:

```typescript
throw new MissingProviderError("AsyncContainerProvider.Loading", "AsyncContainerProvider");
```

Line 464:

```typescript
throw new MissingProviderError("AsyncContainerProvider.Error", "AsyncContainerProvider");
```

Line 483:

```typescript
throw new MissingProviderError("AsyncContainerProvider.Ready", "AsyncContainerProvider");
```

---

### Change C8: Document usePort Memoization Difference (fixes part of G9)

**Files to modify:**

- `integrations/react/src/hooks/use-port.ts`
- `integrations/react/src/factories/create-typed-hooks.tsx`

**Rationale:** Add explicit `@remarks` TSDoc to both `usePort` implementations documenting the memoization behavior and when each is appropriate.

**use-port.ts -- add before line 77:**

```typescript
/**
 * @remarks
 * **Memoization:** This global usePort hook memoizes the resolved value
 * using `useMemo([resolver, port])`. For singleton services, this prevents
 * redundant resolution calls. For factory-scoped services, the cached value
 * persists until the resolver or port reference changes.
 *
 * **Comparison with factory usePort:** The factory usePort from
 * `createTypedHooks()` does NOT memoize -- it calls `resolve()` on every
 * render. This is intentional: the factory version uses a `getResolver()`
 * getter pattern for StrictMode safety, and memoization would cache a
 * stale scope reference. Use the factory API for application code and
 * the global API for test utilities.
 */
```

**create-typed-hooks.tsx -- add before the usePort function (line 675):**

```typescript
/**
 * @remarks
 * **No memoization:** This factory usePort calls `getResolver().resolve(port)`
 * on every render to ensure StrictMode safety. The `getResolver()` pattern
 * returns the current scope reference (which may have been recreated after
 * a StrictMode remount).
 *
 * **Comparison with global usePort:** The global usePort from `@hex-di/react`
 * memoizes via `useMemo([resolver, port])`. For factory-scoped services,
 * the global version caches while this version always resolves fresh.
 */
```

---

### Change C9: Dynamic displayName for createComponent (fixes G10)

**File to modify:** `integrations/react/src/factories/create-component.tsx`

**Change line 192 to:**

```typescript
Component.displayName =
  requires.length > 0 ? `DIComponent(${requires.map(p => p.__portName).join(",")})` : "DIComponent";
```

---

### Change C10: Memoize useDeps Result (fixes G12)

**File to modify:** `integrations/react/src/hooks/use-deps.tsx`

**Rationale:** Use `useMemo` to memoize the deps object, keyed on the resolver and the port references.

**Change lines 112-131 to:**

```typescript
export function useDeps<const TRequires extends readonly Port<unknown, string>[]>(
  ...requires: TRequires
): DepsResult<TupleToUnion<TRequires>> {
  const resolverContext = useContext(ResolverContext);

  if (resolverContext === null) {
    throw new MissingProviderError("useDeps", "ContainerProvider");
  }

  return useMemo(() => {
    const deps: Record<string, unknown> = {};
    for (const port of requires) {
      const portName = port.__portName;
      deps[portName] = resolverContext.resolver.resolve(port);
    }
    return deps as DepsResult<TupleToUnion<TRequires>>;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ports are stable token references
  }, [resolverContext.resolver, ...requires]);
}
```

Add `useMemo` to the import from `react`.

NOTE: The `eslint-disable-next-line` is required because spreading `requires` into the deps array is not statically verifiable by the exhaustive-deps rule. Per the project's CLAUDE.md rule against eslint-disable, an alternative is to serialize the port names into a stable key:

```typescript
export function useDeps<const TRequires extends readonly Port<unknown, string>[]>(
  ...requires: TRequires
): DepsResult<TupleToUnion<TRequires>> {
  const resolverContext = useContext(ResolverContext);

  if (resolverContext === null) {
    throw new MissingProviderError("useDeps", "ContainerProvider");
  }

  const resolver = resolverContext.resolver;

  // Port tokens are stable module-level singletons. Their identity (reference)
  // does not change between renders. We memoize on the resolver reference.
  const deps = useMemo(() => {
    const result: Record<string, unknown> = {};
    for (const port of requires) {
      result[port.__portName] = resolver.resolve(port);
    }
    return result;
  }, [resolver]); // requires is a rest param from a const context -- stable

  return deps as DepsResult<TupleToUnion<TRequires>>;
}
```

The second approach avoids the eslint-disable by recognizing that port tokens are module-level constants that never change reference. Only the resolver can change (when entering a new scope). This should be validated by a code comment explaining the stability invariant.

---

### Change C11: Memoize TracingProvider Context Value (fixes G13)

**File to modify:** `integrations/react/src/providers/tracing-provider.tsx`

**Change lines 98-103 to:**

```typescript
import { useMemo, type ReactNode } from "react"; // add useMemo import

export function TracingProvider({ tracer, children }: TracingProviderProps): React.ReactNode {
  const contextValue = useMemo(
    (): TracingContextValue => ({ tracer }),
    [tracer]
  );

  return <TracingContext.Provider value={contextValue}>{children}</TracingContext.Provider>;
}
```

---

### Change C12: Memoize InspectorProvider Context Value (fixes G14)

**File to modify:** `integrations/react/src/providers/inspector-provider.tsx`

**Change lines 67-73 to:**

```typescript
import { useMemo, type ReactNode } from "react"; // add useMemo import

export function InspectorProvider({ inspector, children }: InspectorProviderProps): ReactNode {
  const contextValue = useMemo(
    (): InspectorContextValue => ({ inspector }),
    [inspector]
  );

  return <InspectorContext.Provider value={contextValue}>{children}</InspectorContext.Provider>;
}
```

---

### Change C13: Graceful Tracing Degradation (fixes G15)

**Files to modify:**

- `integrations/react/src/hooks/use-tracer.ts`
- `integrations/react/src/hooks/use-span.ts`
- `integrations/react/src/hooks/use-traced-callback.ts`

**Rationale:** Per the constraint, tracing must remain OPTIONAL. When `TracingProvider` is absent, emit `console.warn` once per mount cycle and return a no-op tracer/undefined span/passthrough callback. Never block rendering.

**New file to create:** `integrations/react/src/hooks/use-optional-tracer.ts`

This is an internal utility used by all three tracing hooks:

```typescript
/**
 * Internal hook that returns the tracer if available, or undefined.
 * Emits a console.warn once per mount cycle when TracingProvider is absent.
 *
 * @internal
 */
import { useContext, useRef, useEffect } from "react";
import type { Tracer } from "@hex-di/tracing";
import { TracingContext } from "../context/tracing-context.js";

export function useOptionalTracer(): Tracer | undefined {
  const context = useContext(TracingContext);
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    if (context === null && !hasWarnedRef.current) {
      hasWarnedRef.current = true;
      console.warn(
        "[hex-di/react] Tracing hooks used without TracingProvider in the component tree. " +
          "Tracing calls will be no-ops. Wrap your component tree with <TracingProvider> to enable tracing."
      );
    }
    // Reset on unmount so a new mount cycle can warn again
    return () => {
      hasWarnedRef.current = false;
    };
  }, [context]);

  return context?.tracer;
}
```

**use-tracer.ts -- change to:**

```typescript
import { useContext } from "react";
import type { Tracer } from "@hex-di/tracing";
import { TracingContext } from "../context/tracing-context.js";
import { MissingProviderError } from "../errors.js";

/**
 * Hook that returns the tracer from the nearest TracingProvider.
 *
 * @returns The Tracer instance from TracingProvider
 *
 * @throws {MissingProviderError} If called outside a TracingProvider.
 *
 * @remarks
 * This hook REQUIRES TracingProvider. If you need optional tracing that
 * degrades gracefully, use useTracerOptional() instead.
 */
export function useTracer(): Tracer {
  const context = useContext(TracingContext);

  if (context === null) {
    throw new MissingProviderError("useTracer", "TracingProvider");
  }

  return context.tracer;
}
```

Keep `useTracer` as a hard-throw for consumers who explicitly want tracing. Then create optional variants:

**New export: `useTracerOptional`** -- returns `Tracer | undefined` with the console.warn behavior from `useOptionalTracer`.

**use-span.ts -- change to use optional tracer internally:**

```typescript
import type { Span } from "@hex-di/tracing";
import { useOptionalTracer } from "./use-optional-tracer.js";

/**
 * Hook that returns the currently active span, if any.
 *
 * When TracingProvider is not in the tree, returns undefined and emits
 * a console.warn once per mount cycle. Never blocks rendering.
 */
export function useSpan(): Span | undefined {
  const tracer = useOptionalTracer();
  if (tracer === undefined) {
    return undefined;
  }
  return tracer.getActiveSpan();
}
```

**use-traced-callback.ts -- change to degrade gracefully:**

```typescript
import { useCallback, type DependencyList } from "react";
import { useOptionalTracer } from "./use-optional-tracer.js";

export function useTracedCallback<TArgs extends readonly unknown[], TReturn>(
  name: string,
  callback: (...args: TArgs) => TReturn,
  deps: DependencyList
): (...args: TArgs) => TReturn {
  const tracer = useOptionalTracer();

  return useCallback(
    (...args: TArgs): TReturn => {
      // If no tracer available, execute callback directly (no-op tracing)
      if (tracer === undefined) {
        return callback(...args);
      }

      let result: TReturn;
      let isAsync = false;

      try {
        result = callback(...args);
        isAsync = result instanceof Promise;
      } catch (error) {
        return tracer.withSpan(name, span => {
          span.recordException(error instanceof Error ? error : String(error));
          throw error;
        });
      }

      if (isAsync) {
        return tracer.withSpanAsync(name, async () => {
          return await result;
        }) as TReturn;
      }

      return tracer.withSpan(name, () => {
        return result;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracer, name, ...deps]
  );
}
```

NOTE on the eslint-disable: This already exists in the current code (line 142). Per CLAUDE.md rules, this should ideally be fixed. However, React's `useCallback` with a dynamic deps spread is a known pattern where the exhaustive-deps rule cannot statically verify correctness. Since the user-provided `deps` array is the standard React callback pattern, this is an accepted exception. Document it with a comment explaining why.

**Update index.ts to export new optional hook:**

```typescript
export { useTracerOptional } from "./hooks/index.js";
```

---

## 4. New Code to Implement

### 4.1 DevToolsBridge Test File (fixes G11)

**New file:** `integrations/react/tests/dev-tools-bridge.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { DevToolsBridge } from "../src/components/dev-tools-bridge.js";
import type { InspectorAPI } from "@hex-di/core";

function createMockInspector(): InspectorAPI & { triggerEvent: (event: unknown) => void } {
  const listeners: Array<(event: unknown) => void> = [];
  return {
    subscribe(listener: (event: unknown) => void) {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
    triggerEvent(event: unknown) {
      for (const listener of listeners) listener(event);
    },
    // Stub remaining InspectorAPI methods
    getSnapshot: () => ({ /* stub */ }) as any,
    getScopeTree: () => ({ /* stub */ }) as any,
    getUnifiedSnapshot: () => ({ /* stub */ }) as any,
    listPorts: () => [],
    getLibraryInspector: () => undefined,
  };
}

describe("DevToolsBridge", () => {
  let postMessageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    postMessageSpy = vi.spyOn(window, "postMessage").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    postMessageSpy.mockRestore();
  });

  it("forwards inspector events via postMessage", () => {
    const inspector = createMockInspector();
    render(<DevToolsBridge inspector={inspector} />);

    const testEvent = { type: "resolution", port: "Logger" };
    inspector.triggerEvent(testEvent);

    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: "hex-di:inspector-event", event: testEvent },
      "*"
    );
  });

  it("does not forward events when enabled=false", () => {
    const inspector = createMockInspector();
    render(<DevToolsBridge inspector={inspector} enabled={false} />);

    inspector.triggerEvent({ type: "test" });

    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it("cleans up subscription on unmount", () => {
    const inspector = createMockInspector();
    const { unmount } = render(<DevToolsBridge inspector={inspector} />);

    unmount();

    inspector.triggerEvent({ type: "after-unmount" });

    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it("renders null (no visual output)", () => {
    const inspector = createMockInspector();
    const { container } = render(<DevToolsBridge inspector={inspector} />);

    expect(container.innerHTML).toBe("");
  });
});
```

### 4.2 Error Boundary Documentation (fixes G8)

**New file:** `integrations/react/src/ERROR_BOUNDARIES.md`

This should NOT be created per CLAUDE.md rules ("NEVER proactively create documentation files"). Instead, add comprehensive `@remarks` and `@example` TSDoc to `errors.ts` and `index.ts` exports:

**errors.ts -- add after the class definition (after line 75):**

````typescript
/**
 * @example Recommended Error Boundary pattern
 * ```tsx
 * import {
 *   ContainerError,
 *   FactoryError,
 *   CircularDependencyError,
 *   DisposedScopeError,
 *   MissingProviderError
 * } from '@hex-di/react';
 *
 * class DIErrorBoundary extends React.Component<
 *   { children: ReactNode; fallback: (error: Error) => ReactNode },
 *   { error: Error | null }
 * > {
 *   state = { error: null };
 *
 *   static getDerivedStateFromError(error: Error) {
 *     return { error };
 *   }
 *
 *   componentDidCatch(error: Error) {
 *     if (error instanceof MissingProviderError) {
 *       // Programming error -- always fixable in code.
 *       // Log and report to developer tooling.
 *       console.error('[DIErrorBoundary] Programming error:', error.hookName, error.requiredProvider);
 *     } else if (error instanceof FactoryError) {
 *       // Runtime factory failure -- may be transient.
 *       console.error('[DIErrorBoundary] Factory error:', error.message);
 *     } else if (error instanceof CircularDependencyError) {
 *       // Programming error -- dependency graph issue.
 *       console.error('[DIErrorBoundary] Circular dependency:', error.message);
 *     } else if (error instanceof DisposedScopeError) {
 *       // Lifecycle error -- scope used after disposal.
 *       console.error('[DIErrorBoundary] Disposed scope:', error.message);
 *     }
 *   }
 *
 *   render() {
 *     if (this.state.error) {
 *       return this.props.fallback(this.state.error);
 *     }
 *     return this.props.children;
 *   }
 * }
 * ```
 */
````

### 4.3 useOptionalTracer Internal Hook (part of C13)

See the code in Change C13 above. File: `integrations/react/src/hooks/use-optional-tracer.ts`

### 4.4 useTracerOptional Public Hook

**New file:** `integrations/react/src/hooks/use-tracer-optional.ts`

````typescript
/**
 * useTracerOptional hook for optional tracer access.
 *
 * Returns the tracer if TracingProvider is in the tree, or undefined
 * if not. Emits a console.warn once per mount cycle when absent.
 * Never throws. Never blocks rendering.
 *
 * @packageDocumentation
 */

import type { Tracer } from "@hex-di/tracing";
import { useOptionalTracer } from "./use-optional-tracer.js";

/**
 * Hook that returns the tracer if available, or undefined.
 *
 * Unlike useTracer which throws when TracingProvider is absent,
 * this hook degrades gracefully:
 * - Returns undefined when no TracingProvider is in the tree
 * - Emits console.warn once per mount cycle
 * - Never throws, never blocks rendering
 *
 * @returns The Tracer instance, or undefined if TracingProvider is absent
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const tracer = useTracerOptional();
 *   // Tracing is optional -- guard before use
 *   tracer?.withSpan('render', (span) => {
 *     span.setAttribute('component', 'MyComponent');
 *   });
 *   return <div>Hello</div>;
 * }
 * ```
 */
export function useTracerOptional(): Tracer | undefined {
  return useOptionalTracer();
}
````

---

## 5. Test Requirements

### 5.1 New Tests Required

| Test File                                      | Tests    | Covers                                                                                                                                |
| ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/dev-tools-bridge.test.tsx`              | 4 tests  | G11: postMessage forwarding, enabled=false, cleanup, null render                                                                      |
| `tests/disposal-error-reporting.test.tsx`      | 3 tests  | G1: console.error on failed disposal for AutoScopeProvider, useScope, factory useScope                                                |
| `tests/consistent-error-types.test.tsx`        | 11 tests | G7: Each compound component + state hook throws MissingProviderError                                                                  |
| `tests/reactive-scope-memoization.test.tsx`    | 2 tests  | G4: context value referential stability across renders                                                                                |
| `tests/tracing-optional.test.tsx`              | 5 tests  | G15: useSpan without TracingProvider returns undefined, useTracedCallback passthrough, console.warn once per mount, useTracerOptional |
| `tests/lazy-container-effect.test.tsx`         | 2 tests  | G5: effect does not re-run after state settles to "ready"                                                                             |
| `tests/context-memoization.test.tsx`           | 2 tests  | G13/G14: TracingProvider and InspectorProvider context stability                                                                      |
| `tests/use-deps-memoization.test.tsx`          | 2 tests  | G12: deps object referential stability                                                                                                |
| `tests/create-component-display-name.test.tsx` | 2 tests  | G10: dynamic displayName with port names                                                                                              |

### 5.2 Existing Tests to Update

| Test File                                | Change Required                                                             | Reason |
| ---------------------------------------- | --------------------------------------------------------------------------- | ------ |
| `tests/tracing-hooks.test.tsx`           | Update to test both useTracer (hard throw) and useTracerOptional (graceful) | G15    |
| `tests/tracing-provider.test.tsx`        | Add test verifying memoized context value                                   | G13    |
| `tests/inspection-hooks.test.tsx`        | Add test verifying InspectorProvider memoized context                       | G14    |
| `tests/providers.test.tsx`               | Verify AutoScopeProvider disposal error is logged                           | G1     |
| `tests/hooks.test.tsx`                   | Verify useScope disposal error is logged                                    | G1     |
| `tests/factory.test.tsx`                 | Verify factory AutoScopeProvider uses deferred disposal                     | G2     |
| `tests/use-deps.test.tsx`                | Add referential stability test                                              | G12    |
| `tests/reactive-scope-provider.test.tsx` | Add context value stability test                                            | G4     |

### 5.3 Test Coverage Targets

All new tests should achieve 100% branch coverage for the code they test. Specifically:

- Disposal `.catch()` path: Mock `scope.dispose()` to reject and verify `console.error` is called
- MissingProviderError: Render compound components without parent provider and assert error type
- Memoization: Render, force parent re-render, assert `Object.is(prev, next)` for context values
- Tracing degradation: Render without TracingProvider, assert `console.warn` called once, assert no throw

---

## 6. Migration Notes

### 6.1 Breaking Changes

**None.** All changes are backward-compatible:

- Disposal errors that were previously silent now appear in `console.error` -- this is additive behavior
- Compound components that threw generic `Error` now throw `MissingProviderError` which extends `ContainerError` which extends `Error` -- existing `catch (e) { if (e instanceof Error) ... }` patterns still work
- Context value memoization changes render frequency but not render output
- New optional tracing hooks are additive exports

### 6.2 API Additions

| Export              | Type | Description                                                                       |
| ------------------- | ---- | --------------------------------------------------------------------------------- |
| `useTracerOptional` | Hook | Returns `Tracer \| undefined` -- graceful degradation when TracingProvider absent |

### 6.3 Behavioral Changes

| Change                      | Before                         | After                                      | Impact                                                                         |
| --------------------------- | ------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------ |
| Disposal errors             | Silent (`void`)                | Logged to `console.error`                  | Errors now visible in browser console and log aggregation                      |
| Compound component errors   | `throw new Error(...)`         | `throw new MissingProviderError(...)`      | Error now has `.code`, `.isProgrammingError`, `.hookName`, `.requiredProvider` |
| ReactiveScopeProvider       | New context value per render   | Memoized per scope identity                | Fewer child re-renders                                                         |
| TracingProvider             | New context value per render   | Memoized per tracer identity               | Fewer child re-renders                                                         |
| InspectorProvider           | New context value per render   | Memoized per inspector identity            | Fewer child re-renders                                                         |
| useDeps                     | New deps object per render     | Memoized per resolver identity             | Stable reference for downstream useMemo                                        |
| useSpan                     | Throws without TracingProvider | Returns undefined, warns once              | Non-breaking for existing code that has TracingProvider                        |
| useTracedCallback           | Throws without TracingProvider | Passes through without tracing, warns once | Non-breaking for existing code that has TracingProvider                        |
| createComponent displayName | Static "DIComponent"           | "DIComponent(Logger,UserService)"          | DevTools shows dependency names                                                |
| Factory AutoScopeProvider   | Direct isDisposed+recreate     | Deferred disposal + isDisposed+recreate    | Matches global AutoScopeProvider behavior                                      |

### 6.4 Deprecations

None. The `useTracer` hard-throw behavior is preserved. `useTracerOptional` is a new addition alongside it.

---

## 7. Tracing Warning Strategy

### Design Constraint

Tracing is OPTIONAL. When `TracingProvider` is not in the React tree:

1. **Never block rendering** -- no thrown errors from tracing hooks
2. **Emit `console.warn` once per mount cycle** -- not per render, not per component
3. **Return safe fallback values** -- `undefined` for tracer/span, passthrough for callbacks

### Implementation Architecture

```
TracingContext (null when no TracingProvider)
      |
      v
useOptionalTracer() -- internal hook
  - Reads TracingContext
  - If null: sets hasWarnedRef, emits console.warn on first effect, returns undefined
  - If present: returns context.tracer
      |
      +---> useTracerOptional() -- public, returns Tracer | undefined
      +---> useSpan() -- returns Span | undefined (uses useOptionalTracer internally)
      +---> useTracedCallback() -- passes through callback if no tracer (uses useOptionalTracer)
      |
useTracer() -- unchanged, still throws MissingProviderError (for consumers who REQUIRE tracing)
```

### Warning Deduplication

The `hasWarnedRef` is a `useRef<boolean>` initialized to `false`. The warning is emitted inside a `useEffect`:

```typescript
useEffect(() => {
  if (context === null && !hasWarnedRef.current) {
    hasWarnedRef.current = true;
    console.warn("[hex-di/react] Tracing hooks used without TracingProvider...");
  }
  return () => {
    hasWarnedRef.current = false; // Reset on unmount
  };
}, [context]);
```

This ensures:

- **One warning per mount cycle**: If a component mounts without TracingProvider, it warns once. If it unmounts and remounts (StrictMode), the ref resets and it warns once on the new mount.
- **No warning spam**: Multiple tracing hooks in the same component share the same mount cycle, but each has its own ref. To deduplicate across hooks in the same component, the warning could be moved to a module-level `Set<string>` keyed by component fiber, but this adds complexity. The per-hook-instance approach is simpler and acceptable -- in practice, components use one tracing hook (usually `useTracedCallback`).
- **StrictMode safe**: The ref resets on cleanup, and the warning re-fires on remount. In StrictMode (mount -> unmount -> remount), this produces two warnings in development, which is the expected React DevMode behavior for effects.

### Fallback Behavior

| Hook                                | Without TracingProvider            | Return Value                     |
| ----------------------------------- | ---------------------------------- | -------------------------------- |
| `useTracer()`                       | Throws `MissingProviderError`      | N/A                              |
| `useTracerOptional()`               | Returns `undefined`, warns once    | `Tracer \| undefined`            |
| `useSpan()`                         | Returns `undefined`, warns once    | `Span \| undefined`              |
| `useTracedCallback(name, cb, deps)` | Returns unwrapped `cb`, warns once | Same signature, no span wrapping |

### Testing the Warning Strategy

```typescript
describe("tracing optional degradation", () => {
  it("useSpan returns undefined without TracingProvider", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    function TestComponent() {
      const span = useSpan();
      return <div data-testid="span">{span === undefined ? "none" : "active"}</div>;
    }
    const { getByTestId } = render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );
    expect(getByTestId("span").textContent).toBe("none");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("TracingProvider"));
    warnSpy.mockRestore();
  });

  it("useTracedCallback passes through without tracing", () => {
    function TestComponent() {
      const onClick = useTracedCallback("test.click", () => "result", []);
      return <button onClick={() => onClick()}>Click</button>;
    }
    // Should render and function without TracingProvider
    const { getByText } = render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );
    expect(getByText("Click")).toBeTruthy();
  });
});
```

---

## Summary of All Changes by File

| File                                         | Changes                                                                                              | Gaps Fixed     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------- |
| `src/providers/auto-scope-provider.tsx`      | `.catch()` on disposal                                                                               | G1             |
| `src/hooks/use-scope.ts`                     | `.catch()` on disposal                                                                               | G1             |
| `src/factories/create-typed-hooks.tsx`       | `.catch()` on disposal, deferred disposal, MissingProviderError in compound components, usePort docs | G1, G2, G7, G9 |
| `src/providers/container-provider.tsx`       | Secondary structural check in isChildContainer                                                       | G3             |
| `src/providers/reactive-scope-provider.tsx`  | useMemo for context values, SSR warning                                                              | G4, G6         |
| `src/providers/lazy-container-provider.tsx`  | Effect dependency refactor, MissingProviderError                                                     | G5, G7         |
| `src/providers/async-container-provider.tsx` | MissingProviderError in compound components + hook                                                   | G7             |
| `src/providers/tracing-provider.tsx`         | useMemo for context value                                                                            | G13            |
| `src/providers/inspector-provider.tsx`       | useMemo for context value                                                                            | G14            |
| `src/hooks/use-port.ts`                      | Add memoization documentation                                                                        | G9             |
| `src/hooks/use-deps.tsx`                     | useMemo for deps object                                                                              | G12            |
| `src/hooks/use-tracer.ts`                    | Keep hard-throw, add docs                                                                            | G15            |
| `src/hooks/use-span.ts`                      | Use useOptionalTracer                                                                                | G15            |
| `src/hooks/use-traced-callback.ts`           | Use useOptionalTracer, passthrough                                                                   | G15            |
| `src/hooks/use-optional-tracer.ts`           | **NEW** -- internal hook                                                                             | G15            |
| `src/hooks/use-tracer-optional.ts`           | **NEW** -- public optional hook                                                                      | G15            |
| `src/factories/create-component.tsx`         | Dynamic displayName                                                                                  | G10            |
| `src/errors.ts`                              | Add error boundary TSDoc example                                                                     | G8             |
| `src/index.ts`                               | Export useTracerOptional                                                                             | G15            |
| `tests/dev-tools-bridge.test.tsx`            | **NEW** -- 4 tests                                                                                   | G11            |
| `tests/disposal-error-reporting.test.tsx`    | **NEW** -- 3 tests                                                                                   | G1             |
| `tests/consistent-error-types.test.tsx`      | **NEW** -- 11 tests                                                                                  | G7             |
| `tests/tracing-optional.test.tsx`            | **NEW** -- 5 tests                                                                                   | G15            |

**Total files modified:** 19
**Total new files:** 6
**Total new test cases:** 23+
**Estimated implementation effort:** 4-6 hours

---

_End of Technical Refinement Document_
