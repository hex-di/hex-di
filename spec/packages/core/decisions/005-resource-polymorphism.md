# ADR-CO-005: Resource Polymorphism

## Status

Proposed (Tier 3)

## Context

Some adapters own resources that require deterministic cleanup (database connections, file handles, HTTP clients), while others are pure computations with no disposal obligations (validators, formatters, in-memory caches). The container must handle both uniformly, but the current type system does not distinguish between them.

Resource polymorphism (see [RES-03](../../../research/RES-06-contracts-blame-gradual-typing.md), Finding 4: Munch-Maccagnoni 2018) formalizes code that is generic over whether a resource needs deterministic cleanup. It synthesizes RAII (Rust/C++) with garbage collection (OCaml/Haskell), allowing a single abstraction to work with both managed and unmanaged resources without specialization.

### Current behavior

```typescript
// Disposal is optional and untyped -- the container calls dispose() if present
const dbAdapter = createAdapter({
  provides: [DatabasePort],
  factory: () => ok(createPool()),
  lifetime: SINGLETON,
  dispose: pool => pool.end(), // optional
});

const validatorAdapter = createAdapter({
  provides: [ValidatorPort],
  factory: () => ok(createValidator()),
  lifetime: SINGLETON,
  // No dispose -- no cleanup needed
});

// Problem: nothing at the type level distinguishes these two cases.
// A consumer of DatabasePort doesn't know it holds a disposable resource.
// A scope can close without the type system warning about undisposed resources.
```

### Desired behavior

```typescript
// Type-level tracking of disposal obligations
type DatabasePort = Port<"Database", DatabaseService, "disposable">;
type ValidatorPort = Port<"Validator", ValidatorService, "non-disposable">;

// Container tracks aggregate disposal obligations
const scope: Scope<[DatabasePort]>; // knows it holds disposable resources
// scope.close() is required -- type error if omitted in strict mode
```

## Decision

**Introduce type-level resource tracking via `Disposable<T>` and `NonDisposable<T>` phantom brands, propagated through the adapter and container type signatures.**

### Resource kind encoding

Adapters declare their resource kind through the presence or absence of a `dispose` callback. The type system infers the resource kind:

```typescript
type ResourceKind = "disposable" | "non-disposable";

// Phantom-branded service wrappers
type Disposable<T> = T & { readonly [DisposableBrand]: true };
type NonDisposable<T> = T & { readonly [NonDisposableBrand]: true };
type AnyResource<T> = Disposable<T> | NonDisposable<T>;

// createAdapter infers the resource kind from the config shape
function createAdapter<
  TProvides extends ReadonlyArray<DirectedPort<string, unknown>>,
  TConfig extends AdapterConfig<TProvides>,
>(
  config: TConfig
): TConfig extends { dispose: (...args: ReadonlyArray<unknown>) => unknown }
  ? DisposableAdapter<TProvides>
  : NonDisposableAdapter<TProvides>;
```

### Port-level resource declaration

Ports can optionally declare their expected resource kind. When declared, `createAdapter` verifies consistency:

```typescript
const DatabasePort = port<DatabaseService>()({
  name: "Database",
  direction: "outbound",
  resource: "disposable", // adapter MUST provide dispose()
});

const ValidatorPort = port<ValidatorService>()({
  name: "Validator",
  direction: "inbound",
  resource: "non-disposable", // adapter MUST NOT provide dispose()
});

// Resource-polymorphic port: adapter may or may not be disposable
const CachePort = port<CacheService>()({
  name: "Cache",
  direction: "outbound",
  // resource omitted = resource-polymorphic
});
```

### Container disposal tracking

The container's type accumulates disposal obligations as adapters are registered:

```typescript
type ContainerDisposalState<TAdapters extends ReadonlyArray<Adapter>> =
  Extract<TAdapters[number], DisposableAdapter<ReadonlyArray<unknown>>> extends never
    ? "no-disposal-needed"
    : "disposal-required";

// Container type carries its disposal state
interface Container<TState extends "no-disposal-needed" | "disposal-required"> {
  resolve<N extends string, T>(port: Port<N, T>): Result<T, ResolutionError>;
  dispose: TState extends "disposal-required" ? () => Promise<void> : never;
}
```

When a container holds only non-disposable adapters, `dispose()` is absent from its type (typed as `never`). When any disposable adapter is registered, `dispose()` becomes available and -- through linting or custom type rules -- required before the container goes out of scope.

### Scope-level resource polymorphism

Scoped containers inherit and extend their parent's disposal tracking:

```typescript
// Parent has no disposable resources
const parent: Container<"no-disposal-needed"> = createContainer(nonDisposableAdapters);

// Scoped child adds a disposable adapter
const child = parent.createScope(disposableAdapters);
// child: Scope<"disposal-required">

// Type-level reminder: child.dispose() must be called
// Forgetting to call it is detectable by lint rules checking for unused disposal obligations
```

### Resource-polymorphic adapter composition

Decorators and wrappers are resource-polymorphic -- they preserve the disposal kind of the inner adapter:

```typescript
// A logging decorator does not change disposal obligations
function withLogging<T, R extends ResourceKind>(adapter: Adapter<T, R>): Adapter<T, R> {
  // R is preserved: if the inner adapter is disposable, the decorated adapter is too
  return {
    ...adapter,
    factory: (...deps) => {
      const result = adapter.factory(...deps);
      return result.map(service => wrapWithLogging(service));
    },
    // dispose is forwarded if present, absent if absent
    ...(adapter.dispose ? { dispose: adapter.dispose } : {}),
  };
}
```

## Consequences

### Positive

1. **Compile-time leak detection**: Missing `dispose()` calls on containers with disposable resources produce type errors (or lint warnings)
2. **Resource-safe composition**: Decorators that wrap disposable adapters inherit disposal obligations automatically
3. **Self-documenting**: Port declarations make resource requirements explicit in the API
4. **Sound polymorphism**: Resource-polymorphic code (decorators, generic wrappers) works uniformly with both resource kinds, validated by Munch-Maccagnoni's theory

### Negative

1. **Type complexity**: Phantom brands add depth to adapter and container type signatures. IDE tooltips may become harder to read.
2. **Breaking change**: Adding a `resource` parameter to port definitions changes the port factory API. Existing ports without `resource` default to resource-polymorphic (backward compatible at runtime, type-level change only).
3. **Disposal enforcement limits**: TypeScript cannot enforce that `dispose()` is actually called before a container reference is dropped. Lint rules can approximate this, but true linear type enforcement is beyond TypeScript's capabilities.
4. **Decorator burden**: Every adapter decorator must correctly propagate the disposal callback. A decorator that accidentally drops `dispose` changes the resource kind, which may not produce an error until the container is used.

### Neutral

1. **Gradual adoption**: Ports without `resource` declarations remain resource-polymorphic. Teams can add resource annotations incrementally.
2. **Runtime fallback**: The container's runtime disposal logic remains unchanged -- it calls `dispose()` if present, skips if absent. The type-level tracking is an additional safety layer, not a replacement.

## References

- [RES-03](../../../research/RES-03-linear-affine-types-resource-lifecycle.md): Linear & Affine Types for Resource Lifecycle Management (Finding 4: Resource Polymorphism)
- [RES-03](../../../research/RES-03-linear-affine-types-resource-lifecycle.md): Linear & Affine Types for Resource Lifecycle Management (Finding 1: Linear Haskell)
- [ADR-CO-003](./003-disposal-state-phantom-types.md): Disposal State Phantom Types
