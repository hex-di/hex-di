# 09 — Initialization Order Verification

Verify at build time that the dependency graph admits a valid topological ordering, expose that ordering for inspection, and guarantee stability across builds. Inspired by refinement type systems that encode ordering invariants in types. See [RES-08](../../../research/RES-08-refinement-dependent-types-graph-safety.md) (Refinement & Dependent Types).

## BEH-GR-09-001: Type-Level Topological Sort Producing Initialization Order

The graph builder computes a type-level topological sort of the dependency graph, producing an ordered tuple of port names representing the initialization sequence. Ports with no dependencies are initialized first; ports that depend on others are initialized after their dependencies.

```ts
// Type-level topological sort
type TopologicalSort<
  TDepGraph,
  TProvides extends string,
  TProcessed extends string = never,
  TResult extends ReadonlyArray<string> = [],
> =
  // Find ports with no unprocessed dependencies (sources)
  FindSources<TDepGraph, TProvides, TProcessed> extends infer TSources extends string
    ? [TSources] extends [never]
      ? // No more sources: if all ports are processed, done; otherwise cycle
        [Exclude<TProvides, TProcessed>] extends [never]
        ? TResult
        : never // Remaining ports form a cycle (should not happen post-validation)
      : // Process sources: add to result, mark as processed, recurse
        TopologicalSort<
          TDepGraph,
          TProvides,
          TProcessed | TSources,
          [...TResult, ...ToTuple<TSources>]
        >
    : never;

// Find ports whose dependencies are all in TProcessed
type FindSources<
  TDepGraph,
  TProvides extends string,
  TProcessed extends string,
> = TProvides extends infer P extends string
  ? P extends TProcessed
    ? never // Already processed
    : [Exclude<GetDirectDeps<TDepGraph, P>, TProcessed>] extends [never]
      ? P // All deps processed — this is a source
      : never
  : never;
```

**Algorithm**:

1. Initialize: `processed = ∅`, `result = []`
2. Find all source nodes — ports whose direct dependencies are all in `processed` (or have no dependencies)
3. If no sources exist:
   a. If all ports are processed, return `result` (complete ordering)
   b. Otherwise, the remaining ports form a cycle — return `never` (this case is prevented by prior cycle validation)
4. Add all sources to `result` and `processed`
5. Recurse with updated state
6. The recursion depth is bounded by the number of ports (each port is processed exactly once)

**Behavior Table**:

| Dependency Graph              | Topological Sort                       | Initialization Order           |
| ----------------------------- | -------------------------------------- | ------------------------------ |
| `A` (no deps)                 | `["A"]`                                | A first (and only)             |
| `A → B`                       | `["B", "A"]`                           | B first, then A                |
| `A → B, A → C`                | `["B", "C", "A"]` or `["C", "B", "A"]` | B and C before A               |
| `A → B → C`                   | `["C", "B", "A"]`                      | C first, B second, A last      |
| `A → B, C → D` (disconnected) | `["B", "D", "A", "C"]`                 | Independent chains interleaved |

**Example**:

```ts
import { GraphBuilder, createAdapter, port, SINGLETON, ok } from "@hex-di/core";
import type { InitializationOrder } from "@hex-di/graph";

interface Config {
  dbUrl: string;
}
interface Database {
  query(sql: string): Promise<unknown>;
}
interface UserService {
  getUser(id: string): Promise<User>;
}

const ConfigPort = port<Config>()({ name: "Config" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserServicePort = port<UserService>()({ name: "UserService" });

const configAdapter = createAdapter({
  provides: [ConfigPort],
  factory: () => ok({ dbUrl: "postgres://localhost" }),
  lifetime: SINGLETON,
});

const dbAdapter = createAdapter({
  provides: [DatabasePort],
  requires: [ConfigPort],
  factory: ({ Config }) => ok({ query: async sql => ({ rows: [] }) }),
  lifetime: SINGLETON,
});

const userAdapter = createAdapter({
  provides: [UserServicePort],
  requires: [DatabasePort],
  factory: ({ Database }) => ok({ getUser: async id => ({ id, name: "Alice" }) }),
  lifetime: SINGLETON,
});

const builder = GraphBuilder.create()
  .provide(configAdapter)
  .provide(dbAdapter)
  .provide(userAdapter);

// Type-level initialization order
type Order = InitializationOrder<typeof builder>;
// ["Config", "Database", "UserService"]

// Runtime verification matches
const graph = builder.build();
const plan = graph.inspect();
// plan.initializationOrder === ["Config", "Database", "UserService"]
```

**Design notes**:

- The type-level topological sort uses Kahn's algorithm (source-removal) rather than DFS-based ordering. Kahn's is more natural to express via recursive conditional types because it avoids explicit stack management.
- TypeScript recursion limits apply. For graphs with more ports than the recursion limit, the type-level sort gracefully degrades to `string[]` (losing ordering information) while the runtime sort remains correct.
- Cross-ref: [RES-08](../../../research/RES-08-refinement-dependent-types-graph-safety.md) Finding 2 (Eisenberg — singletons as term-level witnesses of type-level values).

## BEH-GR-09-002: Init Order Respects All Dependency Edges

The computed initialization order satisfies the invariant: for every dependency edge `A → B` in the graph, `B` appears before `A` in the initialization sequence. This guarantee holds for both eager and lazy edges (with lazy edges requiring deferred resolution after initial construction).

```ts
// Verification predicate
type OrderRespectsEdges<TDepGraph, TOrder extends ReadonlyArray<string>> = {
  [K in keyof TOrder]: TOrder[K] extends string
    ? GetDirectDeps<TDepGraph, TOrder[K]> extends infer TDeps extends string
      ? TDeps extends TOrder[number]
        ? IndexOf<TOrder, TDeps> extends infer TDepIdx extends number
          ? IndexOf<TOrder, TOrder[K]> extends infer TPortIdx extends number
            ? TDepIdx extends LessThan<TPortIdx>
              ? true
              : false // Dependency appears AFTER dependent — violation
            : never
          : never
        : true // Dependency not in order (external/parent dependency)
      : true // No dependencies
    : never;
};
```

**Algorithm**:

1. Given initialization order `O` and dependency graph `G`:
2. For each port `P` at position `i` in `O`:
   a. Retrieve `P`'s direct dependencies from `G`
   b. For each dependency `D`:
   - Find `D`'s position `j` in `O`
   - Assert `j < i` (dependency appears before dependent)
   - If `D` is a lazy dependency, record deferred check instead
3. For lazy dependencies:
   a. Verify that the lazy target's eager dependencies are all initialized before the dependent
   b. The lazy target itself may be initialized after the dependent (this is the purpose of lazy edges)
4. If any assertion fails, produce a diagnostic identifying the violating edge

**Behavior Table**:

| Graph          | Order             | Valid                          |
| -------------- | ----------------- | ------------------------------ |
| `A → B`        | `["B", "A"]`      | Yes — B before A               |
| `A → B`        | `["A", "B"]`      | No — A before its dependency B |
| `A → B, B → C` | `["C", "B", "A"]` | Yes — C before B before A      |
| `A → B, A → C` | `["B", "C", "A"]` | Yes — both B and C before A    |
| `A → B, A → C` | `["C", "A", "B"]` | No — B appears after A         |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";

const builder = GraphBuilder.create()
  .provide(cacheAdapter) // Cache: no deps
  .provide(databaseAdapter) // Database → Config
  .provide(configAdapter) // Config: no deps
  .provide(userServiceAdapter) // UserService → Database, Cache
  .build();

const inspection = builder.inspect();

// Verify: for every edge A→B, indexOf(B) < indexOf(A)
for (const adapter of inspection.adapters) {
  const adapterIdx = inspection.initializationOrder.indexOf(adapter.provides);
  for (const dep of adapter.requires) {
    const depIdx = inspection.initializationOrder.indexOf(dep);
    expect(depIdx).toBeLessThan(adapterIdx);
  }
}
```

**Design notes**:

- This invariant is the defining property of topological sort. The spec makes it explicit to enable independent verification in tests.
- The runtime inspection exposes `initializationOrder` as a frozen array, enabling programmatic verification by tools and tests.
- Cross-ref: [INV-GR-2](../invariants.md#inv-gr-2-cycle-free-graph) (cycle-free graph guarantees topological sort existence).

## BEH-GR-09-003: Stable Ordering for Deterministic Builds

When multiple valid topological orderings exist (independent ports with no dependency relationship), the builder selects a deterministic ordering based on adapter registration order. The same adapter sequence always produces the same initialization order.

```ts
// Stable sort: break ties by registration index
function stableTopologicalSort(
  adapters: ReadonlyArray<AdapterRegistration>,
  depGraph: ReadonlyMap<string, ReadonlyArray<string>>
): ReadonlyArray<string>;
```

**Algorithm**:

1. Build in-degree map: for each port, count the number of unsatisfied incoming edges
2. Initialize source queue with all ports that have in-degree 0, ordered by registration index (earliest first)
3. While the source queue is non-empty:
   a. Dequeue the port with the lowest registration index among current sources
   b. Append to result
   c. For each port that depends on the dequeued port:
   - Decrement in-degree
   - If in-degree reaches 0, insert into queue at position determined by registration index
4. The registration index tie-breaking ensures deterministic ordering across builds
5. Return the result array

**Behavior Table**:

| Adapters (registration order) | Dependencies   | Initialization Order   | Tie-Breaking                                                |
| ----------------------------- | -------------- | ---------------------- | ----------------------------------------------------------- |
| `[A, B, C]`                   | none           | `["A", "B", "C"]`      | Registration order                                          |
| `[C, B, A]`                   | none           | `["C", "B", "A"]`      | Registration order                                          |
| `[A, B, C]`                   | `A → C`        | `["B", "C", "A"]`      | B before C (registered earlier, both are sources initially) |
| `[A, B, C, D]`                | `A → B, C → D` | `["B", "D", "A", "C"]` | B before D (registered earlier)                             |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";

// Registration order determines tie-breaking
const builder1 = GraphBuilder.create()
  .provide(loggerAdapter) // Logger: no deps, registered first
  .provide(cacheAdapter) // Cache: no deps, registered second
  .provide(metricsAdapter); // Metrics: no deps, registered third

const builder2 = GraphBuilder.create()
  .provide(cacheAdapter) // Cache: no deps, registered first
  .provide(metricsAdapter) // Metrics: no deps, registered second
  .provide(loggerAdapter); // Logger: no deps, registered third

const order1 = builder1.inspect().initializationOrder;
// ["Logger", "Cache", "Metrics"] — registration order

const order2 = builder2.inspect().initializationOrder;
// ["Cache", "Metrics", "Logger"] — different registration order

// Same builder always produces same order
expect(builder1.inspect().initializationOrder).toEqual(builder1.inspect().initializationOrder); // Deterministic
```

**Design notes**:

- Stability is critical for reproducible builds and debugging. Non-deterministic initialization can cause intermittent failures that are difficult to diagnose.
- Registration order is chosen as the tie-breaking criterion because it is the only ordering information available to the builder. Alphabetical ordering was considered but rejected: it would change meaning when ports are renamed, and registration order better reflects developer intent.
- Cross-ref: [BEH-GR-07-004](07-graph-law-tests.md#beh-gr-07-004-build-determinism) (build determinism law depends on stable ordering).
