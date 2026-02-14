# GxP Compliance Analysis Report: @hex-di/react

**Package:** `@hex-di/react`
**Version:** 0.1.0
**Analysis Date:** 2025-02-10
**Analyst:** Automated GxP Compliance Reviewer (Claude Opus 4.6)
**Source Location:** `integrations/react/src/`
**Test Location:** `integrations/react/tests/`

---

## 1. Executive Summary

**Overall GxP Compliance Score: 8.0 / 10**

The `@hex-di/react` package provides a React integration layer for the HexDI dependency injection framework. It exhibits strong engineering discipline in several critical areas: type safety through bivariant method signatures and phantom branding, proper React lifecycle management via `useEffect` cleanup and `useRef` for lazy initialization, memoized context values for referential stability, and structured error handling with the `isProgrammingError` pattern.

The package demonstrates above-average compliance in deterministic behavior, error traceability, and separation of concerns. Key gaps exist in the fire-and-forget async disposal pattern (scope cleanup in `useEffect` returns void while `dispose()` is async), the lack of explicit error boundary guidance for factory errors propagating from `usePort`, and limited documentation for SSR edge cases in the `ReactiveScopeProvider`.

| Criterion                            | Score | Weight   | Weighted |
| ------------------------------------ | ----- | -------- | -------- |
| Type Safety & Correctness            | 9.0   | 15%      | 1.35     |
| Deterministic Behavior               | 8.0   | 15%      | 1.20     |
| Error Handling & Traceability        | 8.5   | 12%      | 1.02     |
| Resource Lifecycle Management        | 7.5   | 12%      | 0.90     |
| Test Coverage & Verification         | 8.5   | 12%      | 1.02     |
| Separation of Concerns               | 8.5   | 8%       | 0.68     |
| Documentation & Auditability         | 7.5   | 8%       | 0.60     |
| API Surface Minimality               | 7.5   | 6%       | 0.45     |
| Concurrency & React Model Compliance | 8.0   | 6%       | 0.48     |
| DevTools & Observability             | 7.5   | 6%       | 0.45     |
| **Total**                            |       | **100%** | **8.15** |

**Rounded Score: 8.0 / 10**

---

## 2. Package Overview

### 2.1 Purpose

`@hex-di/react` bridges the HexDI dependency injection container with React's component model. It provides:

- **Provider components** that establish DI context in the React tree
- **Hooks** for type-safe service resolution within components
- **Scope lifecycle management** tied to React mount/unmount cycles
- **Async initialization** with compound component patterns (Loading/Error/Ready)
- **Inspection hooks** for reactive container state observation
- **Tracing hooks** for distributed tracing integration
- **A factory pattern** (`createTypedHooks`) that captures port types at creation time

### 2.2 Architecture

The package follows a layered internal architecture:

```
index.ts (public API barrel)
  |
  +-- providers/       (ContainerProvider, ScopeProvider, AutoScopeProvider, ...)
  +-- hooks/           (usePort, useContainer, useScope, useTracer, ...)
  +-- context/         (ContainerContext, ResolverContext, TracingContext, InspectorContext)
  +-- internal/        (runtime-refs.ts, runtime-resolver.ts -- type erasure layer)
  +-- factories/       (createTypedHooks, createComponent)
  +-- types/           (core.ts, factory.ts, unified.ts, provider-props.ts, ...)
  +-- components/      (DevToolsBridge)
  +-- errors.ts        (MissingProviderError)
```

### 2.3 Scale Metrics

| Metric               | Value                                                                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source files         | 42                                                                                                                                                                                           |
| Source lines (total) | ~7,421                                                                                                                                                                                       |
| Test files           | 22                                                                                                                                                                                           |
| Test lines (total)   | ~7,279                                                                                                                                                                                       |
| Test-to-source ratio | 0.98:1                                                                                                                                                                                       |
| Public exports       | 40+ symbols                                                                                                                                                                                  |
| Provider components  | 8 (Container, Scope, AutoScope, Async, Lazy, Reactive, Inspector, Tracing)                                                                                                                   |
| Hooks                | 13 (usePort, useContainer, useScope, useDeps, useTracer, useSpan, useTracedCallback, useInspector, useSnapshot, useScopeTree, useUnifiedSnapshot, useTracingSummary, useAsyncContainerState) |
| React contexts       | 5 (Container, Resolver, Tracing, Inspector, AsyncContainer + per-factory isolated contexts)                                                                                                  |

### 2.4 Dependencies

| Dependency        | Type                   | Purpose                                |
| ----------------- | ---------------------- | -------------------------------------- |
| `@hex-di/core`    | workspace              | Port, InferService, InspectorAPI types |
| `@hex-di/graph`   | workspace              | Graph types for unified provider       |
| `@hex-di/runtime` | workspace              | Container, Scope, INTERNAL_ACCESS      |
| `@hex-di/tracing` | workspace              | Tracer, Span types                     |
| `react`           | peer (>=19.0.0)        | React framework                        |
| `typescript`      | peer (>=5.0, optional) | Type checking                          |

---

## 3. GxP Compliance Matrix

### 3.1 Requirement Traceability

| GxP Requirement                | Implementation                                                                                             | Evidence                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Predictable initialization** | Container provided externally; `AsyncContainerProvider` manages async init with explicit states            | `async-container-provider.tsx:337-368`, `lazy-container-provider.tsx:308-345`         |
| **Deterministic resolution**   | `usePort` memoizes per (resolver, port) pair; `createTypedHooks` captures types at factory time            | `use-port.ts:97`, `create-typed-hooks.tsx:677-687`                                    |
| **Explicit error states**      | `MissingProviderError` with `isProgrammingError: true`, error code `MISSING_PROVIDER`, hook/provider names | `errors.ts:46-75`                                                                     |
| **Resource cleanup**           | `useEffect` cleanup for scope disposal; `useRef` for lazy init; deferred disposal for StrictMode           | `auto-scope-provider.tsx:123-144`, `use-scope.ts:110-119`                             |
| **Nested provider detection**  | `ContainerProvider` checks `useContext(ContainerContext)` and throws for nested root containers            | `container-provider.tsx:168-181`                                                      |
| **Context isolation**          | Each `createTypedHooks()` call creates fresh `createContext()` instances; phantom brand prevents mixing    | `create-typed-hooks.tsx:299-309`, `container-context.tsx:31,68`                       |
| **Referential stability**      | `useMemo` for context values prevents unnecessary re-renders                                               | `container-provider.tsx:186-202`                                                      |
| **SSR safety**                 | `useEffect` (not `useLayoutEffect`); `DevToolsBridge` guards `typeof window`; no global singletons         | `auto-scope-provider.tsx:123`, `dev-tools-bridge.tsx:81`                              |
| **Type boundary safety**       | Bivariant method signatures via property function syntax; single trust boundary in `runtime-resolver.ts`   | `runtime-resolver.ts:103-167`, `runtime-refs.ts:188-195`                              |
| **Observability**              | `displayName` on all contexts; `DevToolsBridge` forwards events via `postMessage`                          | `container-context.tsx:100`, `resolver-context.tsx:105`, `dev-tools-bridge.tsx:79-93` |

### 3.2 Risk Classification

| Risk Area                       | Level  | Mitigation                                                                                                                                            |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Async disposal in sync cleanup  | Medium | `void scope.dispose()` -- fire-and-forget by design; React cleanup must be sync                                                                       |
| StrictMode double-mount         | Low    | Deferred disposal via `setTimeout(fn, 0)` with cancellation in `AutoScopeProvider`; `isDisposed` checks in `useScope` and factory `AutoScopeProvider` |
| Type erasure boundary           | Low    | Single `toRuntimeResolver()` function with documented safety justification; runtime port validation in Container/Scope                                |
| Missing Error Boundary guidance | Medium | Factory errors from `usePort` propagate as React errors; no built-in boundary                                                                         |
| Context value stability         | Low    | `useMemo` on all context value objects; bivariant ref wrappers memoized on container/scope identity                                                   |

---

## 4. Detailed Analysis

### 4.1 Type Safety & Correctness (9.0/10)

**Strengths:**

The package implements a sophisticated type architecture that avoids `any` and minimizes type assertions. The central innovation is the bivariant method signature pattern used in `RuntimeResolver`:

```typescript
// From: integrations/react/src/internal/runtime-resolver.ts (lines 103-167)
export interface RuntimeResolver {
  readonly resolve: (port: Port<unknown, string>) => unknown;
  readonly resolveAsync: (port: Port<unknown, string>) => Promise<unknown>;
  readonly createScope: (name?: string) => RuntimeResolver;
  readonly dispose: () => Promise<void>;
  readonly has: (port: Port<unknown, string>) => boolean;
  readonly isDisposed: boolean;
  readonly subscribe?: (listener: () => void) => () => void;
  readonly getDisposalState?: () => ScopeDisposalState;
}
```

Property function syntax (`readonly resolve: (port) => unknown`) is bivariant under `strictFunctionTypes`, allowing `Container<LoggerPort>` to be assigned without casts. This is explicitly documented with a reference to TypeScript 2.6 release notes.

The `ResolverLike` interface in `runtime-refs.ts` uses method syntax for the input side:

```typescript
// From: integrations/react/src/internal/runtime-refs.ts (lines 188-195)
interface ResolverLike {
  resolve(port: Port<unknown, string>): unknown;
  resolveAsync(port: Port<unknown, string>): Promise<unknown>;
  has(port: Port<unknown, string>): boolean;
  createScope(name?: string): ResolverLike;
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
}
```

The phantom brand pattern on `ContainerContextValue` prevents accidental mixing of contexts from different `createTypedHooks` calls:

```typescript
// From: integrations/react/src/context/container-context.tsx (lines 51-69)
export interface ContainerContextValue<TProvides extends Port<unknown, string>> {
  readonly container: RuntimeContainerRef;
  readonly isChildContainer: boolean;
  readonly [ContextBrand]: { provides: TProvides };
}
```

The `createTypedHooks` factory captures `TProvides` at creation time and constrains all hooks:

```typescript
// From: integrations/react/src/factories/create-typed-hooks.tsx (lines 677-687)
function usePort<P extends TProvides>(port: P): InferService<P> {
  const context = useContext(ResolverContext);
  if (context === null) {
    throw new MissingProviderError("usePort", "ContainerProvider");
  }
  return context.getResolver().resolve(port);
}
```

**Gap:** The `use-port.ts` global hook contains two type assertions at line 92 and 97 (`as { resolve: ... }` and `as InferService<P>`). The factory version (`create-typed-hooks.tsx`) avoids this via the `getResolver()` pattern. This is a known tradeoff documented in comments.

### 4.2 Deterministic Behavior (8.0/10)

**Strengths:**

Resolution via `usePort` in the global hooks is memoized with `useMemo`:

```typescript
// From: integrations/react/src/hooks/use-port.ts (lines 77-98)
export function usePort<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  P extends TProvides = TProvides,
>(port: P): InferService<P> {
  const context = useContext(ResolverContext);
  if (context === null) {
    throw new MissingProviderError("usePort", "ContainerProvider");
  }
  const resolver = context.resolver as { resolve: (port: Port<unknown, string>) => unknown };
  return useMemo(() => resolver.resolve(port) as InferService<P>, [resolver, port]);
}
```

Context values are memoized in `ContainerProvider` to prevent spurious re-renders:

```typescript
// From: integrations/react/src/providers/container-provider.tsx (lines 186-202)
const containerRef = useMemo(() => toRuntimeContainerRef(container), [container]);

const containerContextValue = useMemo(
  (): RuntimeContainerContextValue => ({
    container: containerRef,
    isChildContainer: containerIsChild,
  }),
  [containerRef, containerIsChild]
);

const resolverContextValue = useMemo(
  (): RuntimeResolverContextValue => ({
    resolver: containerRef,
  }),
  [containerRef]
);
```

The `useTracingSummary` hook uses referential stability checks to avoid infinite re-render loops with `useSyncExternalStore`:

```typescript
// From: integrations/react/src/hooks/use-tracing-summary.ts (lines 66-92)
const getSnapshot = (): TracingSummary | undefined => {
  const tracingInspector = inspector.getLibraryInspector("tracing");
  if (!tracingInspector) {
    cachedRef.current = undefined;
    return undefined;
  }
  const raw = tracingInspector.getSnapshot();
  const totalSpans = numericOr0(raw.totalSpans);
  const errorCount = numericOr0(raw.errorCount);
  const averageDuration = numericOr0(raw.averageDuration);
  const cacheHitRate = numericOr0(raw.cacheHitRate);

  const prev = cachedRef.current;
  if (
    prev !== undefined &&
    prev.totalSpans === totalSpans &&
    prev.errorCount === errorCount &&
    prev.averageDuration === averageDuration &&
    prev.cacheHitRate === cacheHitRate
  ) {
    return prev;
  }

  const next: TracingSummary = { totalSpans, errorCount, averageDuration, cacheHitRate };
  cachedRef.current = next;
  return next;
};
```

**Gap:** The `useDeps` hook does not memoize its resolved dependencies object. Each render creates a new `deps` object even if the underlying services have not changed. For stable-identity services this is benign, but it means downstream `useMemo`/`useCallback` consumers cannot use the deps object as a dependency.

### 4.3 Error Handling & Traceability (8.5/10)

**Strengths:**

`MissingProviderError` extends `ContainerError` from `@hex-di/runtime` and carries structured metadata:

```typescript
// From: integrations/react/src/errors.ts (lines 46-75)
export class MissingProviderError extends ContainerError {
  readonly code = "MISSING_PROVIDER" as const;
  readonly isProgrammingError = true as const;
  readonly hookName: string;
  readonly requiredProvider: string;

  constructor(hookName: string, requiredProvider: string) {
    super(
      `${hookName} must be used within a ${requiredProvider}. ` +
        `Ensure your component is wrapped in the appropriate Provider component.`
    );
    this.hookName = hookName;
    this.requiredProvider = requiredProvider;
  }
}
```

The `isProgrammingError: true` flag allows error boundaries to distinguish between developer mistakes (always fixable in code) and runtime failures (transient or environmental). Every hook that accesses context performs a null check and throws `MissingProviderError` with the specific hook name and required provider:

```typescript
// From: integrations/react/src/hooks/use-container.ts (lines 63-67)
if (context === null) {
  throw new MissingProviderError("useContainer", "ContainerProvider");
}
```

Nested provider detection produces an actionable error message:

```typescript
// From: integrations/react/src/providers/container-provider.tsx (lines 176-181)
if (existingContext !== null && !containerIsChild) {
  throw new MissingProviderError(
    "HexDiContainerProvider",
    "HexDiContainerProvider (nested providers not allowed)"
  );
}
```

**Gap:** The `AsyncContainerProvider` and `LazyContainerProvider` compound components throw generic `Error` instead of `MissingProviderError` when used outside their parent provider (e.g., `"AsyncContainerProvider.Loading must be used within AsyncContainerProvider"`). These should use `MissingProviderError` for consistency.

### 4.4 Resource Lifecycle Management (7.5/10)

**Strengths:**

The `AutoScopeProvider` implements a deferred disposal strategy for React StrictMode compatibility:

```typescript
// From: integrations/react/src/providers/auto-scope-provider.tsx (lines 96-144)
const scopeRef = useRef<{ scope: RuntimeResolverRef; name: string | undefined } | null>(null);
const disposalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

if (
  scopeRef.current === null ||
  scopeRef.current.scope.isDisposed ||
  scopeRef.current.name !== name
) {
  scopeRef.current = {
    scope: resolverContext.resolver.createScope(name),
    name,
  };
}

useEffect(() => {
  if (disposalTimeoutRef.current !== null) {
    clearTimeout(disposalTimeoutRef.current);
    disposalTimeoutRef.current = null;
  }

  return () => {
    const currentScope = scopeRef.current;
    disposalTimeoutRef.current = setTimeout(() => {
      if (currentScope !== null && !currentScope.scope.isDisposed) {
        void currentScope.scope.dispose();
      }
    }, 0);
  };
}, []);
```

This handles the StrictMode mount-unmount-remount cycle: the cleanup schedules disposal via `setTimeout(fn, 0)`, and if the effect re-runs (StrictMode remount), it cancels the pending disposal.

The `useScope` hook uses `useRef` for lazy initialization and `useEffect` cleanup:

```typescript
// From: integrations/react/src/hooks/use-scope.ts (lines 100-122)
const scopeRef = useRef<Scope<TProvides> | null>(null);

if (scopeRef.current === null) {
  scopeRef.current = context.resolver.createScope() as Scope<TProvides>;
}

useEffect(() => {
  const scope = scopeRef.current;
  return () => {
    if (scope !== null) {
      // Note: dispose is async but we don't await in cleanup
      // This is intentional - React cleanup functions should be sync
      void scope.dispose();
    }
  };
}, []);
```

The `AsyncContainerProvider` uses the `mounted` flag pattern to prevent state updates after unmount:

```typescript
// From: integrations/react/src/providers/async-container-provider.tsx (lines 337-368)
useEffect(() => {
  let mounted = true;
  async function initialize() {
    try {
      const initialized = await runtimeContainer.initialize();
      if (mounted) {
        setState({ status: "ready", container: initialized, error: null });
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
  void initialize();
  return () => {
    mounted = false;
  };
}, [runtimeContainer]);
```

**Gaps:**

1. **Fire-and-forget async disposal**: `void scope.dispose()` discards the promise result. If disposal fails (e.g., a finalizer throws), the error is silently lost. This is documented as intentional (React cleanup must be sync), but in a GxP context, unobserved disposal failures are a risk.

2. **No disposal timeout**: There is no mechanism to detect or report scopes that take excessively long to dispose.

3. **`ScopeProvider` does not dispose**: By design, `ScopeProvider` does not own the scope lifecycle. However, there is no warning or detection if the caller forgets to dispose.

### 4.5 Test Coverage & Verification (8.5/10)

**Strengths:**

The test suite is comprehensive with 22 test files totaling ~7,279 lines:

| Test File                           | Lines | Coverage Area                                    |
| ----------------------------------- | ----- | ------------------------------------------------ |
| `child-container-provider.test.tsx` | 816   | Child container nesting, inheritance             |
| `strategic.test.tsx`                | 583   | End-to-end integration patterns                  |
| `lazy-container-provider.test.tsx`  | 460   | Lazy loading states, compound components         |
| `inspection-hooks.test.tsx`         | 459   | Inspector hooks with `useSyncExternalStore`      |
| `factory.test.tsx`                  | 437   | `createTypedHooks` factory                       |
| `tracing-hooks.test.tsx`            | 409   | Tracer, span, traced callback hooks              |
| `unified-provider.test-d.ts`        | 405   | Type-level tests for unified provider            |
| `types.test-d.ts`                   | 381   | Type-level tests for core types                  |
| `providers.test.tsx`                | 358   | Provider component behavior                      |
| `use-deps.test.tsx`                 | 348   | Multi-dependency resolution                      |
| `create-component.test.tsx`         | 342   | `createComponent` factory                        |
| `reactive-scope-provider.test.tsx`  | 310   | External scope lifecycle, `useSyncExternalStore` |
| `use-tracing-summary.test.tsx`      | 295   | Tracing summary hook                             |
| `runtime-resolver.test-d.ts`        | 290   | Type-level tests for runtime resolver            |
| `hooks.test.tsx`                    | 269   | Core hooks (usePort, useContainer, useScope)     |
| `context-stability.test.tsx`        | 239   | Referential stability of context values          |
| `create-component.test-d.ts`        | 217   | Type-level tests for createComponent             |
| `lazy-container-provider.test-d.ts` | 209   | Type-level tests for lazy provider               |
| `use-deps.test-d.ts`                | 200   | Type-level tests for useDeps                     |
| `errors.test.ts`                    | 42    | Error class structure                            |
| `auto-scope-provider-name.test.tsx` | 105   | AutoScope naming                                 |
| `tracing-provider.test.tsx`         | 105   | TracingProvider behavior                         |

The test suite includes 6 dedicated type-level test files (`*.test-d.ts`) using `vitest --typecheck`, verifying compile-time constraints without runtime execution. This is a strong compliance indicator.

**Gap:** The `DevToolsBridge` component has no dedicated test file. While it is simple (14 lines of logic), its `postMessage` integration and SSR guard warrant at least basic verification.

### 4.6 Separation of Concerns (8.5/10)

**Strengths:**

The architecture cleanly separates:

- **Context layer** (`context/`): Pure `createContext` definitions with no logic
- **Provider layer** (`providers/`): Component implementations that compose contexts
- **Hook layer** (`hooks/`): Pure hooks that consume contexts
- **Internal layer** (`internal/`): Type erasure and runtime bridging, marked `@internal`
- **Type layer** (`types/`): Interface definitions with zero runtime code
- **Factory layer** (`factories/`): Factory patterns that compose all layers

The `ContainerContext` and `ResolverContext` are deliberately separated:

```typescript
// From: integrations/react/src/context/resolver-context.tsx (lines 89-105)
// The resolver context is separate from the container context so that
// ScopeProvider and AutoScopeProvider can override the resolver while
// preserving access to the root container.
export const ResolverContext = createContext<RuntimeResolverContextValue | null>(null);
```

This allows `ScopeProvider` to override the resolver (to a scope) while `useContainer` can still access the root container via `ContainerContext`.

### 4.7 Documentation & Auditability (7.5/10)

**Strengths:**

Every public function, interface, and type has TSDoc comments with `@param`, `@returns`, `@throws`, `@remarks`, and `@example` annotations. Internal modules are marked with `@internal` and `@packageDocumentation`.

The `runtime-resolver.ts` module contains a ~60-line module-level doc comment explaining the variance problem, the solution approach, the safety justification, and usage examples.

**Gaps:**

1. No standalone README or migration guide for the package (though the code is self-documenting)
2. The relationship between global hooks (`usePort` from `hooks/`) and factory hooks (`usePort` from `createTypedHooks`) is not explicitly documented for consumers
3. SSR-specific behavior (e.g., `getServerSnapshot` in `ReactiveScopeProvider`) could benefit from more detailed documentation

### 4.8 API Surface Minimality (7.5/10)

The package exports 40+ symbols from `index.ts`, spanning providers, hooks, types, error classes, and re-exports from `@hex-di/core` and `@hex-di/runtime`. While the re-exports improve consumer ergonomics, the total surface area is large.

The dual-API approach (global hooks + `createTypedHooks` factory) creates two overlapping pathways to the same functionality. This is intentional (factory for type-safe application code, global for testing utilities), but increases cognitive load.

### 4.9 Concurrency & React Model Compliance (8.0/10)

**Strengths:**

- `useSyncExternalStore` is used for all external state subscriptions (`useSnapshot`, `useScopeTree`, `useUnifiedSnapshot`, `useTracingSummary`, `ReactiveScopeProvider`), which is the React-recommended approach for concurrent mode safety
- `useEffect` (not `useLayoutEffect`) ensures SSR compatibility
- The `mounted` flag pattern in `AsyncContainerProvider` and `LazyContainerProvider` prevents state updates after unmount
- The deferred disposal pattern in `AutoScopeProvider` handles StrictMode correctly

```typescript
// From: integrations/react/src/providers/reactive-scope-provider.tsx (lines 157-175)
const state = useSyncExternalStore<ScopeDisposalState>(
  onStoreChange => {
    const listener: ScopeLifecycleListener = () => {
      onStoreChange();
    };
    return scope.subscribe(listener);
  },
  () => {
    return scope.getDisposalState();
  },
  () => {
    return scope.isDisposed ? "disposed" : "active";
  }
);
```

**Gap:** The `ReactiveScopeProvider` does not memoize `scopeRef` and `resolverContextValue` -- these are created fresh on every render. While React's reconciliation handles this, it means child components re-render on every parent render even when the scope has not changed.

### 4.10 DevTools & Observability (7.5/10)

**Strengths:**

All React contexts have `displayName` set for React DevTools visibility:

```typescript
// From: integrations/react/src/context/container-context.tsx (line 100)
ContainerContext.displayName = "HexDI.ContainerContext";

// From: integrations/react/src/context/resolver-context.tsx (line 105)
ResolverContext.displayName = "HexDI.ResolverContext";

// From: integrations/react/src/context/tracing-context.tsx (line 52)
TracingContext.displayName = "HexDI.TracingContext";

// From: integrations/react/src/context/inspector-context.tsx (line 43)
InspectorContext.displayName = "HexDI.InspectorContext";
```

The `DevToolsBridge` component forwards inspector events to browser extensions:

```typescript
// From: integrations/react/src/components/dev-tools-bridge.tsx (lines 79-93)
export function DevToolsBridge({ inspector, enabled = true }: DevToolsBridgeProps): null {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }
    const unsubscribe = inspector.subscribe(event => {
      window.postMessage({ type: "hex-di:inspector-event", event }, "*");
    });
    return unsubscribe;
  }, [inspector, enabled]);
  return null;
}
```

The `createComponent` factory sets `displayName` on generated components:

```typescript
// From: integrations/react/src/factories/create-component.tsx (line 192)
Component.displayName = "DIComponent";
```

**Gap:** The `displayName` for `createComponent` is static ("DIComponent") rather than derived from the component's dependencies, making it harder to distinguish multiple DI components in DevTools.

---

## 5. Code Examples (from source)

### 5.1 Type-Safe Service Resolution with `createTypedHooks`

```typescript
// From: integrations/react/src/factories/create-typed-hooks.tsx (lines 288-290, 677-687)
export function createTypedHooks<
  TProvides extends Port<unknown, string>,
>(): TypedReactIntegration<TProvides> {
  // ... creates isolated contexts ...

  function usePort<P extends TProvides>(port: P): InferService<P> {
    const context = useContext(ResolverContext);
    if (context === null) {
      throw new MissingProviderError("usePort", "ContainerProvider");
    }
    return context.getResolver().resolve(port);
  }

  // ...
}
```

### 5.2 Child Container Detection Without Exception-Based Control Flow

```typescript
// From: integrations/react/src/providers/container-provider.tsx (lines 63-78)
function isChildContainer<TProvides extends Port<unknown, string>>(
  container: AnyContainer<TProvides>
): boolean {
  const accessor = container[INTERNAL_ACCESS];
  if (typeof accessor === "function") {
    const internalState = accessor();
    return internalState.containerId !== "root";
  }
  return false;
}
```

### 5.3 Type Erasure Trust Boundary

```typescript
// From: integrations/react/src/internal/runtime-resolver.ts (lines 344-372)
export function toRuntimeResolver(resolver: ResolverLike): RuntimeResolver {
  const subscribeMethod = resolver.subscribe;
  const getDisposalStateMethod = resolver.getDisposalState;

  const wrapped: RuntimeResolver = {
    resolve: port => resolver.resolve(port),
    resolveAsync: port => resolver.resolveAsync(port),
    createScope: (name?: string) => toRuntimeResolver(resolver.createScope(name)),
    dispose: () => resolver.dispose(),
    has: port => resolver.has(port),
    get isDisposed() {
      return resolver.isDisposed;
    },
    subscribe: subscribeMethod !== undefined ? listener => subscribeMethod(listener) : undefined,
    getDisposalState:
      getDisposalStateMethod !== undefined ? () => getDisposalStateMethod() : undefined,
  };

  return wrapped;
}
```

### 5.4 Declarative Component with DI Dependencies

```typescript
// From: integrations/react/src/factories/create-component.tsx (lines 164-195)
export function createComponent<
  const TRequires extends readonly Port<unknown, string>[],
  TProps extends object = Record<string, never>,
>(config: ComponentConfig<TRequires, TProps>): FC<TProps> {
  const { requires, render } = config;

  function Component(props: TProps): ReactNode {
    const resolverContext = useContext(ResolverContext);
    if (resolverContext === null) {
      throw new MissingProviderError("createComponent", "ContainerProvider");
    }

    const deps: Record<string, unknown> = {};
    for (const port of requires) {
      const portName = port.__portName;
      deps[portName] = resolverContext.resolver.resolve(port);
    }

    return render(deps as ComponentResolvedDeps<TupleToUnion<TRequires>>, props);
  }

  Component.displayName = "DIComponent";
  return Component;
}
```

### 5.5 Multi-Dependency Resolution Hook

```typescript
// From: integrations/react/src/hooks/use-deps.tsx (lines 112-131)
export function useDeps<const TRequires extends readonly Port<unknown, string>[]>(
  ...requires: TRequires
): DepsResult<TupleToUnion<TRequires>> {
  const resolverContext = useContext(ResolverContext);

  if (resolverContext === null) {
    throw new MissingProviderError("useDeps", "ContainerProvider");
  }

  const deps: Record<string, unknown> = {};
  for (const port of requires) {
    const portName = port.__portName;
    deps[portName] = resolverContext.resolver.resolve(port);
  }

  return deps as DepsResult<TupleToUnion<TRequires>>;
}
```

### 5.6 Reactive External Store Integration

```typescript
// From: integrations/react/src/hooks/use-snapshot.ts (lines 37-45)
export function useSnapshot(): ContainerSnapshot {
  const inspector = useInspector();

  return useSyncExternalStore(
    onStoreChange => inspector.subscribe(() => onStoreChange()),
    () => inspector.getSnapshot(),
    () => inspector.getSnapshot()
  );
}
```

---

## 6. Edge Cases & Known Limitations

### 6.1 Fire-and-Forget Async Disposal

**Context:** React `useEffect` cleanup functions must be synchronous, but `Scope.dispose()` returns `Promise<void>`.

**Behavior:** Both `useScope` and `AutoScopeProvider` use `void scope.dispose()`:

```typescript
// From: integrations/react/src/hooks/use-scope.ts (lines 113-116)
return () => {
  if (scope !== null) {
    void scope.dispose();
  }
};
```

**Impact:** If a finalizer in the scope's disposal chain throws an error, that error is unobserved. In production, this means resource cleanup failures are silent. The `void` operator explicitly discards the promise, so no unhandled rejection is generated.

**GxP Concern:** Medium. In regulated environments, silent resource cleanup failures could violate audit trail requirements. Consider adding a global disposal error handler or logging callback.

### 6.2 React StrictMode Double-Mount

**Context:** React 18+ StrictMode mounts, unmounts, then remounts components in development.

**Behavior:** `AutoScopeProvider` uses deferred disposal (`setTimeout(fn, 0)`) with cancellation:

```typescript
// From: integrations/react/src/providers/auto-scope-provider.tsx (lines 123-144)
useEffect(() => {
  if (disposalTimeoutRef.current !== null) {
    clearTimeout(disposalTimeoutRef.current);
    disposalTimeoutRef.current = null;
  }
  return () => {
    const currentScope = scopeRef.current;
    disposalTimeoutRef.current = setTimeout(() => {
      if (currentScope !== null && !currentScope.scope.isDisposed) {
        void currentScope.scope.dispose();
      }
    }, 0);
  };
}, []);
```

The factory `AutoScopeProvider` in `create-typed-hooks.tsx` takes a different approach -- it checks `isDisposed` and recreates:

```typescript
// From: integrations/react/src/factories/create-typed-hooks.tsx (lines 401-434)
if (scopeRef.current === null || scopeRef.current.isDisposed) {
  scopeRef.current = resolverContext.getResolver().createScope(name);
}
```

**Impact:** Both approaches work correctly. The global `AutoScopeProvider`'s deferred approach is more conservative (avoids scope recreation). The factory approach is simpler but creates a new scope on every StrictMode remount.

### 6.3 Nested Root Container Provider Detection

**Context:** Nesting two root `ContainerProvider`s is a programming error.

**Behavior:** `ContainerProvider` checks for existing context and whether the new container is a child:

```typescript
// From: integrations/react/src/providers/container-provider.tsx (lines 168-181)
const existingContext = useContext(ContainerContext);
const containerIsChild = isChildContainer(container);

if (existingContext !== null && !containerIsChild) {
  throw new MissingProviderError(
    "HexDiContainerProvider",
    "HexDiContainerProvider (nested providers not allowed)"
  );
}
```

**Limitation:** Child containers are allowed to nest. The detection relies on `INTERNAL_ACCESS` to read `containerId`. Mock containers in tests that lack `INTERNAL_ACCESS` default to `isChild = false`, which means test mocks always appear as root containers.

### 6.4 `usePort` Memoization Behavior Difference

**Context:** The global `usePort` and factory `usePort` have different memoization strategies.

- **Global `usePort`** (in `hooks/use-port.ts`): Uses `useMemo(() => resolver.resolve(port), [resolver, port])` -- memoizes the resolved value per (resolver, port).
- **Factory `usePort`** (in `create-typed-hooks.tsx`): Calls `context.getResolver().resolve(port)` on every render -- no memoization, always resolves fresh.

**Impact:** For singleton-scoped services, both return the same instance. For factory-scoped services (new instance per resolution), the global hook caches while the factory hook creates fresh. This behavioral difference is subtle and undocumented.

### 6.5 `ReactiveScopeProvider` -- No Context Value Memoization

**Context:** `ReactiveScopeProvider` creates `scopeRef` and `resolverContextValue` inline:

```typescript
// From: integrations/react/src/providers/reactive-scope-provider.tsx (lines 184-193)
const scopeRef: RuntimeResolverRef = toRuntimeScopeRef(scope);
const resolverContextValue: RuntimeResolverContextValue = {
  resolver: scopeRef,
};
```

**Impact:** `toRuntimeScopeRef` creates a new wrapper object on every render. All context consumers will see a new value on every render, triggering unnecessary re-renders of child components that use `useContext(ResolverContext)`.

### 6.6 `LazyContainerProvider` -- Effect Dependency on `state.status`

**Context:** The load effect depends on `state.status` and `state.container`:

```typescript
// From: integrations/react/src/providers/lazy-container-provider.tsx (lines 308-345)
useEffect(() => {
  const needsLoad =
    state.status === "loading" || (state.status === "ready" && state.container === null);
  if (!needsLoad) {
    return;
  }
  // ... load logic ...
}, [state.status, state.container, runtimeLazy]);
```

**Impact:** The effect re-runs when status transitions, which is correct. However, if the `runtimeLazy.load()` promise resolves after the component unmounts and remounts, the `mounted` flag correctly prevents stale state updates.

### 6.7 SSR `getServerSnapshot` Simplification

The `ReactiveScopeProvider` provides a simplified `getServerSnapshot`:

```typescript
// From: integrations/react/src/providers/reactive-scope-provider.tsx (lines 172-174)
() => {
  return scope.isDisposed ? "disposed" : "active";
};
```

This omits the `"disposing"` state, collapsing it to either `"active"` or `"disposed"`. On the server, scopes should not be in a disposing state, so this is a reasonable simplification, but it could mask bugs if server-side code incorrectly disposes scopes mid-render.

---

## 7. Recommendations by Tier

### Tier 1: Critical (Address before GxP audit)

1. **Add disposal error reporting mechanism.** The `void scope.dispose()` pattern silently discards errors. Introduce a configurable `onDisposalError` callback prop on `AutoScopeProvider` and `useScope`, or a global error handler registration.

2. **Use `MissingProviderError` consistently in compound components.** The `Loading`, `Error`, and `Ready` components in `AsyncContainerProvider` and `LazyContainerProvider` throw generic `Error` instead of `MissingProviderError`. Update to maintain uniform error classification.

### Tier 2: Important (Address for compliance hardening)

3. **Memoize context values in `ReactiveScopeProvider`.** Add `useMemo` for `toRuntimeScopeRef(scope)` and the resolver context value object to prevent unnecessary child re-renders.

4. **Document the behavioral difference between global `usePort` (memoized) and factory `usePort` (non-memoized).** Add a `@remarks` note in both implementations explaining the difference and when each is appropriate.

5. **Add `DevToolsBridge` tests.** Write basic tests verifying: (a) events are forwarded via `postMessage`, (b) the `enabled` prop disables forwarding, (c) SSR guard prevents `postMessage` calls when `window` is undefined.

6. **Derive `displayName` in `createComponent`.** Use the port names from the `requires` array to generate a meaningful display name (e.g., `"DIComponent(Logger,UserService)"`).

### Tier 3: Nice to Have (Improves compliance posture)

7. **Add memoization to `useDeps`.** Memoize the resolved dependencies object using a `useRef`-based comparison of port identities and resolved values.

8. **Add disposal timeout warning.** In development mode, log a warning if `scope.dispose()` takes longer than a configurable threshold (e.g., 5 seconds).

9. **Document SSR `getServerSnapshot` simplification.** Add a `@remarks` note to `ReactiveScopeProvider` explaining why `"disposing"` is collapsed on the server.

10. **Add Error Boundary guidance.** Provide a recommended `ErrorBoundary` component or documentation showing how to catch `FactoryError`, `CircularDependencyError`, and `DisposedScopeError` propagated by `usePort`.

---

## 8. File Reference Guide

### 8.1 Source Files

| File                                         | Lines | Purpose                                                                  |
| -------------------------------------------- | ----- | ------------------------------------------------------------------------ |
| `src/index.ts`                               | 355   | Public API barrel export                                                 |
| `src/errors.ts`                              | 76    | `MissingProviderError` class                                             |
| **Context Layer**                            |       |                                                                          |
| `src/context/container-context.tsx`          | 101   | Container context with phantom brand                                     |
| `src/context/resolver-context.tsx`           | 106   | Resolver context (Container or Scope)                                    |
| `src/context/tracing-context.tsx`            | 53    | Tracing context for Tracer                                               |
| `src/context/inspector-context.tsx`          | 44    | Inspector context for InspectorAPI                                       |
| `src/context/index.ts`                       | --    | Barrel export                                                            |
| **Provider Layer**                           |       |                                                                          |
| `src/providers/container-provider.tsx`       | 209   | Root/child container provider with nesting detection                     |
| `src/providers/scope-provider.tsx`           | 93    | Manual scope provider (no lifecycle)                                     |
| `src/providers/auto-scope-provider.tsx`      | 152   | Automatic scope with deferred disposal                                   |
| `src/providers/async-container-provider.tsx` | 515   | Async init with compound components                                      |
| `src/providers/lazy-container-provider.tsx`  | 540   | Lazy graph loading with compound components                              |
| `src/providers/reactive-scope-provider.tsx`  | 195   | External scope disposal reactivity                                       |
| `src/providers/inspector-provider.tsx`       | 73    | Inspector context provider                                               |
| `src/providers/tracing-provider.tsx`         | 105   | Tracing context provider                                                 |
| `src/providers/index.ts`                     | --    | Barrel export                                                            |
| **Hook Layer**                               |       |                                                                          |
| `src/hooks/use-port.ts`                      | 98    | Service resolution (memoized)                                            |
| `src/hooks/use-container.ts`                 | 73    | Container access                                                         |
| `src/hooks/use-scope.ts`                     | 122   | Scoped lifecycle management                                              |
| `src/hooks/use-deps.tsx`                     | 131   | Multi-dependency resolution                                              |
| `src/hooks/use-inspector.ts`                 | 42    | Inspector access                                                         |
| `src/hooks/use-snapshot.ts`                  | 45    | Reactive container snapshot                                              |
| `src/hooks/use-scope-tree.ts`                | 45    | Reactive scope tree                                                      |
| `src/hooks/use-unified-snapshot.ts`          | 48    | Reactive unified snapshot                                                |
| `src/hooks/use-tracer.ts`                    | 78    | Tracer access                                                            |
| `src/hooks/use-span.ts`                      | 80    | Active span access                                                       |
| `src/hooks/use-traced-callback.ts`           | 145   | Traced callback wrapper                                                  |
| `src/hooks/use-tracing-summary.ts`           | 99    | Reactive tracing summary                                                 |
| `src/hooks/index.ts`                         | --    | Barrel export                                                            |
| **Internal Layer**                           |       |                                                                          |
| `src/internal/runtime-resolver.ts`           | 575   | Type erasure: RuntimeResolver, toRuntimeResolver, assertResolverProvides |
| `src/internal/runtime-refs.ts`               | 311   | React-specific aliases and conversion functions                          |
| `src/internal/index.ts`                      | --    | Barrel export                                                            |
| **Factory Layer**                            |       |                                                                          |
| `src/factories/create-typed-hooks.tsx`       | 759   | Factory for isolated typed integration                                   |
| `src/factories/create-component.tsx`         | 195   | Declarative component factory                                            |
| `src/factories/index.ts`                     | --    | Barrel export                                                            |
| **Type Layer**                               |       |                                                                          |
| `src/types/core.ts`                          | 115   | `Resolver` interface, `ToResolver` utility                               |
| `src/types/factory.ts`                       | 288   | `TypedReactIntegration` interface                                        |
| `src/types/unified.ts`                       | 606   | Unified provider types, inheritance validation                           |
| `src/types/provider-props.ts`                | 158   | Provider component prop types                                            |
| `src/types/lazy-container-props.ts`          | 120   | Lazy container prop types                                                |
| `src/types/index.ts`                         | --    | Barrel export                                                            |
| **Component Layer**                          |       |                                                                          |
| `src/components/dev-tools-bridge.tsx`        | 93    | DevTools event bridge                                                    |

### 8.2 Test Files

| File                                      | Lines | Coverage Area                              |
| ----------------------------------------- | ----- | ------------------------------------------ |
| `tests/child-container-provider.test.tsx` | 816   | Child container nesting, inheritance modes |
| `tests/strategic.test.tsx`                | 583   | End-to-end integration patterns            |
| `tests/lazy-container-provider.test.tsx`  | 460   | Lazy loading states, compound components   |
| `tests/inspection-hooks.test.tsx`         | 459   | Inspector hooks, useSyncExternalStore      |
| `tests/factory.test.tsx`                  | 437   | createTypedHooks factory                   |
| `tests/tracing-hooks.test.tsx`            | 409   | Tracing hooks (tracer, span, callback)     |
| `tests/unified-provider.test-d.ts`        | 405   | Type-level: unified provider               |
| `tests/types.test-d.ts`                   | 381   | Type-level: core types                     |
| `tests/providers.test.tsx`                | 358   | Provider component behavior                |
| `tests/use-deps.test.tsx`                 | 348   | useDeps hook                               |
| `tests/create-component.test.tsx`         | 342   | createComponent factory                    |
| `tests/reactive-scope-provider.test.tsx`  | 310   | ReactiveScopeProvider                      |
| `tests/use-tracing-summary.test.tsx`      | 295   | useTracingSummary hook                     |
| `tests/runtime-resolver.test-d.ts`        | 290   | Type-level: runtime resolver               |
| `tests/hooks.test.tsx`                    | 269   | Core hooks                                 |
| `tests/context-stability.test.tsx`        | 239   | Context referential stability              |
| `tests/create-component.test-d.ts`        | 217   | Type-level: createComponent                |
| `tests/lazy-container-provider.test-d.ts` | 209   | Type-level: lazy provider                  |
| `tests/use-deps.test-d.ts`                | 200   | Type-level: useDeps                        |
| `tests/tracing-provider.test.tsx`         | 105   | TracingProvider                            |
| `tests/auto-scope-provider-name.test.tsx` | 105   | AutoScope naming                           |
| `tests/errors.test.ts`                    | 42    | Error class structure                      |

---

_End of GxP Compliance Analysis Report_
