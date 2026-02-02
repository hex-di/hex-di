# Architecture Integration: v4.0 GraphBuilder Improvements

**Domain:** Dependency Injection type-state machine enhancement
**Researched:** 2026-02-02
**Milestone:** v4.0 GraphBuilder Improvements

## Executive Summary

This research analyzes how four new features integrate with HexDI's existing type-state machine architecture:

1. **Type-level async detection** - Integrates into `provide()` type signature via factory return type analysis
2. **Override lifetime validation** - Extends `override()` type chain with parent lifetime map access
3. **Bidirectional captive validation** - Requires new `TPendingConstraints` phantom type parameter in builder state
4. **Disposal lifecycle** - Belongs in **runtime container**, not graph builder (separation of concerns)

**Key Architectural Insight:** The type-state machine pattern enables compile-time validation by threading phantom type parameters through method chains. New features extend this pattern by adding validation steps to existing chains (async detection, override lifetime) or adding new state tracking (pending constraints).

**Critical Decision:** Disposal is a runtime concern (tracking instances, executing cleanup) while GraphBuilder handles compile-time validation (types, dependencies). Disposal belongs in `@hex-di/runtime` container, not `@hex-di/graph` builder.

---

## Integration Point 1: Type-Level Async Detection

### Current State

`provide()` and `provideAsync()` are separate methods:

```typescript
// packages/graph/src/builder/builder.ts:571-620
provide<A extends AdapterConstraint>(adapter: A):
  ProvideResultAllErrors<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>

provideAsync<A extends AdapterConstraint & { readonly factoryKind: "async" }>(adapter: A):
  ProvideAsyncResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>
```

Problem: User must manually choose correct method. Forgetting `provideAsync()` breaks initialization.

### Proposed Integration

Unify to single `provide()` that auto-detects async:

```typescript
// Location: packages/graph/src/builder/types/provide.ts
type IsAsyncFactory<TAdapter> =
  TAdapter extends { factory: infer TFactory }
    ? TFactory extends (...args: any[]) => infer TReturn
      ? [TReturn] extends [Promise<any>]
        ? true
        : Promise<any> extends TReturn
          ? true  // Union includes Promise
          : false
      : false
    : false;

type ProvideResultUnified<..., TAdapter> =
  IsAsyncFactory<TAdapter> extends true
    ? // Use ProvideAsyncResult logic (adds to TAsyncPorts)
      ProvideAsyncResultSuccess<...>
    : // Use regular ProvideResult logic
      ProvideResultSuccess<...>
```

### Type Flow

```
provide(adapter)
   ↓
InferAdapterFactory<A>
   ↓
IsAsyncFactory<Factory>  ← NEW: Promise return type check
   ↓ true               ↓ false
ProvideAsyncResult   ProvideResult
   ↓                    ↓
GraphBuilder<        GraphBuilder<
  ...,                 ...,
  TAsync | Port,       TAsync (unchanged),
  ...                  ...
>                     >
```

### Integration Points

| File                                          | Change                                             | Reason                     |
| --------------------------------------------- | -------------------------------------------------- | -------------------------- |
| `packages/graph/src/builder/types/provide.ts` | Add `IsAsyncFactory<T>` type                       | Promise return detection   |
| `packages/graph/src/builder/types/provide.ts` | Modify `ProvideResultAllErrors` to branch on async | Conditional async handling |
| `packages/graph/src/builder/builder.ts`       | Remove `provideAsync()` method                     | Replaced by auto-detection |

### Benefits

- DX: One method to learn, compiler guides correct usage
- Type Safety: Cannot forget async marking (inferred from types)
- Consistency: All adapters use same `provide()` API

### Risks

- **Type inference ambiguity:** If factory returns `Promise<T> | T`, treated as async (safe choice)
- **Migration burden:** Existing `provideAsync()` calls need replacement

---

## Integration Point 2: Override Lifetime Validation

### Current State

`override()` validates port existence but not lifetime match:

```typescript
// packages/graph/src/builder/types/merge.ts:773-810
export type OverrideResult<..., TAdapter> =
  IsExactlyUnknown<GetParentProvides<TInternalState>> extends true
    ? OverrideWithoutParentErrorMessage
    : ExtractPortNamesFromUnion<InferAdapterProvides<TAdapter>> extends
        ExtractPortNamesFromUnion<GetParentProvides<TInternalState>>
      ? IsPortTypeCompatible<...> extends true
        ? ProvideResult<...>  // ← No lifetime check here
        : OverrideTypeMismatchError<...>
      : InvalidOverrideErrorWithAvailable<...>
```

Problem: Singleton override can replace scoped parent, breaking lifetime assumptions.

### Proposed Integration

Add lifetime validation after port type check:

```typescript
// Location: packages/graph/src/builder/types/merge.ts (extend OverrideResult)
type GetParentPortLifetime<TInternalState, TPortName> =
  GetLifetimeMap<TInternalState>[TPortName & keyof GetLifetimeMap<TInternalState>];

type OverrideResult<..., TAdapter> =
  IsExactlyUnknown<GetParentProvides<TInternalState>> extends true
    ? OverrideWithoutParentErrorMessage
    : ExtractPortNamesFromUnion<InferAdapterProvides<TAdapter>> extends infer TPortName
      ? TPortName extends ExtractPortNamesFromUnion<GetParentProvides<TInternalState>>
        ? IsPortTypeCompatible<...> extends true
          ? // NEW: Validate lifetime match
            DirectAdapterLifetime<TAdapter> extends GetParentPortLifetime<TInternalState, TPortName>
              ? ProvideResult<...>
              : OverrideLifetimeMismatchError<TPortName, DirectAdapterLifetime<TAdapter>, ...>
          : OverrideTypeMismatchError<...>
        : InvalidOverrideErrorWithAvailable<...>
      : never;
```

### Data Flow

```
.override(adapter)
   ↓
InferAdapterProvides<A> → TPortName
   ↓
GetParentProvides<TInternalState> → Does port exist?
   ↓ yes
GetLifetimeMap<TInternalState>[TPortName] → Parent lifetime
   ↓
DirectAdapterLifetime<A> → Override lifetime
   ↓
Compare: Match required → GraphBuilder | Error
```

### Integration Points

| Component           | Access Method                        | Purpose                     |
| ------------------- | ------------------------------------ | --------------------------- |
| Parent lifetime map | `GetLifetimeMap<TInternalState>`     | Lookup parent port lifetime |
| Override lifetime   | `DirectAdapterLifetime<TAdapter>`    | Extract override's lifetime |
| Validation logic    | Conditional in `OverrideResult`      | Enforce exact match         |
| Error type          | `OverrideLifetimeMismatchError<...>` | HEX022 error message        |

### Validation Matrix

| Parent    | Override  | Result   |
| --------- | --------- | -------- |
| singleton | singleton | ✓ Pass   |
| singleton | scoped    | ✗ HEX022 |
| singleton | transient | ✗ HEX022 |
| scoped    | scoped    | ✓ Pass   |
| transient | transient | ✓ Pass   |

### Why Exact Match Required

**Stricter than captive validation:** Captive allows dependent > dependency (transient can depend on singleton). Overrides require **exact equality** because:

1. **Substitution principle:** Override replaces parent adapter 1:1
2. **Container scope assumptions:** Parent container allocated singleton slots based on original lifetime
3. **Memory safety:** Changing singleton → scoped breaks parent's singleton memo invariants

---

## Integration Point 3: Bidirectional Captive Validation

### Current Problem

Forward references bypass compile-time captive validation:

```typescript
// This SHOULD error but doesn't
GraphBuilder.create()
  .provide(
    createAdapter({
      // Singleton depends on ScopedPort (not yet provided)
      provides: SingletonPort,
      requires: [ScopedPort],
      lifetime: "singleton",
      factory: deps => new SingletonService(deps.ScopedPort),
    })
  )
  .provide(
    createAdapter({
      // ScopedPort provided later
      provides: ScopedPort,
      lifetime: "scoped",
      factory: () => new ScopedService(),
    })
  )
  .build(); // ← Should error: Singleton captures Scoped
```

Current state only validates `SingletonAdapter`'s requirements against **already-provided** ports. When `ScopedPort` is not yet in `TLifetimeMap`, no captive check occurs.

### Architecture Challenge

Type-state machine processes adapters **sequentially** (each `provide()` returns new builder). Cannot "look ahead" to future ports.

### Solution: Pending Constraints

Track constraints that couldn't be validated yet:

```typescript
// NEW phantom type parameter in BuilderInternals
interface BuilderInternals<
  TDepGraph,
  TLifetimeMap,
  TParentProvides,
  TMaxDepth,
  TUnsafeDepthOverride,
  TDepthExceededWarning,
  TUncheckedUsed,
  TPendingConstraints = never, // ← NEW
> {
  readonly depGraph: TDepGraph;
  readonly lifetimeMap: TLifetimeMap;
  readonly parentProvides: TParentProvides;
  readonly maxDepth: TMaxDepth;
  readonly unsafeDepthOverride: TUnsafeDepthOverride;
  readonly depthExceededWarning: TDepthExceededWarning;
  readonly uncheckedUsed: TUncheckedUsed;
  readonly pendingConstraints: TPendingConstraints; // ← NEW
}
```

### Data Structure

```typescript
type PendingConstraint = {
  dependentPort: string; // "SingletonPort"
  dependentLifetime: Lifetime; // "singleton"
  requiredPort: string; // "ScopedPort"
};

// Stored as union type in builder state
type TPendingConstraints =
  | PendingConstraint<"SingletonPort", "singleton", "ScopedPort">
  | PendingConstraint<"UserService", "scoped", "TransientPort">
  | never; // Empty state
```

### Integration into Provide Chain

```typescript
// packages/graph/src/builder/types/provide.ts (extend validation)

// Step 3.5 (NEW): Check pending constraints when port is provided
type CheckPendingConstraints<TProvides, ..., TAdapter> =
  FilterPendingForPort<
    GetPendingConstraints<TInternalState>,
    InferAdapterProvides<TAdapter>
  > extends infer TRelevantConstraints
    ? TRelevantConstraints extends PendingConstraint<infer TDepPort, infer TDepLifetime, any>
      ? // Found constraint: dependent=TDepPort requires this port
        LifetimeLevel<DirectAdapterLifetime<TAdapter>> extends LifetimeLevel<TDepLifetime>
          ? // OK: This port's lifetime >= dependent's lifetime
            RemoveConstraint<TInternalState, TRelevantConstraints>  // Remove satisfied constraint
          : // ERROR: Captive violation (dependent captures this port)
            CaptiveErrorMessage<TDepPort, TDepLifetime, AdapterProvidesName<TAdapter>, ...>
      : // No relevant constraints
        TInternalState
    : TInternalState;

// Step 3.6 (NEW): Add pending constraints for unsatisfied requirements
type AddPendingConstraintsForRequirements<TProvides, TInternalState, TAdapter> =
  AdapterRequiresNames<TAdapter> extends infer TReqs
    ? TReqs extends never
      ? TInternalState  // No requirements
      : Exclude<TReqs, ExtractPortNamesFromProvides<TProvides>> extends infer TUnsatisfied
        ? TUnsatisfied extends never
          ? TInternalState  // All requirements satisfied
          : // Create constraints for unsatisfied requirements
            WithPendingConstraints<
              TInternalState,
              CreateConstraints<
                AdapterProvidesName<TAdapter>,
                DirectAdapterLifetime<TAdapter>,
                TUnsatisfied
              >
            >
        : TInternalState
    : TInternalState;
```

### Validation Flow

```
provide(SingletonAdapter requiring ScopedPort)
   ↓
Step 1-3: Normal validation (duplicate, cycle, captive against TLifetimeMap)
   ↓
Step 3.5 (NEW): Check if this port satisfies any pending constraints
   TLifetimeMap['ScopedPort'] = undefined → No pending check
   ↓
Step 3.6 (NEW): Create pending constraint for ScopedPort
   TPendingConstraints = { dependentPort: "Singleton", dependentLifetime: "singleton", requiredPort: "ScopedPort" }
   ↓
Return: GraphBuilder<..., TPendingConstraints>

provide(ScopedAdapter)
   ↓
Step 1-3: Normal validation
   ↓
Step 3.5 (NEW): Check pending constraints for "ScopedPort"
   Found: { dependentPort: "Singleton", dependentLifetime: "singleton", requiredPort: "ScopedPort" }
   Validate: LifetimeLevel<"scoped"> (2) <= LifetimeLevel<"singleton"> (1)?
   2 <= 1? NO → ERROR[HEX003]: Captive dependency
```

### Integration Points

| Component          | Location                                         | Change                               |
| ------------------ | ------------------------------------------------ | ------------------------------------ |
| Builder state      | `packages/graph/src/builder/types/state.ts`      | Add `TPendingConstraints` parameter  |
| Provide validation | `packages/graph/src/builder/types/provide.ts`    | Add Steps 3.5, 3.6                   |
| Constraint types   | `packages/graph/src/validation/types/captive.ts` | Define `PendingConstraint`, helpers  |
| Error messages     | `packages/graph/src/validation/types/errors.ts`  | Reuse existing `CaptiveErrorMessage` |

### Merge Behavior

When merging graphs with pending constraints:

```typescript
type UnifiedMergeInternals<T1, T2, ...> = BuilderInternals<
  TMergedDepGraph,
  TMergedLifetimeMap,
  MergeParentProvides<...>,
  TResolvedMaxDepth,
  BoolOr<...>,
  GetDepthExceededWarning<T1> | GetDepthExceededWarning<T2>,
  BoolOr<...>,
  GetPendingConstraints<T1> | GetPendingConstraints<T2>  // ← Union pending constraints
>;
```

Merged graph inherits constraints from both, validated when ports provided.

### Complexity Analysis

| Operation              | Current                       | With Pending Constraints                           |
| ---------------------- | ----------------------------- | -------------------------------------------------- |
| Provide single adapter | O(requirements × lifetimeMap) | O(requirements × lifetimeMap + pendingConstraints) |
| Build graph            | O(1) validation               | O(1) validation (pending must be empty)            |
| Merge graphs           | O(1) state copy               | O(1) state copy (union constraints)                |

**Impact:** Minimal - pending constraints stored as union type, checked via pattern matching.

---

## Integration Point 4: Disposal Lifecycle

### Architecture Decision: Runtime vs Compile-Time

**Question:** Where does disposal belong?

| Concern               | Graph Builder               | Runtime Container             |
| --------------------- | --------------------------- | ----------------------------- |
| Tracks instances      | ✗ No instances              | ✓ MemoMap stores instances    |
| Executes cleanup      | ✗ No runtime behavior       | ✓ Orchestrates async disposal |
| Knows creation order  | ✗ Only adapter order        | ✓ Tracks instantiation order  |
| Type-level validation | ✓ Validates graph structure | ✗ Runtime only                |

**Decision:** Disposal belongs in **`@hex-di/runtime` container**, not `@hex-di/graph` builder.

### Current Runtime Architecture

```typescript
// packages/runtime/src/container/internal/lifecycle-manager.ts:62-217
export class LifecycleManager {
  private readonly childScopes: Set<Disposable> = new Set();
  private readonly childContainers: Disposable[] = [];
  private disposed: boolean = false;

  async dispose(singletonMemo: MemoMap, parentUnregister?: ParentUnregisterFn): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;

    // Dispose child containers in LIFO order
    for (let i = this.childContainers.length - 1; i >= 0; i--) {
      await this.childContainers[i].dispose();
    }

    // Dispose child scopes
    for (const scope of this.childScopes) {
      await scope.dispose();
    }

    // Dispose singleton memo (CURRENT: just clears map)
    await singletonMemo.dispose();

    // Unregister from parent
    parentUnregister?.();
  }
}
```

**Gap:** `MemoMap.dispose()` currently just clears the map. Needs to invoke adapter `dispose()` functions.

### Proposed Integration

#### 1. Extend Adapter Interface (Graph Package)

```typescript
// packages/graph/src/adapter/types.ts (type-level only)
export interface AdapterConstraint {
  readonly provides: PortConstraint;
  readonly requires: PortConstraint | readonly PortConstraint[];
  readonly lifetime: Lifetime;
  readonly factory: (...args: any[]) => any;
  readonly dispose?: (instance: any) => void | Promise<void>; // ← NEW (optional)
}
```

Type-level only - no runtime validation in graph builder.

#### 2. Extend MemoMap (Runtime Package)

```typescript
// packages/runtime/src/util/memo-map.ts (extend existing class)
export class MemoMap {
  private readonly memo: Map<string, unknown> = new Map();
  private readonly disposers: Map<string, (instance: unknown) => void | Promise<void>> = new Map(); // ← NEW
  private readonly creationOrder: string[] = []; // ← NEW

  set(key: string, value: unknown, disposer?: (instance: unknown) => void | Promise<void>): void {
    this.memo.set(key, value);
    if (disposer !== undefined) {
      this.disposers.set(key, disposer);
    }
    this.creationOrder.push(key); // Track order
  }

  async dispose(): Promise<void> {
    // LIFO disposal (reverse of creation order)
    for (let i = this.creationOrder.length - 1; i >= 0; i--) {
      const key = this.creationOrder[i];
      const instance = this.memo.get(key);
      const disposer = this.disposers.get(key);

      if (disposer !== undefined && instance !== undefined) {
        await disposer(instance);
      }
    }

    this.memo.clear();
    this.disposers.clear();
    this.creationOrder.length = 0;
  }
}
```

#### 3. Update Resolution Engine (Runtime Package)

```typescript
// packages/runtime/src/resolution/engine.ts (extend existing)
function resolveInstance(adapter: RuntimeAdapter, deps: ResolvedDeps): unknown {
  const instance = adapter.factory(deps);

  // Store in memo with disposer
  if (adapter.lifetime === "singleton") {
    container.singletonMemo.set(
      adapter.provides.__portName,
      instance,
      adapter.dispose // ← Pass dispose function
    );
  } else if (adapter.lifetime === "scoped") {
    scope.scopedMemo.set(
      adapter.provides.__portName,
      instance,
      adapter.dispose // ← Pass dispose function
    );
  }
  // Transient: no memoization, no disposal tracking

  return instance;
}
```

### Data Flow: Creation to Disposal

```
1. Graph Build (Compile-Time)
   GraphBuilder.create()
     .provide(createAdapter({
       provides: DatabasePort,
       lifetime: 'singleton',
       factory: () => new Database(),
       dispose: (db) => db.close()  // ← Type-checked, stored in adapter
     }))
     .build()
   ↓
   Graph<DatabasePort, never> (adapter.dispose captured)

2. Container Creation (Runtime)
   createContainer(graph)
   ↓
   RootContainerImpl with LifecycleManager

3. Instance Resolution (Runtime)
   container.resolve(DatabasePort)
   ↓
   resolveInstance(adapter, deps)
   ↓
   instance = adapter.factory(deps)  // new Database()
   ↓
   singletonMemo.set(
     "Database",
     instance,
     adapter.dispose  // ← Store disposer
   )

4. Container Disposal (Runtime)
   await container.dispose()
   ↓
   lifecycleManager.dispose(singletonMemo, ...)
   ↓
   singletonMemo.dispose()
   ↓
   for (key in reverse(creationOrder)) {
     await disposer(instance)  // ← Invoke adapter.dispose(instance)
   }
```

### Guarantees

| Guarantee                                   | Implementation                        |
| ------------------------------------------- | ------------------------------------- |
| LIFO disposal order                         | `creationOrder.reverse()`             |
| Async disposal                              | `await disposer(instance)`            |
| Scope disposal before parent                | `lifecycleManager.dispose()` order    |
| Transient not disposed                      | No memo = no disposer tracking        |
| Container disposal before parent unregister | `lifecycleManager.dispose()` sequence |

### No Graph Builder Changes

Graph builder remains **pure type-level validation**:

- Does NOT validate `dispose()` function signature (runtime concern)
- Does NOT track disposal order (no instances)
- Does NOT change type state for disposal (orthogonal to dependencies)

Disposal is a **runtime container capability**, enabled by type-level adapter metadata.

---

## Component Architecture

### Layered Responsibility

```
┌─────────────────────────────────────────────────────────┐
│ @hex-di/graph                                            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ GraphBuilder<TProvides, TRequires, TAsyncPorts, ...>     │
│                                                           │
│ Responsibilities:                                         │
│ • Type-level dependency validation (cycles, captive)     │
│ • Compile-time error messages                            │
│ • Adapter metadata aggregation                           │
│ • Type-state machine (phantom parameters)                │
│                                                           │
│ NEW FEATURES (v4.0):                                      │
│ • Async detection (IsAsyncFactory<T>)                    │
│ • Override lifetime validation (exact match)             │
│ • Pending captive constraints (TPendingConstraints)      │
│ • Disposal metadata (adapter.dispose type-level)         │
└─────────────────────────────────────────────────────────┘
                            │
                            │ .build()
                            ▼
┌─────────────────────────────────────────────────────────┐
│ Graph<TProvides, TAsyncPorts>                            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Frozen adapter configuration array                        │
│ Passed to runtime for instantiation                       │
└─────────────────────────────────────────────────────────┘
                            │
                            │ createContainer(graph)
                            ▼
┌─────────────────────────────────────────────────────────┐
│ @hex-di/runtime                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ RootContainerImpl / ChildContainerImpl                   │
│                                                           │
│ Responsibilities:                                         │
│ • Dependency resolution (DFS traversal)                  │
│ • Instance memoization (MemoMap)                         │
│ • Scope lifecycle (createScope, scope.dispose)           │
│ • Child containers (createChildContainer)                │
│ • Async initialization (topological sort)                │
│                                                           │
│ NEW FEATURE (v4.0):                                       │
│ • Disposal orchestration (LIFO, async)                   │
│   - MemoMap tracks disposers                             │
│   - LifecycleManager executes disposal                   │
│   - Creation order determines disposal order             │
└─────────────────────────────────────────────────────────┘
```

### Separation Rationale

| Concern      | Graph (Compile-Time)           | Runtime (Runtime)             |
| ------------ | ------------------------------ | ----------------------------- |
| When         | TypeScript type-checking       | Application execution         |
| Data         | Type unions, mapped types      | Actual instances              |
| Errors       | Template literal types         | Thrown exceptions             |
| Validation   | Structural (cycles, lifetimes) | Behavioral (missing services) |
| Side Effects | None (pure types)              | Instantiation, disposal       |

**Why separation matters:** Mixing compile-time and runtime concerns leads to:

- Runtime overhead for type-level checks (defeating zero-cost abstractions)
- Type pollution (runtime details leaking into type signatures)
- Maintenance burden (changes cascade across layers)

---

## Build Order Analysis

### Dependency Graph for New Features

```
Feature 1: Async Detection
   ↓ No dependencies
   Safe to implement first

Feature 2: Override Lifetime Validation
   ↓ Depends on: Parent lifetime map access (already exists)
   Safe to implement independently

Feature 3: Bidirectional Captive Validation
   ↓ Requires: Builder state expansion (TPendingConstraints)
   ↓ Affects: All methods that return builder (provide, merge, override)
   High impact, implement carefully

Feature 4: Disposal Lifecycle
   ↓ Requires: Runtime MemoMap changes
   ↓ Requires: Resolution engine integration
   Independent of Features 1-3 (runtime vs compile-time)
```

### Suggested Implementation Order

**Phase 1: Type-Level Enhancements (Low Risk)**

1. Async detection (Feature 1)
   - Add `IsAsyncFactory<T>` utility
   - Branch `ProvideResult` based on async detection
   - Remove `provideAsync()` method
   - **Risk:** Low (self-contained type-level change)

2. Override lifetime validation (Feature 2)
   - Add lifetime check to `OverrideResult`
   - Define `OverrideLifetimeMismatchError`
   - **Risk:** Low (extends existing validation chain)

**Phase 2: State Machine Expansion (Medium Risk)** 3. Bidirectional captive validation (Feature 3)

- Add `TPendingConstraints` to `BuilderInternals`
- Extend `WithPendingConstraints` helpers
- Update `ProvideResult` validation chain
- Update `UnifiedMergeInternals` to merge constraints
- **Risk:** Medium (changes core builder state structure)

**Phase 3: Runtime Integration (Independent)** 4. Disposal lifecycle (Feature 4)

- Extend `AdapterConstraint` with optional `dispose`
- Add disposal tracking to `MemoMap`
- Update resolution engine to register disposers
- Extend `LifecycleManager.dispose()` to invoke disposers
- **Risk:** Medium (changes runtime behavior, async disposal)

### Cross-Feature Dependencies

```
Async Detection
   ↓
   └─ No dependencies

Override Lifetime Validation
   ↓
   └─ No dependencies (uses existing GetLifetimeMap)

Bidirectional Captive Validation
   ↓
   ├─ Requires: Builder state expansion (blocks all)
   └─ Extends: Captive validation types (reuse existing)

Disposal Lifecycle
   ↓
   └─ Independent (different package, runtime vs compile-time)
```

**Critical Path:** Feature 3 (Bidirectional Captive) blocks nothing but requires careful state design. Implement Phase 1-2 first to gain confidence, then tackle Phase 2 builder state expansion.

---

## Risk Analysis

### High Impact Changes

| Change                              | Impact Area                                                           | Mitigation                                             |
| ----------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| Add `TPendingConstraints` parameter | All builder type signatures, every `provide()` call, merge operations | Introduce as 8th parameter (preserves existing 7)      |
| Remove `provideAsync()`             | Public API surface                                                    | Provide codemod, clear migration guide                 |
| Extend `MemoMap` with disposal      | Runtime instance lifecycle                                            | Extensive integration tests, async disposal edge cases |

### Type Complexity

| Feature                      | Type Recursion Depth          | Performance Impact |
| ---------------------------- | ----------------------------- | ------------------ |
| Async detection              | +1 (check return type)        | Negligible         |
| Override lifetime validation | +1 (indexed access)           | Negligible         |
| Bidirectional captive        | +2 (filter pending, validate) | Low                |
| Disposal lifecycle           | 0 (runtime only)              | None               |

**Total added depth:** ~3-4 levels (well within TS recursion limits of 50-100).

### Breaking Changes

| Change                           | Severity | Migration Path                                               |
| -------------------------------- | -------- | ------------------------------------------------------------ |
| Remove `provideAsync()`          | HIGH     | Replace with `provide()` (auto-detects)                      |
| Remove `provideFirstError()`     | LOW      | Replace with `provide()` (better DX)                         |
| Remove `provideUnchecked()`      | MEDIUM   | Remove calls, fix validation errors                          |
| Remove `mergeWith()`             | LOW      | Replace with `merge()` (same behavior for `maxDepth: 'max'`) |
| Add override lifetime validation | MEDIUM   | Fix lifetime mismatches (were silent bugs)                   |

**Recommendation:** Ship as major version (v4.0) with comprehensive migration guide.

---

## Testing Strategy

### Type-Level Tests

```typescript
// packages/graph/tests/async-detection.test-d.ts
import { GraphBuilder } from '@hex-di/graph';
import { expectType } from 'tsd';

// Async detection - explicit Promise return
const asyncAdapter = createAdapter({
  provides: AsyncPort,
  factory: async () => new AsyncService()
});

const builder = GraphBuilder.create().provide(asyncAdapter);
expectType<GraphBuilder<AsyncPort, never, AsyncPort, never, ...>>(builder);
//                                      ^^^^^^^^ Detected as async

// Async detection - Promise.resolve
const promiseAdapter = createAdapter({
  provides: PromisePort,
  factory: () => Promise.resolve(new Service())
});

const builder2 = GraphBuilder.create().provide(promiseAdapter);
expectType<GraphBuilder<PromisePort, never, PromisePort, never, ...>>(builder2);
//                                          ^^^^^^^^^^^ Detected as async

// Sync adapter - no Promise
const syncAdapter = createAdapter({
  provides: SyncPort,
  factory: () => new SyncService()
});

const builder3 = GraphBuilder.create().provide(syncAdapter);
expectType<GraphBuilder<SyncPort, never, never, never, ...>>(builder3);
//                                       ^^^^^ Not async
```

### Runtime Tests

```typescript
// packages/runtime/tests/disposal-lifecycle.test.ts
test("disposes services in LIFO order", async () => {
  const disposed: string[] = [];

  const A = createAdapter({
    provides: PortA,
    lifetime: "singleton",
    factory: () => ({ name: "A" }),
    dispose: instance => disposed.push(instance.name),
  });

  const B = createAdapter({
    provides: PortB,
    requires: [PortA],
    lifetime: "singleton",
    factory: deps => ({ name: "B", a: deps[PortA] }),
    dispose: instance => disposed.push(instance.name),
  });

  const graph = GraphBuilder.create().provide(A).provide(B).build();
  const container = createContainer(graph);

  container.resolve(PortB); // Creates A, then B
  await container.dispose();

  expect(disposed).toEqual(["B", "A"]); // LIFO: B created last, disposed first
});

test("supports async disposal", async () => {
  let disposed = false;

  const adapter = createAdapter({
    provides: DatabasePort,
    lifetime: "singleton",
    factory: () => new Database(),
    dispose: async db => {
      await db.close(); // Async operation
      disposed = true;
    },
  });

  const graph = GraphBuilder.create().provide(adapter).build();
  const container = createContainer(graph);

  container.resolve(DatabasePort);
  await container.dispose();

  expect(disposed).toBe(true);
});
```

---

## Open Questions

### Q1: How to handle disposal errors?

**Options:**

1. **Fail fast:** First disposer error stops disposal chain
2. **Collect errors:** Continue disposing, return aggregated errors
3. **Best effort:** Log errors, continue disposal

**Recommendation:** Option 2 (collect errors). Disposal should be resilient - one service failing to clean up shouldn't prevent others from disposing.

```typescript
async dispose(): Promise<void> {
  const errors: Error[] = [];

  for (let i = this.creationOrder.length - 1; i >= 0; i--) {
    try {
      await disposer(instance);
    } catch (error) {
      errors.push(new Error(`Failed to dispose ${key}: ${error.message}`));
    }
  }

  this.memo.clear();

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Disposal completed with errors');
  }
}
```

### Q2: Should pending constraints propagate through merges?

**Scenario:**

```typescript
const graph1 = GraphBuilder.create().provide(SingletonAdapter); // requires ScopedPort (pending constraint)

const graph2 = GraphBuilder.create().provide(ScopedAdapter); // provides ScopedPort

const merged = graph1.merge(graph2); // Does constraint get validated?
```

**Answer:** YES. `UnifiedMergeInternals` unions pending constraints from both graphs. After merge, next `provide()` or `build()` validates constraints.

### Q3: How to handle transient lifetime in disposal?

**Decision:** Do NOT track disposal for transient services.

**Rationale:**

- Transient = no memoization = no disposer registration
- User responsible for cleanup when they control lifetime
- Consistent with "transient = caller-owned" semantics

---

## Summary

### Integration Patterns

| Feature                      | Integration Pattern                                   | Complexity |
| ---------------------------- | ----------------------------------------------------- | ---------- |
| Async detection              | **Type-level branching** in existing `ProvideResult`  | Low        |
| Override lifetime validation | **Extend validation chain** in `OverrideResult`       | Low        |
| Bidirectional captive        | **New state parameter** (`TPendingConstraints`)       | Medium     |
| Disposal lifecycle           | **Runtime augmentation** (MemoMap + LifecycleManager) | Medium     |

### Key Takeaways

1. **Type-state machine flexibility:** Phantom type parameters enable compile-time validation without runtime overhead. New features extend this pattern naturally.

2. **Separation of concerns:** Graph builder handles compile-time (types, dependencies), runtime container handles execution (instances, disposal). Keep boundary clean.

3. **Incremental adoption:** Features 1-2 are self-contained. Feature 3 requires state expansion (coordinate carefully). Feature 4 is independent (different package).

4. **Build order:** Phases 1 (async + override) → Phase 2 (captive) → Phase 3 (disposal). Each phase builds confidence for the next.

5. **Breaking changes justified:** Removing `provideAsync()` and adding override lifetime validation eliminate entire classes of runtime errors. Ship as major version with migration guide.

---

**Ready for roadmap creation:** This architecture document provides sufficient detail to structure phases, estimate effort, and identify dependencies. No blocking unknowns remain.
