# Technology Stack Patterns for Runtime DI Improvements

**Project:** HexDI v5.0 Runtime Package Improvements
**Researched:** 2026-02-03
**Context:** Existing @hex-di/runtime at 8.7/10, targeting 9.5/10

---

## Executive Summary

This research focuses on **patterns and techniques** for the four improvement areas:

1. Type-safe override APIs (replacing string-keyed maps)
2. Performance optimizations (O(1) data structures, timestamp elision)
3. Testing strategies for DI container internals
4. Documentation patterns for complex type systems

All recommendations are specific to TypeScript DI container development and integrate with HexDI's existing patterns.

---

## 1. Type-Safe Override Patterns

### 1.1 The Problem

Current `withOverrides()` uses string keys:

```typescript
// Current (string-keyed, error-prone)
container.withOverrides(
  { Loggerr: () => mockLogger }, // Typo not caught
  () => {
    /* ... */
  }
);
```

### 1.2 Recommended Pattern: Port-Keyed Map with Mapped Types

**Pattern:** Use mapped types to derive override map keys from port union.

```typescript
/**
 * Type-safe override map where keys are constrained to port names
 * from TProvides and values must return compatible service types.
 */
type TypeSafeOverrideMap<TProvides extends Port<unknown, string>> = {
  [P in TProvides as InferPortName<P>]?: () => InferService<P>;
};
```

**Why this works:**

- `[P in TProvides as InferPortName<P>]` - Iterates port union, uses port name as key
- `() => InferService<P>` - Factory return type derived from same port
- TypeScript enforces both key validity AND return type correctness

**Integration with existing runtime:**

```typescript
// types.ts addition
export type TypeSafeOverrideMap<TProvides extends Port<unknown, string>> = {
  [P in TProvides as InferPortName<P>]?: () => InferService<P>;
};

// ContainerMembers.withOverrides signature update
withOverrides<
  TOverrides extends TypeSafeOverrideMap<TProvides | TExtends>,
  R,
>(
  overrides: TOverrides,
  fn: () => R
): R;
```

### 1.3 Alternative: Builder Pattern

**Pattern:** Fluent builder with port-typed methods.

```typescript
interface OverrideBuilder<TProvides extends Port<unknown, string>> {
  override<P extends TProvides>(
    port: P,
    factory: () => InferService<P>
  ): OverrideBuilder<TProvides>;

  build(): OverrideFactoryMap;
}

// Usage
container.withOverrides(
  builder => builder.override(LoggerPort, () => mockLogger).override(DatabasePort, () => mockDb),
  () => {
    /* ... */
  }
);
```

**Trade-offs:**

| Approach        | Pros                           | Cons                                          |
| --------------- | ------------------------------ | --------------------------------------------- |
| Mapped Types    | Simpler API, single object     | Refactoring port names requires updating keys |
| Builder Pattern | Port references, auto-complete | More verbose, additional runtime object       |

**Recommendation:** Use mapped types pattern (1.2) because:

- Simpler API matches existing container.withOverrides signature
- Port names are stable identifiers in HexDI design
- Backward compatible (string keys still work, just typed)

### 1.4 Implementation Details

**OverrideContext update:**

```typescript
// override-context.ts changes

// BEFORE: string-keyed
export type OverrideFactoryMap = {
  readonly [portName: string]: (() => unknown) | undefined;
};

// AFTER: Port name extraction at runtime preserved
// Type safety added at API boundary in types.ts
// Internal representation unchanged for performance
```

**Key insight:** Type safety is enforced at compile time via the mapped type. Runtime code continues using string keys internally - no performance impact.

---

## 2. Performance Optimization Techniques

### 2.1 O(1) Data Structures for Child Container Management

**Current problem:** Linear search for unregistration:

```typescript
// lifecycle-manager.ts:121-124 (O(n))
const idx = this.childContainers.indexOf(child);
if (idx !== -1) {
  this.childContainers.splice(idx, 1);
}
```

**Recommended pattern:** Map with insertion-order iteration.

```typescript
// ES2015+ Map preserves insertion order
private childContainers: Map<string, DisposableChild> = new Map();

registerChild(child: DisposableChild): void {
  this.childContainers.set(child.name, child); // O(1)
}

unregisterChild(child: DisposableChild): void {
  this.childContainers.delete(child.name); // O(1)
}

// LIFO disposal via reverse iteration
async disposeChildren(): Promise<void> {
  const children = [...this.childContainers.values()].reverse();
  for (const child of children) {
    await child.dispose();
  }
  this.childContainers.clear();
}
```

**Why Map over Set:**

- Map provides O(1) lookup by ID
- Map iteration order matches insertion order (ES6 guarantee)
- Enables ID-based API for unregistration

**Alternative consideration - WeakMap:**

NOT recommended because:

- WeakMap doesn't support iteration (can't dispose children)
- Child containers need explicit lifecycle management
- Memory is already managed via disposal

### 2.2 Timestamp Elision Pattern

**Current state:** `Date.now()` called on every memoization:

```typescript
// memo-map.ts:195
resolvedAt: Date.now(), // Called even when not needed
```

**Recommended pattern:** Conditional timestamp capture.

```typescript
interface MemoMapOptions {
  /**
   * Track resolution timestamps for DevTools.
   * Default: true (required for tracer statistics)
   */
  trackTimestamps?: boolean;
}

class MemoMap {
  private readonly trackTimestamps: boolean;

  constructor(parent?: MemoMap, options?: MemoMapOptions) {
    this.parent = parent;
    // Inherit setting from parent, or default to true
    this.trackTimestamps = options?.trackTimestamps ?? parent?.trackTimestamps ?? true;
  }

  private createEntry<P extends Port<unknown, string>>(
    port: P,
    instance: InferService<P>,
    finalizer?: Finalizer<InferService<P>>
  ): CacheEntry<P> {
    return {
      port,
      instance,
      finalizer,
      resolvedAt: this.trackTimestamps ? Date.now() : 0,
      resolutionOrder: this.resolutionCounter++,
    };
  }
}
```

**Trade-off analysis:**

| Scenario                 | `Date.now()`              | Without         |
| ------------------------ | ------------------------- | --------------- |
| DevTools attached        | Required                  | -               |
| Production (no DevTools) | ~0.5ms per 1K resolutions | 0ms             |
| Tracer statistics        | Required                  | Incomplete data |

**Recommendation:** Keep timestamps enabled by default but make configurable via `createContainer` options:

```typescript
interface CreateContainerOptions {
  name: string;
  devtools?: {
    /** Disable for maximum performance */
    trackTimestamps?: boolean;
  };
}
```

This preserves the existing behavior (tracer works) while enabling opt-out for performance-critical scenarios.

### 2.3 Resolution Stack Optimization (Already Good)

The existing `ResolutionContext` uses array push/pop which is O(1):

```typescript
// context.ts - Already optimal
enter(portName: string): void {
  this.stack.push(portName); // O(1) amortized
}

exit(portName: string): void {
  this.stack.pop(); // O(1)
}
```

No changes needed here.

---

## 3. Testing Strategies for DI Container Internals

### 3.1 Hook Testing Patterns

**Challenge:** Hooks are callbacks invoked during resolution with specific context.

**Recommended pattern:** Structured context assertion helpers.

```typescript
// test-utils/hook-assertions.ts

interface HookContextExpectation {
  portName: string;
  lifetime?: Lifetime;
  scopeId?: string | null;
  parentPort?: Port<unknown, string> | null;
  isCacheHit?: boolean;
  depth?: number;
  containerId?: string;
  containerKind?: ContainerKind;
}

function expectHookContext(actual: ResolutionHookContext, expected: HookContextExpectation): void {
  expect(actual.portName).toBe(expected.portName);
  if (expected.lifetime !== undefined) {
    expect(actual.lifetime).toBe(expected.lifetime);
  }
  // ... other assertions
}

// Usage in tests
describe("Resolution Hooks", () => {
  it("provides correct context in beforeResolve", () => {
    const contexts: ResolutionHookContext[] = [];
    const hooks: ResolutionHooks = {
      beforeResolve: ctx => contexts.push(ctx),
    };

    const container = createContainer(graph, {
      name: "Test",
      hooks,
    });
    container.resolve(LoggerPort);

    expectHookContext(contexts[0], {
      portName: "Logger",
      lifetime: "singleton",
      isCacheHit: false,
      depth: 0,
    });
  });
});
```

### 3.2 Call Order Verification

**Pattern:** Track call sequence with array markers.

```typescript
it("calls hooks in correct order around factory", () => {
  const callOrder: string[] = [];

  const hooks: ResolutionHooks = {
    beforeResolve: () => callOrder.push("before"),
    afterResolve: () => callOrder.push("after"),
  };

  const factory = vi.fn(() => {
    callOrder.push("factory");
    return { value: 1 };
  });

  // ... setup container with tracked factory
  container.resolve(TestPort);

  expect(callOrder).toEqual(["before", "factory", "after"]);
});
```

### 3.3 Nested Dependency Hook Testing

**Challenge:** Testing depth tracking and parent port relationships.

```typescript
it("tracks depth for nested dependencies", () => {
  const contexts: ResolutionHookContext[] = [];
  const hooks: ResolutionHooks = {
    beforeResolve: ctx => contexts.push(ctx),
  };

  // Graph: A -> B -> C
  const graph = GraphBuilder.create()
    .provide(CAdapter) // depth 2
    .provide(BAdapter) // depth 1, requires C
    .provide(AAdapter) // depth 0, requires B
    .build();

  const container = createContainer(graph, { name: "Test", hooks });
  container.resolve(APort);

  // Assert depth progression
  expect(contexts.map(c => c.depth)).toEqual([0, 1, 2]);

  // Assert parent chain
  expect(contexts[0].parentPort).toBeNull(); // A is root
  expect(contexts[1].parentPort).toBe(APort); // B's parent is A
  expect(contexts[2].parentPort).toBe(BPort); // C's parent is B
});
```

### 3.4 Cache Hit Testing

```typescript
it("reports isCacheHit correctly for singletons", () => {
  const contexts: ResolutionHookContext[] = [];
  const hooks: ResolutionHooks = {
    beforeResolve: ctx => contexts.push(ctx),
  };

  const container = createContainer(graph, { name: "Test", hooks });

  container.resolve(SingletonPort);
  container.resolve(SingletonPort); // Second resolution

  expect(contexts[0].isCacheHit).toBe(false); // First: miss
  expect(contexts[1].isCacheHit).toBe(true); // Second: hit
});
```

### 3.5 Error Scenario Testing

```typescript
it("calls afterResolve even when factory throws", () => {
  let afterCalled = false;
  let afterError: Error | null = null;

  const hooks: ResolutionHooks = {
    afterResolve: ctx => {
      afterCalled = true;
      afterError = ctx.error;
    },
  };

  const throwingAdapter = createAdapter({
    provides: TestPort,
    factory: () => {
      throw new Error("Factory failed");
    },
  });

  const container = createContainer(GraphBuilder.create().provide(throwingAdapter).build(), {
    name: "Test",
    hooks,
  });

  expect(() => container.resolve(TestPort)).toThrow("Factory failed");
  expect(afterCalled).toBe(true);
  expect(afterError).toBeInstanceOf(Error);
  expect(afterError?.message).toBe("Factory failed");
});
```

### 3.6 Plugin System Testing

**Pattern:** Symbol-based internal access verification.

```typescript
import { HOOKS_ACCESS } from "@hex-di/runtime";

describe("Hook Installation", () => {
  it("installs hooks via HOOKS_ACCESS symbol", () => {
    const container = createContainer(graph, { name: "Test" });

    // Access hook installer
    const installer = container[HOOKS_ACCESS]();

    const calls: string[] = [];
    const uninstall = installer.installHooks({
      beforeResolve: () => calls.push("installed-hook"),
    });

    container.resolve(TestPort);
    expect(calls).toContain("installed-hook");

    // Verify uninstall works
    uninstall();
    calls.length = 0;
    container.resolve(TestPort);
    expect(calls).not.toContain("installed-hook");
  });
});
```

---

## 4. Documentation Patterns for Complex Type Systems

### 4.1 Type Parameter Documentation

**Pattern:** Use `@typeParam` JSDoc tags with concrete examples.

````typescript
/**
 * A type-safe dependency injection container.
 *
 * @typeParam TProvides - Union of ports provided by this container.
 *   For root containers: all ports from the graph.
 *   For child containers: inherited ports from parent.
 *
 * @typeParam TExtends - Ports added by child containers via override/extend.
 *   Always `never` for root containers.
 *
 * @typeParam TAsyncPorts - Ports with async factories requiring initialization.
 *
 * @typeParam TPhase - Initialization state controlling sync resolution.
 *
 * @example Root container
 * ```typescript
 * // TProvides = LoggerPort | DatabasePort
 * // TExtends = never (root)
 * // TAsyncPorts = DatabasePort (has async factory)
 * // TPhase = "uninitialized" initially
 * const container = createContainer(graph, { name: "App" });
 * ```
 *
 * @example Child container
 * ```typescript
 * // TProvides = LoggerPort | DatabasePort (inherited)
 * // TExtends = MockLoggerPort (override)
 * // TPhase = "initialized" (child inherits)
 * const child = container.createChild(childGraph, { name: "Test" });
 * ```
 */
export type Container<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
> = ContainerMembers<TProvides, TExtends, TAsyncPorts, TPhase>;
````

### 4.2 Conditional Type Documentation

**Pattern:** Document behavior for different type parameter values.

````typescript
/**
 * Initialize method - only available on root containers.
 *
 * This method has different types based on container kind:
 *
 * - **Root container (TExtends = never):** Returns `() => Promise<Container<..., "initialized">>`
 * - **Child container (TExtends != never):** Returns `never` (not callable)
 *
 * @remarks
 * Uses `[TExtends] extends [never]` pattern to prevent distribution
 * over never type. Plain `TExtends extends never` would return `never`
 * unconditionally due to conditional type distribution.
 *
 * @example Why the bracket pattern
 * ```typescript
 * // Without brackets - WRONG
 * type A = never extends never ? true : false;  // never (distributed)
 *
 * // With brackets - CORRECT
 * type B = [never] extends [never] ? true : false;  // true
 * ```
 */
initialize: [TExtends] extends [never]
  ? TPhase extends "uninitialized"
    ? () => Promise<Container<TProvides, never, TAsyncPorts, "initialized">>
    : never
  : never;
````

### 4.3 Error Type Documentation

**Pattern:** Explain why error types are returned instead of never.

````typescript
/**
 * Extracts the service type from a Port.
 *
 * Returns the phantom type `T` from `Port<T, TName>`, or a descriptive
 * error type if the input is not a valid Port.
 *
 * @remarks
 * Why `NotAPortError<P>` instead of `never`:
 * - `never` is opaque - IDE shows no useful information
 * - Error types appear in tooltips with explanations
 * - Developers see what went wrong and how to fix it
 *
 * @example Error case shows helpful message
 * ```typescript
 * type Result = InferService<string>;
 * // Hovering shows:
 * // {
 * //   __errorBrand: "NotAPortError";
 * //   __message: "Expected a Port type created with createPort()";
 * //   __received: string;
 * //   __hint: "Use InferService<typeof YourPort>, not InferService<YourPort>";
 * // }
 * ```
 */
export type InferService<P> = P extends Port<infer T, infer _> ? T : NotAPortError<P>;
````

### 4.4 Module Split Documentation

When splitting large type files, preserve documentation context:

```typescript
// types/index.ts

/**
 * @hex-di/runtime type definitions.
 *
 * This module re-exports types from focused submodules:
 *
 * - `./container` - Container type and members
 * - `./scope` - Scope type and members
 * - `./lazy-container` - LazyContainer for code-splitting
 * - `./utilities` - Type inference utilities (Infer*, Is*)
 * - `./inheritance` - Inheritance mode configuration
 * - `./phase` - Container phase and state types
 *
 * @module
 */

export * from "./container.js";
export * from "./scope.js";
export * from "./lazy-container.js";
export * from "./utilities.js";
export * from "./inheritance.js";
export * from "./phase.js";
```

### 4.5 State Machine Documentation

**Pattern:** ASCII diagrams in JSDoc for lifecycle states.

````typescript
/**
 * Container disposal state.
 *
 * ```
 * +--------+   dispose()   +-----------+   complete   +----------+
 * | active | ------------> | disposing | -----------> | disposed |
 * +--------+               +-----------+              +----------+
 *     |                         |                          |
 *     | resolve() works         | resolve() throws         | resolve() throws
 *     | createScope() works     | createScope() throws     | createScope() throws
 * ```
 *
 * @remarks
 * - `'disposing'` emitted synchronously when dispose() called
 * - `'disposed'` emitted after all async finalization completes
 * - Scopes can subscribe to disposal events for reactive cleanup
 */
export type ScopeDisposalState = "active" | "disposing" | "disposed";
````

---

## 5. Integration Points with Existing Runtime

### 5.1 Where Type-Safe Overrides Integrate

```
packages/runtime/src/
+-- types.ts                          # Add TypeSafeOverrideMap type
+-- container/
|   +-- base-impl.ts                  # withOverrides uses new type
|   +-- override-context.ts           # No changes (internal string keys)
|   +-- wrappers.ts                   # Forward typed overrides
```

### 5.2 Where Performance Changes Integrate

```
packages/runtime/src/
+-- util/
|   +-- memo-map.ts                   # Configurable timestamps
+-- container/
    +-- internal/
        +-- lifecycle-manager.ts      # Map for child containers
```

### 5.3 Where Testing Utilities Integrate

```
packages/runtime/tests/
+-- resolution-hooks.test.ts          # New: comprehensive hook tests
+-- hooks-composition.test.ts         # New: multi-hook scenarios
+-- plugins/
    +-- hooks-plugin.test.ts          # New: HOOKS_ACCESS testing
    +-- inspector-plugin.test.ts      # New: inspector API tests
    +-- tracer-plugin.test.ts         # New: tracer API tests
```

---

## 6. What NOT to Do

### 6.1 Avoid WeakMap for Child Containers

**Why:** WeakMap doesn't support iteration, making LIFO disposal impossible.

### 6.2 Avoid Runtime Type Checks for Override Keys

**Why:** Type safety should be compile-time only. Adding runtime validation:

- Adds overhead to every withOverrides call
- Duplicates what TypeScript already enforces
- Creates maintenance burden for keeping types/runtime in sync

### 6.3 Avoid Breaking the String-Keyed Internal API

**Why:** The internal `OverrideFactoryMap` works with string keys because:

- Port names are stable runtime identifiers
- O(1) Map lookup by string is efficient
- Changing this would cascade through resolution logic

Type safety is added at the public API boundary, not internally.

### 6.4 Avoid Over-Documenting Implementation Details

**Why:** Documentation should focus on:

- What the type does (behavior)
- When to use it (examples)
- Why it's designed this way (rationale)

NOT:

- How the implementation works (changes)
- Internal type manipulation tricks (confusing)

---

## 7. Sources and Confidence

| Topic                       | Source                              | Confidence |
| --------------------------- | ----------------------------------- | ---------- |
| Mapped type patterns        | TypeScript handbook, project usage  | HIGH       |
| Map iteration order         | ECMAScript 2015 spec                | HIGH       |
| Hook testing patterns       | Vitest docs, existing test patterns | HIGH       |
| JSDoc @typeParam            | TypeScript JSDoc reference          | HIGH       |
| Performance characteristics | V8 engine documentation             | MEDIUM     |
| Timestamp elision benefit   | Hypothesis (needs benchmarking)     | LOW        |

---

## 8. Summary Recommendations

| Area                 | Pattern                   | Confidence | Implementation Effort  |
| -------------------- | ------------------------- | ---------- | ---------------------- |
| Type-safe overrides  | Mapped types              | HIGH       | Low (type change only) |
| Child container O(1) | Map with string keys      | HIGH       | Low (~20 lines)        |
| Timestamp elision    | Configurable option       | MEDIUM     | Low (~10 lines)        |
| Hook testing         | Context assertion helpers | HIGH       | Medium (new test file) |
| Type documentation   | @typeParam + examples     | HIGH       | Medium (documentation) |

**Proceed with all patterns. Low implementation risk, high value.**
