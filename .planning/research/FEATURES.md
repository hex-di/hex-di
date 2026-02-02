# Feature Landscape: GraphBuilder Improvements

**Domain:** Compile-time DI container with graph building
**Researched:** 2026-02-02

## Overview

This research focuses on four specific feature categories for GraphBuilder improvements:

1. Type-level async detection (auto-detect Promise return types)
2. Override lifetime validation (same lifetime required)
3. Disposal ordering guarantees
4. Graph inspection/introspection APIs (summary mode)

These are **subsequent milestone features** — the codebase already has a working GraphBuilder with `provide()`, `merge()`, `inspect()`, `build()`, etc. This research evaluates how similar features work in other DI systems and what users expect.

---

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature                       | Why Expected                                                      | Complexity  | Notes                                                                         |
| ----------------------------- | ----------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| Async/sync factory detection  | DI containers in 2026 should handle async factories automatically | Medium      | TypeScript's type system enables compile-time detection via conditional types |
| Disposal lifecycle            | Modern DI containers provide cleanup hooks                        | Medium-High | Must support async disposal, LIFO ordering                                    |
| Lifecycle ordering guarantees | Disposal order is critical for correctness                        | Medium      | Reverse dependency order prevents use-after-dispose bugs                      |
| Basic introspection           | Debugging requires visibility into container state                | Low-Medium  | List ports, check completeness, get port metadata                             |

### Feature 1: Type-Level Async Detection

**Expectation:** DI containers should detect async factories automatically without requiring explicit registration.

**Industry patterns:**

- **.NET**: Uses `Task<T>` return types to detect async factories automatically
- **TSyringe**: No automatic detection; users must manually await
- **InversifyJS**: Supports async but requires explicit registration

**User mental model:**

```typescript
// User writes this:
const adapter = createAdapter({
  provides: DatabasePort,
  factory: async () => await connectToDatabase(),
});

// Container should KNOW it's async without:
builder.provideAsync(adapter); // ❌ Extra ceremony

// Preferred:
builder.provide(adapter); // ✅ Auto-detects async
```

**Why table stakes:**

- TypeScript's type system makes this trivially detectable
- Manual async/sync distinction creates error-prone ceremony
- Users expect type-level features in a compile-time DI system

**Implementation complexity: MEDIUM**

- Type-level: `TReturn extends Promise<any>` detection (simple)
- Runtime: Already handled by existing async resolution logic
- Challenge: Union types that include Promise (`string | Promise<string>`)

### Feature 2: Override Lifetime Validation

**Expectation:** Overrides must use the same lifetime as the parent adapter.

**Industry patterns:**

- **.NET**: Throws runtime exception if child container changes lifetime
- **InversifyJS**: Allows lifetime changes (footgun: child scoped, parent singleton)
- **TSyringe**: No override concept; uses registration order

**Why footgun exists:**

```typescript
// Parent container:
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  lifetime: "singleton", // Shared state
});

// Child container override:
const MockLoggerAdapter = createAdapter({
  provides: LoggerPort,
  lifetime: "scoped", // ❌ Different lifetime!
});

// Problem: Parent expects singleton semantics, child breaks that contract
```

**Why table stakes:**

- Lifetime mismatch causes subtle bugs (state not shared as expected)
- Compile-time validation prevents runtime confusion
- Child containers inherit contracts, not just implementations

**Implementation complexity: MEDIUM**

- Type-level: Compare parent's lifetime map with override adapter lifetime
- Requires: `_lifetimeMap` lookup, error message type
- Runtime: No changes needed (already validated)

### Feature 3: Disposal Ordering Guarantees

**Expectation:** Services are disposed in reverse dependency order (LIFO).

**Industry patterns:**

- **.NET**: Scoped/Singleton services disposed in reverse creation order
- **NestJS**: `onModuleDestroy` called in reverse dependency order
- **Angular**: `ngOnDestroy` called bottom-up (children before parents)

**Ordering semantics:**

```
Creation order:    Logger → Database → UserService
Disposal order:    UserService → Database → Logger
                   (reverse)

Rationale: UserService may call Database.close() in finalizer,
           Database may call Logger.log() in finalizer.
           Disposing Logger first breaks Database finalizer.
```

**Why table stakes:**

- Incorrect disposal order causes use-after-dispose bugs
- Standard pattern across all DI systems
- Already partially implemented in HexDI (LIFO for container instances)

**Implementation complexity: MEDIUM-HIGH**

- Runtime disposal logic: Already exists (LifecycleManager)
- Challenge: Adapter-level finalizers (currently container tracks instances, not adapter metadata)
- Need: Associate finalizer with adapter, track dependency order

### Feature 4: Graph Introspection (Summary Mode)

**Expectation:** Inspect API should provide quick health check without full details.

**Industry patterns:**

- **.NET**: `IServiceProvider.GetService()` for probing, no batch introspection
- **InversifyJS**: Container metadata API for querying registered types
- **Angular**: No direct introspection; uses module metadata reflection

**Use case distinction:**

```typescript
// Full inspection: Debugging, graph visualization
const full = builder.inspect();
// Returns: 20+ fields including dependencyMap, orphanPorts, suggestions

// Summary: Health check, CI validation, quick status
const summary = builder.inspect({ summary: true });
// Returns: 7 fields — adapterCount, asyncAdapterCount, isComplete, errors
```

**Why table stakes:**

- Full inspection is verbose for simple checks
- CI pipelines need fast validation ("is graph complete?")
- DevTools need incremental queries (don't fetch all data upfront)

**Implementation complexity: LOW-MEDIUM**

- Type-level: Conditional return type based on options parameter
- Runtime: Filter existing inspection fields, no new computation
- Already have: All data needed for summary exists in GraphInspection

---

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature                          | Value Proposition                                | Complexity | Notes                                                       |
| -------------------------------- | ------------------------------------------------ | ---------- | ----------------------------------------------------------- |
| Compile-time Promise detection   | Competitors do this at runtime                   | Low        | Leverage TypeScript's type system for zero-cost abstraction |
| Compile-time override validation | Most DI containers throw runtime errors          | Medium     | Catch lifetime mismatches before code runs                  |
| Bidirectional captive validation | Competitors only validate forward references     | High       | Validate pending constraints when ports are registered      |
| Disposal warnings in inspect()   | Most containers don't warn about disposal issues | Low        | Surface potential use-after-dispose bugs early              |

### Feature 1: Compile-Time Promise Detection

**Why differentiator:**

- Most JavaScript DI containers detect async at runtime or require explicit marking
- HexDI can leverage TypeScript to make this zero-cost (no runtime overhead)
- Users never think about async/sync distinction — it's automatic

**Implementation:**

```typescript
type IsAsyncFactory<TFactory> = TFactory extends (...args: any[]) => infer TReturn
  ? [TReturn] extends [Promise<any>]
    ? true
    : Promise<any> extends TReturn
      ? "partial" // Union includes Promise
      : false
  : false;
```

**Competitive advantage:**

- Zero runtime overhead (pure type-level)
- Impossible to forget `provideAsync()` (no such method exists)
- Better DX than manual async/sync distinction

### Feature 2: Compile-Time Override Validation

**Why differentiator:**

- .NET throws **runtime** exception when lifetime mismatches
- InversifyJS allows lifetime changes (silent footgun)
- HexDI can catch this at **compile time** with actionable error

**Implementation:**

```typescript
type OverrideResult<TAdapter, TParentGraph> =
  InferProvides<TAdapter> extends keyof TParentGraph['_lifetimeMap']
    ? TAdapter['lifetime'] extends TParentGraph['_lifetimeMap'][InferProvides<TAdapter>]
      ? GraphBuilder<...>  // OK
      : OverrideLifetimeError<...>  // Compile error
    : OverridePortNotFoundError<...>;
```

**Competitive advantage:**

- Errors surface in IDE, not at runtime
- Error message includes both lifetimes and explanation
- Prevents entire class of bugs

### Feature 3: Bidirectional Captive Validation

**Why differentiator:**

- Most DI containers only validate captive dependencies during resolution (runtime)
- HexDI validates at graph build time
- **Bidirectional** means it validates regardless of registration order

**Forward reference problem:**

```typescript
// Registration order 1:
builder
  .provide(SingletonAdapter) // requires ScopedPort (not yet registered)
  .provide(ScopedAdapter); // provides ScopedPort

// Registration order 2:
builder
  .provide(ScopedAdapter) // provides ScopedPort
  .provide(SingletonAdapter); // requires ScopedPort (already registered)

// Both should catch the captive dependency violation!
```

**Competitive advantage:**

- Order-independent validation
- Compile-time detection (with pending constraints)
- Clear error messages with dependency chain

### Feature 4: Disposal Warnings in inspect()

**Why differentiator:**

- No other DI container surfaces disposal order issues proactively
- Prevents debugging "why did my finalizer crash?" at runtime

**Warning pattern:**

```typescript
const info = builder.inspect();
if (info.disposalWarnings.length > 0) {
  // "UserService finalizer may use Logger, but Logger has no finalizer.
  //  If Logger is garbage collected before disposal, UserService finalizer may fail."
}
```

**Competitive advantage:**

- Proactive issue detection
- Actionable suggestions (add finalizer to dependency)
- Surfaces architectural issues early

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature                         | Why Avoid                                                     | What to Do Instead                                   |
| ------------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------- |
| Dynamic lifetime changes             | Breaks container contracts, causes state bugs                 | Validate lifetime immutability at compile time       |
| Manual async marking after detection | Creates ceremony and forgetting-to-mark bugs                  | Auto-detect always; no `provideAsync()` method       |
| Async detection at runtime only      | Misses optimization opportunities, slower startup             | Detect at type level; runtime can assume correctness |
| String-based error codes in types    | Pollutes type space, hard to parse                            | Use discriminated unions with structured error types |
| Optional disposal ordering           | Use-after-dispose bugs are too common                         | Always enforce reverse dependency order, no opt-out  |
| Sync disposal forcing                | Modern apps need async cleanup (DB connections, file handles) | Support both sync and async finalizers               |

### Anti-Feature 1: Dynamic Lifetime Changes

**Why avoid:**

- Singleton → Scoped means parent sees shared state, child sees per-request state
- Breaks Liskov Substitution Principle (child violates parent's contract)
- Causes subtle bugs that are hard to debug

**Real-world footgun:**

```typescript
// Parent container
const CacheAdapter = createAdapter({
  provides: CachePort,
  lifetime: "singleton",
  factory: () => new InMemoryCache(),
});

// Child container (testing)
const MockCacheAdapter = createAdapter({
  provides: CachePort,
  lifetime: "scoped", // ❌ Different lifetime
  factory: () => new MockCache(),
});

// Problem: Tests pass (scoped cache works), production fails (singleton cache expected)
```

**What to do instead:**

- Validate lifetime matches parent at compile time
- Error message: "Override lifetime mismatch: CachePort parent=singleton, override=scoped"

### Anti-Feature 2: Manual Async Marking

**Why avoid:**

- Forgetting `provideAsync()` causes runtime errors
- Extra ceremony for something the type system knows
- Creates divergence between type and implementation

**Footgun example:**

```typescript
// User forgets provideAsync():
builder.provide(DatabaseAdapter); // ❌ Should be provideAsync()

// Runtime error during build():
// "Async factory detected but registered with provide(). Use provideAsync()."
```

**What to do instead:**

- Auto-detect Promise return types
- Single `provide()` method handles both
- Runtime uses type information to decide resolution strategy

### Anti-Feature 3: Runtime-Only Async Detection

**Why avoid:**

- Slower startup (must check every factory at runtime)
- Missed optimization (type system already knows)
- Can't enforce async initialization order at compile time

**What to do instead:**

- Type-level detection with `IsAsyncFactory<TFactory>`
- Build time: Construct `TAsyncPorts` type parameter
- Runtime: Use pre-computed async port set (no dynamic checks)

### Anti-Feature 4: String Error Codes in Types

**Why avoid:**

- Error code strings pollute autocomplete
- Hard to parse programmatically
- Doesn't compose with discriminated unions

**Bad pattern:**

```typescript
type Result = GraphBuilder<...> | "HEX022: Override lifetime mismatch";
// ❌ String literal, no structure
```

**What to do instead:**

```typescript
type Result = GraphBuilder<...> | OverrideLifetimeError<{
  port: "CachePort",
  parentLifetime: "singleton",
  overrideLifetime: "scoped"
}>;
// ✅ Structured, parseable, compositional
```

### Anti-Feature 5: Optional Disposal Ordering

**Why avoid:**

- Use-after-dispose bugs are too common and too hard to debug
- No valid use case for "dispose in random order"
- Opt-in complexity for zero benefit

**What to do instead:**

- Always dispose in reverse dependency order
- No configuration option
- Document guarantee in Container.dispose() JSDoc

### Anti-Feature 6: Sync-Only Disposal

**Why avoid:**

- Modern apps need async cleanup (DB connections, file handles, network sockets)
- Forcing sync disposal leads to incomplete cleanup or blocking operations

**What to do instead:**

- Support both sync and async finalizers: `(instance) => void | Promise<void>`
- Container.dispose() always returns Promise
- Sequential async disposal (await each finalizer)

---

## Feature Dependencies

```
Type-Level Async Detection
  ↓
Override Lifetime Validation (needs async port info for parent graph)
  ↓
Bidirectional Captive Validation (needs lifetime constraints)

Disposal Ordering Guarantees (independent)
  ↓
Disposal Warnings in inspect() (needs disposal order algorithm)

Inspection Summary Mode (independent, uses existing GraphInspection)
```

**Critical path:**

1. Type-level async detection (foundation for override validation)
2. Override lifetime validation (needed before bidirectional captive)
3. Bidirectional captive validation (most complex, depends on 1+2)

**Parallel workstreams:**

- Disposal features (independent of async detection)
- Inspection improvements (independent of all others)

---

## MVP Recommendation

For this milestone, prioritize:

1. **Type-level async detection** (foundation, low complexity)
2. **Override lifetime validation** (high value, medium complexity)
3. **Inspection summary mode** (low complexity, high utility)

Defer to post-milestone:

- **Bidirectional captive validation**: High complexity, lower priority than override validation
- **Disposal ordering at adapter level**: Requires runtime architecture changes

**Rationale:**

- Async detection unblocks override validation
- Override validation delivers immediate value (catches bugs)
- Summary mode is low-hanging fruit for DevTools/CI
- Bidirectional captive is ambitious for a single milestone (already have forward-ref validation)
- Disposal ordering exists at container level; adapter-level is enhancement

---

## Existing HexDI Features (Context)

Already built:

- ✅ `GraphBuilder.create()`, `withMaxDepth()`, `forParent()`
- ✅ `provide()`, `provideMany()` (no auto-async detection yet)
- ✅ `merge()`, `build()`, `buildFragment()`
- ✅ `inspect()` (full mode only)
- ✅ Container/Scope disposal with LIFO ordering (instance level)
- ✅ Error codes HEX001-HEX021
- ✅ Forward reference captive validation (runtime defense-in-depth)

What's new in this milestone:

- ⏳ Auto-detect async from return type (remove `provideAsync()`)
- ⏳ Override lifetime validation (new error HEX022)
- ⏳ Inspection summary mode (`{ summary: true }`)
- ⏳ Bidirectional captive validation (type-level pending constraints)
- ⏳ Disposal at adapter level (currently container/scope level only)

---

## Research Confidence

| Feature                      | Confidence | Sources                                                                  |
| ---------------------------- | ---------- | ------------------------------------------------------------------------ |
| Async detection patterns     | HIGH       | Existing codebase, TypeScript handbook (conditional types)               |
| Override lifetime validation | HIGH       | .NET DI documentation, existing HexDI override implementation            |
| Disposal ordering            | HIGH       | .NET IDisposable docs, NestJS lifecycle, existing HexDI LifecycleManager |
| Inspection APIs              | HIGH       | Existing GraphInspection interface, InversifyJS metadata API             |

**Low confidence areas:**

- None — all features align with existing codebase patterns and industry standards

**Verification needed:**

- None — research is based on authoritative sources (existing code, official docs)

---

## Competitive Analysis

| Feature                          | HexDI        | InversifyJS       | TSyringe    | .NET DI      | NestJS         |
| -------------------------------- | ------------ | ----------------- | ----------- | ------------ | -------------- |
| Compile-time async detection     | ⏳ (planned) | ❌ (runtime)      | ❌ (manual) | ❌ (runtime) | ❌ (decorator) |
| Override lifetime validation     | ⏳ (planned) | ❌                | N/A         | ✅ (runtime) | ❌             |
| Disposal ordering guarantees     | ✅ (LIFO)    | ✅ (deactivation) | ❌          | ✅ (LIFO)    | ✅ (reverse)   |
| Inspection summary mode          | ⏳ (planned) | ✅ (partial)      | ❌          | ❌           | ❌             |
| Bidirectional captive validation | ⏳ (planned) | ❌                | ❌          | ❌ (runtime) | ❌             |

**Key differentiators:**

- Compile-time validation (most competitors do runtime)
- Order-independent validation (bidirectional captive)
- Structured error types (not just runtime exceptions)

---

## Sources

**Authoritative (HIGH confidence):**

- HexDI codebase: `packages/graph/src`, `packages/runtime/src` (disposal implementation, inspection types)
- TypeScript Handbook: Conditional types, type inference
- .NET DI documentation: IDisposable semantics, scoped service disposal
- Existing GraphInspection interface: `.planning/research/FEATURES.md`

**Community sources (MEDIUM confidence):**

- TSyringe README: Lifecycle scopes, disposal patterns
- InversifyJS landing page: Container features (disposal details not found)

**Not verified (LOW confidence):**

- None — all findings are based on authoritative sources or existing code

---

## Open Questions

None. All features have clear patterns from existing codebase or industry standards.

**Why no open questions:**

- Type-level async detection: TypeScript handbook + existing GraphBuilder patterns
- Override validation: Existing override implementation provides foundation
- Disposal: Existing LifecycleManager shows LIFO pattern works
- Inspection: Existing GraphInspection shows all data is available

---

_Research completed: 2026-02-02_
