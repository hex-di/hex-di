# Analysis: Graph Builder Enhancements via Module System & Compositional Verification Research

## 1. Current Graph Capabilities

### Compile-Time Validation (Type-Level)

The graph builder already implements sophisticated compile-time validation through TypeScript's type system:

#### **Cycle Detection** (`validation/types/cycle/`)

- **Algorithm**: Type-level DFS with visited set tracking
- **Depth-bounded**: Default 50 levels, configurable via `withMaxDepth<N>()`
- **Three-way result**: `true` (cycle exists), `false` (no cycle), `DepthExceededResult` (inconclusive)
- **Graceful degradation**: When depth exceeded, defers to runtime validation rather than false positive
- **Error quality**: Builds readable cycle paths like `"A → B → C → A"`

#### **Captive Dependency Detection** (`validation/types/captive/`)

- **Lifetime hierarchy**: `singleton` > `scoped` > `transient`
- **Rule**: A longer-lived service cannot depend on a shorter-lived service
- **Type-level tracking**: `TLifetimeMap` phantom type parameter maintains port→lifetime mapping
- **Merge semantics**: Properly handles lifetime maps when merging builders

#### **Duplicate Port Detection**

- Port names tracked as literal types in `TProvides` union
- Duplicate detection via type-level set operations
- Compile-time errors for conflicting adapters

#### **Dependency Satisfaction**

- `TRequires` union shrinks as dependencies are satisfied
- `UnsatisfiedDependencies<TProvides, TRequires>` computes missing ports
- `build()` returns template literal error if `TRequires` is not `never`

#### **Error Channel Enforcement** (NEW)

- Detects unhandled adapter error channels at compile time
- Forces use of `adapterOrDie()`, `adapterOrElse()`, or `adapterOrHandle()` before graph inclusion
- Type parameter `GetErrors<TInternalState>` tracks unhandled errors

### Runtime Validation

When compile-time validation is incomplete (depth exceeded) or for dynamic scenarios:

#### **Full Cycle Detection** (`graph/inspection/runtime-cycle-detection.ts`)

- Unbounded DFS algorithm
- Returns actual cycle path for error reporting
- Handles arbitrarily deep graphs

#### **Captive Dependency Validation** (`graph/inspection/runtime-captive-detection.ts`)

- Validates lifetime constraints at build time
- Provides detailed error messages with port names and lifetimes

#### **Disposal Order Analysis** (`graph/inspection/disposal.ts`)

- Computes correct disposal order respecting dependencies
- Warns about potential disposal issues

### Inspection & Debugging

- **GraphInspection**: Rich runtime introspection of graph state
- **Correlation IDs**: Tracks relationships between adapters
- **Complexity metrics**: Fanout, depth, cycle detection
- **Suggestions**: Provides actionable hints for fixing validation errors

## 2. Module System Mapping

The current architecture maps remarkably well to ML module system concepts:

### Current ↔ Module Theory Mapping

| hex-di Concept          | Module System Equivalent         | Status                 |
| ----------------------- | -------------------------------- | ---------------------- |
| `Port<TName, TService>` | Module signature                 | Implemented            |
| `Adapter`               | Module structure/implementation  | Implemented            |
| `GraphBuilder`          | Functor application / Linker     | Implemented            |
| `TProvides` union       | Signature exports                | Implemented            |
| `TRequires` union       | Signature imports (holes)        | Implemented            |
| `build()`               | Linking / Instantiation          | Implemented            |
| Lazy initialization     | Recursive modules (mixin theory) | Partial (runtime only) |
| Port compatibility      | Signature matching               | Structural only        |
| Behavioral contracts    | Module specifications            | Missing                |
| Separate compilation    | Per-adapter verification         | Missing                |

### What's Missing

1. **Behavioral Specifications**: Ports define structural types but not behavioral contracts (pre/postconditions, invariants)

2. **Signature Elaboration**: No explicit "this adapter satisfies this port" verification beyond type compatibility

3. **First-class Modules**: Adapters aren't first-class values that can be passed around and composed dynamically

4. **Recursive Module Support**: Lazy initialization exists at runtime but isn't reflected in the type system for well-founded cycle acceptance

5. **Parameterized Modules**: No equivalent to ML functors — can't create adapter templates parameterized by other adapters

## 3. Compositional Verification Opportunities

Based on the research, several verification properties could be added:

### Near-Term Opportunities

#### **Operation Completeness Checking** (Backpack-inspired)

When an adapter claims to provide a port, verify it implements ALL required operations:

```typescript
// Port requires: { log(), error(), warn() }
// Adapter provides: { log(), error() } // Missing warn()!
// → Compile error: "Adapter missing required operation 'warn' for LoggerPort"
```

#### **Initialization Order Verification**

Use type-level topological sort to verify initialization order:

- Compute init order at compile time
- Detect init order cycles (different from dependency cycles)
- Warn about async initialization race conditions

#### **Disposal Safety Verification**

Stronger than current disposal warnings:

- Prove disposal order is inverse of initialization order
- Detect resources that might leak on partial disposal
- Type-level tracking of disposable vs non-disposable services

### Medium-Term Opportunities

#### **Effect Propagation Verification**

Track how effects (errors, async, disposal) propagate through the graph:

```typescript
// If A depends on B, and B is async, then A must handle async
// If A depends on B, and B can error with E, then A must handle E
```

#### **Contract Composition** (Lightweight Separate Compilation)

```typescript
const LoggerPort = port<Logger>()({
  name: "Logger",
  contract: {
    precondition: "level must be valid",
    postcondition: "message is written",
    invariant: "thread-safe",
  },
});
```

### Long-Term Opportunities

#### **Parametric Adapter Templates** (ML Functors)

```typescript
// Adapter template parameterized by cache implementation
const CachedServiceTemplate = <TCache extends Cache>(CachePort: Port<"Cache", TCache>) =>
  createAdapter({
    provides: ServicePort,
    requires: [DatabasePort, CachePort],
    factory: ({ Database, Cache }) => new CachedService(Database, Cache),
  });
```

## 4. Cycle Handling: Current vs Mixin Theory

### Current Approach

- **Strict rejection**: ALL cycles are compile/runtime errors
- **No lazy init recognition**: Even with lazy() wrappers, cycles are rejected
- **Rationale**: Predictability over flexibility

### Mixin Module Theory Approach

- **Well-founded cycles**: Allow cycles if broken by lazy initialization
- **Recursive modules**: Modules can reference each other if init is deferred
- **More expressive**: Can model legitimate mutual dependencies

### Analysis

The current strict approach is **appropriate for hex-di's domain**:

1. DI graphs rarely need legitimate cycles
2. Cycles usually indicate design problems
3. Lazy init can be modeled differently (provider pattern)
4. Simpler mental model for users

**Recommendation**: Keep strict cycle rejection but improve error messages to suggest refactoring patterns (provider pattern, event bus, etc.)

## 5. Composition Laws

The graph builder could verify these categorical laws:

### Associativity of Merge

```typescript
// Currently not verified at type level
merge(merge(A, B), C) ≡ merge(A, merge(B, C))
```

**Current State**: Runtime behavior is associative, but no type-level proof

**Property Test Opportunity**:

```typescript
test("merge associativity", () => {
  fc.assert(
    fc.property(arbGraphBuilder(), arbGraphBuilder(), arbGraphBuilder(), (a, b, c) => {
      const left = a.merge(b).merge(c);
      const right = a.merge(b.merge(c));
      expect(inspectGraph(left)).toEqual(inspectGraph(right));
    })
  );
});
```

### Identity Element

```typescript
// Empty builder is identity for merge
merge(builder, empty) ≡ builder
merge(empty, builder) ≡ builder
```

**Current State**: Holds at runtime, not verified at type level

### Functor Laws for Adapter Composition

If we view adapters as morphisms:

- **Identity**: Wrapping a service in a pass-through adapter preserves behavior
- **Composition**: Composing adapters associates correctly

## 6. Concrete Recommendations (Ranked by Impact/Feasibility)

### High Impact, High Feasibility

1. **Property-based tests for composition laws** [IMMEDIATE]
   - Test merge associativity, identity, commutativity
   - Test that build order doesn't affect result
   - Use fast-check with custom arbitraries
   - **Rationale**: Catches subtle bugs, documents laws, low implementation cost

2. **Operation completeness checking** [NEAR-TERM]
   - Extend port metadata to list required operations
   - Type-level verification that adapter provides all operations
   - Better error messages for incomplete adapters
   - **Rationale**: Common source of runtime errors, Backpack proven approach

3. **Enhanced cycle error messages with refactoring suggestions** [IMMEDIATE]
   - Detect common patterns (A ↔ B mutual dependency)
   - Suggest provider pattern, events, or factory solutions
   - Include ASCII art diagrams of the cycle
   - **Rationale**: Cycles are confusing, guidance helps adoption

### Medium Impact, Medium Feasibility

4. **Type-level initialization order verification** [MEDIUM-TERM]
   - Compute topological sort at type level
   - Detect init order issues at compile time
   - Warn about async initialization races
   - **Rationale**: Init order bugs are subtle and hard to debug

5. **Behavioral specifications for ports** [MEDIUM-TERM]
   - Optional preconditions/postconditions in port metadata
   - Runtime contract checking in development mode
   - Generate property tests from contracts
   - **Rationale**: Bridges structural and behavioral correctness

6. **Effect propagation tracking** [MEDIUM-TERM]
   - Track error types through dependency chain
   - Ensure error handlers exist for all propagated errors
   - Type-level async contamination checking
   - **Rationale**: Makes error handling more predictable

### High Impact, Low Feasibility

7. **Well-founded cycle support with lazy initialization** [LONG-TERM]
   - Detect lazy() wrapped factories
   - Allow cycles broken by lazy init
   - Type-level tracking of lazy boundaries
   - **Rationale**: Enables more patterns but adds significant complexity

8. **Parametric adapter templates (functors)** [LONG-TERM]
   - Adapter factories parameterized by other adapters
   - Higher-order composition patterns
   - Type-safe adapter specialization
   - **Rationale**: Powerful but may be over-engineering for most use cases

### Low Impact, High Feasibility

9. **Formal documentation of categorical structure** [IMMEDIATE]
   - Document the category formed by the DI graph
   - Explain morphisms, objects, composition
   - Provide formal proofs of laws in documentation
   - **Rationale**: Good for library credibility, helps advanced users

10. **Compile-time performance metrics** [NEAR-TERM]
    - Report type-level computation depth
    - Warn when approaching TS limits
    - Suggest graph restructuring for performance
    - **Rationale**: Helps with large codebases but not critical

## Summary

The hex-di graph builder already implements sophisticated compile-time validation that aligns well with module system theory. The type-level cycle detection, captive dependency checking, and dependency satisfaction tracking demonstrate a deep understanding of the problem space.

The highest-value enhancements focus on:

1. **Verification**: Property-based testing of composition laws
2. **Usability**: Better error messages with refactoring suggestions
3. **Completeness**: Checking that adapters fully implement port interfaces
4. **Predictability**: Type-level initialization order verification

The research validates that hex-di is on the right track, implementing many concepts from F-ing Modules and Backpack in a TypeScript-idiomatic way. The main opportunities lie in pushing more runtime checks to compile time and providing better guidance when invariants are violated.
