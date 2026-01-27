/**
 * # CYCLE DETECTION CONCEPT DOCUMENTATION
 *
 * This file documents the complete cycle detection algorithm implemented
 * at the TypeScript type level. Read this to understand how cycles are
 * detected at compile-time before any code runs.
 *
 * ## Algorithm Overview
 *
 * When an adapter is added to the graph via `.provide()`:
 *
 * 1. **Extract Names**: Get the port name the adapter provides and all ports it requires
 *    - `AdapterProvidesName<A>` → `"UserService"`
 *    - `AdapterRequiresNames<A>` → `"Database" | "Logger"`
 *
 * 2. **Check for Cycle**: Determine if adding this adapter would create a cycle
 *    - `WouldCreateCycle<TDepGraph, TNewPort, TRequiredPorts>`
 *    - Performs DFS from each required port to see if any can reach the new port
 *
 * 3. **On Cycle Detected**: Build a readable error path
 *    - `BuildCyclePath<TDepGraph, TFromPort, TToPort>` → `"A → B → C → A"`
 *    - Format into `CircularDependencyError<"A → B → C → A">`
 *
 * ## Type Flow Diagram
 *
 * ```
 * .provide(Adapter)
 *        │
 *        ▼
 * ┌─────────────────────────────────────┐
 * │ Extract: AdapterProvidesName<A>     │
 * │          AdapterRequiresNames<A>    │
 * └─────────────────────────────────────┘
 *        │
 *        ▼
 * ┌─────────────────────────────────────┐
 * │ Check: WouldCreateCycle<...>        │
 * │   └── IsReachable<...> (DFS)        │
 * │         └── GetDirectDeps<...>      │
 * │               └── Recursion...      │
 * └─────────────────────────────────────┘
 *        │
 *    ┌───┴───┐
 *    │       │
 *  false   true
 *    │       │
 *    ▼       ▼
 * Success  BuildCyclePath → CircularDependencyError
 * ```
 *
 * ## File Locations
 *
 * The cycle detection implementation is split across these files in `./cycle/`:
 *
 * | File | Contents |
 * |------|----------|
 * | `depth.ts` | Peano-style depth tracking: `Depth`, `IncrementDepth`, `DepthExceeded` |
 * | `detection.ts` | Core DFS algorithm: `AddEdge`, `GetDirectDeps`, `IsReachable`, `WouldCreateCycle` |
 * | `errors.ts` | Error path construction: `BuildCyclePath`, `CircularDependencyError`, `LazySuggestions` |
 * | `batch.ts` | Batch validation: `WouldAnyCreateCycle`, `DetectCycleInMergedGraph` |
 * | `index.ts` | Re-exports all types |
 *
 * ## Depth Tracking (Why Peano Numbers?)
 *
 * TypeScript's type system can't do arithmetic. To track recursion depth,
 * we use Peano-style tuple encoding:
 *
 * ```typescript
 * type Depth0 = [];           // Depth = 0
 * type Depth1 = [0];          // Depth = 1
 * type Depth2 = [0, 0];       // Depth = 2
 * type Depth50 = [0, 0, ...]; // Depth = 50 (MaxDepth)
 * ```
 *
 * `IncrementDepth<D>` prepends an element: `[0, ...D]`
 * `DepthExceeded<D>` checks: `D['length'] >= MaxDepth`
 *
 * ## Performance Considerations
 *
 * - Default `MaxDepth` is 50 (configurable via `GraphBuilder.withMaxDepth<N>()`)
 * - Deep graphs (>40) trigger a warning via `GraphInspection.depthWarning`
 * - The DFS is memoized per-port in the type-level dependency map
 *
 * ## Example: Detecting A → B → A
 *
 * Given:
 * ```typescript
 * const AAdapter = createAdapter({
 *   provides: APort,
 *   requires: [BPort],
 *   factory: ({ B }) => new AImpl(B),
 * });
 *
 * const BAdapter = createAdapter({
 *   provides: BPort,
 *   requires: [APort], // Creates cycle!
 *   factory: ({ A }) => new BImpl(A),
 * });
 * ```
 *
 * Type-level evaluation:
 * 1. Add AAdapter: `{ A: ["B"] }` - no cycle
 * 2. Add BAdapter: Check `IsReachable<{ A: ["B"] }, "A", "B">`
 *    - "A" requires "B"
 *    - Adding "B → A" would make "A" reachable from "B"
 *    - Cycle detected! Return: `CircularDependencyError<"B → A → B">`
 *
 * @packageDocumentation
 */

export {};
