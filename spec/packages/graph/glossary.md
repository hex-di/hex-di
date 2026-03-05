# Glossary

Terminology used throughout the `@hex-di/graph` specification.

## GraphBuilder

A fluent builder class that assembles adapter registrations into a validated dependency graph. Created via `GraphBuilder.create()`. Each `.provide()` call returns a new builder instance with updated type state. `.build()` runs all validations and produces an immutable `Graph`. See [BEH-GR-01](behaviors/01-builder-api.md).

## Dependency Graph

A directed acyclic graph (DAG) where nodes are port names and edges are adapter dependency relationships. An edge from port A to port B means "the adapter providing A requires B". The graph encodes the complete resolution order for the DI container. See [BEH-GR-01](behaviors/01-builder-api.md).

## Cycle Detection

Identification of circular dependency chains in the graph where port A requires B, B requires C, and C requires A. Implemented at two levels: compile-time (type-level DFS that produces type errors) and runtime (Tarjan's algorithm as a fallback). Cycles make resolution impossible without lazy initialization. See [BEH-GR-02](behaviors/02-cycle-detection.md).

## Captive Dependency

A lifetime violation where a longer-lived adapter (e.g., singleton) depends on a shorter-lived adapter (e.g., transient). The singleton "captures" the transient instance, preventing it from being recreated as intended. Detected via a lifetime hierarchy: `singleton > scoped > transient`. See [BEH-GR-03](behaviors/03-captive-dependency-detection.md).

## Operation Completeness

A verification that an adapter provides implementations for all methods declared by its port interface. Inspired by ML module system signature matching (RES-05). A "partially implemented" adapter is detected at build time rather than failing at runtime when an unimplemented method is called. See [BEH-GR-05](behaviors/05-operation-completeness.md) and [ADR-GR-001](decisions/001-operation-completeness-strategy.md).

## Well-Founded Cycle

A dependency cycle that can be safely resolved through lazy initialization. The cycle must have at least one edge annotated with `lazyPort()`, and all lazy edges must point to services that are fully constructed before their methods are called. Named after "well-founded" relations in mathematics where infinite descending chains are impossible. See [BEH-GR-08](behaviors/08-well-founded-cycles.md).

## Composition Law

A mathematical property that graph operations must satisfy for reliable composition. Key laws: merge associativity (`(A.merge(B)).merge(C) ≡ A.merge(B.merge(C))`), merge identity (merging an empty graph is a no-op), and provide idempotence (providing the same adapter twice is equivalent to providing it once). Verified via property-based testing (RES-07). See [BEH-GR-07](behaviors/07-graph-law-tests.md).

## Topological Sort

An ordering of graph nodes such that for every directed edge (A → B), A appears before B. Used to determine initialization order (dependencies first) and disposal order (dependents first). The graph must be a DAG for topological sort to exist. See [BEH-GR-09](behaviors/09-init-order-verification.md).

## Effect Propagation

The flow of error types through the dependency graph. If adapter A depends on adapter B, and B's factory can fail with error `E`, then A's resolution can also fail with `E` (transitively). Effect propagation analysis determines the complete error profile for resolving any port in the graph. See [BEH-GR-10](behaviors/10-effect-propagation.md).

## Parametric Adapter Template

An adapter definition parameterized by other adapters, analogous to ML functors (RES-05). A parametric template takes adapter specifications as type parameters and produces a concrete adapter. Enables generic adapter patterns like "cache any service" or "log all calls to any service". See [ADR-GR-004](decisions/004-parametric-adapter-templates.md).
