# Phase 9: Unified createAdapter - Research

**Researched:** 2026-02-02
**Domain:** TypeScript API design, DI adapter creation patterns
**Confidence:** HIGH

## Summary

This research covers the implementation of a unified `createAdapter()` function that accepts both factory functions and class constructors through a single API. The current codebase already has well-established patterns for adapter creation (`createAdapter`, `createAsyncAdapter`, `fromClass`, `createClassAdapter`) that this phase will consolidate.

The key insight is that the codebase uses function overloads extensively for type-safe APIs with defaults, branded error types for compile-time validation, and literal-typed constants for precise type inference. The unified API should follow these established patterns while adding mutual exclusion validation between `factory` and `class` properties.

**Primary recommendation:** Use overloads for the unified `createAdapter()` with conditional async detection, and branded error types for mutual exclusion validation between factory/class properties.

## Standard Stack

The unified API will use existing patterns and types from the codebase:

### Core Types (Already in Codebase)

| Type              | Location            | Purpose                    | Why Standard                         |
| ----------------- | ------------------- | -------------------------- | ------------------------------------ |
| `Adapter<...>`    | `adapters/types.ts` | Output adapter type        | Already handles all adapter variants |
| `Port<T, TName>`  | `ports/types.ts`    | Port token type            | Established port representation      |
| `Lifetime`        | `adapters/types.ts` | Lifetime union             | Validated enum type                  |
| `ResolvedDeps<T>` | `adapters/types.ts` | Dependency injection shape | Maps ports to instances              |

### Supporting Types (Already in Codebase)

| Type                  | Location                  | Purpose                         | When to Use      |
| --------------------- | ------------------------- | ------------------------------- | ---------------- |
| `InferService<P>`     | `ports/types.ts`          | Extract service type from port  | Type validation  |
| `InferPortName<P>`    | `ports/types.ts`          | Extract port name               | Error messages   |
| `TupleToUnion<T>`     | `utils/type-utilities.ts` | Convert requires tuple to union | Adapter creation |
| `InferenceError<...>` | `utils/type-utilities.ts` | Descriptive error types         | Debugging        |

### Constants (Already in Codebase)

| Constant                           | Location                | Purpose                 |
| ---------------------------------- | ----------------------- | ----------------------- |
| `SINGLETON`, `SCOPED`, `TRANSIENT` | `adapters/constants.ts` | Literal lifetime values |
| `SYNC`, `ASYNC`                    | `adapters/constants.ts` | Factory kind literals   |
| `FALSE`, `TRUE`                    | `adapters/constants.ts` | Literal boolean values  |
| `EMPTY_REQUIRES`                   | `adapters/constants.ts` | Empty frozen array      |

### Alternatives Considered

| Instead of                        | Could Use                               | Tradeoff                                                             |
| --------------------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| Overloads                         | Single signature with conditional types | Overloads produce cleaner error messages; conditionals more flexible |
| Branded error types               | `never` return                          | Branded errors are more informative for IDE tooltips                 |
| Separate factory/class validation | Discriminated union                     | Discriminated union requires a `type` discriminator field            |

**Installation:** No new dependencies needed - all types exist in `@hex-di/core`.

## Architecture Patterns

### Recommended Project Structure

```
packages/core/src/adapters/
├── factory.ts           # Unified createAdapter() + legacy createAsyncAdapter()
├── types.ts             # Adapter type, constraints
├── validation.ts        # NEW: Config validation types (mutual exclusion)
├── constants.ts         # Literal constants
├── from-class.ts        # fromClass() builder (uses createAdapter internally)
├── service.ts           # defineService() helper (uses createAdapter internally)
├── builder.ts           # ServiceBuilder class
├── inference.ts         # Type inference utilities
├── guards.ts            # Runtime type guards
├── lazy.ts              # Lazy port utilities
└── index.ts             # Public exports
```

### Pattern 1: Function Overloads for Type-Safe Defaults

**What:** Multiple function signatures with different type parameter combinations, implementation handles all cases.
**When to use:** When a function has optional parameters with defaults that affect return type.
**Example:**

```typescript
// Source: packages/core/src/adapters/factory.ts (lines 204-277)

// Overload 1: clonable undefined -> defaults to false literal
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
>(
  config: Omit<AdapterConfig<TProvides, TRequires, TLifetime, false>, "clonable"> & {
    clonable?: undefined;
  }
): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, Sync, False, TRequires>;

// Overload 2: clonable explicitly provided -> preserves literal type
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TLifetime extends Lifetime,
  const TClonable extends boolean,
>(
  config: AdapterConfig<TProvides, TRequires, TLifetime, TClonable> & {
    clonable: TClonable;
  }
): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, Sync, TClonable, TRequires>;

// Implementation handles all cases
export function createAdapter<...>(config: ...): Adapter<...> {
  // Runtime validation then construct adapter
}
```

### Pattern 2: Branded Error Types for Compile-Time Validation

**What:** Object types with `__error` and `__hint` properties that appear in IDE tooltips.
**When to use:** When type constraints fail and you want informative error messages.
**Example:**

```typescript
// Source: packages/graph/src/validation/types/error-messages.ts (lines 178-198)

export type MissingDependencyError<MissingPorts> = [MissingPorts] extends [never]
  ? never
  : {
      readonly __valid: false;
      readonly __errorBrand: "MissingDependencyError";
      readonly __message: `Missing dependencies: ${JoinPortNames<MissingPorts>}`;
      readonly __missing: MissingPorts;
    };

// For mutual exclusion, create similar pattern:
export type BothFactoryAndClassError = {
  readonly __error: "BothFactoryAndClassError";
  readonly __hint: "Provide either 'factory' or 'class', not both. Use 'factory' for custom instantiation logic, 'class' for constructor injection.";
};

export type NeitherFactoryNorClassError = {
  readonly __error: "NeitherFactoryNorClassError";
  readonly __hint: "Must provide either 'factory' (function that creates instance) or 'class' (constructor for dependency injection).";
};
```

### Pattern 3: Async Detection via Return Type

**What:** Detect async factory by checking if return type extends `Promise<T>`.
**When to use:** When a single function should auto-detect sync vs async behavior.
**Example:**

```typescript
// Unified detection approach
type IsAsyncFactory<TFactory> = TFactory extends (...args: never[]) => Promise<unknown>
  ? true
  : false;

// Use in overload return type
export function createAdapter<
  TProvides extends Port<unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TLifetime extends Lifetime,
  TFactory extends (
    deps: ResolvedDeps<TupleToUnion<TRequires>>
  ) => InferService<TProvides> | Promise<InferService<TProvides>>,
>(config: {
  provides: TProvides;
  requires?: TRequires;
  lifetime?: TLifetime;
  factory: TFactory;
}): Adapter<
  TProvides,
  TupleToUnion<TRequires>,
  IsAsyncFactory<TFactory> extends true ? "singleton" : TLifetime,
  IsAsyncFactory<TFactory> extends true ? Async : Sync,
  false,
  TRequires
>;
```

### Pattern 4: Conditional Config Type with Mutual Exclusion

**What:** Use conditional types to enforce that exactly one of `factory` or `class` is provided.
**When to use:** When two config properties are mutually exclusive.
**Example:**

```typescript
// Base config shared by both variants
interface BaseAdapterConfig<
  TProvides extends Port<unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
> {
  provides: TProvides;
  requires?: TRequires;  // Defaults to []
  lifetime?: Lifetime;   // Defaults to 'singleton'
  clonable?: boolean;    // Defaults to false
  finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}

// Factory variant - has factory, no class
interface FactoryAdapterConfig<
  TProvides extends Port<unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
> extends BaseAdapterConfig<TProvides, TRequires> {
  factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => InferService<TProvides> | Promise<InferService<TProvides>>;
  class?: never;  // Explicitly disallowed
}

// Class variant - has class, no factory
interface ClassAdapterConfig<
  TProvides extends Port<unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TClass extends new (...args: PortsToServices<TRequires>) => InferService<TProvides>,
> extends BaseAdapterConfig<TProvides, TRequires> {
  class: TClass;
  factory?: never;  // Explicitly disallowed
}

// Unified config is a discriminated union
type UnifiedAdapterConfig<...> = FactoryAdapterConfig<...> | ClassAdapterConfig<...>;
```

### Anti-Patterns to Avoid

- **Using `any` for config types:** Loses all type safety. Use proper generics with constraints.
- **Single signature with optional properties:** `factory?: F; class?: C` allows both/neither at compile time.
- **Checking mutual exclusion only at runtime:** User gets confusing TypeScript errors before hitting runtime.
- **Complex conditional return types in single overload:** Split into separate overloads for cleaner IDE errors.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                         | Don't Build                            | Use Instead                            | Why                                                       |
| ------------------------------- | -------------------------------------- | -------------------------------------- | --------------------------------------------------------- |
| Async factory detection         | Custom `typeof factory().then` check   | `ReturnType<T> extends Promise<...>`   | TypeScript's built-in inference handles generics properly |
| Constructor argument extraction | Manual tuple iteration                 | `PortsToServices<T>` from `service.ts` | Already handles Port to service type mapping              |
| Empty requires default          | `config.requires ?? []` with `never[]` | `EMPTY_REQUIRES` constant              | Frozen, properly typed as literal `readonly []`           |
| Literal boolean inference       | `config.clonable ?? false`             | `FALSE` constant + overload            | Preserves `false` literal type, not widened `boolean`     |
| Port name extraction            | String manipulation                    | `InferPortName<P>`                     | Works with branded types, handles errors                  |

**Key insight:** The codebase has solved these type inference problems already. Reuse the patterns in `factory.ts`, `service.ts`, and `constants.ts`.

## Common Pitfalls

### Pitfall 1: Type Widening with Defaults

**What goes wrong:** When `lifetime?: Lifetime` defaults to `"singleton"`, the type becomes `Lifetime` not `"singleton"`.
**Why it happens:** TypeScript infers the widest type compatible with the default value.
**How to avoid:** Use overloads where one branch has `lifetime?: undefined` returning `"singleton"` literal, another has `lifetime: TLifetime` preserving the literal.
**Warning signs:** Return type shows `"singleton" | "scoped" | "transient"` instead of just `"singleton"`.

### Pitfall 2: Tuple Type Inference for Requires Array

**What goes wrong:** `requires: [PortA, PortB]` infers as `Port<unknown, string>[]` not `[typeof PortA, typeof PortB]`.
**Why it happens:** Arrays widen to array types by default.
**How to avoid:** Use `const TRequires extends readonly Port<unknown, string>[]` with `const` modifier.
**Warning signs:** `adapter.requires[0]` has type `Port<unknown, string>` instead of specific port type.

### Pitfall 3: Async Factory Lifetime Enforcement

**What goes wrong:** Async adapter with `lifetime: "scoped"` compiles but causes runtime issues.
**Why it happens:** Async factories return promises that can't be re-awaited safely per-scope.
**How to avoid:** Type system should either reject non-singleton async adapters OR automatically coerce to singleton. Current codebase uses separate `createAsyncAdapter()` that doesn't accept lifetime.
**Warning signs:** User specifies `lifetime: "transient"` with async factory and gets no error.

### Pitfall 4: `never extends T` Always True

**What goes wrong:** `TResult extends CaptiveDependencyError<...>` matches when `TResult` is `never`.
**Why it happens:** `never` extends all types in TypeScript's type system.
**How to avoid:** Check `[TResult] extends [never]` first before checking specific error types.
**Warning signs:** Error messages for `never` cases produce garbage like `CaptiveErrorMessage<never, never, never, never>`.

### Pitfall 5: Class Constructor Typing for DI

**What goes wrong:** TypeScript can't verify that `requires` order matches constructor parameter order.
**Why it happens:** No structural relationship between Port tuple and constructor parameters.
**How to avoid:** Accept this as documented limitation (same as `fromClass()`). Use `PortsToServices<TRequires>` for constructor type and trust user to order correctly.
**Warning signs:** User puts ports in wrong order and gets runtime error with mismatched dependency types.

## Code Examples

Verified patterns from the existing codebase:

### Creating Adapter with Factory (Current Pattern)

```typescript
// Source: packages/core/src/adapters/factory.ts
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => new ConsoleLogger(),
});
```

### Creating Adapter from Class (Current Pattern)

```typescript
// Source: packages/core/src/adapters/service.ts (lines 551-602)
const UserServiceAdapter = createClassAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort], // Order matches constructor
  lifetime: "scoped",
  class: UserServiceImpl,
});
```

### Unified API Target (New Pattern)

```typescript
// Factory variant
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => new ConsoleLogger(),
  // lifetime defaults to 'singleton'
  // requires defaults to []
});

// Async factory (auto-detected, forces singleton)
const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  factory: async () => await loadConfig(),
  // lifetime automatically 'singleton' for async
});

// Class variant
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort],
  lifetime: "scoped",
  class: UserServiceImpl,
});

// Error: both factory and class
const Invalid = createAdapter({
  provides: LoggerPort,
  factory: () => new ConsoleLogger(),
  class: ConsoleLogger, // Error: BothFactoryAndClassError
});

// Error: neither factory nor class
const AlsoInvalid = createAdapter({
  provides: LoggerPort,
  // Error: NeitherFactoryNorClassError
});
```

### Runtime Validation Pattern

```typescript
// Source: packages/core/src/adapters/factory.ts (lines 66-172)
function assertValidAdapterConfig(config: {...}, isAsync: boolean): void {
  if (config.provides === null || config.provides === undefined) {
    throw new TypeError(
      "ERROR[HEX010]: Invalid adapter config: 'provides' is required."
    );
  }
  // ... more validations
}
```

### Extracting Services from Deps by Port Order

```typescript
// Source: packages/core/src/adapters/service.ts (lines 501-510)
function extractServicesInOrder<T extends readonly Port<unknown, string>[]>(
  deps: Record<string, unknown>,
  requires: T
): PortsToServices<T>;
function extractServicesInOrder(
  deps: Record<string, unknown>,
  requires: readonly Port<unknown, string>[]
): unknown[] {
  return requires.map(port => deps[port.__portName]);
}
```

## State of the Art

| Old Approach                               | Current Approach                     | When Changed | Impact                              |
| ------------------------------------------ | ------------------------------------ | ------------ | ----------------------------------- |
| `createAdapter()` + `createAsyncAdapter()` | Separate functions                   | Current      | Requires user to know which to call |
| `createClassAdapter()` helper              | Separate function from factory-based | Current      | Inconsistent API surface            |
| `fromClass()` builder pattern              | Separate entry point                 | Current      | Yet another way to create adapters  |
| Branded `__brand` symbols                  | Phantom types with `declare const`   | Established  | Zero runtime cost                   |

**Deprecated/outdated:**

- Nothing deprecated yet; this phase creates the unified replacement.

## Open Questions

Things that couldn't be fully resolved:

1. **Async Lifetime Warning vs Error**
   - What we know: Async factories should be singletons to avoid re-initialization.
   - What's unclear: Should `createAdapter({ lifetime: "scoped", factory: async () => ... })` be a compile error or silently coerce to singleton?
   - Recommendation: Error at compile time with branded error type. Phase 10 handles this.

2. **Class Property Name**
   - What we know: Decision is `class` (from CONTEXT.md).
   - What's unclear: `class` is a reserved word - may need quotes in object literals in some contexts.
   - Recommendation: Verified that TypeScript handles `{ class: MyClass }` syntax correctly. No issue.

3. **Finalizer Typing with Class Variant**
   - What we know: Finalizer receives `InferService<TProvides>`.
   - What's unclear: For class variant, should finalizer receive `InstanceType<TClass>` or `InferService<TProvides>`?
   - Recommendation: Keep as `InferService<TProvides>` for consistency. User declares port type, finalizer uses port type.

## Sources

### Primary (HIGH confidence)

- `packages/core/src/adapters/factory.ts` - Current createAdapter implementation
- `packages/core/src/adapters/types.ts` - Adapter type definition
- `packages/core/src/adapters/service.ts` - createClassAdapter implementation
- `packages/core/src/adapters/from-class.ts` - fromClass builder implementation
- `packages/core/src/ports/factory.ts` - createPort unified API (pattern reference)
- `packages/graph/src/validation/types/error-messages.ts` - Branded error type patterns

### Secondary (MEDIUM confidence)

- `packages/core/tests/builder.test.ts` - ServiceBuilder test patterns
- `packages/core/tests/from-class.test.ts` - Class-based adapter test patterns

### Tertiary (LOW confidence)

- None - all findings verified against codebase.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All types exist in codebase, patterns established
- Architecture: HIGH - Following existing patterns from createPort() and createAdapter()
- Pitfalls: HIGH - Identified from codebase patterns and TypeScript behavior
- Error types: HIGH - Existing pattern in graph package error-messages.ts

**Research date:** 2026-02-02
**Valid until:** Stable - patterns unlikely to change
