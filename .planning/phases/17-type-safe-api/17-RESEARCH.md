# Phase 17: Type-Safe API - Research

**Researched:** 2026-02-03
**Domain:** TypeScript type-level programming, builder patterns, compile-time validation
**Confidence:** HIGH

## Summary

Phase 17 implements compile-time validation for container override configurations using TypeScript's advanced type system. The research focused on three core areas: (1) type-safe builder pattern APIs similar to GraphBuilder's fluent interface, (2) compile-time port validation ensuring adapters' ports exist in graphs, and (3) detailed error messages using template literal types.

The codebase already has sophisticated infrastructure for this work. GraphBuilder demonstrates advanced type-state patterns with phantom type parameters tracking graph state at compile time. The validation system uses conditional types, mapped types, and recursive type algorithms (DFS for cycle detection, lifetime hierarchy checks). The key challenge is extending these patterns to container creation and override APIs.

**Primary recommendation:** Mirror GraphBuilder's architecture using phantom types to track graph provides/requires at type level, with adapter-based override API that validates port membership via conditional types.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library                | Version     | Purpose                                               | Why Standard                                                                        |
| ---------------------- | ----------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| TypeScript             | 5.3+        | Type system with template literals, conditional types | Industry standard for compile-time validation, sophisticated type-level programming |
| Conditional Types      | TS built-in | Type-level branching (`T extends U ? X : Y`)          | Foundation for compile-time validation logic                                        |
| Template Literal Types | TS built-in | String manipulation at type level                     | Creates readable error messages with context                                        |
| Mapped Types           | TS built-in | Transform object types (`{ [K in T]: ... }`)          | Port validation, dependency mapping                                                 |

### Supporting

| Library         | Version     | Purpose                                      | When to Use                               |
| --------------- | ----------- | -------------------------------------------- | ----------------------------------------- |
| Recursive Types | TS built-in | Type-level algorithms (DFS, graph traversal) | Cycle detection, dependency resolution    |
| `infer` keyword | TS built-in | Extract types from patterns                  | Adapter provides/requires extraction      |
| Branded Types   | Pattern     | Nominal typing via unique symbols            | Port identity, builder phase tracking     |
| Phantom Types   | Pattern     | Type-level state without runtime cost        | Builder state machine, validation context |

### Alternatives Considered

| Instead of              | Could Use               | Tradeoff                                                |
| ----------------------- | ----------------------- | ------------------------------------------------------- |
| Compile-time validation | Runtime-only validation | Faster iteration but errors at runtime, no IDE feedback |
| Template literal errors | Generic error types     | Simpler types but less actionable errors                |
| Phantom type tracking   | Explicit state objects  | Runtime overhead, less type safety                      |

**Installation:**

```bash
# No external dependencies - TypeScript built-ins only
# Requires TypeScript 5.3+ in package.json
```

## Architecture Patterns

### Recommended Project Structure

```
packages/runtime/src/
├── container/
│   ├── factory.ts              # createContainer with options object
│   ├── override-builder.ts     # NEW: Fluent override builder
│   └── override-validation.ts  # NEW: Type-level port validation
├── types/
│   ├── container.ts            # Container type with TProvides tracking
│   ├── override-types.ts       # NEW: Override builder types
│   └── validation-errors.ts    # NEW: Detailed error types
```

### Pattern 1: Phantom Type Tracking for Override Validation

**What:** Use phantom type parameters to track graph's TProvides at container level, enabling compile-time checks that override adapters' ports exist in graph.

**When to use:** Container creation and override APIs where port membership must be validated.

**Example:**

```typescript
// Existing GraphBuilder pattern (proven approach):
class GraphBuilder<
  TProvides = never,           // Union of all ports in graph
  TRequires = never,           // Union of unsatisfied ports
  TAsyncPorts = never,
  TOverrides = never,
  TInternalState = DefaultInternals
> {
  provide<A extends AdapterConstraint>(adapter: A): ProvideResult<...> {
    // Type-level validation happens via ProvideResult conditional type
  }
}

// Proposed Container pattern (mirrors GraphBuilder):
interface Container<
  TProvides extends Port<unknown, string>,  // Track graph's provides
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends "uninitialized" | "initialized" = "initialized"
> {
  // Override builder returns new container type with validated overrides
  override<A extends AdapterConstraint>(
    adapter: A
  ): ValidateOverrideAdapter<TProvides, A>;
}

// Type-level validation (similar to ProvideResult pattern):
type ValidateOverrideAdapter<
  TProvides,
  TAdapter extends AdapterConstraint
> =
  InferAdapterProvides<TAdapter> extends TProvides
    ? ContainerWithOverride<TProvides, TAdapter>  // Success
    : PortNotInGraphError<                         // Error with details
        InferAdapterProvides<TAdapter>,
        TProvides
      >;

type PortNotInGraphError<
  TPort,
  TAvailable
> = `ERROR[TYPE-01]: Port '${InferPortName<TPort>}' not found in graph. Available ports: ${UnionToString<TAvailable>}`;
```

### Pattern 2: Builder Chain with Immutable State

**What:** Each `.override()` call returns new container type with accumulated overrides, enabling chainable API.

**When to use:** Override configuration where multiple overrides needed.

**Example:**

```typescript
// Existing GraphBuilder pattern:
const graph = GraphBuilder.create()
  .provide(LoggerAdapter) // Returns GraphBuilder<Logger, never, ...>
  .provide(DatabaseAdapter) // Returns GraphBuilder<Logger | Database, never, ...>
  .build(); // Returns Graph<Logger | Database, ...>

// Proposed Container override pattern:
const container = createContainer({ graph, name: "App" });

// Builder pattern approach:
const testContainer = container
  .override(MockLoggerAdapter) // Returns Container<..., overrides = Logger>
  .override(MockDatabaseAdapter) // Returns Container<..., overrides = Logger | Database>
  .build(); // Finalizes overrides, returns Container

// OR single-call approach:
const testContainer = container.withOverrides([MockLoggerAdapter, MockDatabaseAdapter]).build();
```

### Pattern 3: Single Options Object for createContainer

**What:** Merge separate parameters into single options object for clarity and extensibility.

**When to use:** Function APIs with multiple configuration options.

**Example:**

```typescript
// Before (current API has evolved):
createContainer(graph, { name: "App" }, { hooks: { ... } });

// After (consolidated):
createContainer({
  graph: graph,
  name: "App",
  hooks: {
    beforeResolve: (ctx) => { ... },
    afterResolve: (ctx) => { ... }
  },
  performance: {
    captureTimestamps: true
  }
});

// Benefits:
// - Single source of configuration
// - Named parameters (order doesn't matter)
// - Easy to add new options without breaking changes
// - Follows GraphBuilder.create() pattern
```

### Pattern 4: Detailed Type-Level Error Messages

**What:** Use template literal types to create actionable error messages with context.

**When to use:** Any compile-time validation where users need to understand what went wrong.

**Example:**

```typescript
// Source: Existing patterns in packages/graph/src/validation/types/errors.ts

// Generic error (not helpful):
type Error1 = never;

// Detailed error with context (helpful):
type PortNotInGraphError<
  TPortName extends string,
  TAvailablePorts extends string,
> = `ERROR[TYPE-01]: Override adapter provides port '${TPortName}' which is not in graph.

Available ports: ${TAvailablePorts}

Fix: Either remove this override or add an adapter for '${TPortName}' to the graph.`;

// Circular dependency error (existing pattern):
type CircularErrorMessage<TPath extends readonly string[]> =
  `ERROR[HEX002]: Circular dependency detected: ${JoinPortNames<TPath>}`;

// Example in IDE:
const badOverride = container.override(UnknownAdapter);
// Type shows:
// ERROR[TYPE-01]: Override adapter provides port 'Unknown' which is not in graph.
// Available ports: Logger | Database | Config
// Fix: Either remove this override or add an adapter for 'Unknown' to the graph.
```

### Anti-Patterns to Avoid

- **String-based port matching**: Avoid `{ [portName: string]: factory }` - loses type safety, no compile-time validation
- **Runtime-only validation**: Don't defer port existence checks to runtime - users lose IDE feedback
- **Mutable builder state**: Don't mutate container in place - return new types for immutability and type tracking
- **Generic error types**: Avoid `never` or opaque errors - provide actionable messages with context

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                       | Don't Build            | Use Instead                                                        | Why                                                     |
| ----------------------------- | ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| Type-level DFS                | Custom recursive types | Existing `DetectCycleInMergedGraph` pattern                        | Already handles depth limits, max recursion, edge cases |
| Port name extraction          | String manipulation    | `InferPortName<P>` + `__portName` property                         | Preserves literal types, works with branded ports       |
| Conditional validation chains | Nested ternaries       | Existing validation pipeline pattern (Duplicate → Cycle → Captive) | Established order prevents confusing errors             |
| Union to string conversion    | Custom type recursion  | Existing `JoinPortNames` utility                                   | Handles `never`, empty unions, formatting               |
| Adapter type inference        | Manual type extraction | `InferAdapterProvides`, `InferAdapterRequires`                     | Already handles lazy ports, async adapters, edge cases  |

**Key insight:** GraphBuilder validation infrastructure is sophisticated and battle-tested. Extend rather than rewrite - the patterns handle edge cases that aren't obvious (lazy ports, async adapters, depth limits, error message formatting).

## Common Pitfalls

### Pitfall 1: Type Recursion Depth Limits

**What goes wrong:** TypeScript has recursion limits (~50-100 depth). Complex graphs hit this during compile-time cycle detection, causing cryptic "Type instantiation is excessively deep" errors.

**Why it happens:** Recursive conditional types for DFS traversal, union operations accumulate depth.

**How to avoid:**

- Use `TMaxDepth` parameter pattern from GraphBuilder (default 50, configurable)
- Implement `withExtendedDepth()` for legitimate deep graphs
- Track depth with type-level counter: `DetectCycle<..., Depth = 0>`
- Return warning types when depth exceeded instead of erroring

**Warning signs:**

- "Type instantiation is excessively deep and possibly infinite" in IDE
- Union types with >30 members
- Nested conditional types >5 levels

**Example from codebase:**

```typescript
// packages/graph/src/builder/types/state.ts
export interface BuilderInternals<
  TDepGraph,
  TLifetimeMap,
  TParentProvides = unknown,
  TMaxDepth extends number = DefaultMaxDepth,  // Configurable depth
  TExtendedDepth extends boolean = false        // Warning vs error mode
> { ... }
```

### Pitfall 2: Port Identity vs String Comparison

**What goes wrong:** Comparing ports by `__portName` string loses type information, breaks when port names collide.

**Why it happens:** TypeScript structural typing means two ports with same name look identical at type level.

**How to avoid:**

- Use branded types with unique symbols for port identity
- Compare port types directly: `P extends TProvides` not `InferPortName<P> extends string`
- Keep port objects as single source of truth (don't extract names early)

**Warning signs:**

- Type errors about incompatible port types with same name
- Override validation passing when it should fail
- Union types collapsing unexpectedly

**Example from codebase:**

```typescript
// packages/core/src/ports/types.ts
export type Port<T, TName extends string> = {
  readonly [__brand]: [T, TName]; // Branded for nominal typing
  readonly __portName: TName; // String for runtime, but type preserves brand
};

// WRONG: String comparison loses type safety
type BadCheck<P> = InferPortName<P> extends AvailableNames ? OK : Error;

// RIGHT: Structural comparison preserves port identity
type GoodCheck<P> = P extends AvailablePorts ? OK : Error;
```

### Pitfall 3: Adapter Requires Validation Incomplete

**What goes wrong:** Validating that override adapter's `provides` port exists in graph, but forgetting to validate its `requires` ports also exist.

**Why it happens:** Focus on "does the override port exist" misses transitive dependency validation.

**How to avoid:**

- Validate both `provides` and `requires` ports
- Check that adapter's dependencies are satisfied by graph OR other overrides
- Use existing `UnsatisfiedDependencies` pattern from GraphBuilder
- Allow override adapters to depend on other overrides in same chain

**Warning signs:**

- Runtime errors about missing dependencies despite compile-time success
- Override adapters that can't resolve their own dependencies

**Example validation:**

```typescript
type ValidateOverrideAdapter<
  TProvides,
  TAdapter extends AdapterConstraint
> =
  // Step 1: Check provides port exists
  InferAdapterProvides<TAdapter> extends TProvides
    ? // Step 2: Check all requires ports are satisfied
      UnsatisfiedDependencies<
        TProvides,
        InferAdapterRequires<TAdapter>
      > extends never
      ? Success<TAdapter>
      : MissingDependenciesError<...>
    : PortNotInGraphError<...>;
```

### Pitfall 4: Template Literal Type Explosion

**What goes wrong:** Template literal types in error messages multiply complexity - IDE hangs, slow compilation.

**Why it happens:** String concatenation at type level, union types in template positions create combinatorial explosion.

**How to avoid:**

- Keep error types lazy (computed only when error occurs)
- Use type aliases to avoid recomputation
- Limit template literal nesting
- Use `JoinPortNames` utility for union-to-string (handles complexity)

**Warning signs:**

- IDE tooltips take >1 second to show
- Compile time >30s for type checking
- "Type is too complex" warnings

**Example from codebase:**

```typescript
// BAD: Template in hot path (computed even on success)
type Result<P> = P extends Valid
  ? Success
  : `ERROR: ${InferPortName<P>} failed because ${Reason<P>}`;

// GOOD: Lazy error computation (only when fails)
type Result<P> = P extends Valid ? Success : ErrorWrapper<P>; // Type alias - deferred computation

type ErrorWrapper<P> = `ERROR: ${InferPortName<P>} failed`;
```

## Code Examples

Verified patterns from official sources:

### Adapter-Based Override API

```typescript
// Source: Mirror GraphBuilder.override() pattern
// Location: packages/runtime/src/container/factory.ts (proposed)

// GraphBuilder override pattern (existing):
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .override(TestLoggerAdapter) // Override parent's Logger
  .build();

// Container override pattern (proposed):
const container = createContainer({ graph, name: "App" });

// Override builder:
const testContainer = container
  .override(MockLoggerAdapter) // Adapter created with createAdapter()
  .override(MockDatabaseAdapter) // No special mock adapter type needed
  .build(); // Finalize overrides

// Type validation at compile time:
type ValidateOverride<TProvides, TAdapter extends AdapterConstraint> =
  InferAdapterProvides<TAdapter> extends TProvides
    ? ContainerWithOverride<TProvides, TAdapter>
    : `ERROR[TYPE-01]: Port '${InferPortName<InferAdapterProvides<TAdapter>>}' not in graph. Available: ${PortUnionToString<TProvides>}`;
```

### Consolidated createContainer Options

```typescript
// Source: Existing createContainer signature evolution
// Location: packages/runtime/src/container/factory.ts

// Current signature (Phase 15 result):
export function createContainer<TProvides, TAsyncPorts>(
  graph: Graph<TProvides, Port<unknown, string>>,
  containerOptions: CreateContainerOptions,
  hookOptions?: ContainerOptions
): Container<...>

// Proposed single options object:
export function createContainer<TProvides, TAsyncPorts>(
  options: {
    graph: Graph<TProvides, Port<unknown, string>>;
    name: string;
    hooks?: {
      beforeResolve?: (ctx: ResolutionHookContext) => void;
      afterResolve?: (ctx: ResolutionResultContext) => void;
    };
    performance?: {
      captureTimestamps?: boolean;
      enableMetrics?: boolean;
    };
  }
): Container<TProvides, never, TAsyncPorts, "uninitialized">

// Usage:
const container = createContainer({
  graph: appGraph,
  name: "Application",
  hooks: {
    beforeResolve: (ctx) => console.log(`Resolving ${ctx.portName}`)
  },
  performance: {
    captureTimestamps: true
  }
});
```

### Port Existence Validation

```typescript
// Source: Existing GraphBuilder validation patterns
// Location: packages/graph/src/builder/types/provide.ts

// Pattern: Use extends check, not string comparison
type ValidatePortInGraph<
  TPort extends Port<unknown, string>,
  TGraphProvides extends Port<unknown, string>,
> = TPort extends TGraphProvides
  ? ValidPort<TPort>
  : PortNotInGraphError<InferPortName<TPort>, TGraphProvides>;

// Error type with context:
type PortNotInGraphError<
  TPortName extends string,
  TAvailablePorts extends Port<unknown, string>,
> = `ERROR[TYPE-01]: Port '${TPortName}' not found in graph.

Available ports: ${PortUnionToString<TAvailablePorts>}

Fix: Add adapter for '${TPortName}' to graph before creating container.`;

// Helper to convert port union to readable string:
type PortUnionToString<P extends Port<unknown, string>> = P extends never
  ? "(empty graph)"
  : JoinPortNames<InferPortName<P>>; // Existing utility
```

### Chainable Override Builder

```typescript
// Source: GraphBuilder immutable builder pattern
// Location: packages/runtime/src/container/override-builder.ts (proposed)

// Builder tracks accumulated overrides via phantom type
class OverrideBuilder<
  TProvides extends Port<unknown, string>,
  TOverrides extends Port<unknown, string> = never
> {
  constructor(
    private readonly baseContainer: Container<TProvides>,
    private readonly overrideAdapters: AdapterConstraint[] = []
  ) {}

  // Each override returns new builder with updated type
  override<A extends AdapterConstraint>(
    adapter: A
  ): ValidateAndAddOverride<TProvides, TOverrides, A> {
    // Type validation happens at compile time via return type
    return new OverrideBuilder(
      this.baseContainer,
      [...this.overrideAdapters, adapter]
    ) as any;  // Type cast - actual type computed by ValidateAndAddOverride
  }

  build(): Container<TProvides, TOverrides> {
    // Create child container with overrides
    const overrideGraph = GraphBuilder.create()
      .provideMany(this.overrideAdapters)
      .buildFragment();

    return this.baseContainer.createChild(overrideGraph, {
      name: `${this.baseContainer.name}-Overrides`
    });
  }
}

// Type-level validation:
type ValidateAndAddOverride<
  TProvides,
  TOverrides,
  TAdapter extends AdapterConstraint
> =
  InferAdapterProvides<TAdapter> extends TProvides
    ? OverrideBuilder<
        TProvides,
        TOverrides | InferAdapterProvides<TAdapter>
      >
    : PortNotInGraphError<...>;
```

### Detailed Error Messages

```typescript
// Source: Existing error patterns in validation types
// Location: packages/graph/src/validation/types/errors.ts

// Pattern 1: Error with available alternatives
type PortNotInGraphError<
  TPortName extends string,
  TAvailablePorts extends readonly string[]
> = `ERROR[TYPE-01]: Port '${TPortName}' not found in graph. Available ports: [${JoinArray<TAvailablePorts>}]. Add adapter to graph or check port name.`;

// Pattern 2: Error with fix suggestion
type CircularDependencyError<
  TPath extends readonly string[]
> = `ERROR[TYPE-02]: Circular dependency: ${JoinArray<TPath>}. Remove one dependency to break cycle.`;

// Pattern 3: Multi-line error with context
type CaptiveDependencyError<
  TDependentName extends string,
  TDependentLifetime extends string,
  TCaptiveName extends string,
  TCaptiveLifetime extends string
> = `ERROR[TYPE-03]: Captive dependency detected.

Dependent: '${TDependentName}' (${TDependentLifetime})
Captive:   '${TCaptiveName}' (${TCaptiveLifetime})

A ${TDependentLifetime} service cannot depend on a ${TCaptiveLifetime} service.
Change '${TDependentName}' to ${TCaptiveLifetime} or '${TCaptiveName}' to ${TDependentLifetime}.`;

// Usage in validation:
type ProvideResult<...> =
  // ... validation chain ...
  FindCaptiveDependency<...> extends CaptiveDependencyError<infer DN, infer DL, infer CN, infer CL>
    ? CaptiveDependencyError<DN, DL, CN, CL>  // Pass through detailed error
    : Success<...>;
```

## State of the Art

| Old Approach                    | Current Approach             | When Changed      | Impact                                 |
| ------------------------------- | ---------------------------- | ----------------- | -------------------------------------- |
| String-based overrides          | Adapter-based overrides      | v5.0 (this phase) | Compile-time validation, IDE support   |
| Multiple createContainer params | Single options object        | v5.0 (this phase) | Clearer API, easier to extend          |
| Runtime port validation         | Compile-time port validation | v5.0 (this phase) | Errors at edit time, not runtime       |
| Generic error types             | Template literal errors      | v4.0 (existing)   | Actionable error messages with context |
| Mutable containers              | Immutable builder pattern    | v4.0 (existing)   | Type-safe state transitions            |

**Deprecated/outdated:**

- String-based override API (`{ [portName: string]: factory }`): Removed entirely in v5.0, no backward compatibility
- Separate hooks parameter in createContainer: Merged into options object for consistency

## Open Questions

Things that couldn't be fully resolved:

1. **Lifetime mismatch warnings for overrides**
   - What we know: GraphBuilder detects captive dependencies at compile time
   - What's unclear: Should override adapters warn if lifetime differs from original?
   - Recommendation: Follow GraphBuilder pattern - validate captive dependencies but allow same-or-shorter lifetime overrides (singleton can override singleton, transient can override any)

2. **Class-based override adapter support**
   - What we know: `createAdapter()` supports both factory and class patterns
   - What's unclear: Should `.override()` API accept classes directly or only adapters?
   - Recommendation: Accept adapters only (created via `createAdapter()`) - keeps API simple, `createAdapter` already supports classes

3. **Override builder chainability vs array**
   - What we know: GraphBuilder uses `.provide(a).provide(b)` chain successfully
   - What's unclear: Should container use `.override(a).override(b)` or `.withOverrides([a, b])`?
   - Recommendation: Support both - `.override()` for single adapter (chainable), `.withOverrides()` for batch. Mirrors `provide()` and `provideMany()` pattern

## Sources

### Primary (HIGH confidence)

- GraphBuilder implementation: packages/graph/src/builder/builder.ts - Proven phantom type patterns, immutable builder
- Validation types: packages/graph/src/builder/types/provide.ts, merge.ts - Compile-time validation chains
- Port types: packages/core/src/ports/types.ts, factory.ts - Branded port identity, inference utilities
- createAdapter: packages/core/src/adapters/unified.ts - Unified adapter creation, supports factories and classes
- Container factory: packages/runtime/src/container/factory.ts - Current createContainer signature
- Override context: packages/runtime/src/container/override-context.ts - Existing string-based override implementation

### Secondary (MEDIUM confidence)

- Error message patterns: packages/graph/src/validation/types/errors.ts - Template literal error formats
- Inference utilities: packages/core/src/adapters/inference.ts - Adapter type extraction

### Tertiary (LOW confidence)

- None - all findings verified against codebase implementation

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - TypeScript built-ins, existing codebase patterns
- Architecture: HIGH - GraphBuilder demonstrates these patterns working at scale
- Pitfalls: HIGH - Documented from actual codebase challenges (depth limits, template literal complexity)

**Research date:** 2026-02-03
**Valid until:** 30 days (stable patterns, TypeScript features won't change)
