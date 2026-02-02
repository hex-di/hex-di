# Phase 4: API Ergonomics - Research

**Researched:** 2026-02-01
**Domain:** TypeScript Fluent Builder Pattern / DI API Design
**Confidence:** HIGH

## Summary

This phase implements a fluent builder API for service definition and a class-based adapter helper. The research focused on TypeScript patterns for type-safe method chaining, analyzing the existing codebase architecture, and identifying the correct approach for the builder implementation.

The HexDI codebase already demonstrates an excellent fluent builder pattern in `GraphBuilder` (packages/graph/src/builder/builder.ts). This builder uses phantom type parameters and immutable state evolution to track type information through method chains. The same pattern should be applied to the new `defineService()` builder API.

Key insight: The existing `defineService()` returns a `[Port, Adapter]` tuple. The new builder should follow the same pattern - a fluent chain that terminates with `.factory()` and returns the same tuple type.

**Primary recommendation:** Implement a ServiceBuilder class with phantom types that accumulates configuration through method chaining, using the same patterns as GraphBuilder. The `.factory()` method returns `readonly [Port, Adapter]` to maintain API consistency.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library    | Version | Purpose                     | Why Standard                       |
| ---------- | ------- | --------------------------- | ---------------------------------- |
| TypeScript | 5.x     | Static typing and inference | Already in use throughout codebase |
| None       | N/A     | No external dependencies    | @hex-di/core is zero-dependency    |

### Supporting

No external libraries needed - this is pure TypeScript type-level programming.

### Alternatives Considered

| Instead of          | Could Use                         | Tradeoff                                                                                  |
| ------------------- | --------------------------------- | ----------------------------------------------------------------------------------------- |
| Class-based builder | Function-based builder            | Class enables clear phantom type tracking; functions require more complex type gymnastics |
| Return tuple        | Return object `{ port, adapter }` | Tuple matches existing `defineService()` API; changing would be a breaking change         |

**Installation:**

```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure

```
packages/core/src/adapters/
├── types.ts           # Existing Adapter types
├── factory.ts         # Existing createAdapter
├── service.ts         # Enhanced with builder entry point
├── builder.ts         # NEW: ServiceBuilder class
└── from-class.ts      # NEW: fromClass() helper
```

### Pattern 1: Phantom Type State Machine (from GraphBuilder)

**What:** Use type parameters to encode builder state at compile time
**When to use:** When building type-safe fluent APIs
**Example:**

```typescript
// Source: packages/graph/src/builder/builder.ts lines 262-268
export class GraphBuilder<
  TProvides = never,
  TRequires = never,
  out TAsyncPorts = never,
  out TOverrides = never,
  TInternalState extends AnyBuilderInternals = DefaultInternals,
> {
  // Type parameters change with each method call
}
```

### Pattern 2: Literal Type Constants (from constants.ts)

**What:** Use literal-typed constants to ensure type narrowing works without `as const`
**When to use:** For lifetime values, factory kinds, and booleans in adapter configs
**Example:**

```typescript
// Source: packages/core/src/adapters/constants.ts lines 34-58
export const SINGLETON = literal("singleton");
export const SCOPED = literal("scoped");
export const TRANSIENT = literal("transient");

// Type aliases for signatures
export type Singleton = typeof SINGLETON;
export type Scoped = typeof SCOPED;
```

### Pattern 3: Immutable Builder (from GraphBuilder)

**What:** Each method returns a NEW builder instance with updated types
**When to use:** For predictable type evolution and preventing runtime mutation bugs
**Example:**

```typescript
// Each provide() returns new instance, types accumulate
provide<A>(adapter: A): ProvideResult<...>;
provide<A>(adapter: A): GraphBuilder<...> {
  const state = addAdapter(this, adapter);
  return GraphBuilder.fromState(state);  // NEW instance
}
```

### Pattern 4: Curried Port Creation (from port factory)

**What:** Split type parameters across function calls for partial inference
**When to use:** When you want user to specify only some type parameters
**Example:**

```typescript
// Source: packages/core/src/ports/factory.ts lines 181-185
export function port<TService>() {
  return <const TName extends string>(name: TName): Port<TService, TName> => {
    return unsafeCreatePort<TService, TName>(name);
  };
}
// Usage: port<Logger>()("Logger") - only service type specified
```

### Anti-Patterns to Avoid

- **Mutable builder state:** Don't mutate internal state; return new instances
- **Type casting:** The CLAUDE.md explicitly forbids `as X` - use proper type inference
- **Any types:** CLAUDE.md forbids `any` - use `unknown` with guards or proper generics
- **Breaking existing API:** `defineService()` must continue working unchanged

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                | Don't Build                     | Use Instead                                    | Why                                          |
| ---------------------- | ------------------------------- | ---------------------------------------------- | -------------------------------------------- |
| Literal type constants | Inline strings with `as const`  | Existing `SINGLETON`, `SCOPED`, etc. constants | Already typed correctly, ensures consistency |
| Port creation          | Custom port object construction | `createPort()` from existing factory           | Handles phantom types correctly              |
| Adapter creation       | Manual adapter object assembly  | `createAdapter()` from existing factory        | Includes validation, freezing, proper typing |
| Tuple to union         | Custom type utility             | `TupleToUnion` from utils                      | Already tested and correct                   |
| Empty deps type        | `Record<string, never>`         | `EmptyDeps` from types.ts                      | Has correct brand to prevent key access      |

**Key insight:** The builder should compose existing primitives (`createPort`, `createAdapter`, constants) rather than reimplementing their logic.

## Common Pitfalls

### Pitfall 1: Losing Type Inference in Method Chains

**What goes wrong:** Type parameters get widened to `unknown` or `never` through the chain
**Why it happens:** Each method needs to capture and propagate generic parameters correctly
**How to avoid:**

- Use `const` modifiers on type parameters where needed: `<const TName extends string>`
- Ensure method return types explicitly include all accumulated type parameters
- Test type inference with IDE hover - types should be specific, not widened
  **Warning signs:** IDE shows `unknown`, `never`, or overly wide types at chain end

### Pitfall 2: Factory Function Type Not Matching Dependencies

**What goes wrong:** Factory receives wrong deps type; doesn't match declared requires
**Why it happens:** `ResolvedDeps<TRequires>` must be computed correctly from the requires array
**How to avoid:**

- Use `TupleToUnion` to convert requires tuple to union for `ResolvedDeps`
- Ensure the `TRequires` type parameter tracks the exact port tuple type
- Test that deps parameter has correct keys and value types
  **Warning signs:** Factory `deps` has `Record<string, unknown>` instead of specific port names

### Pitfall 3: Inconsistent Return Types Between Builder and Direct API

**What goes wrong:** Builder returns different type than `defineService()` config-based API
**Why it happens:** Builder and direct API implemented separately, types drift
**How to avoid:**

- Both paths should produce identical `Adapter<...>` types
- Share type computation logic where possible
- Write comparison tests between builder and config approaches
  **Warning signs:** Same logical service definition produces different adapter types

### Pitfall 4: fromClass Constructor Args Not Matching Requires Order

**What goes wrong:** Constructor receives dependencies in wrong order
**Why it happens:** Object destructuring doesn't preserve order; requires array does
**How to avoid:**

- Use `PortsToServices<TRequires>` (already exists in service.ts) for constructor args
- Constructor params must match requires array order exactly
- Document this ordering requirement clearly
  **Warning signs:** Services receive wrong dependencies at runtime despite type checking

### Pitfall 5: Breaking Backward Compatibility

**What goes wrong:** Existing `defineService()` calls fail after changes
**Why it happens:** Adding builder pattern changes function signature or overload order
**How to avoid:**

- Keep ALL existing overloads unchanged
- Add new overload for builder entry point (no config parameter)
- Test all existing example code still compiles
  **Warning signs:** Existing code in examples/ or tests fails to compile

## Code Examples

Verified patterns from the codebase:

### Existing defineService Usage (packages/core/src/adapters/service.ts)

```typescript
// Source: service.ts lines 60-70
export function defineService<const TName extends string, TService>(
  name: TName,
  config: {
    factory: (deps: Record<string, unknown>) => TService;
    clonable?: undefined;
    finalizer?: (instance: TService) => void | Promise<void>;
  }
): readonly [
  Port<TService, TName>,
  Adapter<Port<TService, TName>, never, Singleton, "sync", false, EmptyRequires>,
];
```

### Existing createClassAdapter Pattern (packages/core/src/adapters/service.ts)

```typescript
// Source: service.ts lines 467-479
export function createClassAdapter<
  TProvides extends Port<TService, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
  TService,
>(config: {
  provides: TProvides;
  requires: TRequires;
  lifetime: TLifetime;
  class: new (...args: PortsToServices<TRequires>) => TService;
  clonable?: undefined;
  finalizer?: (instance: TService) => void | Promise<void>;
}): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, "sync", false, TRequires>;
```

### Proposed Builder API (target pattern)

```typescript
// Target API from requirements:
// defineService<Logger>('Logger').singleton().factory(() => new ConsoleLogger())

// Implementation approach:
class ServiceBuilder<
  TService,
  TName extends string,
  TRequires extends readonly Port<unknown, string>[] = readonly [],
  TLifetime extends Lifetime = "singleton",  // default
> {
  // Phantom types, immutable instance

  singleton(): ServiceBuilder<TService, TName, TRequires, "singleton">;
  scoped(): ServiceBuilder<TService, TName, TRequires, "scoped">;
  transient(): ServiceBuilder<TService, TName, TRequires, "transient">;

  requires<const TPorts extends readonly Port<unknown, string>[]>(
    ...ports: TPorts
  ): ServiceBuilder<TService, TName, TPorts, TLifetime>;

  factory(
    fn: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TService
  ): readonly [Port<TService, TName>, Adapter<...>];
}
```

### Proposed fromClass API

```typescript
// Target API from requirements:
// fromClass(MyClass).as<MyInterface>('Name').scoped()

// Implementation approach:
function fromClass<TClass extends new (...args: unknown[]) => unknown>(
  cls: TClass
): ClassAdapterBuilder<InstanceType<TClass>, ConstructorParameters<TClass>>;

class ClassAdapterBuilder<TInstance, TArgs extends readonly unknown[]> {
  as<TInterface, const TName extends string>(
    name: TName
  ): ClassServiceBuilder<TInterface, TName, TArgs>;

  // Terminal: creates [Port, Adapter] tuple
}
```

## State of the Art

| Old Approach       | Current Approach              | When Changed                   | Impact                                            |
| ------------------ | ----------------------------- | ------------------------------ | ------------------------------------------------- |
| Multiple overloads | Single config object          | Current                        | Overloads still used for type inference precision |
| Mutable builders   | Immutable with type evolution | Current (GraphBuilder pattern) | Better type safety, no mutation bugs              |

**Deprecated/outdated:**

- None identified - this is greenfield API addition

## Open Questions

Things that couldn't be fully resolved:

1. **Builder Entry Point Design**
   - What we know: Need to call `defineService<T>('name')` to start builder
   - What's unclear: Should this be a new overload of `defineService()` or a separate function?
   - Recommendation: Add new overload to `defineService()` - when called with only name (no config), returns builder. This maintains single entry point and is backward compatible.

2. **Async Service Builder**
   - What we know: Need to handle async factories (always singleton per existing rules)
   - What's unclear: Should there be `.asyncFactory()` or separate `defineAsyncService()` builder?
   - Recommendation: Add `.asyncFactory()` method that forces singleton lifetime and returns async adapter type. Mirrors existing `defineAsyncService()` function.

3. **fromClass Dependency Inference**
   - What we know: Constructor parameters define the requires order
   - What's unclear: How to map constructor param types back to Port types?
   - Recommendation: Require explicit `.requires(PortA, PortB)` call to match constructor order. TypeScript cannot infer Port from parameter type alone. Document clearly that requires order MUST match constructor parameter order.

## Sources

### Primary (HIGH confidence)

- packages/core/src/adapters/service.ts - Existing defineService, createClassAdapter implementations
- packages/core/src/adapters/factory.ts - createAdapter, createAsyncAdapter implementations
- packages/core/src/adapters/types.ts - Adapter type definition with all parameters
- packages/core/src/adapters/constants.ts - Literal type constants
- packages/graph/src/builder/builder.ts - GraphBuilder fluent pattern reference
- packages/core/src/ports/factory.ts - Port creation and curried pattern

### Secondary (MEDIUM confidence)

- packages/core/src/utils/type-utilities.ts - TupleToUnion, Prettify utilities
- .planning/REQUIREMENTS.md - API-01 through API-06 requirements

### Tertiary (LOW confidence)

- None - all findings verified against codebase

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - No external dependencies, pure TypeScript patterns
- Architecture: HIGH - Directly mirrors existing GraphBuilder pattern in codebase
- Pitfalls: HIGH - Derived from analyzing existing implementation complexity

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable TypeScript patterns)
