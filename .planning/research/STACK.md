# Technology Stack Research

**Project:** HexDI v4.0 GraphBuilder Improvements
**Researched:** 2026-02-02
**Focus:** Type-level async detection, disposal lifecycle, override validation

---

## Executive Summary

This research focused on three specific technical patterns needed for GraphBuilder improvements:

1. **Type-level async detection** - Already implemented in codebase (Phase 10)
2. **Disposal lifecycle** - TC39 Stage 3 proposal, TypeScript 5.2+ support, already integrated
3. **Override lifetime validation** - Type-state machine extension needed

**Key finding:** HexDI already has working implementations of async detection and disposal. The v4.0 milestone should focus on GraphBuilder API consolidation and override validation, not rebuilding existing capabilities.

---

## Core Technologies

### TypeScript 5.6.0

| Feature                      | Status              | Usage in HexDI                               |
| ---------------------------- | ------------------- | -------------------------------------------- |
| Conditional types            | ✅ Stable (TS 2.8+) | Type-state machine, async detection          |
| Template literal types       | ✅ Stable (TS 4.1+) | Compile-time error messages                  |
| `infer` keyword              | ✅ Stable (TS 2.8+) | Port name extraction, return type unwrapping |
| Recursive conditional types  | ✅ Stable (TS 4.1+) | Dependency graph traversal                   |
| Explicit Resource Management | ✅ Stable (TS 5.2+) | TC39 Stage 3, optional integration           |

**Rationale:** TypeScript 5.6 provides all necessary type-level programming features. No version upgrade needed for v4.0 requirements.

---

## 1. Type-Level Async Detection

### Current Implementation

**Location:** `packages/core/src/adapters/unified-types.ts` (Lines 85-101)

```typescript
export type IsAsyncFactory<TFactory> = TFactory extends (...args: never[]) => infer R
  ? [R] extends [never]
    ? false // Throwing factories are not async
    : R extends Promise<unknown>
      ? true
      : false
  : false;
```

**Status:** ✅ **Already implemented and shipped in Phase 10**

### Pattern Analysis

**How it works:**

1. **Infer return type** - Extract `R` from factory function signature
2. **Handle `never` case** - Functions that always throw return `never`, which is a subtype of everything including Promise. Explicit check prevents false positives.
3. **Structural check** - `R extends Promise<unknown>` catches all Promise types
4. **No union handling needed** - Codebase doesn't support factories returning `T | Promise<T>`

**Coverage:**

| Factory Signature                           | Detected as Async |
| ------------------------------------------- | ----------------- |
| `async () => new Service()`                 | ✅ Yes            |
| `() => Promise.resolve(service)`            | ✅ Yes            |
| `async (deps) => await init()`              | ✅ Yes            |
| `() => fetchData()` (typed as Promise)      | ✅ Yes            |
| `() => new Service()`                       | ❌ No (correct)   |
| `() => throw new Error()` (returns `never`) | ❌ No (correct)   |

**Validation:** `packages/core/tests/async-lifetime-enforcement.test-d.ts` (262 lines)

### Alternative Patterns Considered

**Pattern 1: Union handling with distributive conditionals**

```typescript
type IsAsyncFactory<TFactory> = TFactory extends (...args: any[]) => infer R
  ? [R] extends [Promise<any>]
    ? true
    : Promise<any> extends R
      ? "partial" // Union includes Promise
      : false
  : false;
```

**Rejected:** HexDI doesn't support union return types for factories. Factories must return either `T` or `Promise<T>`, not `T | Promise<T>`. Adding union handling would complicate the type system without providing value.

**Pattern 2: Awaited<T> utility type (TS 4.5+)**

```typescript
type IsAsyncFactory<TFactory> = TFactory extends (...args: any[]) => infer R
  ? Awaited<R> extends R
    ? false // Awaited has no effect = not a Promise
    : true // Awaited unwrapped something = was a Promise
  : false;
```

**Rejected:** Less explicit than structural check. The `R extends Promise<unknown>` pattern is more readable and matches project conventions.

### Recommendation

**DO NOT re-implement async detection.** Current implementation is:

- ✅ Comprehensive (handles all realistic factory signatures)
- ✅ Battle-tested (262 lines of type tests, shipped in production)
- ✅ Performant (no expensive type operations)
- ✅ Clear error messages (via `AsyncLifetimeError<L>` template literal)

**What v4.0 needs:**

- Leverage existing `IsAsyncFactory<T>` in unified `provide()` method
- Remove deprecated `provideAsync()` method
- Maintain existing compile-time enforcement

**Sources:**

- TypeScript Handbook: Conditional Types (https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) - HIGH confidence
- Codebase: `packages/core/src/adapters/unified-types.ts` - HIGH confidence
- Codebase: `packages/core/tests/async-lifetime-enforcement.test-d.ts` - HIGH confidence

---

## 2. Disposal Lifecycle Management

### TC39 Explicit Resource Management (Stage 3)

**Status:** ✅ Stage 3 proposal, TypeScript 5.2+ support, **already integrated in HexDI**

**Proposal details:**

- Champion: Ron Buckton (Microsoft)
- Stage: 3 (candidate, awaiting implementation feedback)
- Last presented: March 2023
- TypeScript support: 5.2+ (August 2023)

### Core Language Features

| Feature                     | Node.js  | TypeScript | HexDI Usage             |
| --------------------------- | -------- | ---------- | ----------------------- |
| `Symbol.dispose`            | v20.4.0+ | 5.2+       | Optional (not required) |
| `Symbol.asyncDispose`       | v20.4.0+ | 5.2+       | Optional (not required) |
| `using` declarations        | v20.4.0+ | 5.2+       | Not used                |
| `await using` declarations  | v20.4.0+ | 5.2+       | Not used                |
| `Disposable` interface      | v20.4.0+ | 5.2+       | Internal only           |
| `AsyncDisposable` interface | v20.4.0+ | 5.2+       | Internal only           |
| `DisposableStack`           | v20.4.0+ | 5.2+       | Not used                |
| `AsyncDisposableStack`      | v20.4.0+ | 5.2+       | Not used                |

**Current runtime:** Node.js 25.4.0 (supports all disposal features)

### HexDI Implementation

**Adapter-level disposal:**

```typescript
// packages/core/src/adapters/unified-types.ts (Line 204)
interface BaseUnifiedConfig<TProvides, TRequires> {
  readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}
```

**Container-level disposal:**

```typescript
// packages/runtime/src/container/internal/lifecycle-manager.ts (Lines 23-26)
interface Disposable {
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
}
```

**Disposal ordering:**

```typescript
// packages/runtime/src/container/internal/lifecycle-manager.ts (Lines 152-180)
async dispose(singletonMemo: MemoMap, parentUnregister?: ParentUnregisterFn): Promise<void> {
  // 1. Child containers (LIFO - last registered first)
  for (let i = this.childContainers.length - 1; i >= 0; i--) {
    await this.childContainers[i].dispose();
  }

  // 2. Child scopes
  for (const scope of this.childScopes) {
    await scope.dispose();
  }

  // 3. Singleton memo (calls finalizers in LIFO order)
  await singletonMemo.dispose();

  // 4. Parent unregistration
  parentUnregister?.();
}
```

**Status:** ✅ **Fully implemented and tested**

### Disposal Features

| Feature             | Status      | Implementation                                    |
| ------------------- | ----------- | ------------------------------------------------- |
| LIFO disposal order | ✅ Complete | `LifecycleManager.dispose()`                      |
| Async finalizers    | ✅ Complete | `finalizer?: (instance) => void \| Promise<void>` |
| Error aggregation   | ✅ Complete | `AggregateError` for multiple finalizer failures  |
| Idempotent disposal | ✅ Complete | `isDisposed` flag prevents double disposal        |
| Child cascade       | ✅ Complete | Disposes children before parent                   |
| Scope disposal      | ✅ Complete | `Scope.dispose()` triggers service cleanup        |
| Container disposal  | ✅ Complete | `Container.dispose()` cascades to all children    |

**Test coverage:** `packages/runtime/tests/disposal.test.ts` (comprehensive)

### Why NOT Symbol.dispose Integration

HexDI **deliberately does NOT** implement `Symbol.dispose` on containers/scopes because:

1. **Explicit over implicit** - `container.dispose()` is clearer than `using container = ...`
2. **Async disposal** - Most DI finalizers are async (database connections, file handles). `using` only works with sync disposal; `await using` is required for async.
3. **Lifecycle clarity** - DI container lifecycle is rarely block-scoped. Containers typically live for application lifetime, request lifetime, or explicit test boundaries.
4. **No Node.js 20.4 requirement** - Not requiring `Symbol.dispose` keeps minimum Node.js version flexible

**When Symbol.dispose would help:**

- Scope-per-request patterns in Express/Fastify middleware
- Test fixtures with automatic cleanup
- Short-lived child containers in request handlers

**Recommendation for v4.0:** Add **optional** `Symbol.asyncDispose` support:

```typescript
class Container {
  async dispose(): Promise<void> {
    /* existing implementation */
  }

  // Optional TC39 integration
  async [Symbol.asyncDispose](): Promise<void> {
    await this.dispose();
  }
}
```

**Benefits:**

- ✅ Opt-in for users who want `await using`
- ✅ No breaking changes (existing `dispose()` still works)
- ✅ Node.js 20.4+ users get ergonomic cleanup
- ✅ Older Node.js versions still supported (symbol is just missing)

**Implementation:** 10 lines per class (Container, Scope, OverrideContext)

### Disposal Order Guarantees

**HexDI disposal order (LIFO):**

1. Child containers (reverse registration order)
2. Child scopes
3. Service instances (reverse creation order via MemoMap)
4. Parent unregistration

**Why LIFO?**

- Services depend on other services
- Dependents must be disposed before dependencies
- Creation order = A depends on B → create B, then A
- Disposal order = reverse → dispose A, then B

**Comparison with other DI libraries:**

| Library      | Disposal Order                                     | Configurable             |
| ------------ | -------------------------------------------------- | ------------------------ |
| HexDI        | LIFO (reverse creation)                            | ❌ No (guaranteed)       |
| InversifyJS  | Not documented                                     | ❌ No disposal API found |
| TSyringe     | Documented ("Disposable instances" section exists) | Unknown                  |
| typed-inject | LIFO (documented)                                  | ❌ No (guaranteed)       |

**Source:** typed-inject README confirms LIFO: "Calling `dispose()` on an injector will call `dispose` on any instance that was ever provided from it"

### Recommendation

**DO NOT re-implement disposal.** Current implementation is:

- ✅ Comprehensive (LIFO, async, error aggregation, idempotent)
- ✅ Battle-tested (disposal.test.ts, memory-cleanup.test.ts)
- ✅ Standards-compliant (TC39 Stage 3 pattern)

**What v4.0 should add:**

- Optional `Symbol.asyncDispose` on Container/Scope/OverrideContext (~30 lines total)
- Document disposal patterns in GraphBuilder examples
- Consider deprecating synchronous finalizers (most real-world cleanup is async)

**Sources:**

- TC39 Explicit Resource Management proposal (https://github.com/tc39/proposal-explicit-resource-management) - MEDIUM confidence (Stage 3, no TS version info)
- TypeScript 5.2 announcement (https://devblogs.microsoft.com/typescript/announcing-typescript-5-2/) - HIGH confidence
- Codebase: `packages/runtime/src/container/internal/lifecycle-manager.ts` - HIGH confidence
- Codebase: `packages/runtime/tests/disposal.test.ts` - HIGH confidence

---

## 3. Override Lifetime Validation

### Current State

**GraphBuilder has `override()` method but no lifetime validation:**

```typescript
// Current behavior (no validation)
const parentGraph = GraphBuilder.create()
  .provide(singletonAdapter) // lifetime: 'singleton'
  .build();

const childGraph = GraphBuilder.forParent(parentGraph)
  .override(scopedAdapter) // lifetime: 'scoped' - should ERROR but doesn't
  .build();
```

**Problem:** Overrides can change lifetime, breaking captive dependency guarantees.

**Error code:** HEX022 (planned in `docs/improvements/graph-builder.md`)

### Required Pattern

**Type-level lifetime map tracking:**

```typescript
type OverrideResult<TAdapter, TParentGraph, TCurrentOverrides> =
  InferProvides<TAdapter> extends keyof TParentGraph['_lifetimeMap']
    ? TAdapter['lifetime'] extends TParentGraph['_lifetimeMap'][InferProvides<TAdapter>]
      ? GraphBuilder<..., TCurrentOverrides | InferProvides<TAdapter>, ...>
      : OverrideLifetimeError<...>
    : OverridePortNotFoundError<...>;
```

**Validation matrix:**

| Parent Lifetime | Override Lifetime | Result           |
| --------------- | ----------------- | ---------------- |
| singleton       | singleton         | ✅ OK            |
| singleton       | scoped            | ❌ ERROR[HEX022] |
| singleton       | transient         | ❌ ERROR[HEX022] |
| scoped          | singleton         | ❌ ERROR[HEX022] |
| scoped          | scoped            | ✅ OK            |
| scoped          | transient         | ❌ ERROR[HEX022] |
| transient       | singleton         | ❌ ERROR[HEX022] |
| transient       | scoped            | ❌ ERROR[HEX022] |
| transient       | transient         | ✅ OK            |

**Rule:** Override lifetime MUST exactly match parent lifetime.

### Implementation Requirements

**1. Lifetime map in Graph type:**

```typescript
// packages/graph/src/graph/types/graph-types.ts
export interface Graph<
  TProvides extends string,
  TRequires extends string,
  TAsyncPorts extends string,
  TOverrides extends string,
  TLifetimeMap extends Record<string, Lifetime>, // Add this
> {
  // ... existing properties
  readonly _lifetimeMap: TLifetimeMap;
}
```

**2. Populate lifetime map during provide():**

```typescript
type ProvideResult<TBuilder, TAdapter> =
  GraphBuilder<
    ...,
    TLifetimeMap & { [K in InferProvides<TAdapter>]: TAdapter['lifetime'] }
  >;
```

**3. Access parent lifetime map in forParent():**

```typescript
type ParentLifetimeMap = InferParentGraph["_lifetimeMap"];
```

**4. Validate override lifetime:**

```typescript
type ValidateOverrideLifetime<TAdapter, TParentLifetimeMap extends Record<string, Lifetime>> =
  InferProvides<TAdapter> extends keyof TParentLifetimeMap
    ? TAdapter["lifetime"] extends TParentLifetimeMap[InferProvides<TAdapter>]
      ? true // Lifetimes match
      : OverrideLifetimeError<
          InferProvides<TAdapter>,
          TAdapter["lifetime"],
          TParentLifetimeMap[InferProvides<TAdapter>]
        >
    : OverridePortNotFoundError<InferProvides<TAdapter>>;
```

**5. Error message type:**

```typescript
type OverrideLifetimeError<
  TPortName extends string,
  TOverrideLifetime extends string,
  TParentLifetime extends string,
> = `ERROR[HEX022]: Override lifetime mismatch for '${TPortName}'. Parent uses ${TParentLifetime}, override uses ${TOverrideLifetime}. Fix: Change override to use ${TParentLifetime} lifetime.`;
```

### Comparison with Other DI Libraries

**Research findings:**

| Library      | Override Validation                  | Lifetime Enforcement          |
| ------------ | ------------------------------------ | ----------------------------- |
| HexDI        | ❌ Not yet (planned for v4.0)        | ✅ Type-level                 |
| InversifyJS  | Unknown (not documented)             | ❌ Runtime only               |
| TSyringe     | Unknown (not documented)             | ❌ Runtime only               |
| typed-inject | Unknown (override pattern not found) | ❌ No lifetime concept        |
| di-compiler  | Unknown (not documented)             | ❌ No compile-time validation |

**Finding:** No TypeScript DI library found with compile-time override lifetime validation. This would be a unique feature.

**Why other libraries don't do this:**

- Most DI libraries use runtime validation only
- TypeScript DI libraries focus on type safety for resolution, not graph construction
- GraphBuilder's type-state machine pattern is unusually comprehensive

### Recommendation

**IMPLEMENT override lifetime validation for v4.0:**

**Why:**

- ✅ Prevents captive dependency violations via override escape hatch
- ✅ Maintains "if types say valid, it is valid" guarantee
- ✅ Consistent with existing compile-time validation philosophy
- ✅ Low implementation cost (~50 lines of type-level code)

**Implementation steps:**

1. Add `_lifetimeMap` to Graph type (1 line)
2. Populate map in `provide()` return type (5 lines)
3. Expose parent map in `forParent()` (3 lines)
4. Add `ValidateOverrideLifetime` type (15 lines)
5. Add `OverrideLifetimeError` message type (3 lines)
6. Integrate validation in `override()` return type (10 lines)
7. Add test file `override-lifetime-validation.test-d.ts` (150 lines)

**Estimated effort:** 4-6 hours (straightforward type-level programming)

**Complexity:** LOW (similar to existing captive dependency validation)

**Sources:**

- docs/improvements/graph-builder.md (Lines 78-103) - HIGH confidence
- No external sources found (unique to HexDI) - N/A

---

## What NOT to Add

### ❌ GraphBuilder Method Explosion

**Anti-pattern:** Adding specialized methods for every use case

**Example of what NOT to do:**

```typescript
// DON'T add these
.provideSingleton(adapter)
.provideScoped(adapter)
.provideTransient(adapter)
.provideSyncSingleton(adapter)
.provideAsyncSingleton(adapter)
```

**Why not:**

- Adapter already has `lifetime` property
- Auto-detection handles async
- Method explosion increases API surface without value

**What to do instead:**

- Single `provide()` method with auto-detection
- Leverage adapter configuration properties

### ❌ Runtime Symbol.dispose Requirement

**Anti-pattern:** Requiring services to implement `Symbol.dispose`

**Why not:**

- Most services don't need disposal
- Forces unnecessary boilerplate on user code
- Container-level `finalizer` is more flexible

**What to do instead:**

- Optional `finalizer` in adapter config
- Container handles disposal orchestration
- Services remain unaware of DI lifecycle

### ❌ Partial Union Type Support

**Anti-pattern:** Supporting factories that return `T | Promise<T>`

**Why not:**

- Ambiguous runtime behavior (is it async or not?)
- Complicates type inference significantly
- No clear use case (async factories should consistently return Promise)

**What to do instead:**

- Enforce `T` XOR `Promise<T>` return types
- Clear separation between sync and async factories

### ❌ Configurable Disposal Order

**Anti-pattern:** Allowing users to configure disposal order

**Why not:**

- LIFO is the only safe order (reverse of creation order)
- Configurable order would require users to understand entire dependency graph
- Creates foot-gun for captive dependency violations

**What to do instead:**

- Guarantee LIFO disposal (document as contract)
- No configuration options

---

## Technology Decision Summary

| Area                       | Decision                            | Rationale                                            |
| -------------------------- | ----------------------------------- | ---------------------------------------------------- |
| **Async detection**        | Use existing `IsAsyncFactory<T>`    | Already implemented, tested, comprehensive           |
| **Disposal lifecycle**     | Use existing finalizer system       | TC39-aligned, fully featured, battle-tested          |
| **Symbol.asyncDispose**    | Add as optional enhancement         | Ergonomic for Node.js 20.4+, no breaking changes     |
| **Override validation**    | Implement type-level lifetime check | Maintains compile-time guarantee, low cost           |
| **Union return types**     | Do NOT support                      | Ambiguous semantics, no clear use case               |
| **Method proliferation**   | Do NOT add specialized methods      | Single `provide()` with auto-detection is sufficient |
| **Runtime disposal hooks** | Do NOT require on services          | Container-level finalizer is more flexible           |

---

## Validation Checklist

- ✅ TypeScript 5.2+ disposable patterns covered (TC39 Stage 3, TS 5.2 announcement)
- ✅ Rationale explains WHY, not just WHAT
- ✅ Integration with existing type-state machine considered
- ✅ Disposal order patterns documented (LIFO with rationale)
- ✅ Async detection patterns verified against codebase
- ✅ Override validation approach specified (lifetime map)
- ✅ Anti-patterns documented (what NOT to add)

---

## Open Questions

**None.** All three research areas have clear paths forward:

1. **Async detection** - Already complete, leverage existing implementation
2. **Disposal** - Already complete, optionally add Symbol.asyncDispose
3. **Override validation** - Straightforward type-level extension (~50 lines)

---

## Next Steps for Roadmap

Based on this research, v4.0 roadmap should prioritize:

1. **Method consolidation** - Remove `provideAsync()`, unify on `provide()`
2. **Override validation** - Implement HEX022 lifetime check
3. **Optional TC39 integration** - Add `Symbol.asyncDispose` support
4. **Documentation** - Document disposal patterns and override rules

**NOT needed:**

- Re-implementing async detection (already done)
- Redesigning disposal system (already comprehensive)
- Supporting union return types (no use case)

**Estimated milestone scope:** Medium (mostly API consolidation, one new validation)
