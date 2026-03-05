# 14 — Formal Disposal Ordering

Deterministic disposal ordering based on the dependency graph topology. Dependents are disposed before their dependencies, and independent branches are disposed in parallel. See [RES-03](../../../research/RES-03-linear-affine-types-resource-lifecycle.md).

## BEH-CO-14-001: Topological Sort of Disposal Order

The container computes a topological sort of the dependency graph to determine disposal order. Disposal proceeds in reverse topological order: leaf nodes (no dependents) are disposed first, working back to root nodes (no dependencies).

```ts
interface DisposalPlan {
  readonly phases: ReadonlyArray<DisposalPhase>;
  readonly totalAdapters: number;
}

interface DisposalPhase {
  readonly level: number;
  readonly adapters: ReadonlyArray<{
    readonly adapterName: string;
    readonly portName: string;
    readonly hasFinalizer: boolean;
  }>;
}

function computeDisposalPlan(graph: DependencyGraph): DisposalPlan;
```

**Exported from**: `lifecycle/disposal.ts` (proposed).

**Algorithm**:

1. Build the dependency graph as an adjacency list: for each adapter, record its direct dependencies
2. Compute the reverse graph: for each adapter, record which adapters depend on it (its dependents)
3. Perform a topological sort on the reverse graph using Kahn's algorithm:
   a. Initialize a queue with all adapters that have no dependents (leaf nodes)
   b. Assign these to disposal phase 0
   c. For each adapter in the queue, remove it from the graph and decrement the dependent count of its dependencies
   d. When a dependency's dependent count reaches 0, add it to the next phase
   e. Repeat until all adapters are assigned to a phase
4. If the graph has cycles (should be prevented at build time), throw an invariant violation
5. Return the `DisposalPlan` with phases ordered from first-to-dispose (leaves) to last-to-dispose (roots)
6. `Object.freeze()` the entire plan

**Behavior Table**:

| Dependency Structure             | Disposal Phases                                   |
| -------------------------------- | ------------------------------------------------- |
| `A -> B -> C` (linear chain)     | Phase 0: `[A]`, Phase 1: `[B]`, Phase 2: `[C]`    |
| `A -> C, B -> C` (diamond)       | Phase 0: `[A, B]`, Phase 1: `[C]`                 |
| `A, B, C` (independent)          | Phase 0: `[A, B, C]`                              |
| `A -> B, A -> C, B -> D, C -> D` | Phase 0: `[A]`, Phase 1: `[B, C]`, Phase 2: `[D]` |
| `A -> B, C -> D` (two chains)    | Phase 0: `[A, C]`, Phase 1: `[B, D]`              |

**Example**:

```ts
import { GraphBuilder, computeDisposalPlan } from "@hex-di/core";

// Graph: UserService -> UserRepo -> Database
//        UserService -> Logger
const graph = new GraphBuilder()
  .add(loggerAdapter) // Logger (no deps)
  .add(dbAdapter) // Database (no deps)
  .add(userRepoAdapter) // UserRepo -> Database
  .add(userServiceAdapter) // UserService -> UserRepo, Logger
  .build();

const plan = computeDisposalPlan(graph);
// {
//   phases: [
//     { level: 0, adapters: [{ adapterName: "userServiceAdapter", portName: "UserService", hasFinalizer: false }] },
//     { level: 1, adapters: [
//       { adapterName: "userRepoAdapter", portName: "UserRepo", hasFinalizer: true },
//       { adapterName: "loggerAdapter", portName: "Logger", hasFinalizer: false }
//     ]},
//     { level: 2, adapters: [{ adapterName: "dbAdapter", portName: "Database", hasFinalizer: true }] },
//   ],
//   totalAdapters: 4,
// }
```

**Design notes**:

- Topological sort guarantees that no adapter is disposed while its dependents still hold references to it. This is the formal property that prevents use-after-dispose at the dependency level.
- Kahn's algorithm is chosen over DFS-based topological sort because it naturally produces the level-based phasing needed for parallel disposal.
- Adapters without finalizers are still included in the plan (for completeness and debugging) but are no-ops during execution.
- Cycle detection is a safety check — cycles should already be rejected at `GraphBuilder.build()` time. If a cycle is found during disposal planning, it indicates a framework bug.
- Cross-ref: [BEH-CO-04](04-container-lifecycle.md) (container lifecycle), [BEH-CO-07](07-disposal-state-branding.md) (disposal state branding).

## BEH-CO-14-002: Reverse Dependency Ordering

Disposal follows strict reverse dependency order: if adapter A depends on adapter B, then A is disposed before B. This ensures that when B's finalizer runs, no active adapter still holds a reference to B's service.

```ts
// Type-level guarantee: disposal order is the reverse of resolution order
type DisposalOrder<TGraph> = Reverse<TopologicalSort<TGraph>>;

// Runtime disposal executor
async function executeDisposalPlan(
  plan: DisposalPlan,
  instances: Map<
    string,
    { instance: unknown; finalizer?: (instance: unknown) => void | Promise<void> }
  >
): Promise<DisposalResult>;

interface DisposalResult {
  readonly disposed: ReadonlyArray<string>;
  readonly errors: ReadonlyArray<{
    readonly adapterName: string;
    readonly error: unknown;
    readonly blame: BlameContext;
  }>;
  readonly totalTime: number;
}
```

**Exported from**: `lifecycle/disposal.ts` (proposed).

**Algorithm**:

1. Receive the `DisposalPlan` (phases ordered leaves-first)
2. For each phase (in order from phase 0 to phase N):
   a. Collect all adapters in this phase that have finalizers
   b. Execute finalizers (see [BEH-CO-14-003](#beh-co-14-003-parallel-disposal-of-independent-branches) for parallelism)
   c. For each finalizer, catch errors and record them with blame context
   d. Mark the adapter's handle as `"disposed"` (phantom state transition)
   e. Continue to the next phase regardless of errors (best-effort disposal)
3. After all phases, return `DisposalResult` with disposed adapters, errors, and timing

**Behavior Table**:

| Dependency       | Resolution Order         | Disposal Order                 | Guarantee                                               |
| ---------------- | ------------------------ | ------------------------------ | ------------------------------------------------------- |
| `A -> B`         | B resolved first, then A | A disposed first, then B       | B's service exists when A's finalizer runs              |
| `A -> B, A -> C` | B and C resolved, then A | A disposed first, then B and C | B and C exist when A's finalizer runs                   |
| `A -> B -> C`    | C, then B, then A        | A, then B, then C              | Each service exists when its dependents' finalizers run |

**Example**:

```ts
import { buildContainer } from "@hex-di/core";

// Database connection and repository with finalizers
const dbAdapter = createAdapter({
  provides: [DBPort],
  factory: () => ok(createPool("postgres://localhost/mydb")),
  lifetime: SINGLETON,
  finalizer: pool => pool.end(), // Close all connections
});

const repoAdapter = createAdapter({
  provides: [RepoPort],
  requires: [DBPort],
  factory: deps => ok(new PgUserRepo(deps.Database)),
  lifetime: SINGLETON,
  finalizer: repo => repo.flush(), // Flush pending writes (needs DB connection!)
});

const container = buildContainer(graph);
await container.dispose();

// Disposal order:
// 1. repoAdapter.finalizer(repo) — repo.flush() runs while DB is still alive
// 2. dbAdapter.finalizer(pool)   — pool.end() runs after all dependents are disposed
```

**Design notes**:

- This is the runtime complement to the type-level disposal state branding ([BEH-CO-07](07-disposal-state-branding.md)). Types prevent compile-time misuse; ordering prevents runtime misuse.
- Errors during disposal do not halt the process. All adapters are disposed on a best-effort basis, and all errors are collected. This follows the principle that disposal should be resilient — a failing finalizer should not prevent other resources from being cleaned up.
- Inspired by Munch-Maccagnoni (2018) — resource polymorphism. The disposal executor handles both disposable adapters (with finalizers) and non-disposable adapters (without finalizers) uniformly.
- Cross-ref: [BEH-CO-14-001](#beh-co-14-001-topological-sort-of-disposal-order), [BEH-CO-08-003](08-adapter-lifecycle-states.md) (state transition to "disposed").

## BEH-CO-14-003: Parallel Disposal of Independent Branches

Adapters within the same disposal phase (no dependency relationships between them) are disposed in parallel using `Promise.allSettled`. This minimizes total disposal time for graphs with independent branches.

```ts
// Phase execution with parallelism
async function executePhase(
  phase: DisposalPhase,
  instances: Map<
    string,
    { instance: unknown; finalizer?: (instance: unknown) => void | Promise<void> }
  >
): Promise<ReadonlyArray<PromiseSettledResult<void>>>;
```

**Exported from**: `lifecycle/disposal.ts` (proposed).

**Algorithm**:

1. For a given `DisposalPhase`, collect all adapters that have finalizers
2. Create a `Promise` for each finalizer invocation
3. Execute all promises via `Promise.allSettled()` (not `Promise.all` — one failure must not cancel others)
4. Collect results: `fulfilled` results mark successful disposal, `rejected` results capture errors
5. For sync finalizers (returning `void`), wrap in `Promise.resolve()` for uniform handling
6. Apply a per-adapter timeout (configurable, default 30 seconds) to prevent hanging finalizers from blocking disposal

**Behavior Table**:

| Phase Adapters          | Finalizer Results                           | Phase Outcome                        |
| ----------------------- | ------------------------------------------- | ------------------------------------ |
| `[A, B, C]` all succeed | `[fulfilled, fulfilled, fulfilled]`         | Phase complete, all disposed         |
| `[A, B, C]` B fails     | `[fulfilled, rejected(err), fulfilled]`     | Phase complete, B's error recorded   |
| `[A, B, C]` A times out | `[rejected(timeout), fulfilled, fulfilled]` | Phase complete, A's timeout recorded |
| `[A]` single adapter    | `[fulfilled]`                               | No parallelism needed                |
| `[]` no finalizers      | `[]`                                        | Phase is a no-op                     |

**Example**:

```ts
import { buildContainer } from "@hex-di/core";

// Graph: Service -> Logger, Service -> Cache, Service -> Metrics
// Logger, Cache, and Metrics are independent (no deps between them)
const container = buildContainer(graph);
const result = await container.dispose();

// Disposal plan:
// Phase 0: [Service]          — disposed first (depends on all three)
// Phase 1: [Logger, Cache, Metrics] — disposed in parallel (independent)

// Phase 1 execution:
// Promise.allSettled([
//   logger.finalizer(loggerInstance),    // flush log buffer
//   cache.finalizer(cacheInstance),      // persist cache to disk
//   metrics.finalizer(metricsInstance),  // send final metrics batch
// ])

// If cache finalizer fails but others succeed:
// result.errors = [{
//   adapterName: "cacheAdapter",
//   error: { _tag: "DiskWriteError", ... },
//   blame: {
//     adapterFactory: { name: "cacheAdapter" },
//     portContract: { name: "Cache", direction: "outbound" },
//     violationType: { _tag: "DisposalError", error: { _tag: "DiskWriteError", ... } },
//     resolutionPath: ["Cache"]
//   }
// }]
// result.disposed = ["Service", "Logger", "Metrics", "Cache"]
// (Cache is still listed as "disposed" — the error is recorded but disposal proceeded)
```

**Design notes**:

- `Promise.allSettled` is chosen over `Promise.all` to ensure disposal resilience. One failing finalizer must not prevent other independent adapters from being cleaned up.
- The per-adapter timeout prevents a single hanging finalizer (e.g., waiting for a network response that never comes) from blocking the entire disposal process. Timeouts produce a `DisposalTimeoutError` with blame context.
- Parallel disposal is safe because adapters in the same phase have no dependency relationships — by definition, none of them depends on any other adapter in the same phase.
- For scoped containers, child scope disposal follows the same algorithm. Cross-scope transfer records ([BEH-CO-09-003](09-scoped-reference-tracking.md)) are consulted to ensure transferred references are accounted for.
- Cross-ref: [BEH-CO-14-001](#beh-co-14-001-topological-sort-of-disposal-order), [BEH-CO-14-002](#beh-co-14-002-reverse-dependency-ordering), [BEH-CO-07-002](07-disposal-state-branding.md) (scope disposal).
