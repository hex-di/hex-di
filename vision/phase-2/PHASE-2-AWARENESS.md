# Phase 2: AWARENESS — Container Knows Itself

## Status: 100% Complete ✅

**Completion Date:** Phase 2 is fully implemented and verified.

---

## Vision Statement

> **"Container knows its topology (graph inspection), its state (runtime snapshots), and its history (tracing)."**

Phase 2 establishes the foundation of **self-awareness** in HexDI. The container becomes an introspective system that can answer three fundamental questions:

1. **STRUCTURE**: "What am I made of?" — Understanding the dependency graph topology
2. **STATE**: "What is my current condition?" — Knowing what's resolved, what's cached, what's active
3. **BEHAVIOR**: "What am I doing right now?" — Observing resolution activity in real-time

This self-knowledge enables debugging, monitoring, DevTools integration, and advanced features in later phases.

---

## The Three Layers of Self-Knowledge

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 2: AWARENESS                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Layer 1: STRUCTURAL AWARENESS (Graph)              │   │
│  │ "What am I made of?"                                │   │
│  │ • Graph construction with type-state machine        │   │
│  │ • Graph inspection (dependencyMap, orphans, etc.)  │   │
│  │ • Graph traversal (topological sort, paths)        │   │
│  │ • Complexity scoring & safety detection             │   │
│  │ • Suggestions system                                │   │
│  │ • Graph serialization                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Layer 2: STATE AWARENESS (Runtime)                 │   │
│  │ "What is my current condition?"                    │   │
│  │ • Container snapshots (frozen, typed)               │   │
│  │ • Scope tree inspection (hierarchical)              │   │
│  │ • Inspector API (pull-based queries)                │   │
│  │ • Push-based subscriptions (events)                  │   │
│  │ • Hierarchy traversal (child containers)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Layer 3: BEHAVIORAL AWARENESS (Tracing)            │   │
│  │ "What am I doing right now?"                        │   │
│  │ • Resolution tracing hooks (zero overhead)          │   │
│  │ • Span data capture (hex-di.* attributes)          │   │
│  │ • Span hierarchy (parent-child via stack)          │   │
│  │ • Error recording & status                          │   │
│  │ • Memory tracer (circular buffer 10k)              │   │
│  │ • W3C Trace Context (cross-boundary)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### Layer 1: STRUCTURAL AWARENESS (Graph)

The graph layer provides compile-time and runtime understanding of the dependency graph structure. This is the foundation for all other awareness capabilities.

#### 1.1 Graph Construction (GraphBuilder with Type-State Machine)

**Location:** `packages/graph/src/builder/builder.ts`

The `GraphBuilder` class uses a **type-state machine pattern** with phantom type parameters to track state at compile time:

```typescript
class GraphBuilder<
  TProvides = never,      // Union of provided ports
  TRequires = never,      // Union of required ports
  TAsyncPorts = never,    // Union of async ports
  TOverrides = never,     // Union of override ports
  TInternalState = DefaultInternals  // Dependency graph, lifetime map, etc.
>
```

**Key Features:**

- **Phantom types**: Type parameters exist only at compile time, no runtime overhead
- **Type-state evolution**: Each `.provide()` call changes the type parameters
- **Compile-time validation**: Cycle detection, captive dependencies, unsatisfied requirements
- **Immutable builder**: Each method returns a new builder instance

**Type Parameter Evolution:**

| Method                  | TProvides Effect           | TRequires Effect           | TInternalState Effect               |
| ----------------------- | -------------------------- | -------------------------- | ----------------------------------- |
| `create()`              | `never`                    | `never`                    | Empty (default)                     |
| `provide(adapter)`      | `\| InferProvides<A>`      | `\| InferRequires<A>`      | + depGraph edge, + lifetime entry   |
| `provideMany(adapters)` | `\| InferManyProvides<As>` | `\| InferManyRequires<As>` | + all edges, + all lifetimes        |
| `merge(other)`          | `\| OtherProvides`         | `\| OtherRequires`         | Merged depGraph, merged lifetimeMap |
| `override(adapter)`     | unchanged                  | unchanged                  | + depGraph edge (replaces parent)   |
| `build()`               | unchanged (frozen)         | must be `never`            | N/A - returns Graph                 |

**Example:**

```typescript
const builder = GraphBuilder.create()
  .provide(LoggerAdapter) // TProvides: "Logger"
  .provide(DatabaseAdapter) // TProvides: "Logger" | "Database"
  .build(); // Compile error if TRequires !== never
```

#### 1.2 Graph Inspection (inspectGraph → GraphInspection)

**Location:** `packages/graph/src/graph/inspection/inspector.ts`

The `inspectGraph()` function provides comprehensive runtime analysis of a graph:

```typescript
interface GraphInspection {
  adapterCount: number;
  provides: string[]; // "PortName (lifetime)"
  unsatisfiedRequirements: string[]; // Alphabetically sorted
  dependencyMap: Record<string, string[]>; // portName -> [deps]
  overrides: string[]; // Alphabetically sorted
  maxChainDepth: number; // Longest dependency chain
  depthWarning?: string; // Warning if approaching limit
  isComplete: boolean; // All deps satisfied
  summary: string; // Human-readable summary
  suggestions: GraphSuggestion[]; // Actionable suggestions
  orphanPorts: string[]; // Provided but never required
  disposalWarnings: string[]; // Lifetime disposal issues
  typeComplexityScore: number; // Performance heuristic
  performanceRecommendation: "safe" | "monitor" | "consider-splitting";
  portsWithFinalizers: string[]; // Ports with disposal logic
  depthLimitExceeded: boolean; // Exceeded compile-time limit
  unnecessaryLazyPorts: string[]; // Lazy ports that don't break cycles
  correlationId: string; // Unique ID for tracing
  ports: PortInfo[]; // Port metadata (direction, category, tags)
  directionSummary: DirectionSummary; // Inbound/outbound counts
}
```

**Key Properties:**

- **Order-independent**: Most properties are deterministic regardless of adapter registration order
- **Frozen results**: All arrays and objects are deeply frozen for immutability
- **Summary mode**: Lightweight `GraphSummary` with 7 fields for quick health checks

**Example:**

```typescript
const inspection = builder.inspect();
console.log(inspection.summary);
// "Graph(5 adapters, 0 unsatisfied): Logger (singleton), Database (scoped), ..."

if (inspection.maxChainDepth > 40) {
  console.warn(inspection.depthWarning);
}
```

#### 1.3 Graph Traversal

**Location:** `packages/graph/src/graph/inspection/traversal.ts`

Provides reusable functions for traversing and analyzing dependency graphs:

**Functions:**

| Function                                      | Purpose                   | Returns                                  |
| --------------------------------------------- | ------------------------- | ---------------------------------------- |
| `topologicalSort(adapters)`                   | Initialization order      | `string[] \| null` (null if cycle)       |
| `getTransitiveDependencies(portName, depMap)` | All transitive deps       | `ReadonlySet<string>`                    |
| `getTransitiveDependents(portName, depMap)`   | All transitive dependents | `ReadonlySet<string>`                    |
| `findDependencyPath(from, to, depMap)`        | Path between ports        | `string[] \| null`                       |
| `findCommonDependencies(portNames, depMap)`   | Shared dependencies       | `ReadonlySet<string>`                    |
| `computeDependencyLayers(adapters)`           | Initialization levels     | `ReadonlyMap<string, number> \| null`    |
| `getPortsByLayer(adapters)`                   | Ports grouped by level    | `readonly (readonly string[])[] \| null` |

**Example:**

```typescript
const depMap = buildDependencyMap(graph.adapters);
const deps = getTransitiveDependencies("UserService", depMap);
// Set { "UserRepository", "Database", "Logger" }

const layers = computeDependencyLayers(graph.adapters);
// Map { Database: 0, Logger: 0, UserRepository: 1, UserService: 2 }

const byLayer = getPortsByLayer(graph.adapters);
// [["Database", "Logger"], ["UserRepository"], ["UserService"]]
// Level 0 can init in parallel, then level 1, etc.
```

#### 1.4 Complexity Scoring

**Location:** `packages/graph/src/graph/inspection/complexity.ts`

Computes type complexity scores for performance monitoring:

**Formula:**

```
score = adapterCount + (maxDepth² × DEPTH_WEIGHT) + (avgFanOut × adapterCount × FANOUT_WEIGHT)
```

Where:

- `DEPTH_WEIGHT = 2` (quadratic impact due to type-level cycle detection O(depth²))
- `FANOUT_WEIGHT = 0.5` (linear impact per adapter)

**Breakdown:**

```typescript
interface ComplexityBreakdown {
  totalScore: number; // Sum of all contributions
  adapterCount: number;
  adapterContribution: number; // Equal to adapterCount
  maxDepth: number;
  depthContribution: number; // depth² × DEPTH_WEIGHT
  averageFanOut: number;
  fanOutContribution: number; // avgFanOut × adapterCount × FANOUT_WEIGHT
  totalEdges: number;
}
```

**Performance Thresholds:**

- `≤ 50`: **safe** — Safe for all applications
- `51-100`: **monitor** — Monitor for slowdowns in large graphs
- `> 100`: **consider-splitting** — Consider splitting into multiple graphs

**Example:**

```typescript
const breakdown = computeTypeComplexity(10, 5, dependencyMap);
console.log(`Depth contribution: ${breakdown.depthContribution}`);
// If depth contribution is high, consider restructuring to reduce chain depth
```

#### 1.5 Safety Detection

HexDI provides multiple layers of safety detection:

##### Compile-Time Cycle Detection (Peano Depth)

**Location:** `packages/graph/src/validation/types/cycle/`

Uses **Peano-style tuple length** to track recursion depth at the type level:

```typescript
// Depth tracking via tuple length
type Depth = []; // length = 0
type Depth1 = [x]; // length = 1
type Depth2 = [x, x]; // length = 2
// ... up to DefaultMaxDepth (50)
```

**Algorithm:**

- `IsReachable<TDepGraph, TFrom, TTo, TDepth, TMaxDepth>`: DFS traversal with depth limit
- `WouldCreateCycle<TDepGraph, TProvides, TRequires>`: Checks if adding adapter creates cycle
- Returns `true` (cycle), `false` (no cycle), or `DepthExceededResult` (inconclusive)

**Depth Limit:**

- Default: `50` (covers most enterprise graphs)
- Configurable: `GraphBuilder.withMaxDepth<N>()` (1-100)
- Extended mode: `withExtendedDepth()` — warnings instead of errors

**Example:**

```typescript
// Deep graph needs higher limit
const builder = GraphBuilder.withMaxDepth<100>().create()
  .provide(...)
  .build();
```

##### Runtime Cycle Detection

**Location:** `packages/graph/src/graph/inspection/runtime-cycle-detection.ts`

Safety net for graphs exceeding compile-time depth limit:

```typescript
function detectCycleAtRuntime(adapters: readonly AdapterConstraint[]): string[] | null;
```

**Algorithm:**

- DFS with path tracking
- Normalizes cycle paths to start from lexicographically smallest node
- Returns cycle path or `null` if clean

**Example:**

```typescript
if (inspection.depthLimitExceeded) {
  const cycle = detectCycleAtRuntime(graph.adapters);
  if (cycle) {
    throw new Error(`Circular dependency: ${cycle.join(" -> ")}`);
  }
}
```

##### Captive Dependency Detection

**Location:** `packages/graph/src/validation/types/captive/`

Detects lifetime violations where longer-lived services depend on shorter-lived services:

**Lifetime Hierarchy:**

- `transient` (level 3) — shortest lifetime
- `scoped` (level 2) — per-scope instance
- `singleton` (level 1) — longest lifetime

**Detection:**

- Compile-time: `FindAnyCaptiveDependency<TLifetimeMap, TLevel, TRequires>`
- Reverse checking: Detects when adding a shorter-lived adapter violates existing dependencies
- Two-pass algorithm: Builds complete lifetime map, then validates all adapters

**Example:**

```typescript
// ERROR: Singleton depends on Scoped
GraphBuilder.create()
  .provide(createAdapter({ provides: CachePort, lifetime: "singleton", requires: [SessionPort] }))
  .provide(createAdapter({ provides: SessionPort, lifetime: "scoped" }));
// Compile error: Captive dependency detected
```

##### Orphan Port Detection

**Location:** `packages/graph/src/graph/inspection/depth-analysis.ts`

Identifies ports that are provided but never required by other adapters:

```typescript
function computeOrphanPorts(providedSet: Set<string>, allRequires: Set<string>): string[];
```

**Use Cases:**

- Entry points (intentionally orphaned)
- Unused adapters (should be removed)
- Missing dependencies (should require the orphan)

**Example:**

```typescript
const orphans = inspection.orphanPorts;
if (orphans.length > 0) {
  console.warn(`Orphan ports: ${orphans.join(", ")}`);
}
```

#### 1.6 Suggestions System

**Location:** `packages/graph/src/graph/inspection/suggestions.ts`

Generates actionable suggestions based on graph state:

**Suggestion Types:**

| Type               | Trigger                       | Message                        | Action                                 |
| ------------------ | ----------------------------- | ------------------------------ | -------------------------------------- |
| `missing_adapter`  | Unsatisfied requirement       | Port required but no adapter   | Add adapter using `.provide()`         |
| `depth_warning`    | `maxChainDepth ≥ 40`          | Approaching compile-time limit | Use `withMaxDepth<N>()` or restructure |
| `orphan_port`      | Provided but not required     | Port unused                    | Verify entry point or remove           |
| `disposal_warning` | Lifetime disposal issue       | Disposal order problem         | Add finalizer or fix order             |
| `unnecessary_lazy` | Lazy port doesn't break cycle | Lazy port unnecessary          | Replace with direct dependency         |

**Example:**

```typescript
for (const suggestion of inspection.suggestions) {
  console.log(`${suggestion.type}: ${suggestion.message}`);
  console.log(`  → ${suggestion.action}`);
}
```

#### 1.7 Graph Serialization

**Location:** `packages/graph/src/graph/inspection/serialization.ts`

Converts `GraphInspection` to JSON-serializable format:

```typescript
function inspectionToJSON(
  inspection: GraphInspection,
  options?: InspectionToJSONOptions
): GraphInspectionJSON;
```

**Features:**

- Versioned schema (`version: 1`)
- Timestamp injection (for deterministic testing)
- All arrays/objects converted to plain types
- Safe for `JSON.stringify()`

**Use Cases:**

- Logging graph state as structured JSON
- Storing inspection results for analysis
- Network transport for remote diagnostics
- Snapshot testing with fixed timestamps

**Example:**

```typescript
const json = inspectionToJSON(inspection, {
  timestamp: "2024-01-01T00:00:00.000Z", // For tests
});
console.log(JSON.stringify(json, null, 2));
```

---

### Layer 2: STATE AWARENESS (Runtime)

The runtime layer provides introspection into the container's current state: what's resolved, what's cached, what scopes exist, and the container hierarchy.

#### 2.1 Container Snapshots

**Location:** `packages/runtime/src/inspection/creation.ts`

The `snapshot()` method returns a frozen, serializable snapshot of container state:

```typescript
interface ContainerSnapshot {
  isDisposed: boolean;
  singletons: SingletonEntry[]; // All singleton ports
  scopes: ScopeTree; // Root scope tree
  containerName: string; // Container identifier
}

interface SingletonEntry {
  portName: string;
  lifetime: "singleton";
  isResolved: boolean;
  resolvedAt?: number; // Timestamp
  resolutionOrder?: number; // Order of resolution
}
```

**Key Features:**

- **Frozen**: Deep freeze ensures immutability
- **Typed variants**: `buildTypedSnapshotFromInternal()` provides container-kind-specific types
- **O(n) complexity**: Iterates adapter map and memo entries
- **Throws if disposed**: Accessing disposed container throws error

**Example:**

```typescript
const snapshot = inspector.snapshot();
console.log(`Disposed: ${snapshot.isDisposed}`);
console.log(`Singletons: ${snapshot.singletons.length}`);
for (const singleton of snapshot.singletons) {
  if (singleton.isResolved) {
    console.log(`  ${singleton.portName} resolved at ${singleton.resolvedAt}`);
  }
}
```

#### 2.2 Scope Tree Inspection

**Location:** `packages/runtime/src/inspection/creation.ts`

The `getScopeTree()` method returns a hierarchical tree of all scopes:

```typescript
interface ScopeTree {
  id: string; // Scope identifier
  status: "active" | "disposed";
  resolvedCount: number; // Resolved ports in this scope
  totalCount: number; // Total scoped ports
  children: ScopeTree[]; // Child scopes (recursive)
  resolvedPorts: string[]; // Port names resolved in this scope
}
```

**Structure:**

```
container (root)
├── scope-1
│   ├── scope-1-1
│   └── scope-1-2
└── scope-2
    └── scope-2-1
```

**Example:**

```typescript
const tree = inspector.getScopeTree();
console.log(`Root: ${tree.id}, Status: ${tree.status}`);
console.log(`Resolved: ${tree.resolvedCount}/${tree.totalCount}`);
for (const child of tree.children) {
  console.log(`  Child ${child.id}: ${child.resolvedCount} resolved`);
}
```

#### 2.3 Inspector API

**Location:** `packages/runtime/src/inspection/builtin-api.ts`

The `InspectorAPI` provides comprehensive inspection capabilities:

##### Pull-Based Queries

```typescript
interface InspectorAPI {
  // Snapshot queries
  getSnapshot(): TypedContainerSnapshot;
  getScopeTree(): ScopeTree;
  listPorts(): readonly string[]; // Alphabetically sorted
  isResolved(portName: string): boolean | "scope-required";

  // Container metadata
  getContainerKind(): "root" | "child" | "lazy";
  getPhase(): ContainerPhase;
  readonly isDisposed: boolean;

  // Hierarchy traversal
  getChildContainers(): readonly InspectorAPI[];

  // Graph data
  getAdapterInfo(): readonly AdapterInfo[];
  getGraphData(): ContainerGraphData;

  // Push-based subscriptions
  subscribe(listener: InspectorListener): () => void;

  // Internal (for runtime/tracing)
  getContainer(): Container;
  emit(event: InspectorEvent): void;
}
```

**Pull-Based Methods:**

| Method                 | Purpose                    | Returns                       |
| ---------------------- | -------------------------- | ----------------------------- |
| `getSnapshot()`        | Complete state snapshot    | `TypedContainerSnapshot`      |
| `getScopeTree()`       | Scope hierarchy            | `ScopeTree`                   |
| `listPorts()`          | All registered ports       | `readonly string[]`           |
| `isResolved(portName)` | Resolution status          | `boolean \| "scope-required"` |
| `getContainerKind()`   | Container type             | `"root" \| "child" \| "lazy"` |
| `getPhase()`           | Container lifecycle phase  | `ContainerPhase`              |
| `getChildContainers()` | Child container inspectors | `readonly InspectorAPI[]`     |
| `getAdapterInfo()`     | Adapter metadata           | `readonly AdapterInfo[]`      |
| `getGraphData()`       | Graph visualization data   | `ContainerGraphData`          |

**Example:**

```typescript
const inspector = container.inspector;

// Check resolution status
if (inspector.isResolved("Logger")) {
  console.log("Logger has been resolved");
}

// List all ports
const ports = inspector.listPorts();
console.log(`Registered ports: ${ports.join(", ")}`);

// Traverse hierarchy
for (const child of inspector.getChildContainers()) {
  console.log(`Child: ${child.getContainerKind()}`);
}
```

##### Push-Based Subscriptions

**Event Types:**

```typescript
type InspectorEvent =
  | { type: "child-created"; childId: string; childInspector: InspectorAPI }
  | { type: "port-resolved"; portName: string; timestamp: number }
  | { type: "scope-created"; scopeId: string }
  | { type: "scope-disposed"; scopeId: string };
```

**Example:**

```typescript
const unsubscribe = inspector.subscribe(event => {
  if (event.type === "child-created") {
    console.log(`New child container: ${event.childId}`);
  } else if (event.type === "port-resolved") {
    console.log(`Port resolved: ${event.portName} at ${event.timestamp}`);
  }
});

// Later, unsubscribe
unsubscribe();
```

##### Hierarchy Traversal

The `getChildContainers()` method enables recursive traversal:

```typescript
function walkTree(inspector: InspectorAPI): void {
  console.log(`Container: ${inspector.getContainerKind()}`);

  for (const child of inspector.getChildContainers()) {
    walkTree(child); // Recursive
  }
}
```

**Features:**

- WeakMap caching for child inspectors
- Handles lazy containers (instrumented when created)
- Supports dynamic child containers via event subscriptions

---

### Layer 3: BEHAVIORAL AWARENESS (Tracing)

The tracing layer provides real-time observation of container activity: what's being resolved, how long it takes, what errors occur, and the resolution hierarchy.

#### 3.1 Resolution Tracing Hooks

**Location:** `packages/tracing/src/instrumentation/hooks.ts`

The `createTracingHook()` function returns resolution hooks that create spans for every dependency resolution:

```typescript
function createTracingHook(tracer: Tracer, options?: AutoInstrumentOptions): ResolutionHooks;
```

**Hook Lifecycle:**

```
beforeResolve(context)
  ├─ Create span
  ├─ Set attributes (port name, lifetime, etc.)
  ├─ Push to span stack
  └─ Return

[Resolution happens - may trigger nested resolutions]

afterResolve(context)
  ├─ Pop span from stack
  ├─ Set duration attribute
  ├─ Set status (ok/error)
  ├─ Record exception (if error)
  └─ End span
```

**Zero Overhead When Not Configured:**

```typescript
// Early bailout if tracer is disabled
if (!tracer.isEnabled()) {
  return { beforeResolve: () => {}, afterResolve: () => {} };
}
```

**Filtering Options:**

```typescript
interface AutoInstrumentOptions {
  traceSyncResolutions?: boolean; // Default: true
  traceAsyncResolutions?: boolean; // Default: true
  traceCachedResolutions?: boolean; // Default: true
  portFilter?: PortFilter; // Include/exclude ports
  minDurationMs?: number; // Skip fast resolutions
  additionalAttributes?: Attributes; // Custom attributes
  includeStackTrace?: boolean; // Add stack traces
}
```

**Example:**

```typescript
const hooks = createTracingHook(tracer, {
  traceCachedResolutions: false, // Skip cache hits
  minDurationMs: 5, // Only trace slow resolutions
  portFilter: { include: ["ApiService", "DatabasePool"] },
  additionalAttributes: {
    "service.name": "user-api",
    "deployment.environment": "production",
  },
});

const container = createContainer(graph, { hooks });
```

#### 3.2 Span Data Captured

**Location:** `packages/tracing/src/instrumentation/hooks.ts`

All spans include standard `hex-di.*` attributes:

| Attribute                    | Type                                     | Description                                |
| ---------------------------- | ---------------------------------------- | ------------------------------------------ |
| `hex-di.port.name`           | `string`                                 | Port name being resolved                   |
| `hex-di.port.lifetime`       | `"singleton" \| "scoped" \| "transient"` | Port lifetime                              |
| `hex-di.resolution.cached`   | `boolean`                                | Whether resolution was cached              |
| `hex-di.container.name`      | `string`                                 | Container identifier                       |
| `hex-di.container.kind`      | `"root" \| "child" \| "lazy"`            | Container type                             |
| `hex-di.resolution.depth`    | `number`                                 | Resolution depth (nesting level)           |
| `hex-di.parent.port`         | `string?`                                | Parent port name (if nested)               |
| `hex-di.scope.id`            | `string?`                                | Scope identifier (if scoped)               |
| `hex-di.inheritance.mode`    | `"shared" \| "isolated" \| "copy"?`      | Inheritance mode (if child)                |
| `hex-di.resolution.duration` | `number`                                 | Resolution duration in milliseconds        |
| `stackTrace`                 | `string?`                                | Stack trace (if `includeStackTrace: true`) |

**Example Span:**

```json
{
  "name": "resolve:UserService",
  "attributes": {
    "hex-di.port.name": "UserService",
    "hex-di.port.lifetime": "singleton",
    "hex-di.resolution.cached": false,
    "hex-di.container.name": "root",
    "hex-di.container.kind": "root",
    "hex-di.resolution.depth": 0,
    "hex-di.resolution.duration": 2.5
  },
  "status": "ok"
}
```

#### 3.3 Span Hierarchy

**Location:** `packages/tracing/src/instrumentation/span-stack.ts`

Parent-child relationships are established via a **module-level span stack**:

```typescript
// Module-level stack (shared across all containers)
const spanStack: Span[] = [];

function pushSpan(span: Span): void {
  spanStack.push(span);
}

function popSpan(): Span | undefined {
  return spanStack.pop();
}
```

**How It Works:**

1. **Nested Resolutions**: When `UserService` resolves `UserRepository`, the `UserService` span is on the stack
2. **Child Span Creation**: `UserRepository` span is created with `UserService` span as parent
3. **Cross-Container**: When root container triggers child container resolution, parent span is on stack

**Example:**

```
resolve:UserService (depth 0)
  └─ resolve:UserRepository (depth 1)
      └─ resolve:Database (depth 2)
```

**Dynamic Child Instrumentation:**

**Location:** `packages/tracing/src/instrumentation/tree.ts`

The `instrumentContainerTree()` function automatically instruments entire container hierarchies:

```typescript
function instrumentContainerTree(
  container: HookableContainer,
  inspector: InspectorAPI,
  tracer: Tracer,
  options?: AutoInstrumentOptions
): () => void;
```

**Features:**

- Instruments root container
- Walks existing child containers recursively
- Subscribes to `child-created` events for dynamic children
- Returns cleanup function (idempotent)

**Example:**

```typescript
const cleanup = instrumentContainerTree(root, root.inspector, tracer);

// All resolutions in tree create spans
const logger = root.resolve(LoggerPort);

// Child containers created later are auto-instrumented
const child = root.createChild(childGraph);
const cache = child.resolve(CachePort); // Creates span with parent relationship

cleanup(); // Remove all instrumentation
```

#### 3.4 Error Recording

**Location:** `packages/tracing/src/instrumentation/hooks.ts`

Errors are automatically recorded in spans:

```typescript
function afterResolve(ctx: ResolutionResultContext): void {
  const span = popSpan();

  if (ctx.error !== null) {
    span.recordException(ctx.error); // Records error details
    span.setStatus("error"); // Marks span as error
  } else {
    span.setStatus("ok");
  }

  span.end();
}
```

**Error Context Preserved:**

- Error message
- Error stack trace
- Resolution context (port name, container, etc.)
- Duration (even for failed resolutions)

**Example:**

```typescript
// If resolution throws, span is still ended with error status
try {
  const service = container.resolve(ServicePort);
} catch (error) {
  // Span already recorded the error
  // Check tracer.getCollectedSpans() for error details
}
```

#### 3.5 Memory Tracer

**Location:** `packages/tracing/src/adapters/memory/tracer.ts`

The `MemoryTracer` provides in-memory span collection for testing and debugging:

```typescript
class MemoryTracer implements Tracer {
  private readonly _spans: (SpanData | undefined)[]; // Circular buffer
  private _head = 0;
  private _tail = 0;
  private _size = 0;
  private readonly _maxSpans: number; // Default: 10000
}
```

**Features:**

- **Circular buffer**: FIFO eviction when limit reached (10k spans default)
- **Active span stack**: Array-based stack for O(1) push/pop
- **Flat storage**: No tree structure (parent-child via `parentSpanId`)
- **Test utilities**: `getCollectedSpans()`, `clear()`

**Example:**

```typescript
const tracer = createMemoryTracer();

tracer.withSpan("operation", span => {
  span.setAttribute("key", "value");
});

const spans = tracer.getCollectedSpans();
expect(spans).toHaveLength(1);
expect(spans[0].name).toBe("operation");
expect(spans[0].attributes.key).toBe("value");

tracer.clear(); // Reset for next test
```

**Circular Buffer Implementation:**

```typescript
private _collectSpan(spanData: SpanData): void {
  // Write at tail position
  this._spans[this._tail] = spanData;
  this._tail = (this._tail + 1) % this._maxSpans;

  // Update size and advance head if buffer is full
  if (this._size < this._maxSpans) {
    this._size++;
  } else {
    // Buffer full, advance head to maintain FIFO
    this._head = (this._head + 1) % this._maxSpans;
  }
}
```

#### 3.6 W3C Trace Context

**Location:** `packages/tracing/src/context/parse.ts`

Implements W3C Trace Context specification for distributed tracing:

**Format:**

```
traceparent: 00-{traceId}-{spanId}-{flags}
```

Where:

- `version`: `00` (2 hex chars)
- `traceId`: 32 hex chars (16 bytes), not all zeros
- `spanId`: 16 hex chars (8 bytes), not all zeros
- `flags`: 2 hex chars (1 byte)

**Functions:**

```typescript
// Parse traceparent header
function parseTraceparent(header: string): SpanContext | undefined;

// Format span context as traceparent
function formatTraceparent(context: SpanContext): string;

// Extract from HTTP headers (case-insensitive)
function extractTraceContext(headers: Record<string, string | undefined>): SpanContext | undefined;

// Inject into HTTP headers
function injectTraceContext(context: SpanContext, headers: Record<string, string>): void;
```

**Example:**

```typescript
// Parse incoming trace context
const headers = {
  traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  tracestate: "vendor1=value1",
};

const context = extractTraceContext(headers);
// {
//   traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
//   spanId: '00f067aa0ba902b7',
//   traceFlags: 1,
//   traceState: 'vendor1=value1'
// }

// Inject outgoing trace context
const outgoingHeaders: Record<string, string> = {};
injectTraceContext(context, outgoingHeaders);
// {
//   traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
//   tracestate: 'vendor1=value1'
// }
```

**Cross-Boundary Propagation:**

When resolving dependencies across service boundaries (HTTP, gRPC, etc.), trace context is propagated:

1. **Extract** trace context from incoming headers
2. **Create** child span with extracted context as parent
3. **Inject** trace context into outgoing headers

This maintains trace continuity across distributed systems.

---

## Verification Checklist

All Phase 2 features are implemented and verified:

### Layer 1: Structural Awareness ✅

- [x] GraphBuilder with type-state machine and phantom types
- [x] Graph inspection (`inspectGraph()`) with comprehensive analysis
- [x] Graph traversal utilities (topological sort, transitive deps, paths, layers)
- [x] Complexity scoring with breakdown and performance recommendations
- [x] Compile-time cycle detection with Peano depth (default 50, configurable 1-100)
- [x] Runtime cycle detection as safety net
- [x] Captive dependency detection (compile-time and reverse checking)
- [x] Orphan port detection
- [x] Suggestions system (missing adapters, depth warnings, orphans, disposal, unnecessary lazy)
- [x] Graph serialization (`inspectionToJSON()` with versioned schema)

### Layer 2: State Awareness ✅

- [x] Container snapshots (`snapshot()`) with frozen, typed variants
- [x] Scope tree inspection (`getScopeTree()`) with hierarchical structure
- [x] Inspector API with pull-based queries (`getSnapshot`, `getScopeTree`, `listPorts`, `isResolved`)
- [x] Push-based subscriptions (`subscribe`) with event types
- [x] Hierarchy traversal (`getChildContainers()`) with recursive support
- [x] Graph data access (`getAdapterInfo`, `getGraphData`) for visualization
- [x] Container metadata (`getContainerKind`, `getPhase`, `isDisposed`)

### Layer 3: Behavioral Awareness ✅

- [x] Resolution tracing hooks (`createTracingHook`) with zero overhead when disabled
- [x] Span data capture (all `hex-di.*` attributes with types)
- [x] Span hierarchy via module-level span stack (parent-child relationships)
- [x] Error recording (`recordException`, `setStatus`) with preserved context
- [x] Memory tracer (`MemoryTracer`) with circular buffer (10k limit, FIFO eviction)
- [x] W3C Trace Context (`parseTraceparent`, `formatTraceparent`, `extractTraceContext`, `injectTraceContext`)
- [x] Dynamic child instrumentation (`instrumentContainerTree`) with event subscriptions
- [x] Cross-container span relationships via span stack

---

## Relationship to Other Phases

### Prerequisites

Phase 2 builds on **Phase 1: FOUNDATION**:

- Graph construction (Phase 1) → Graph inspection (Phase 2)
- Container creation (Phase 1) → Container snapshots (Phase 2)
- Resolution hooks (Phase 1) → Tracing hooks (Phase 2)

### Enables Future Phases

Phase 2 enables:

- **Phase 3: VISUALIZATION** — Graph inspection data powers DevTools visualization
- **Phase 4: OPTIMIZATION** — Complexity scoring guides optimization decisions
- **Phase 5: INTELLIGENCE** — Tracing data enables ML-based optimization

### Integration Points

- **Graph → Runtime**: `inspectGraph()` analyzes graphs before container creation
- **Runtime → Tracing**: Inspector API provides container metadata for spans
- **Tracing → Graph**: Span data can be correlated with graph structure

---

## Key Files Reference

| Feature                     | File Path                                                        |
| --------------------------- | ---------------------------------------------------------------- |
| **Graph Construction**      | `packages/graph/src/builder/builder.ts`                          |
| **Graph Inspection**        | `packages/graph/src/graph/inspection/inspector.ts`               |
| **Graph Traversal**         | `packages/graph/src/graph/inspection/traversal.ts`               |
| **Complexity Scoring**      | `packages/graph/src/graph/inspection/complexity.ts`              |
| **Suggestions**             | `packages/graph/src/graph/inspection/suggestions.ts`             |
| **Runtime Cycle Detection** | `packages/graph/src/graph/inspection/runtime-cycle-detection.ts` |
| **Orphan Detection**        | `packages/graph/src/graph/inspection/depth-analysis.ts`          |
| **Compile-Time Cycles**     | `packages/graph/src/validation/types/cycle/detection.ts`         |
| **Peano Depth**             | `packages/graph/src/validation/types/cycle/depth.ts`             |
| **Captive Dependencies**    | `packages/graph/src/validation/types/captive/detection.ts`       |
| **Graph Serialization**     | `packages/graph/src/graph/inspection/serialization.ts`           |
| **Container Snapshots**     | `packages/runtime/src/inspection/creation.ts`                    |
| **Inspector API**           | `packages/runtime/src/inspection/builtin-api.ts`                 |
| **Tracing Hooks**           | `packages/tracing/src/instrumentation/hooks.ts`                  |
| **Span Stack**              | `packages/tracing/src/instrumentation/span-stack.ts`             |
| **Memory Tracer**           | `packages/tracing/src/adapters/memory/tracer.ts`                 |
| **Tree Instrumentation**    | `packages/tracing/src/instrumentation/tree.ts`                   |
| **W3C Trace Context**       | `packages/tracing/src/context/parse.ts`                          |
| **Trace Propagation**       | `packages/tracing/src/context/propagation.ts`                    |

---

## Summary

Phase 2: AWARENESS is **100% complete**. The container now has comprehensive self-knowledge across three layers:

1. **STRUCTURE** — Knows its dependency graph topology, complexity, and safety
2. **STATE** — Knows what's resolved, cached, and active in the runtime
3. **BEHAVIOR** — Observes resolution activity in real-time with distributed tracing

This foundation enables debugging, monitoring, DevTools integration, and advanced features in future phases.

---

**Next Phase:** Phase 3: VISUALIZATION — Container shows itself (DevTools, graph visualization, runtime inspection UI)
