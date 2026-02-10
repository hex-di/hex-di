# 4. Typed LibraryInspector Protocol

## 4.1 Motivation

The existing `LibraryInspector` protocol operates at runtime with an untyped snapshot surface:

```typescript
// Current: snapshot shape is erased to Record<string, unknown>
interface LibraryInspector {
  readonly name: string;
  getSnapshot(): Readonly<Record<string, unknown>>;
  subscribe?(listener: LibraryEventListener): () => void;
  dispose?(): void;
}
```

Every consumer that reads a library snapshot today must cast or validate the shape defensively. DevTools panels that display flow machine counts, tracing span totals, or store action histories all operate on `unknown` values. The graph builder knows at compile time which library-inspector ports are registered (via `PortsByCategory<TProvides, "library-inspector">`), yet that type-level knowledge is discarded the moment a snapshot is read.

A compile-time typed protocol addresses four problems:

1. **Auto-generated typed panels.** DevTools can generate panel components per library where each panel's props are derived from the library's snapshot type. A `FlowPanel` receives `FlowLibrarySnapshot`; a `TracingPanel` receives `TracingSnapshot`. No runtime validation code is needed inside panels.

2. **Compile-time library discovery.** TypeScript can compute a union of library names from the graph's provides type. A `LibrarySnapshotMap` mapped type produces a record keyed by library name with the correct snapshot type for each. DevTools knows at build time which panels to render.

3. **Snapshot shape validation.** When a library author changes their snapshot shape (adds a field, renames a key), all consumers see compile errors immediately. No more runtime surprises from `snapshot.totalSpans` being renamed to `snapshot.spanCount`.

4. **Typed cross-library queries.** The `queryLibraries` and `queryByLibrary` methods on `InspectorAPI` currently return `LibraryQueryEntry` with `value: unknown`. With typed snapshots, higher-level query APIs can narrow the value type based on the library name, enabling autocomplete and type checking across library boundaries.

### Before vs. After

```
+---------------------------+---------------------------------------------+-------------------------------------------+
| Aspect                    | Before (untyped)                            | After (typed)                             |
+---------------------------+---------------------------------------------+-------------------------------------------+
| Snapshot return type      | Readonly<Record<string, unknown>>           | Readonly<TSnapshot>                       |
| Library name type         | string                                      | TName (literal)                           |
| Panel component props     | Record<string, unknown>, manual validation  | Exact snapshot interface, auto-narrowed   |
| Cross-library query value | unknown                                     | Narrowed per library via mapped type      |
| Graph-level awareness     | Runtime only (afterResolve hook)            | Compile-time via PortsByCategory          |
| Breaking change detection | Runtime failure                              | Compile error at usage site               |
+---------------------------+---------------------------------------------+-------------------------------------------+
```

## 4.2 TypedLibraryInspector Interface

The typed protocol is a **refinement**, not a replacement. It adds type parameters to the existing `LibraryInspector` interface so that a `TypedLibraryInspector<TName, TSnapshot>` is structurally assignable to `LibraryInspector`. The runtime protocol stays identical. The typing is additive and opt-in.

```typescript
/**
 * A type-refined LibraryInspector that carries its name and snapshot
 * shape at the type level.
 *
 * Structurally assignable to LibraryInspector -- this is NOT a new
 * runtime protocol, only a compile-time narrowing.
 *
 * @typeParam TName - Literal string name (e.g., "flow", "tracing")
 * @typeParam TSnapshot - Frozen record type returned by getSnapshot()
 */
interface TypedLibraryInspector<
  TName extends string,
  TSnapshot extends Readonly<Record<string, unknown>>,
> {
  readonly name: TName;
  getSnapshot(): Readonly<TSnapshot>;
  subscribe?(listener: LibraryEventListener): () => void;
  dispose?(): void;
}
```

### Assignability proof

```
TypedLibraryInspector<"flow", FlowLibrarySnapshot>
  |
  |  name: "flow"  extends  string                          OK
  |  getSnapshot(): Readonly<FlowLibrarySnapshot>
  |    extends  Readonly<Record<string, unknown>>           OK (covariant return)
  |  subscribe?: same signature                              OK
  |  dispose?: same signature                                OK
  |
  +---> assignable to LibraryInspector                       OK
```

This means:

- Existing code that accepts `LibraryInspector` continues to work with zero changes.
- The `isLibraryInspector()` type guard still works at runtime.
- The `createLibraryRegistry()` internal component does not need modification.
- The `afterResolve` auto-discovery hook does not need modification.
- Only code that _wants_ the typed narrowing needs to use `TypedLibraryInspector`.

### Placement

`TypedLibraryInspector` is defined in `@hex-di/core` alongside `LibraryInspector` in `src/inspection/library-inspector-types.ts`. It is a pure type export (no runtime code).

## 4.3 Typed Library Inspector Port Factory

The existing `createLibraryInspectorPort()` factory returns:

```typescript
DirectedPort<LibraryInspector, TName, "outbound", "library-inspector">;
```

The service type is always `LibraryInspector` (untyped snapshots). A new companion factory carries the snapshot type through the port:

```typescript
/**
 * Creates a library-inspector port whose service type is
 * TypedLibraryInspector<TName, TSnapshot>.
 *
 * The returned port has category "library-inspector", enabling
 * compile-time discovery via PortsByCategory and runtime auto-
 * registration via the afterResolve hook.
 *
 * @typeParam TName - Literal string name for the library
 * @typeParam TSnapshot - The frozen snapshot record type
 * @param config - Port configuration (name, optional description/tags)
 * @returns DirectedPort carrying the typed inspector as its service type
 */
function createTypedLibraryInspectorPort<
  const TName extends string,
  TSnapshot extends Readonly<Record<string, unknown>>,
>(config: {
  readonly name: TName;
  readonly description?: string;
  readonly tags?: readonly string[];
}): DirectedPort<TypedLibraryInspector<TName, TSnapshot>, TName, "outbound", "library-inspector">;
```

### Implementation approach

Internally, `createTypedLibraryInspectorPort` delegates to `createPort` with `category: "library-inspector"` and `direction: "outbound"`, identical to `createLibraryInspectorPort`. The only difference is the `TService` type parameter: `TypedLibraryInspector<TName, TSnapshot>` instead of `LibraryInspector`.

Because `TypedLibraryInspector<TName, TSnapshot>` is assignable to `LibraryInspector`, all runtime machinery (auto-registration hook, library registry, unified snapshot aggregation) works without changes.

### Migration from untyped to typed

Libraries migrate one at a time. The migration for each library is:

1. Define a snapshot interface (e.g., `FlowLibrarySnapshot`).
2. Replace `createLibraryInspectorPort(...)` with `createTypedLibraryInspectorPort<TName, TSnapshot>(...)`.
3. Type-check that the bridge function's `getSnapshot()` return type matches `TSnapshot`.
4. No changes to adapters, registry, or consumers are required. Consumers gain typed access opportunistically.

```
Before:  createLibraryInspectorPort({ name: "FlowLibraryInspector" })
         -> DirectedPort<LibraryInspector, "FlowLibraryInspector", "outbound", "library-inspector">

After:   createTypedLibraryInspectorPort<"FlowLibraryInspector", FlowLibrarySnapshot>({ name: "FlowLibraryInspector" })
         -> DirectedPort<TypedLibraryInspector<"FlowLibraryInspector", FlowLibrarySnapshot>, "FlowLibraryInspector", "outbound", "library-inspector">
```

## 4.4 Per-Library Snapshot Types

Each library that implements the Library Inspector Protocol defines a named snapshot interface. These interfaces describe the exact shape returned by `getSnapshot()`.

### Flow Library

The Flow library bridge (in `libs/flow/core/src/integration/library-inspector-bridge.ts`) currently returns an object with `machineCount`, `machines`, `healthEvents`, and `effectStatistics`. The typed snapshot captures this:

```typescript
interface FlowLibrarySnapshot {
  readonly machineCount: number;
  readonly machines: readonly {
    readonly portName: string;
    readonly instanceId: string;
    readonly machineId: string;
    readonly state: string;
    readonly scopeId: string | undefined;
  }[];
  readonly healthEvents: readonly {
    readonly type: "flow-error" | "flow-degraded" | "flow-recovered";
    readonly machineId: string;
    readonly timestamp: number;
  }[];
  readonly effectStatistics: Readonly<
    Record<string, { readonly ok: number; readonly err: number }>
  >;
}

const FlowLibraryInspectorPort = createTypedLibraryInspectorPort<
  "FlowLibraryInspector",
  FlowLibrarySnapshot
>({ name: "FlowLibraryInspector", description: "Library inspector bridge for flow machines" });
```

### Tracing Library

The Tracing library bridge (in `packages/tracing/src/inspection/library-inspector-bridge.ts`) returns `totalSpans`, `errorCount`, `averageDuration`, and `cacheHitRate`:

```typescript
interface TracingLibrarySnapshot {
  readonly totalSpans: number;
  readonly errorCount: number;
  readonly averageDuration: number;
  readonly cacheHitRate: number;
}

const TracingLibraryInspectorPort = createTypedLibraryInspectorPort<
  "TracingLibraryInspector",
  TracingLibrarySnapshot
>({ name: "TracingLibraryInspector", description: "Library inspector bridge for tracing" });
```

### Store Library

```typescript
interface StoreLibrarySnapshot {
  readonly storeCount: number;
  readonly stores: readonly {
    readonly portName: string;
    readonly currentState: string;
    readonly actionCount: number;
    readonly subscriberCount: number;
  }[];
  readonly totalDispatches: number;
}
```

### Query Library

```typescript
interface QueryLibrarySnapshot {
  readonly queryCount: number;
  readonly queries: readonly {
    readonly key: string;
    readonly status: "idle" | "loading" | "success" | "error";
    readonly lastUpdated: number | undefined;
    readonly isCached: boolean;
  }[];
  readonly cacheSize: number;
  readonly cacheHitRate: number;
}
```

### Saga Library

```typescript
interface SagaLibrarySnapshot {
  readonly activeSagaCount: number;
  readonly sagas: readonly {
    readonly sagaId: string;
    readonly currentStep: string;
    readonly status: "running" | "compensating" | "completed" | "failed";
    readonly startedAt: number;
  }[];
  readonly completedCount: number;
  readonly failedCount: number;
}
```

### Logger Library

```typescript
interface LoggerLibrarySnapshot {
  readonly loggerCount: number;
  readonly totalEntries: number;
  readonly entriesByLevel: Readonly<Record<string, number>>;
  readonly recentErrors: readonly {
    readonly message: string;
    readonly timestamp: number;
    readonly source: string;
  }[];
}
```

Each of these snapshot interfaces is exported from the respective library's public API, enabling consumers (including DevTools) to import and use them directly.

### Type flow diagram

```
  Library Source                     Port Factory                          Graph Builder
  ================                  ===============                       ==============

  FlowLibrarySnapshot               createTypedLibrary                    .provide(FlowLibrary
    (interface)           --->       InspectorPort<                  --->  InspectorAdapter)
                                       "FlowLibraryInspector",            |
                                       FlowLibrarySnapshot                |
                                     >                                    |
                                     |                                    v
                                     |                               TProvides union now
                                     v                               contains:
                                  DirectedPort<                        DirectedPort<
                                    TypedLibraryInspector<               TypedLibraryInspector<
                                      "FlowLibraryInspector",              "FlowLibraryInspector",
                                      FlowLibrarySnapshot                  FlowLibrarySnapshot
                                    >,                                   >,
                                    "FlowLibraryInspector",              "FlowLibraryInspector",
                                    "outbound",                          "outbound",
                                    "library-inspector"                  "library-inspector"
                                  >                                    >
```

---

# 5. Compile-Time Graph Validation

## 5.1 Type-Level Library Extraction

The graph builder already tracks all provided ports as a union type via `TProvides`. The existing `PortsByCategory` utility (in `packages/graph/src/builder/types/inspection.ts`) filters this union by category. Building on this foundation, a family of type utilities extracts library inspector information from the graph at the type level.

### ExtractLibraryInspectorPorts

Filters the graph's provides union to only those ports with category `"library-inspector"`:

```typescript
type ExtractLibraryInspectorPorts<TProvides> = PortsByCategory<TProvides, "library-inspector">;
```

This reuses the existing `PortsByCategory` utility with no new type machinery. Given a graph that provides `FlowLibraryInspectorPort`, `TracingLibraryInspectorPort`, `LoggerPort`, and `DatabasePort`, only the first two survive the filter.

### ExtractLibraryNames

Extracts the port names as a string union from the filtered library-inspector ports:

```typescript
type ExtractLibraryNames<TProvides> = InferPortName<ExtractLibraryInspectorPorts<TProvides>>;
```

Result example: `"FlowLibraryInspector" | "TracingLibraryInspector"`.

### InferTypedInspectorSnapshot

Extracts the snapshot type from a `TypedLibraryInspector` carried inside a port's service type:

```typescript
type InferTypedInspectorSnapshot<TPort> =
  InferService<TPort> extends TypedLibraryInspector<infer _N, infer TSnapshot>
    ? TSnapshot
    : Readonly<Record<string, unknown>>;
```

If the port was created with `createTypedLibraryInspectorPort`, the snapshot type is extracted. If the port was created with the original `createLibraryInspectorPort` (untyped), the fallback is `Readonly<Record<string, unknown>>`. This ensures backward compatibility: untyped libraries still participate, just without narrowed snapshots.

### ExtractLibrarySnapshot

Extracts the snapshot type for a specific library name from the graph's provides:

```typescript
type ExtractLibrarySnapshot<TProvides, TName extends string> = InferTypedInspectorSnapshot<
  Extract<ExtractLibraryInspectorPorts<TProvides>, Port<unknown, TName>>
>;
```

This first filters to library-inspector ports, then narrows to the port matching `TName`, then extracts the snapshot type from that port's service.

### LibrarySnapshotMap

Builds a complete record type mapping each library name to its snapshot type:

```typescript
type LibrarySnapshotMap<TProvides> = {
  readonly [K in ExtractLibraryNames<TProvides>]: ExtractLibrarySnapshot<TProvides, K>;
};
```

### End-to-end type flow

```
  Graph TProvides Union
  =====================
  | FlowLibraryInspectorPort        (category: "library-inspector")
  | TracingLibraryInspectorPort      (category: "library-inspector")
  | LoggerPort                       (category: "logging")
  | DatabasePort                     (category: "persistence")
  | UserServicePort                  (category: "domain")
      |
      | PortsByCategory<..., "library-inspector">
      v
  Filtered Union
  ==============
  | FlowLibraryInspectorPort
  | TracingLibraryInspectorPort
      |
      | InferPortName<...>
      v
  Name Union: "FlowLibraryInspector" | "TracingLibraryInspector"
      |
      | LibrarySnapshotMap<TProvides>
      v
  {
    readonly FlowLibraryInspector: FlowLibrarySnapshot;
    readonly TracingLibraryInspector: TracingLibrarySnapshot;
  }
```

### Placement

All extraction utilities are defined in `@hex-di/core` in a new file `src/inspection/library-extraction-types.ts` and re-exported from the package index. They depend only on types already in `@hex-di/core` (`Port`, `InferService`, `InferPortName`, `DirectedPort`, `TypedLibraryInspector`) and the `PortsByCategory` utility from `@hex-di/graph`.

Because `PortsByCategory` lives in `@hex-di/graph` and `@hex-di/core` must not depend on `@hex-di/graph`, the extraction utilities that use `PortsByCategory` are split:

- `@hex-di/core` exports: `TypedLibraryInspector`, `InferTypedInspectorSnapshot`
- `@hex-di/graph` exports: `ExtractLibraryInspectorPorts`, `ExtractLibraryNames`, `ExtractLibrarySnapshot`, `LibrarySnapshotMap` (these compose `PortsByCategory` with the core utilities)

## 5.2 Typed UnifiedSnapshot

The existing `UnifiedSnapshot` interface has untyped library snapshots:

```typescript
interface UnifiedSnapshot {
  readonly timestamp: number;
  readonly container: ContainerSnapshot;
  readonly libraries: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly registeredLibraries: readonly string[];
}
```

A typed companion narrows the library section:

```typescript
/**
 * A UnifiedSnapshot with compile-time typed library snapshots.
 *
 * TLibraries maps library names to their snapshot types.
 * Assignable to UnifiedSnapshot (the typed libraries record
 * is a subtype of Record<string, Readonly<Record<string, unknown>>>).
 *
 * @typeParam TLibraries - Record mapping library name to snapshot type
 */
interface TypedUnifiedSnapshot<
  TLibraries extends Record<string, Readonly<Record<string, unknown>>>,
> {
  readonly timestamp: number;
  readonly container: ContainerSnapshot;
  readonly libraries: {
    readonly [K in keyof TLibraries]: Readonly<TLibraries[K]>;
  };
  readonly registeredLibraries: readonly (keyof TLibraries & string)[];
}
```

### Usage

```typescript
// Given a graph type:
type AppGraph = typeof appGraph;
type AppLibraries = LibrarySnapshotMap<InferGraphProvides<AppGraph>>;
// Result:
// {
//   readonly FlowLibraryInspector: FlowLibrarySnapshot;
//   readonly TracingLibraryInspector: TracingLibrarySnapshot;
// }

// Typed unified snapshot:
type AppUnifiedSnapshot = TypedUnifiedSnapshot<AppLibraries>;
// Now:
//   snapshot.libraries.FlowLibraryInspector.machineCount  -- number, typed
//   snapshot.libraries.TracingLibraryInspector.totalSpans  -- number, typed
//   snapshot.libraries.FlowLibraryInspector.typo           -- compile error
```

### Runtime bridging

At runtime, `inspector.getUnifiedSnapshot()` still returns the untyped `UnifiedSnapshot`. To bridge to the typed version, a utility function narrows the type without runtime cost:

```typescript
/**
 * Narrows an UnifiedSnapshot to a TypedUnifiedSnapshot.
 *
 * This is a zero-cost type assertion for use at the boundary
 * between the untyped runtime API and typed consumer code.
 * The caller is responsible for ensuring the graph actually
 * provides the expected library inspectors.
 *
 * @param snapshot - The untyped unified snapshot from the inspector
 * @returns The same snapshot object, narrowed to typed libraries
 */
function asTypedSnapshot<TLibraries extends Record<string, Readonly<Record<string, unknown>>>>(
  snapshot: UnifiedSnapshot
): TypedUnifiedSnapshot<TLibraries>;
```

This function is the single point where the type gap is bridged. It is implemented in `@hex-di/devtools` (not in `@hex-di/core`) because it is a DevTools concern, not a core protocol concern.

## 5.3 Multi-Library Composition Example

This end-to-end example demonstrates the full compile-time typed workflow: building a graph with multiple typed library inspector adapters, extracting the typed snapshot map, and consuming typed data in a React component.

### Graph Definition with Four Library Inspectors

```typescript
import { GraphBuilder } from "@hex-di/graph";
import type { InferGraphProvides, LibrarySnapshotMap, ExtractLibraryNames } from "@hex-di/graph";
import type { AvailablePanels, TypedUnifiedSnapshot } from "@hex-di/core";

// Build a graph that provides four typed library inspectors
const appGraph = GraphBuilder.create()
  // Application services
  .provide(AuthServiceAdapter)
  .provide(UserRepositoryAdapter)
  .provide(PaymentGatewayAdapter)
  // Library inspector adapters (each created with createTypedLibraryInspectorPort)
  .provide(FlowLibraryInspectorAdapter) // category: "library-inspector"
  .provide(TracingLibraryInspectorAdapter) // category: "library-inspector"
  .provide(StoreLibraryInspectorAdapter) // category: "library-inspector"
  .provide(SagaLibraryInspectorAdapter) // category: "library-inspector"
  .build();

// Extract the graph's provides type
type AppProvides = InferGraphProvides<typeof appGraph>;
```

### LibrarySnapshotMap Extraction

```typescript
// Extract the typed library snapshot map from the graph's provides
type AppLibraries = LibrarySnapshotMap<AppProvides>;
// Result:
// {
//   readonly FlowLibraryInspector: FlowLibrarySnapshot;
//   readonly TracingLibraryInspector: TracingLibrarySnapshot;
//   readonly StoreLibraryInspector: StoreLibrarySnapshot;
//   readonly SagaLibraryInspector: SagaLibrarySnapshot;
// }

// The library name union is also available
type AppLibraryNames = ExtractLibraryNames<AppProvides>;
// "FlowLibraryInspector" | "TracingLibraryInspector" | "StoreLibraryInspector" | "SagaLibraryInspector"
```

### asTypedSnapshot() Usage in a React Component

```typescript
import { useUnifiedSnapshot } from "@hex-di/react";
import { asTypedSnapshot } from "@hex-di/devtools";

function DashboardWidget() {
  const snapshot = useUnifiedSnapshot();
  const typed = asTypedSnapshot<AppLibraries>(snapshot);

  // Full autocomplete and type safety on library snapshots
  const machineCount = typed.libraries.FlowLibraryInspector.machineCount;       // number
  const totalSpans = typed.libraries.TracingLibraryInspector.totalSpans;         // number
  const storeCount = typed.libraries.StoreLibraryInspector.storeCount;           // number
  const activeSagas = typed.libraries.SagaLibraryInspector.sagas;                // readonly { sagaId, ... }[]

  return (
    <div>
      <p>Flow machines: {machineCount}</p>
      <p>Tracing spans: {totalSpans}</p>
      <p>Stores: {storeCount}</p>
      <p>Active sagas: {activeSagas.length}</p>
    </div>
  );
}
```

### AvailablePanels Compile-Time Panel Union

```typescript
type AppPanels = AvailablePanels<AppProvides>;
// "container" | "graph" | "scopes" | "events"
// | "FlowLibraryInspector" | "TracingLibraryInspector"
// | "StoreLibraryInspector" | "SagaLibraryInspector"

// Type-safe panel selection
function navigateToPanel(panel: AppPanels): void {
  /* ... */
}

navigateToPanel("FlowLibraryInspector"); // OK
navigateToPanel("container"); // OK
navigateToPanel("QueryLibraryInspector"); // Compile error: Query not in graph
```

### Compile Error Examples

```typescript
// ERROR 1: Typo in snapshot field name
typed.libraries.FlowLibraryInspector.machinecount;
//                                    ~~~~~~~~~~~~
// Property 'machinecount' does not exist on type 'FlowLibrarySnapshot'.
// Did you mean 'machineCount'?

// ERROR 2: Accessing a library not in the graph
typed.libraries.QueryLibraryInspector;
//              ~~~~~~~~~~~~~~~~~~~~~
// Property 'QueryLibraryInspector' does not exist on type
// '{ readonly FlowLibraryInspector: FlowLibrarySnapshot; ... }'.

// ERROR 3: Wrong type assumption
const count: string = typed.libraries.TracingLibraryInspector.totalSpans;
//    ~~~~~
// Type 'number' is not assignable to type 'string'.
```

### Assignability to Untyped UnifiedSnapshot

`TypedUnifiedSnapshot<AppLibraries>` is assignable to the base `UnifiedSnapshot`. This means typed code can pass its snapshot to any function expecting the untyped version:

```typescript
function logSnapshot(snapshot: UnifiedSnapshot): void {
  console.log(snapshot.registeredLibraries);
}

const typed: TypedUnifiedSnapshot<AppLibraries> = asTypedSnapshot<AppLibraries>(raw);
logSnapshot(typed); // OK -- TypedUnifiedSnapshot is a subtype of UnifiedSnapshot
```

## 5.4 Graph Builder Integration

After building a graph, the type-level library information is available through standard type utilities. No changes to the graph builder API are needed.

```typescript
import { GraphBuilder } from "@hex-di/graph";
import type { InferGraphProvides, LibrarySnapshotMap, ExtractLibraryNames } from "@hex-di/graph";

// Build a graph with library inspectors
const appGraph = GraphBuilder.create()
  .provide(FlowLibraryInspectorAdapter)
  .provide(TracingLibraryInspectorAdapter)
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build();

// Type-level queries (zero runtime cost)
type AppProvides = InferGraphProvides<typeof appGraph>;
type AppLibraries = LibrarySnapshotMap<AppProvides>;
// {
//   readonly FlowLibraryInspector: FlowLibrarySnapshot;
//   readonly TracingLibraryInspector: TracingLibrarySnapshot;
// }

type AppLibraryNames = ExtractLibraryNames<AppProvides>;
// "FlowLibraryInspector" | "TracingLibraryInspector"
```

### Compile-time validation examples

The type utilities enable compile-time checks that were previously impossible:

```typescript
// 1. Verify a specific library is registered
type HasFlow = "FlowLibraryInspector" extends ExtractLibraryNames<AppProvides> ? true : false;
// true

// 2. Access a specific library's snapshot type
type FlowSnap = AppLibraries["FlowLibraryInspector"];
// FlowLibrarySnapshot

// 3. Detect when a library is missing from the graph
type HasSaga = "SagaLibraryInspector" extends ExtractLibraryNames<AppProvides> ? true : false;
// false -- Saga library inspector was not provided
```

## 5.5 DevTools Port Requirements

A key design decision: DevTools does NOT require any specific library inspectors. It works with zero libraries (showing only the container, graph, scopes, and events panels) and dynamically adds library-specific panels as inspectors are discovered at runtime.

```typescript
// DevTools port -- no library inspector requirements
const HexDevToolsPort = port<HexDevTools>()({
  name: "HexDevTools",
  direction: "outbound",
  category: "infrastructure",
  tags: ["devtools", "inspection"],
});

// DevTools adapter -- requires only InspectorAPI (always available)
const HexDevToolsAdapter = defineAdapter({
  provides: HexDevToolsPort,
  requires: [], // No hard requirements
  lifetime: "singleton",
  factory: () => createHexDevTools(),
});
```

### Zero-requirement rationale

```
  Graph with 0 library inspectors         Graph with 3 library inspectors
  ===================================      ===================================

  +-----------------------------------+    +-----------------------------------+
  |  HexDevTools Panel                |    |  HexDevTools Panel                |
  |  +------+ +-------+ +-----+      |    |  +------+ +-------+ +-----+      |
  |  |Contai| | Graph | |Scope|      |    |  |Contai| | Graph | |Scope|      |
  |  |ner   | |       | |Tree |      |    |  |ner   | |       | |Tree |      |
  |  +------+ +-------+ +-----+      |    |  +------+ +-------+ +-----+      |
  |  +--------+                       |    |  +--------+ +------+ +-------+   |
  |  | Events |                       |    |  | Events | | Flow | |Tracing|   |
  |  +--------+                       |    |  +--------+ +------+ +-------+   |
  |                                   |    |  +--------+                      |
  |  (works fine -- core panels only) |    |  | Logger |                      |
  +-----------------------------------+    |  +--------+                      |
                                           +-----------------------------------+
```

At runtime, DevTools subscribes to `"library-registered"` and `"library-unregistered"` events from `InspectorAPI` to dynamically add and remove library panels.

At the **type level**, DevTools can be parameterized with the expected library map for type-safe panel access in application code:

```typescript
// Application-level typed DevTools hook
function useTypedDevTools<TProvides>() {
  type Libraries = LibrarySnapshotMap<TProvides>;
  // ...returns typed panel accessors
}
```

## 5.6 Compile-Time Panel Registration

DevTools panels fall into two categories: **built-in panels** (always available) and **library panels** (one per registered library inspector). The type system can compute the full set at build time.

```typescript
/**
 * Computes the union of all available panel identifiers for a given graph.
 *
 * Built-in panels are always present. Library panels are derived from the
 * graph's library-inspector ports.
 */
type AvailablePanels<TProvides> =
  | "container" // Always available -- ContainerSnapshot
  | "graph" // Always available -- ContainerGraphData
  | "scopes" // Always available -- ScopeTree
  | "events" // Always available -- InspectorEvent stream
  | ExtractLibraryNames<TProvides>; // Library-specific panels
```

### Panel type safety

Given `AvailablePanels`, panel selection can be type-checked:

```typescript
// Type-safe panel selector
function selectPanel<TProvides>(panel: AvailablePanels<TProvides>): void;

// Usage:
selectPanel<AppProvides>("container"); // OK
selectPanel<AppProvides>("FlowLibraryInspector"); // OK (Flow is in the graph)
selectPanel<AppProvides>("SagaLibraryInspector"); // Compile error (Saga not in graph)
```

### Panel-to-snapshot mapping

Each panel identifier maps to the data type it displays:

```typescript
/**
 * Maps panel identifiers to their data types.
 */
type PanelDataMap<TProvides> = {
  readonly container: ContainerSnapshot;
  readonly graph: ContainerGraphData;
  readonly scopes: ScopeTree;
  readonly events: readonly InspectorEvent[];
} & {
  readonly [K in ExtractLibraryNames<TProvides>]: ExtractLibrarySnapshot<TProvides, K>;
};
```

A React hook can use this mapping:

```typescript
function usePanelData<TProvides, TPanel extends AvailablePanels<TProvides>>(
  panel: TPanel
): PanelDataMap<TProvides>[TPanel];
```

### Full type flow diagram

```
  Graph Definition (compile time)
  ===============================

  const graph = GraphBuilder.create()
    .provide(FlowLibraryInspectorAdapter)     // category: "library-inspector"
    .provide(TracingLibraryInspectorAdapter)   // category: "library-inspector"
    .provide(LoggerAdapter)                    // category: "logging"
    .provide(UserServiceAdapter)              // category: "domain"
    .build();
      |
      |  InferGraphProvides<typeof graph>
      v
  TProvides =
    | DirectedPort<TypedLibraryInspector<"FlowLibraryInspector", FlowLibrarySnapshot>, ...>
    | DirectedPort<TypedLibraryInspector<"TracingLibraryInspector", TracingLibrarySnapshot>, ...>
    | DirectedPort<Logger, "Logger", "outbound", "logging">
    | DirectedPort<UserService, "UserService", "inbound", "domain">
      |
      |  PortsByCategory<TProvides, "library-inspector">
      v
  LibraryPorts =
    | DirectedPort<TypedLibraryInspector<"FlowLibraryInspector", FlowLibrarySnapshot>, ...>
    | DirectedPort<TypedLibraryInspector<"TracingLibraryInspector", TracingLibrarySnapshot>, ...>
      |
      +----> ExtractLibraryNames  ---->  "FlowLibraryInspector" | "TracingLibraryInspector"
      |
      +----> LibrarySnapshotMap   ---->  {
      |                                    FlowLibraryInspector: FlowLibrarySnapshot;
      |                                    TracingLibraryInspector: TracingLibrarySnapshot;
      |                                  }
      |
      +----> AvailablePanels      ---->  "container" | "graph" | "scopes" | "events"
      |                                  | "FlowLibraryInspector" | "TracingLibraryInspector"
      |
      +----> PanelDataMap         ---->  {
                                           container: ContainerSnapshot;
                                           graph: ContainerGraphData;
                                           scopes: ScopeTree;
                                           events: readonly InspectorEvent[];
                                           FlowLibraryInspector: FlowLibrarySnapshot;
                                           TracingLibraryInspector: TracingLibrarySnapshot;
                                         }

  Runtime (container created)
  ===========================

  const container = createContainer(graph, { name: "App" });
      |
      |  afterResolve hook
      |  (portMeta.category === "library-inspector" && isLibraryInspector(result))
      |  --> container.inspector.registerLibrary(result)
      v
  inspector.getUnifiedSnapshot()
      |
      |  asTypedSnapshot<LibrarySnapshotMap<AppProvides>>(snapshot)
      v
  TypedUnifiedSnapshot<{
    FlowLibraryInspector: FlowLibrarySnapshot;
    TracingLibraryInspector: TracingLibrarySnapshot;
  }>
```

## 5.7 Backward Compatibility

The typed protocol is a compile-time-only enhancement. Every aspect of backward compatibility is preserved:

### Runtime protocol unchanged

The `LibraryInspector` interface is not modified. The `isLibraryInspector()` type guard is not modified. The `createLibraryRegistry()` internal component is not modified. The `afterResolve` auto-discovery hook is not modified. All runtime behavior is identical.

### Untyped libraries still work

Libraries that have not migrated to `createTypedLibraryInspectorPort` continue to use `createLibraryInspectorPort`. Their ports carry `LibraryInspector` as the service type. When the type utilities encounter these ports:

- `InferTypedInspectorSnapshot` returns `Readonly<Record<string, unknown>>` (the fallback).
- The library appears in `ExtractLibraryNames` with its name.
- The library appears in `LibrarySnapshotMap` with `Readonly<Record<string, unknown>>` as its snapshot type.
- DevTools panels render the library's data, just without typed access to individual fields.

### Migration is per-library and non-breaking

Each library can migrate independently:

```
+----------------------------+-------------------------------------------+-----------------------------+
| Migration step             | What changes                              | What stays the same         |
+----------------------------+-------------------------------------------+-----------------------------+
| 1. Define snapshot type    | New .ts file with interface                | Nothing changes             |
| 2. Swap port factory       | createLibraryInspectorPort ->              | Runtime port value is       |
|                            | createTypedLibraryInspectorPort            | structurally identical      |
| 3. Type-check bridge       | Bridge getSnapshot() return type narrowed  | Bridge runtime code is      |
|                            |                                           | identical                   |
| 4. Consumers adopt         | Import snapshot type, use typed access      | Untyped access still works  |
+----------------------------+-------------------------------------------+-----------------------------+
```

### No breaking changes to public API

- `LibraryInspector` is not removed or modified.
- `createLibraryInspectorPort` is not removed or modified.
- `UnifiedSnapshot` is not removed or modified.
- `InspectorAPI` methods are not modified.
- All new types and functions are additive exports.

### Gradual adoption path

```
Phase 1: Define TypedLibraryInspector and createTypedLibraryInspectorPort in @hex-di/core.
         Define type extraction utilities in @hex-di/graph.
         Zero consumer impact.

Phase 2: Migrate Flow library inspector port to typed.
         Migrate Tracing library inspector port to typed.
         All existing code continues to compile.

Phase 3: DevTools uses LibrarySnapshotMap<TProvides> for typed panel props.
         Applications that want typed access import the snapshot types.

Phase 4: Remaining libraries (Store, Query, Saga, Logger) migrate to typed
         ports as they are implemented.
```

---

**Previous:** [01 - Overview and Architecture](./01-overview.md)
**Next:** [03 - Visual Design Specification](./03-visual-design.md)
