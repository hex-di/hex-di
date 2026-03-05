# ADR-GR-003: Full Type-Level Graph Topology

## Status

Proposed (Tier 3 -- Long-term)

## Context

The `@hex-di/graph` builder already uses phantom type parameters to track provided ports, required ports, and a type-level adjacency map for cycle detection. However, this coverage is partial. The type-level dependency graph (`TDepGraph`) encodes edges for DFS cycle detection but does not represent the full topology needed for:

1. **Completeness checking**: verifying that every required port has a provider, accounting for transitive dependencies through the full graph shape.
2. **Topological ordering**: computing a type-level initialization order that respects all dependency edges.
3. **Captive dependency detection**: verifying lifetime constraints across the full transitive closure, not just direct edges.
4. **Subgraph extraction**: determining at the type level which adapters are reachable from a given port.

These properties are currently verified at runtime during `.build()`. Runtime checks serve as a safety net, but they defer error discovery to execution time. In large applications, this means developers encounter graph violations only when they run their program or test suite, not when they save a file.

Refinement type theory (see [RES-08](../../../research/RES-08-refinement-dependent-types-graph-safety.md)) demonstrates that graph invariants -- acyclicity, completeness, uniqueness -- are expressible as predicates over graph structures. TypeScript's conditional types, mapped types, and template literal types form a limited refinement type system. This ADR explores encoding the full graph topology in TypeScript types to push all verifiable invariants to compile time.

### TypeScript recursion limits

TypeScript imposes a recursion depth limit on conditional types. As of TypeScript 5.x, the effective limit is approximately 50 levels of recursive type instantiation before the compiler emits a "Type instantiation is excessively deep and possibly infinite" error. This constrains type-level graph algorithms:

- **DFS traversal**: Each visited node consumes one recursion level. A graph with a longest path of 50 nodes exhausts the budget.
- **Topological sort**: Kahn's algorithm requires iterating once per node. For N nodes, this requires N recursion levels.
- **Transitive closure**: Floyd-Warshall requires O(N^3) steps -- infeasible at the type level for any non-trivial graph.

The current `GraphBuilder` addresses this via `withMaxDepth<N>()` and `withExtendedDepth()`, which cap DFS depth and degrade gracefully. Full topology encoding must adopt similar strategies.

### Current behavior

```typescript
const graph = GraphBuilder.create()
  .provide(adapterA) // provides PortA, requires PortB
  .provide(adapterB) // provides PortB, requires PortC
  .build();
// Compile-time: checks PortC is missing (via UnsatisfiedDependencies)
// Compile-time: checks no cycles in TDepGraph (via DFS)
// Runtime: checks captive dependencies, full transitive closure
```

### Desired behavior

```typescript
const graph = GraphBuilder.create().provide(adapterA).provide(adapterB).build();
// Compile-time: ALL of the following verified in types:
//   - Missing providers (completeness)
//   - Cycle freedom (DFS over full topology)
//   - Captive dependency violations (lifetime comparison over transitive edges)
//   - Initialization order derivable from TopologicalOrder<TGraph>
```

## Decision

**Introduce a type-level graph representation `GraphShape<TNodes, TEdges>` that encodes the full topology, with recursive conditional types for DFS traversal, topological sorting, and completeness checking. Apply depth-bounded computation with runtime fallback.**

### Type-level graph encoding

The graph is represented as two type-level structures:

```typescript
// Node set: mapping from port name to node metadata
type GraphNodes = {
  readonly [PortName in string]: {
    readonly lifetime: "singleton" | "scoped" | "transient";
    readonly provides: string;
    readonly requires: ReadonlyArray<string>;
  };
};

// Full graph shape: nodes plus derived edge information
type GraphShape<TNodes extends GraphNodes> = {
  readonly nodes: TNodes;
  readonly edges: DeriveEdges<TNodes>;
};
```

### Depth-bounded DFS

Type-level DFS uses a counter type to track recursion depth. When the counter reaches zero, the algorithm returns an "unknown" result instead of diverging:

```typescript
type DFS<
  TGraph extends GraphNodes,
  TNode extends string,
  TVisited extends string,
  TDepth extends ReadonlyArray<unknown>,
> = TDepth extends []
  ? "DEPTH_EXCEEDED" // Graceful degradation
  : TNode extends TVisited
    ? "CYCLE_DETECTED"
    : TGraph[TNode]["requires"][number] extends infer TDep extends string
      ? DFS<TGraph, TDep, TVisited | TNode, Pop<TDepth>>
      : "OK";
```

### Type-level topological sort

Topological sort at the type level uses iterative source removal (Kahn's algorithm adapted for types). At each step, nodes with no incoming edges are "removed" and appended to the result:

```typescript
type TopologicalOrder<
  TGraph extends GraphNodes,
  TRemaining extends string = keyof TGraph & string,
  TAcc extends ReadonlyArray<string> = [],
  TDepth extends ReadonlyArray<unknown> = BuildCounter<50>,
> = TDepth extends []
  ? TAcc // Depth exceeded: return partial order
  : FindSources<TGraph, TRemaining> extends infer TSources extends string
    ? [TSources] extends [never]
      ? TAcc // No sources and nodes remain: cycle (caught elsewhere)
      : TopologicalOrder<TGraph, Exclude<TRemaining, TSources>, [...TAcc, TSources], Pop<TDepth>>
    : TAcc;
```

### Completeness checking

A type-level predicate that verifies every required port has a provider in the graph:

```typescript
type IsComplete<TGraph extends GraphNodes> = {
  [K in keyof TGraph]: TGraph[K]["requires"][number] extends keyof TGraph ? true : false;
}[keyof TGraph] extends true
  ? true
  : false;
```

### Recursion budget allocation

For a graph with N nodes, the available recursion budget (~50 levels) must be shared across all type-level computations triggered by a single `.provide()` call. The budget is allocated as:

| Computation           | Budget    | Justification                     |
| --------------------- | --------- | --------------------------------- |
| Cycle detection (DFS) | 30 levels | Longest expected dependency chain |
| Captive checking      | 10 levels | Direct + one level of transitive  |
| Completeness          | 5 levels  | Single pass over requires         |
| Reserved              | 5 levels  | Framework overhead                |

For graphs exceeding these bounds, `withMaxDepth<N>()` allows users to increase the budget (up to ~100 with `withExtendedDepth()`), accepting slower type-checking.

### Fallback strategy

Every type-level check has a corresponding runtime check in `.build()`:

1. Type-level computation runs with bounded depth.
2. If depth is exceeded, the type degrades to a warning (not an error).
3. Runtime validation in `.build()` performs the same check without depth limits.
4. Users see runtime errors only for graphs too large for type-level verification.

## Consequences

### Positive

1. **Compile-time safety**: Graph violations surface as red squiggles in the IDE, not as runtime errors during integration testing.
2. **Documentation in types**: The graph shape type serves as machine-readable documentation of the dependency topology.
3. **Refactoring confidence**: Removing or changing an adapter immediately shows all affected dependencies as type errors.
4. **Incremental adoption**: The depth-bounded approach means small-to-medium graphs get full compile-time coverage while large graphs degrade gracefully.

### Negative

1. **IDE performance**: Complex recursive conditional types slow down TypeScript's language server. Graphs with 30+ adapters may cause noticeable IDE lag.
2. **Type error readability**: When type-level DFS detects a cycle, the resulting error is a deeply nested conditional type, not a human-readable message. Custom error types with template literals mitigate this but do not fully solve it.
3. **TypeScript version coupling**: The recursion depth limit and conditional type behavior are implementation details of the TypeScript compiler. Future versions may change these limits.
4. **Maintenance burden**: Type-level graph algorithms are significantly harder to write, test, and debug than their runtime equivalents.

### Neutral

1. **Runtime checks remain**: All type-level checks have runtime equivalents. The type-level layer is an optimization for early error detection, not a replacement for runtime validation.
2. **Opt-in complexity**: Teams that find the type-level overhead unacceptable can use `withExtendedDepth()` to relax compile-time checking and rely on runtime validation.

## References

- [BEH-GR-02](../behaviors/02-cycle-detection.md): Cycle Detection behavior
- [BEH-GR-05](../behaviors/05-operation-completeness.md): Operation Completeness behavior
- [BEH-GR-09](../behaviors/09-init-order-verification.md): Init Order Verification behavior
- [type-system/graph-invariants.md](../type-system/graph-invariants.md): Type-level graph property encoding
- [INV-GR-1](../invariants.md#inv-gr-1-complete-port-coverage): Complete Port Coverage
- [INV-GR-2](../invariants.md#inv-gr-2-cycle-free-graph): Cycle-Free Graph
- [RES-08](../../../research/RES-08-refinement-dependent-types-graph-safety.md): Refinement & Dependent Types for Compile-Time Graph Safety
