# ADR-GR-004: Parametric Adapter Templates

## Status

Proposed (Tier 3 -- Long-term)

## Context

Adapters in `@hex-di/graph` are concrete: each adapter is bound to specific ports at definition time. This means generic cross-cutting patterns -- caching, logging, retry, circuit-breaking -- must be manually re-implemented for every service they wrap. A "caching adapter" for `UserService` and a "caching adapter" for `ProductService` are two entirely separate adapter definitions, even though they share identical logic.

ML module systems (see [RES-05](../../../research/RES-05-module-systems-compositional-verification.md)) solve this through **functors**: modules parameterized by other modules. A functor takes a module signature as input and produces a new module. The classic example is a `Set` functor parameterized by an `Ord` module -- the functor produces a concrete `Set` implementation for any type that provides an ordering function.

Backpack (Finding 2 in RES-05) extends this with **indefinite packages**: packages with unfilled signatures that can be instantiated with different implementations. An indefinite package is parameterized by its module holes, which correspond directly to required ports in hex-di.

### Current behavior

```typescript
// Manually duplicated caching logic for each service
const CachedUserService = createAdapter({
  provides: [UserServicePort],
  requires: [UserRepositoryPort, CachePort],
  factory: (repo, cache) => ok(createCachedWrapper(repo, cache)),
  lifetime: SINGLETON,
});

const CachedProductService = createAdapter({
  provides: [ProductServicePort],
  requires: [ProductRepositoryPort, CachePort],
  factory: (repo, cache) => ok(createCachedWrapper(repo, cache)),
  lifetime: SINGLETON,
});
// Same pattern, different ports. Not composable.
```

### Desired behavior

```typescript
// Define the pattern once as a parametric template
const CachingTemplate = adapterTemplate({
  pattern: "caching",
  requires: [CachePort],
  factory: <TService>(service: TService, cache: Cache) => ok(createCachedWrapper(service, cache)),
});

// Instantiate for specific services
const CachedUserService = CachingTemplate.instantiate({
  provides: [UserServicePort],
  requires: [UserRepositoryPort],
  lifetime: SINGLETON,
});

const CachedProductService = CachingTemplate.instantiate({
  provides: [ProductServicePort],
  requires: [ProductRepositoryPort],
  lifetime: SINGLETON,
});
```

## Decision

**Introduce `AdapterTemplate<TRequires, TProvides>` as a higher-kinded adapter factory that produces concrete adapters when provided with specific dependency and provision ports. Templates encode cross-cutting adapter patterns as reusable, type-safe compositions.**

### Template definition

An adapter template separates the _pattern_ (shared logic) from the _binding_ (specific ports):

```typescript
interface AdapterTemplateConfig<
  TTemplateRequires extends ReadonlyArray<DirectedPort<string, unknown>>,
  TServiceConstraint,
> {
  readonly pattern: string;
  readonly requires: TTemplateRequires;
  readonly factory: <TService extends TServiceConstraint>(
    service: TService,
    ...templateDeps: InferServices<TTemplateRequires>
  ) => Result<TService, never>;
}

type AdapterTemplate<
  TTemplateRequires extends ReadonlyArray<DirectedPort<string, unknown>>,
  TServiceConstraint,
> = {
  readonly instantiate: <
    TProvides extends ReadonlyArray<DirectedPort<string, TServiceConstraint>>,
    TInstanceRequires extends ReadonlyArray<DirectedPort<string, unknown>>,
    TLifetime extends Lifetime,
  >(config: {
    readonly provides: TProvides;
    readonly requires: TInstanceRequires;
    readonly lifetime: TLifetime;
  }) => Adapter<TProvides, [...TInstanceRequires, ...TTemplateRequires], TLifetime>;
};
```

### Type-level guarantees

Templates enforce constraints at the type level:

1. **Service constraint**: The template's `TServiceConstraint` ensures only compatible services can be wrapped. A caching template that requires `{ getById(id: string): Promise<T> }` rejects services without that method shape.

2. **Transparent dependencies**: The instantiated adapter's `requires` tuple is the concatenation of instance-specific requires and template requires. The graph builder sees all dependencies and validates them normally.

3. **Operation completeness**: Because the template factory returns `TService` (the input type), the instantiated adapter inherits the operation completeness of its wrapped service. The template cannot silently drop methods.

### Template composition

Templates compose via chaining:

```typescript
const LoggedCachingTemplate = CachingTemplate.compose(LoggingTemplate);

// Equivalent to: service -> logging(caching(service))
const adapter = LoggedCachingTemplate.instantiate({
  provides: [UserServicePort],
  requires: [UserRepositoryPort],
  lifetime: SINGLETON,
});
```

Composition is associative: `(A.compose(B)).compose(C)` produces the same adapter type as `A.compose(B.compose(C))`. This aligns with the functor composition law from [RES-05](../../../research/RES-05-module-systems-compositional-verification.md), Finding 1 (F-ing Modules).

### Graph builder integration

Instantiated templates are standard adapters. No changes to `GraphBuilder.provide()` are needed:

```typescript
const graph = GraphBuilder.create()
  .provide(CachedUserService) // standard adapter from template
  .provide(CachedProductService) // another instantiation
  .provide(cacheAdapter) // template dependency
  .build();
```

The graph builder validates all dependencies, including those introduced by the template (e.g., `CachePort`), using the existing type-level validation pipeline.

### Relationship to ML functors

| ML Concept          | hex-di Equivalent        |
| ------------------- | ------------------------ |
| Module signature    | Port interface           |
| Module structure    | Adapter                  |
| Functor             | `AdapterTemplate`        |
| Functor application | `template.instantiate()` |
| Functor composition | `template.compose()`     |
| Sharing constraint  | `TServiceConstraint`     |

The key limitation vs. ML functors: TypeScript lacks higher-kinded types, so the template cannot be fully polymorphic over the service type at the definition site. The `TServiceConstraint` bound provides a practical approximation.

## Consequences

### Positive

1. **DRY cross-cutting patterns**: Caching, logging, retry, metrics, and similar concerns are defined once and applied to any compatible service.
2. **Type-safe composition**: Template composition preserves all type constraints. The graph builder validates the composed result exactly as it would a hand-written adapter.
3. **Discoverable patterns**: Templates with named `pattern` strings are searchable in the codebase and documentable as standard architectural patterns.
4. **Testable in isolation**: A template's factory can be unit-tested with mock services and dependencies, independent of any specific service.

### Negative

1. **Higher-kinded type limitations**: TypeScript cannot express `Template<F<_>>` where `F` is a type constructor. The `TServiceConstraint` bound is a workaround that limits expressiveness compared to ML functors.
2. **Indirection cost**: Template instantiation adds a layer of indirection. Debugging a cached, logged adapter requires understanding both the template chain and the underlying service.
3. **Naming conventions**: Teams must establish naming conventions to distinguish templates from concrete adapters (e.g., `CachingTemplate` vs. `CachedUserService`).
4. **Error message depth**: When a template instantiation fails type checking, the error involves the template's generic constraints, the instance's ports, and the graph builder's validation -- a deep stack of conditional types.

### Neutral

1. **No runtime overhead**: Template instantiation happens at module load time. The produced adapter is a standard adapter object with no additional runtime wrapping.
2. **Incremental adoption**: Templates are opt-in. Existing concrete adapters continue to work unchanged. Teams adopt templates when they identify repeated patterns.
3. **Composition law testing**: Template composition laws (associativity, identity) can be verified with property-based tests, extending the graph law tests from [BEH-GR-07](../behaviors/07-graph-law-tests.md).

## References

- [BEH-GR-05](../behaviors/05-operation-completeness.md): Operation Completeness behavior
- [BEH-GR-07](../behaviors/07-graph-law-tests.md): Graph Composition Law Tests
- [ADR-GR-001](./001-operation-completeness-strategy.md): Operation Completeness Strategy
- [RES-05](../../../research/RES-05-module-systems-compositional-verification.md): Module Systems & Compositional Verification
