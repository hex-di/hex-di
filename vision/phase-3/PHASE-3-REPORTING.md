# Phase 3: REPORTING — Every Library Reports What It Knows

## Status: 15% Complete

## Vision Statement

_"Every library in the ecosystem reports what it knows back to the central system."_

Phase 3 is the **CRITICAL convergence point** where the DI container transforms from a wiring mechanism into the **single source of truth** for all application knowledge. This phase establishes the reporting infrastructure that makes every library in the HexDI ecosystem observable, queryable, and diagnosable.

**The Convergence Point Concept:**

The container is uniquely positioned because:

- Every service creation flows through it
- Every library lifecycle is managed by it
- Every resolution is automatically observed
- Every state change can be reported to it

By making every library report its state, behavior, and capabilities back to the container, the container becomes the **nervous system** that knows everything about the application.

---

## Current State vs. Target State

### What Exists Today (15%)

**Tracing (30% complete):**

- ✅ Tracing hooks work (`packages/tracing/src/instrumentation/hooks.ts`)
- ✅ Memory tracer collects spans (`packages/tracing/src/adapters/memory/tracer.ts`)
- ✅ Span data structure with attributes, timing, parent-child relationships
- ❌ **NO query API** — can't filter, aggregate, or analyze spans
- ❌ **NO integration with container inspector** — tracing is isolated

**Flow (0% complete):**

- ✅ FlowAdapter exists (`libs/flow/core/src/integration/adapter.ts`)
- ✅ FlowService interface with state/context/transitions (`libs/flow/core/src/integration/types.ts`)
- ✅ Per-instance state tracking (each scope has its own machine)
- ❌ **NO FlowRegistry** — can't enumerate all machines
- ❌ **NO FlowInspector** — can't query machine state
- ❌ **NO tracing integration** — state transitions aren't traced

**React Integration (20% complete):**

- ✅ Basic hooks exist (`integrations/react/src/hooks/`)
- ✅ `useContainer()`, `useScope()`, `usePort()`, `useTracer()`
- ❌ **NO inspection hooks** — can't query container state from React
- ❌ **NO DevTools integration** — no React DevTools provider

**Hono Integration (20% complete):**

- ✅ Container/scope helpers exist (`integrations/hono/src/helpers.ts`)
- ✅ Middleware for request-scoped containers
- ❌ **NO inspection utilities** — can't query container from Hono context
- ❌ **NO diagnostic routes** — no `/debug` endpoints

**Store Library (0% complete):**

- ❌ Package doesn't exist (`packages/store/` missing)
- ✅ Spec exists (`spec/store/`) with introspection design
- ❌ No implementation

**Query Library (0% complete):**

- ❌ Package doesn't exist (`packages/query/` missing)
- ❌ No spec, no implementation

**Saga Library (0% complete):**

- ❌ Package doesn't exist (`packages/saga/` missing)
- ✅ Partial spec exists (`spec/saga.md`)
- ❌ No implementation

**Agent Library (0% complete):**

- ❌ Package doesn't exist (`packages/agent/` missing)
- ✅ Spec exists (`spec/agent/`) with full design
- ❌ No implementation

**Unified Knowledge Model (20% complete):**

- ✅ ContainerInspector exists (`packages/runtime/src/inspection/`)
- ✅ Basic snapshot structure
- ❌ **NO library-specific inspectors** — no FlowInspector, StoreInspector, etc.
- ❌ **NO unified snapshot** — can't get cross-library view
- ❌ **NO unified query API** — can't query across libraries

### What 100% Looks Like

**Complete Reporting Infrastructure:**

- Every library has an `Inspector` interface
- Every library reports to the container via standardized events
- Container inspector provides unified snapshot of ALL knowledge
- Cross-library queries work seamlessly

**Complete Query APIs:**

- Tracing: filter spans, aggregate metrics, analyze performance
- Flow: enumerate machines, query state, inspect transitions
- Store: query state values, action history, subscriber graph
- Query: cache contents, staleness, pending requests
- Saga: running workflows, compensation state, failure points
- Agent: tool registry, conversation history, approval state

**Complete Integration:**

- React hooks for all inspection APIs
- Hono diagnostic routes for server-side debugging
- DevTools visualization for all library state
- Tracing spans for all library operations

---

## Detailed Component Plans

### 3.1 Tracing Query API

**Current State:** 30% → **Target:** 100%

**Status:** Tracing hooks work, MemoryTracer collects spans, but no query API exists.

**Required Subtasks:**

#### 3.1.1 TracingQueryAPI Interface Design

**File:** `packages/tracing/src/inspection/query-api.ts`

**Interface:**

```typescript
export interface TracingQueryAPI {
  /**
   * Query spans with filters.
   * Returns matching spans in chronological order.
   */
  querySpans(filter: SpanFilter): readonly SpanData[];

  /**
   * Get average resolution duration for a port.
   * Returns undefined if no spans match.
   */
  getAverageDuration(portName: string, options?: TimeRangeOptions): number | undefined;

  /**
   * Get error count for a port or globally.
   * Returns 0 if no errors found.
   */
  getErrorCount(portName?: string, options?: TimeRangeOptions): number;

  /**
   * Get cache hit rate for a port or globally.
   * Returns 0-1 ratio, or undefined if no spans match.
   */
  getCacheHitRate(portName?: string, options?: TimeRangeOptions): number | undefined;

  /**
   * Get percentile durations (P50, P95, P99).
   * Returns object with percentile values in milliseconds.
   */
  getPercentiles(
    portName: string,
    percentiles: readonly number[],
    options?: TimeRangeOptions
  ): Record<number, number>;

  /**
   * Get slow resolutions above threshold.
   * Returns spans sorted by duration (slowest first).
   */
  getSlowResolutions(
    thresholdMs: number,
    options?: TimeRangeOptions & { limit?: number }
  ): readonly SpanData[];

  /**
   * Get error spans with full context.
   * Returns spans with status="error", sorted by timestamp (newest first).
   */
  getErrorSpans(
    portName?: string,
    options?: TimeRangeOptions & { limit?: number }
  ): readonly SpanData[];

  /**
   * Get resolution count for a port or globally.
   */
  getResolutionCount(portName?: string, options?: TimeRangeOptions): number;

  /**
   * Get span tree for a trace ID.
   * Returns root span with children array (tree structure).
   */
  getTraceTree(traceId: string): TraceTree | undefined;
}

export interface SpanFilter {
  /** Filter by port name (exact match) */
  portName?: string;
  /** Filter by time range */
  timeRange?: TimeRangeOptions;
  /** Filter by minimum duration (milliseconds) */
  minDuration?: number;
  /** Filter by maximum duration (milliseconds) */
  maxDuration?: number;
  /** Filter by status */
  status?: "ok" | "error" | "unset";
  /** Filter by scope ID */
  scopeId?: string;
  /** Filter by cache hit/miss */
  cached?: boolean;
  /** Filter by trace ID */
  traceId?: string;
  /** Maximum results to return */
  limit?: number;
}

export interface TimeRangeOptions {
  /** Start timestamp (milliseconds since epoch) */
  since?: number;
  /** End timestamp (milliseconds since epoch) */
  until?: number;
}

export interface TraceTree {
  readonly span: SpanData;
  readonly children: readonly TraceTree[];
}
```

**Effort:** M (3-5 days)
**Dependencies:** None (builds on existing MemoryTracer)

#### 3.1.2 MemoryTracer Filtering Implementation

**File:** `packages/tracing/src/adapters/memory/query.ts`

**Implementation:**

- Add `querySpans(filter: SpanFilter)` method to MemoryTracer
- Implement filter evaluation (portName, timeRange, duration, status, scopeId, cached)
- Use efficient filtering (early bailout, indexed lookups where possible)
- Return frozen arrays

**Effort:** M (3-5 days)
**Dependencies:** 3.1.1

#### 3.1.3 Aggregation Engine

**File:** `packages/tracing/src/inspection/aggregation.ts`

**Implementation:**

- `getAverageDuration()` — sum durations, divide by count
- `getErrorCount()` — count spans with status="error"
- `getCacheHitRate()` — count cached=true / total
- `getPercentiles()` — sort durations, calculate percentiles
- `getSlowResolutions()` — filter by threshold, sort descending
- `getErrorSpans()` — filter by status="error", sort by timestamp
- `getResolutionCount()` — count matching spans
- `getTraceTree()` — build tree from parentSpanId relationships

**Effort:** L (5-8 days)
**Dependencies:** 3.1.2

#### 3.1.4 Container Inspector Integration

**File:** `packages/tracing/src/inspection/container-integration.ts`

**Implementation:**

- Create `TracingInspector` that wraps TracingQueryAPI
- Register TracingInspector with container inspector
- Add tracing data to unified snapshot
- Expose via `container.inspector.getTracingInspector()`

**Effort:** M (3-5 days)
**Dependencies:** 3.1.3, ContainerInspector (exists)

#### 3.1.5 Scope Name Attribute Addition

**File:** `packages/tracing/src/instrumentation/hooks.ts`

**Implementation:**

- Add `hex-di.scope.name` attribute to spans when scope has a name
- Extract from scope metadata if available
- Update span attribute building logic

**Effort:** S (1-2 days)
**Dependencies:** None

**Total Effort for 3.1:** L (15-25 days)

---

### 3.2 Flow Reporting

**Current State:** 0% → **Target:** 100%

**Status:** FlowAdapter exists but no registry or inspector.

**Required Subtasks:**

#### 3.2.1 FlowRegistry Implementation

**File:** `libs/flow/core/src/inspection/registry.ts`

**Interface:**

```typescript
export interface FlowRegistry {
  /**
   * Register a FlowService instance.
   * Called automatically by FlowAdapter when service is created.
   */
  register(portName: string, service: FlowServiceAny): void;

  /**
   * Unregister a FlowService instance.
   * Called automatically when service is disposed.
   */
  unregister(portName: string, service: FlowServiceAny): void;

  /**
   * Get all registered machines for a port.
   * Returns array of FlowService instances (one per scope for scoped lifetime).
   */
  getAllMachines(portName: string): readonly FlowServiceAny[];

  /**
   * Get all registered port names.
   */
  getAllPortNames(): readonly string[];

  /**
   * Get total machine count across all ports.
   */
  getTotalMachineCount(): number;
}

export function createFlowRegistry(): FlowRegistry;
```

**Implementation:**

- Global registry (singleton) or per-container registry
- Map<portName, Set<FlowServiceAny>> for tracking
- WeakSet for fast unregistration lookup
- Thread-safe operations (if needed for async)

**Effort:** M (3-5 days)
**Dependencies:** None

#### 3.2.2 FlowInspector Interface Design

**File:** `libs/flow/core/src/inspection/inspector.ts`

**Interface:**

```typescript
export interface FlowInspector {
  /**
   * Get current state of a machine.
   * Returns undefined if machine not found.
   */
  getMachineState(portName: string, instanceId?: string): MachineStateSnapshot | undefined;

  /**
   * Get valid transitions from current state.
   * Returns array of event types that can be sent.
   */
  getValidTransitions(portName: string, instanceId?: string): readonly string[];

  /**
   * Get running activities for a machine.
   * Returns array of activity statuses.
   */
  getRunningActivities(portName: string, instanceId?: string): readonly ActivityStatus[];

  /**
   * Get event history for a machine.
   * Returns array of events in chronological order.
   */
  getEventHistory(
    portName: string,
    instanceId?: string,
    options?: { limit?: number }
  ): readonly EventHistoryEntry[];

  /**
   * Get all machines for a port.
   * Returns array of machine snapshots (one per scope).
   */
  getAllMachines(portName: string): readonly MachineStateSnapshot[];

  /**
   * Get snapshot of all machines across all ports.
   */
  getAllMachinesSnapshot(): AllMachinesSnapshot;
}

export interface MachineStateSnapshot {
  readonly portName: string;
  readonly instanceId: string;
  readonly state: string;
  readonly context: unknown;
  readonly validTransitions: readonly string[];
  readonly runningActivities: readonly ActivityStatus[];
  readonly isDisposed: boolean;
}

export interface EventHistoryEntry {
  readonly eventType: string;
  readonly payload: unknown;
  readonly timestamp: number;
  readonly resultingState: string;
}

export interface AllMachinesSnapshot {
  readonly timestamp: number;
  readonly machines: readonly MachineStateSnapshot[];
  readonly totalCount: number;
}
```

**Effort:** M (3-5 days)
**Dependencies:** 3.2.1

#### 3.2.3 FlowAdapter Registration Update

**File:** `libs/flow/core/src/integration/adapter.ts`

**Implementation:**

- Import FlowRegistry
- Call `registry.register()` in factory after creating FlowService
- Call `registry.unregister()` in finalizer when disposing
- Pass port name from adapter.provides

**Effort:** S (1-2 days)
**Dependencies:** 3.2.1

#### 3.2.4 Container Inspector Integration

**File:** `libs/flow/core/src/inspection/container-integration.ts`

**Implementation:**

- Create FlowInspector that wraps FlowRegistry
- Register with container inspector
- Add flow data to unified snapshot
- Expose via `container.inspector.getFlowInspector()`

**Effort:** M (3-5 days)
**Dependencies:** 3.2.2, ContainerInspector (exists)

#### 3.2.5 Tracing Integration

**File:** `libs/flow/core/src/inspection/tracing-integration.ts`

**Implementation:**

- Emit spans for state transitions
- Span name: `flow:${portName}/${state}`
- Attributes: `hex-di.flow.port_name`, `hex-di.flow.state`, `hex-di.flow.event_type`
- Parent span context from current resolution if available
- Conditional integration (only if TracerPort is registered)

**Effort:** M (3-5 days)
**Dependencies:** 3.2.3, Tracing hooks (exists)

#### 3.2.6 Event Queue Introspection

**File:** `libs/flow/core/src/inspection/event-queue.ts`

**Implementation:**

- Expose pending events in queue
- Add to MachineStateSnapshot: `pendingEvents: readonly PendingEvent[]`
- Include event type, payload, timestamp

**Effort:** S (1-2 days)
**Dependencies:** 3.2.2

**Total Effort for 3.2:** L (15-24 days)

---

### 3.3 React Inspection Hooks

**Current State:** 20% → **Target:** 100%

**Status:** Basic hooks exist, but no inspection hooks.

**Required Subtasks:**

#### 3.3.1 useInspector Hook

**File:** `integrations/react/src/hooks/use-inspector.ts`

**Implementation:**

```typescript
export function useInspector<TProvides extends Port<unknown, string>>(
  container: Container<TProvides>
): InspectorAPI {
  return container.inspector;
}
```

**Effort:** S (1 day)
**Dependencies:** ContainerInspector (exists)

#### 3.3.2 useSnapshot Hook

**File:** `integrations/react/src/hooks/use-snapshot.ts`

**Implementation:**

```typescript
export function useSnapshot<TProvides extends Port<unknown, string>>(
  container: Container<TProvides>
): ContainerSnapshot {
  const [snapshot, setSnapshot] = useState(() => container.inspector.getSnapshot());

  useEffect(() => {
    const unsubscribe = container.inspector.subscribe(() => {
      setSnapshot(container.inspector.getSnapshot());
    });
    return unsubscribe;
  }, [container]);

  return snapshot;
}
```

**Effort:** S (1-2 days)
**Dependencies:** 3.3.1

#### 3.3.3 useScopeTree Hook

**File:** `integrations/react/src/hooks/use-scope-tree.ts`

**Implementation:**

```typescript
export function useScopeTree<TProvides extends Port<unknown, string>>(
  container: Container<TProvides>
): ScopeTree {
  const [tree, setTree] = useState(() => container.inspector.getScopeTree());

  useEffect(() => {
    const unsubscribe = container.inspector.subscribe(() => {
      setTree(container.inspector.getScopeTree());
    });
    return unsubscribe;
  }, [container]);

  return tree;
}
```

**Effort:** S (1-2 days)
**Dependencies:** 3.3.1

#### 3.3.4 useTracingSummary Hook

**File:** `integrations/react/src/hooks/use-tracing-summary.ts`

**Implementation:**

```typescript
export function useTracingSummary(
  tracingInspector: TracingInspector | undefined,
  portName?: string
): TracingSummary | undefined {
  const [summary, setSummary] = useState<TracingSummary | undefined>(() => {
    if (!tracingInspector) return undefined;
    return {
      totalResolutions: tracingInspector.getResolutionCount(portName),
      averageDuration: tracingInspector.getAverageDuration(portName),
      errorCount: tracingInspector.getErrorCount(portName),
      cacheHitRate: tracingInspector.getCacheHitRate(portName),
    };
  });

  // Update on interval or event subscription
  useEffect(() => {
    if (!tracingInspector) return;
    const interval = setInterval(() => {
      setSummary({
        totalResolutions: tracingInspector.getResolutionCount(portName),
        averageDuration: tracingInspector.getAverageDuration(portName),
        errorCount: tracingInspector.getErrorCount(portName),
        cacheHitRate: tracingInspector.getCacheHitRate(portName),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [tracingInspector, portName]);

  return summary;
}
```

**Effort:** M (3-5 days)
**Dependencies:** 3.1.4 (TracingInspector)

#### 3.3.5 useFlowState Hook

**File:** `integrations/react/src/hooks/use-flow-state.ts`

**Implementation:**

```typescript
export function useFlowState(
  flowInspector: FlowInspector | undefined,
  portName: string,
  instanceId?: string
): MachineStateSnapshot | undefined {
  const [state, setState] = useState(() => flowInspector?.getMachineState(portName, instanceId));

  useEffect(() => {
    if (!flowInspector) return;
    const interval = setInterval(() => {
      setState(flowInspector.getMachineState(portName, instanceId));
    }, 100);
    return () => clearInterval(interval);
  }, [flowInspector, portName, instanceId]);

  return state;
}
```

**Effort:** M (3-5 days)
**Dependencies:** 3.2.4 (FlowInspector)

#### 3.3.6 DevToolsProvider Component

**File:** `integrations/react/src/components/DevToolsProvider.tsx`

**Implementation:**

```typescript
export interface DevToolsProviderProps {
  container: Container<Port<unknown, string>>;
  children: React.ReactNode;
  enabled?: boolean;
}

export function DevToolsProvider({
  container,
  children,
  enabled = process.env.NODE_ENV === 'development',
}: DevToolsProviderProps) {
  useEffect(() => {
    if (!enabled) return;

    // Register with React DevTools
    // Send container inspector data via postMessage
    const inspector = container.inspector;
    const unsubscribe = inspector.subscribe((event) => {
      window.postMessage({
        type: 'HEXDI_INSPECTOR_EVENT',
        event,
        snapshot: inspector.getSnapshot(),
      }, '*');
    });

    return unsubscribe;
  }, [container, enabled]);

  return <>{children}</>;
}
```

**Effort:** M (3-5 days)
**Dependencies:** 3.3.1

**Total Effort for 3.3:** M (12-20 days)

---

### 3.4 Hono Inspection Utilities

**Current State:** 20% → **Target:** 100%

**Status:** Basic helpers exist, but no inspection utilities.

**Required Subtasks:**

#### 3.4.1 inspectContainer Helper

**File:** `integrations/hono/src/inspection/helpers.ts`

**Implementation:**

```typescript
export function inspectContainer<E extends GenericEnv>(
  context: Context<E>,
  containerKey?: string
): InspectorAPI {
  const container = getContainer(context, containerKey);
  return container.inspector;
}
```

**Effort:** S (1 day)
**Dependencies:** ContainerInspector (exists)

#### 3.4.2 createDiagnosticRoutes Factory

**File:** `integrations/hono/src/inspection/routes.ts`

**Implementation:**

```typescript
export interface DiagnosticRoutesConfig {
  containerKey?: string;
  enabled?: boolean;
  pathPrefix?: string;
}

export function createDiagnosticRoutes(config?: DiagnosticRoutesConfig): Hono {
  const app = new Hono();
  const prefix = config?.pathPrefix ?? "/debug";
  const enabled = config?.enabled ?? process.env.NODE_ENV === "development";

  if (!enabled) {
    return app; // Return empty router
  }

  // GET /debug/container/snapshot
  app.get(`${prefix}/container/snapshot`, async c => {
    const inspector = inspectContainer(c, config?.containerKey);
    return c.json(inspector.getSnapshot());
  });

  // GET /debug/container/ports
  app.get(`${prefix}/container/ports`, async c => {
    const inspector = inspectContainer(c, config?.containerKey);
    return c.json(inspector.listPorts());
  });

  // GET /debug/container/scopes
  app.get(`${prefix}/container/scopes`, async c => {
    const inspector = inspectContainer(c, config?.containerKey);
    return c.json(inspector.getScopeTree());
  });

  // GET /debug/tracing/spans?portName=...&since=...
  app.get(`${prefix}/tracing/spans`, async c => {
    const inspector = inspectContainer(c, config?.containerKey);
    const tracingInspector = inspector.getTracingInspector?.();
    if (!tracingInspector) {
      return c.json({ error: "Tracing not available" }, 404);
    }
    const filter = parseSpanFilter(c.req.query());
    return c.json(tracingInspector.querySpans(filter));
  });

  // GET /debug/flow/machines?portName=...
  app.get(`${prefix}/flow/machines`, async c => {
    const inspector = inspectContainer(c, config?.containerKey);
    const flowInspector = inspector.getFlowInspector?.();
    if (!flowInspector) {
      return c.json({ error: "Flow not available" }, 404);
    }
    const portName = c.req.query("portName");
    if (portName) {
      return c.json(flowInspector.getAllMachines(portName));
    }
    return c.json(flowInspector.getAllMachinesSnapshot());
  });

  // GET /debug/health
  app.get(`${prefix}/health`, async c => {
    const inspector = inspectContainer(c, config?.containerKey);
    const snapshot = inspector.getSnapshot();
    return c.json({
      status: snapshot.isDisposed ? "disposed" : "healthy",
      phase: inspector.getPhase(),
      portCount: snapshot.ports.length,
      singletonCount: snapshot.singletons.length,
      scopeCount: inspector.getScopeTree().children.length,
    });
  });

  return app;
}
```

**Effort:** M (3-5 days)
**Dependencies:** 3.4.1, 3.1.4, 3.2.4

#### 3.4.3 Tracing Response Headers

**File:** `integrations/hono/src/inspection/tracing-headers.ts`

**Implementation:**

- Add W3C Trace Context headers to responses
- Extract trace context from current span
- Set `traceparent` and `tracestate` headers
- Middleware that runs after request handling

**Effort:** S (1-2 days)
**Dependencies:** Tracing hooks (exists)

#### 3.4.4 Request-ID Correlation

**File:** `integrations/hono/src/inspection/request-id.ts`

**Implementation:**

- Generate request ID for each request
- Add to span attributes: `hex-di.request.id`
- Include in response headers: `X-Request-ID`
- Enable correlation between logs, traces, and requests

**Effort:** S (1-2 days)
**Dependencies:** Tracing hooks (exists)

**Total Effort for 3.4:** M (6-10 days)

---

### 3.5 Store Library

**Current State:** 0% → **Target:** 100%

**Status:** Package doesn't exist. Spec exists at `spec/store/`.

**Required Subtasks:**

#### 3.5.1 Package Setup

**Files:**

- `packages/store/package.json`
- `packages/store/tsconfig.json`
- `packages/store/src/index.ts`

**Implementation:**

- Create package structure
- Set up dependencies: `@hex-di/core`, `@hex-di/runtime`
- Export public API

**Effort:** S (1-2 days)
**Dependencies:** None

#### 3.5.2 StorePort Interface

**File:** `packages/store/src/ports/store-port.ts`

**Interface:**

```typescript
export interface StorePort<TState> {
  /**
   * Get current state value.
   */
  get(): TState;

  /**
   * Set state value (replaces entire state).
   */
  set(state: TState): void;

  /**
   * Update state using a reducer function.
   */
  update(updater: (prev: TState) => TState): void;

  /**
   * Subscribe to state changes.
   * Returns unsubscribe function.
   */
  subscribe(listener: (state: TState) => void): () => void;

  /**
   * Derive a computed value from this store.
   * Returns a derived store that updates when source changes.
   */
  derive<TDerived>(selector: (state: TState) => TDerived): DerivedStorePort<TDerived>;
}
```

**Effort:** M (3-5 days)
**Dependencies:** 3.5.1

#### 3.5.3 Signal-Based Reactive Store Adapter

**File:** `packages/store/src/adapters/signal-store-adapter.ts`

**Implementation:**

- Use signals library (e.g., `@preact/signals-core`) for reactivity
- Create adapter that provides StorePort
- Implement get/set/update/subscribe/derive
- Support singleton and scoped lifetimes

**Effort:** L (5-8 days)
**Dependencies:** 3.5.2

#### 3.5.4 Action History

**File:** `packages/store/src/inspection/action-history.ts`

**Implementation:**

- Track all state transitions
- Store action name, payload, prevState, nextState, timestamp
- Configurable history size (max entries)
- Filtering by port name, action name, time range

**Effort:** M (3-5 days)
**Dependencies:** 3.5.3

#### 3.5.5 StoreInspector

**File:** `packages/store/src/inspection/inspector.ts`

**Interface:**

```typescript
export interface StoreInspector {
  /**
   * Get snapshot of all store state.
   */
  getSnapshot(): StoreSnapshot;

  /**
   * Get state for a specific port.
   */
  getPortState(portName: string): PortSnapshot | undefined;

  /**
   * List all registered state ports.
   */
  listStatePorts(): readonly StatePortInfo[];

  /**
   * Get subscriber dependency graph.
   */
  getSubscriberGraph(): SubscriberGraph;

  /**
   * Get action history with optional filtering.
   */
  getActionHistory(filter?: ActionHistoryFilter): readonly ActionHistoryEntry[];

  /**
   * Subscribe to inspector events.
   */
  subscribe(listener: StoreInspectorListener): () => void;
}
```

**Effort:** L (5-8 days)
**Dependencies:** 3.5.4, spec/store/05b-introspection.md

#### 3.5.6 Container Integration

**File:** `packages/store/src/inspection/container-integration.ts`

**Implementation:**

- Register StoreInspector with container inspector
- Add store data to unified snapshot
- Expose via `container.inspector.getStoreInspector()`

**Effort:** M (3-5 days)
**Dependencies:** 3.5.5, ContainerInspector (exists)

#### 3.5.7 Tracing Integration

**File:** `packages/store/src/inspection/tracing-integration.ts`

**Implementation:**

- Emit spans for state transitions
- Span name: `store:${portName}/${actionName}`
- Attributes: `hex-di.store.port_name`, `hex-di.store.action_name`, `hex-di.store.subscriber_count`
- Conditional integration (only if TracerPort is registered)

**Effort:** M (3-5 days)
**Dependencies:** 3.5.3, Tracing hooks (exists)

#### 3.5.8 React Hooks

**File:** `packages/store/src/react/hooks.ts`

**Implementation:**

- `useStore(port)` — subscribe to store changes
- `useStoreValue(port, selector)` — subscribe to derived value
- `useStoreAction(port, actionName)` — get action dispatcher

**Effort:** M (3-5 days)
**Dependencies:** 3.5.3, React integration (exists)

**Total Effort for 3.5:** XL (26-43 days)

---

### 3.6 Query Library

**Current State:** 0% → **Target:** 100%

**Status:** Package doesn't exist. No spec.

**Required Subtasks:**

#### 3.6.1 Package Setup

**Files:**

- `packages/query/package.json`
- `packages/query/tsconfig.json`
- `packages/query/src/index.ts`

**Effort:** S (1-2 days)
**Dependencies:** None

#### 3.6.2 QueryPort Interface

**File:** `packages/query/src/ports/query-port.ts`

**Interface:**

```typescript
export interface QueryPort<TKey, TData> {
  /**
   * Fetch data for a key.
   * Returns cached data if available and fresh, otherwise fetches.
   */
  fetch(key: TKey): Promise<TData>;

  /**
   * Invalidate cached data for a key or pattern.
   */
  invalidate(key: TKey | TKey[]): void;

  /**
   * Prefetch data for a key (optimistic fetch).
   */
  prefetch(key: TKey): Promise<void>;

  /**
   * Get cached data without fetching.
   * Returns undefined if not cached or stale.
   */
  getCached(key: TKey): TData | undefined;

  /**
   * Get cache status for a key.
   */
  getCacheStatus(key: TKey): CacheStatus;
}

export interface CacheStatus {
  readonly isCached: boolean;
  readonly isStale: boolean;
  readonly age: number; // milliseconds
  readonly staleAt: number; // timestamp when stale
}
```

**Effort:** M (3-5 days)
**Dependencies:** 3.6.1

#### 3.6.3 Cache Manager with Staleness Tracking

**File:** `packages/query/src/cache/cache-manager.ts`

**Implementation:**

- Map-based cache storage
- Staleness calculation based on TTL
- LRU eviction for memory management
- Timestamp tracking for age calculation

**Effort:** M (3-5 days)
**Dependencies:** 3.6.2

#### 3.6.4 Request Deduplication

**File:** `packages/query/src/cache/deduplication.ts`

**Implementation:**

- Track in-flight requests by key
- Reuse promise for concurrent requests
- Prevent duplicate fetches

**Effort:** M (3-5 days)
**Dependencies:** 3.6.3

#### 3.6.5 Optimistic Updates

**File:** `packages/query/src/cache/optimistic.ts`

**Implementation:**

- Allow setting temporary cache value
- Mark as optimistic
- Replace with real data when fetch completes

**Effort:** M (3-5 days)
**Dependencies:** 3.6.3

#### 3.6.6 QueryInspector

**File:** `packages/query/src/inspection/inspector.ts`

**Interface:**

```typescript
export interface QueryInspector {
  /**
   * Get snapshot of all cache state.
   */
  getSnapshot(): QuerySnapshot;

  /**
   * Get cache contents for a port.
   */
  getCacheContents(portName: string): readonly CacheEntry[];

  /**
   * Get stale cache entries.
   */
  getStaleEntries(portName?: string): readonly CacheEntry[];

  /**
   * Get pending requests.
   */
  getPendingRequests(portName?: string): readonly PendingRequest[];

  /**
   * Get cache statistics.
   */
  getStatistics(portName?: string): CacheStatistics;

  /**
   * Subscribe to inspector events.
   */
  subscribe(listener: QueryInspectorListener): () => void;
}
```

**Effort:** L (5-8 days)
**Dependencies:** 3.6.5

#### 3.6.7 Container Integration

**File:** `packages/query/src/inspection/container-integration.ts`

**Implementation:**

- Register QueryInspector with container inspector
- Add query data to unified snapshot
- Expose via `container.inspector.getQueryInspector()`

**Effort:** M (3-5 days)
**Dependencies:** 3.6.6, ContainerInspector (exists)

#### 3.6.8 Tracing Integration

**File:** `packages/query/src/inspection/tracing-integration.ts`

**Implementation:**

- Emit spans for fetch operations
- Span name: `query:${portName}/${key}`
- Attributes: `hex-di.query.port_name`, `hex-di.query.key`, `hex-di.query.cache_hit`, `hex-di.query.stale`
- Conditional integration

**Effort:** M (3-5 days)
**Dependencies:** 3.6.3, Tracing hooks (exists)

#### 3.6.9 React Hooks

**File:** `packages/query/src/react/hooks.ts`

**Implementation:**

- `useQuery(port, key)` — fetch and subscribe
- `useQueryStatus(port, key)` — get loading/error state
- `usePrefetch(port, key)` — prefetch hook

**Effort:** M (3-5 days)
**Dependencies:** 3.6.3, React integration (exists)

**Total Effort for 3.6:** XL (30-48 days)

---

### 3.7 Saga Library

**Current State:** 0% → **Target:** 100%

**Status:** Package doesn't exist. Partial spec at `spec/saga.md`.

**Required Subtasks:**

#### 3.7.1 Package Setup

**Files:**

- `packages/saga/package.json`
- `packages/saga/tsconfig.json`
- `packages/saga/src/index.ts`

**Effort:** S (1-2 days)
**Dependencies:** None

#### 3.7.2 SagaDefinition + SagaPort Interfaces

**File:** `packages/saga/src/ports/saga-port.ts`

**Interface:**

```typescript
export interface SagaStep<TContext> {
  readonly name: string;
  readonly execute: (context: TContext) => Promise<void>;
  readonly compensate?: (context: TContext) => Promise<void>;
}

export interface SagaDefinition<TContext> {
  readonly name: string;
  readonly steps: readonly SagaStep<TContext>[];
  readonly contextFactory: () => TContext;
}

export interface SagaPort<TContext> {
  /**
   * Execute the saga from the beginning.
   */
  execute(): Promise<SagaResult<TContext>>;

  /**
   * Get current execution state.
   */
  getState(): SagaState<TContext>;

  /**
   * Retry failed step.
   */
  retryStep(stepName: string): Promise<void>;

  /**
   * Execute compensation chain from current step.
   */
  compensate(): Promise<void>;
}

export interface SagaState<TContext> {
  readonly currentStep: string | null;
  readonly completedSteps: readonly string[];
  readonly failedStep: string | null;
  readonly context: TContext;
  readonly isCompensating: boolean;
}
```

**Effort:** M (3-5 days)
**Dependencies:** 3.7.1

#### 3.7.3 Saga Runner with Sequential Steps

**File:** `packages/saga/src/runner/saga-runner.ts`

**Implementation:**

- Execute steps sequentially
- Track current step, completed steps, failed step
- Handle errors and trigger compensation
- State machine for execution flow

**Effort:** L (5-8 days)
**Dependencies:** 3.7.2

#### 3.7.4 Compensation Chains

**File:** `packages/saga/src/runner/compensation.ts`

**Implementation:**

- Execute compensation steps in reverse order
- Track compensation state
- Handle compensation failures
- Full rollback support

**Effort:** M (3-5 days)
**Dependencies:** 3.7.3

#### 3.7.5 Transaction Boundaries

**File:** `packages/saga/src/runner/transactions.ts`

**Implementation:**

- Define transaction boundaries per step
- Automatic rollback on failure
- Integration with container scopes for isolation

**Effort:** M (3-5 days)
**Dependencies:** 3.7.4

#### 3.7.6 SagaInspector

**File:** `packages/saga/src/inspection/inspector.ts`

**Interface:**

```typescript
export interface SagaInspector {
  /**
   * Get all running sagas.
   */
  getRunningSagas(): readonly SagaStateSnapshot[];

  /**
   * Get saga state by ID.
   */
  getSagaState(sagaId: string): SagaStateSnapshot | undefined;

  /**
   * Get failed sagas.
   */
  getFailedSagas(): readonly SagaStateSnapshot[];

  /**
   * Get compensation history.
   */
  getCompensationHistory(sagaId: string): readonly CompensationEntry[];

  /**
   * Subscribe to inspector events.
   */
  subscribe(listener: SagaInspectorListener): () => void;
}
```

**Effort:** L (5-8 days)
**Dependencies:** 3.7.5

#### 3.7.7 Container Integration

**File:** `packages/saga/src/inspection/container-integration.ts`

**Implementation:**

- Register SagaInspector with container inspector
- Add saga data to unified snapshot
- Expose via `container.inspector.getSagaInspector()`

**Effort:** M (3-5 days)
**Dependencies:** 3.7.6, ContainerInspector (exists)

#### 3.7.8 Tracing Integration

**File:** `packages/saga/src/inspection/tracing-integration.ts`

**Implementation:**

- Emit spans for saga execution
- Span name: `saga:${sagaName}/${stepName}`
- Attributes: `hex-di.saga.name`, `hex-di.saga.step`, `hex-di.saga.compensating`
- Conditional integration

**Effort:** M (3-5 days)
**Dependencies:** 3.7.3, Tracing hooks (exists)

**Total Effort for 3.7:** XL (29-46 days)

---

### 3.8 Agent Library

**Current State:** 0% → **Target:** 100%

**Status:** Package doesn't exist. Spec exists at `spec/agent/`.

**Required Subtasks:**

#### 3.8.1 Package Setup

**Files:**

- `packages/agent/package.json`
- `packages/agent/tsconfig.json`
- `packages/agent/src/index.ts`

**Effort:** S (1-2 days)
**Dependencies:** None

#### 3.8.2 ToolPort Interface

**File:** `packages/agent/src/ports/tool-port.ts`

**Interface:**

```typescript
export interface ToolPort<TInput, TOutput> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JSONSchema;
  readonly outputSchema: JSONSchema;
  readonly execute: (input: TInput) => Promise<TOutput>;
}

export interface JSONSchema {
  readonly type: string;
  readonly properties?: Record<string, unknown>;
  readonly required?: readonly string[];
  // ... full JSON Schema structure
}
```

**Effort:** M (3-5 days)
**Dependencies:** 3.8.1

#### 3.8.3 Tool Registry with JSON Schema Validation

**File:** `packages/agent/src/registry/tool-registry.ts`

**Implementation:**

- Register tools by name
- Validate input/output against schemas
- Lookup by name
- List all tools

**Effort:** M (3-5 days)
**Dependencies:** 3.8.2

#### 3.8.4 LLM Provider Port

**File:** `packages/agent/src/ports/llm-port.ts`

**Interface:**

```typescript
export interface LLMProviderPort {
  readonly name: string;
  readonly chat: (messages: readonly ChatMessage[]) => Promise<ChatResponse>;
  readonly streamChat?: (messages: readonly ChatMessage[]) => AsyncIterable<ChatChunk>;
}

export interface ChatMessage {
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
}
```

**Effort:** M (3-5 days)
**Dependencies:** 3.8.1

#### 3.8.5 Conversation Context Management

**File:** `packages/agent/src/context/conversation.ts`

**Implementation:**

- Track conversation history
- Manage context window
- Summarization for long conversations
- Context pruning strategies

**Effort:** L (5-8 days)
**Dependencies:** 3.8.4

#### 3.8.6 Human-in-the-Loop Approval

**File:** `packages/agent/src/approval/hitl.ts`

**Implementation:**

- Request approval before tool execution
- Approval queue management
- Timeout handling
- Approval callbacks

**Effort:** M (3-5 days)
**Dependencies:** 3.8.3

#### 3.8.7 AgentInspector

**File:** `packages/agent/src/inspection/inspector.ts`

**Interface:**

```typescript
export interface AgentInspector {
  /**
   * Get all registered tools.
   */
  getTools(): readonly ToolInfo[];

  /**
   * Get active conversations.
   */
  getActiveConversations(): readonly ConversationSnapshot[];

  /**
   * Get approval queue.
   */
  getApprovalQueue(): readonly ApprovalRequest[];

  /**
   * Get conversation history.
   */
  getConversationHistory(conversationId: string): readonly ChatMessage[];

  /**
   * Subscribe to inspector events.
   */
  subscribe(listener: AgentInspectorListener): () => void;
}
```

**Effort:** L (5-8 days)
**Dependencies:** 3.8.6, spec/agent/

#### 3.8.8 Container Integration

**File:** `packages/agent/src/inspection/container-integration.ts`

**Implementation:**

- Register AgentInspector with container inspector
- Add agent data to unified snapshot
- Expose via `container.inspector.getAgentInspector()`

**Effort:** M (3-5 days)
**Dependencies:** 3.8.7, ContainerInspector (exists)

#### 3.8.9 Tracing Integration

**File:** `packages/agent/src/inspection/tracing-integration.ts`

**Implementation:**

- Emit spans for tool executions
- Span name: `agent:tool/${toolName}`
- Attributes: `hex-di.agent.tool_name`, `hex-di.agent.conversation_id`, `hex-di.agent.approved`
- Conditional integration

**Effort:** M (3-5 days)
**Dependencies:** 3.8.3, Tracing hooks (exists)

**Total Effort for 3.8:** XL (30-48 days)

---

### 3.9 Unified Knowledge Model

**Current State:** 20% → **Target:** 100%

**Status:** ContainerInspector exists, but no unified snapshot or cross-library queries.

**Required Subtasks:**

#### 3.9.1 LibraryInspector Common Interface

**File:** `packages/core/src/inspection/library-inspector.ts`

**Interface:**

```typescript
export interface LibraryInspector {
  /**
   * Get library-specific snapshot.
   */
  getSnapshot(): unknown; // Library-specific type

  /**
   * Get library name.
   */
  readonly libraryName: string;

  /**
   * Subscribe to library events.
   */
  subscribe?(listener: (event: unknown) => void): () => void;
}
```

**Effort:** S (1-2 days)
**Dependencies:** None

#### 3.9.2 UnifiedSnapshot Type

**File:** `packages/core/src/inspection/unified-snapshot.ts`

**Type:**

```typescript
export interface UnifiedSnapshot {
  readonly timestamp: number;
  readonly graph: GraphSnapshot;
  readonly runtime: ContainerSnapshot;
  readonly tracing: TracingSnapshot | undefined;
  readonly flow: FlowSnapshot | undefined;
  readonly store: StoreSnapshot | undefined;
  readonly query: QuerySnapshot | undefined;
  readonly saga: SagaSnapshot | undefined;
  readonly agent: AgentSnapshot | undefined;
}

export interface GraphSnapshot {
  readonly ports: readonly PortInfo[];
  readonly adapters: readonly AdapterInfo[];
  readonly edges: readonly DependencyEdge[];
}

export interface TracingSnapshot {
  readonly totalSpans: number;
  readonly errorCount: number;
  readonly averageDuration: number;
  readonly cacheHitRate: number;
}

export interface FlowSnapshot {
  readonly totalMachines: number;
  readonly machinesByPort: Record<string, number>;
}

export interface StoreSnapshot {
  readonly totalPorts: number;
  readonly totalSubscribers: number;
  readonly pendingEffects: number;
}

export interface QuerySnapshot {
  readonly totalCached: number;
  readonly staleCount: number;
  readonly pendingRequests: number;
}

export interface SagaSnapshot {
  readonly runningSagas: number;
  readonly failedSagas: number;
  readonly compensatingSagas: number;
}

export interface AgentSnapshot {
  readonly toolCount: number;
  readonly activeConversations: number;
  readonly pendingApprovals: number;
}
```

**Effort:** M (3-5 days)
**Dependencies:** 3.9.1, All library inspectors

#### 3.9.3 Unified Query API

**File:** `packages/core/src/inspection/unified-query.ts`

**Interface:**

```typescript
export interface UnifiedQueryAPI {
  /**
   * Get unified snapshot of all library knowledge.
   */
  getUnifiedSnapshot(): UnifiedSnapshot;

  /**
   * Query across libraries by source.
   */
  queryBySource(source: LibrarySource, query: unknown): unknown;

  /**
   * Get inspector for a specific library.
   */
  getLibraryInspector(libraryName: string): LibraryInspector | undefined;

  /**
   * List all available library inspectors.
   */
  listLibraryInspectors(): readonly string[];
}

export type LibrarySource =
  | "graph"
  | "runtime"
  | "tracing"
  | "flow"
  | "store"
  | "query"
  | "saga"
  | "agent";
```

**Effort:** L (5-8 days)
**Dependencies:** 3.9.2

#### 3.9.4 Cross-Library Event Bus

**File:** `packages/core/src/inspection/event-bus.ts`

**Implementation:**

- Central event bus for cross-library events
- Library inspectors emit events
- Subscribers can listen to events from any library
- Event correlation by trace ID, scope ID, etc.

**Effort:** M (3-5 days)
**Dependencies:** 3.9.1

**Total Effort for 3.9:** L (12-20 days)

---

## Dependency Graph

```
3.1 Tracing Query API
  └─> ContainerInspector (exists)
  └─> MemoryTracer (exists)

3.2 Flow Reporting
  └─> FlowAdapter (exists)
  └─> ContainerInspector (exists)
  └─> Tracing hooks (exists)

3.3 React Inspection Hooks
  └─> 3.1.4 (TracingInspector)
  └─> 3.2.4 (FlowInspector)
  └─> ContainerInspector (exists)

3.4 Hono Inspection Utilities
  └─> 3.1.4 (TracingInspector)
  └─> 3.2.4 (FlowInspector)
  └─> ContainerInspector (exists)

3.5 Store Library
  └─> ContainerInspector (exists)
  └─> Tracing hooks (exists)
  └─> React integration (exists)

3.6 Query Library
  └─> ContainerInspector (exists)
  └─> Tracing hooks (exists)
  └─> React integration (exists)

3.7 Saga Library
  └─> ContainerInspector (exists)
  └─> Tracing hooks (exists)

3.8 Agent Library
  └─> ContainerInspector (exists)
  └─> Tracing hooks (exists)

3.9 Unified Knowledge Model
  └─> 3.1.4 (TracingInspector)
  └─> 3.2.4 (FlowInspector)
  └─> 3.5.6 (StoreInspector)
  └─> 3.6.7 (QueryInspector)
  └─> 3.7.7 (SagaInspector)
  └─> 3.8.8 (AgentInspector)
  └─> ContainerInspector (exists)
```

## Execution Order

### Wave 1: Foundation (3.1-3.4)

**Duration:** 33-55 days

**Rationale:** These components build on existing infrastructure and don't require new libraries. They establish the reporting patterns that other libraries will follow.

1. **3.1 Tracing Query API** (15-25 days)
   - Builds on existing MemoryTracer
   - Establishes query pattern for other libraries
   - No dependencies on new libraries

2. **3.2 Flow Reporting** (15-24 days)
   - Builds on existing FlowAdapter
   - Establishes registry pattern
   - Integrates with tracing

3. **3.3 React Inspection Hooks** (12-20 days)
   - Builds on 3.1 and 3.2
   - Provides React integration for inspection
   - Enables DevTools integration

4. **3.4 Hono Inspection Utilities** (6-10 days)
   - Builds on 3.1 and 3.2
   - Provides server-side debugging
   - Enables diagnostic endpoints

### Wave 2: New Libraries (3.5-3.8)

**Duration:** 115-185 days

**Rationale:** These are new packages that need to be built from scratch. They follow the patterns established in Wave 1.

5. **3.5 Store Library** (26-43 days)
   - New package
   - Follows inspection patterns from 3.1-3.4
   - Integrates with container and tracing

6. **3.6 Query Library** (30-48 days)
   - New package
   - Similar patterns to Store
   - Cache management complexity

7. **3.7 Saga Library** (29-46 days)
   - New package
   - Workflow orchestration
   - Compensation logic complexity

8. **3.8 Agent Library** (30-48 days)
   - New package
   - AI tool integration
   - Conversation management complexity

### Wave 3: Unification (3.9)

**Duration:** 12-20 days

**Rationale:** This brings everything together into a unified model. Must wait for all libraries to have inspectors.

9. **3.9 Unified Knowledge Model** (12-20 days)
   - Requires all library inspectors (3.1-3.8)
   - Creates unified snapshot
   - Enables cross-library queries

**Total Duration:** 160-260 days (~6-10 months)

---

## Effort Estimation Table

| Component     | Subtask                          | Size   | Days      | Dependencies        |
| ------------- | -------------------------------- | ------ | --------- | ------------------- |
| 3.1           | 3.1.1 TracingQueryAPI Interface  | M      | 3-5       | None                |
| 3.1           | 3.1.2 MemoryTracer Filtering     | M      | 3-5       | 3.1.1               |
| 3.1           | 3.1.3 Aggregation Engine         | L      | 5-8       | 3.1.2               |
| 3.1           | 3.1.4 Container Integration      | M      | 3-5       | 3.1.3               |
| 3.1           | 3.1.5 Scope Name Attribute       | S      | 1-2       | None                |
| **3.1 Total** |                                  | **L**  | **15-25** |                     |
| 3.2           | 3.2.1 FlowRegistry               | M      | 3-5       | None                |
| 3.2           | 3.2.2 FlowInspector Interface    | M      | 3-5       | 3.2.1               |
| 3.2           | 3.2.3 FlowAdapter Registration   | S      | 1-2       | 3.2.1               |
| 3.2           | 3.2.4 Container Integration      | M      | 3-5       | 3.2.2               |
| 3.2           | 3.2.5 Tracing Integration        | M      | 3-5       | 3.2.3               |
| 3.2           | 3.2.6 Event Queue Introspection  | S      | 1-2       | 3.2.2               |
| **3.2 Total** |                                  | **L**  | **15-24** |                     |
| 3.3           | 3.3.1 useInspector               | S      | 1         | None                |
| 3.3           | 3.3.2 useSnapshot                | S      | 1-2       | 3.3.1               |
| 3.3           | 3.3.3 useScopeTree               | S      | 1-2       | 3.3.1               |
| 3.3           | 3.3.4 useTracingSummary          | M      | 3-5       | 3.1.4               |
| 3.3           | 3.3.5 useFlowState               | M      | 3-5       | 3.2.4               |
| 3.3           | 3.3.6 DevToolsProvider           | M      | 3-5       | 3.3.1               |
| **3.3 Total** |                                  | **M**  | **12-20** |                     |
| 3.4           | 3.4.1 inspectContainer Helper    | S      | 1         | None                |
| 3.4           | 3.4.2 createDiagnosticRoutes     | M      | 3-5       | 3.4.1, 3.1.4, 3.2.4 |
| 3.4           | 3.4.3 Tracing Response Headers   | S      | 1-2       | None                |
| 3.4           | 3.4.4 Request-ID Correlation     | S      | 1-2       | None                |
| **3.4 Total** |                                  | **M**  | **6-10**  |                     |
| 3.5           | 3.5.1 Package Setup              | S      | 1-2       | None                |
| 3.5           | 3.5.2 StorePort Interface        | M      | 3-5       | 3.5.1               |
| 3.5           | 3.5.3 Signal Store Adapter       | L      | 5-8       | 3.5.2               |
| 3.5           | 3.5.4 Action History             | M      | 3-5       | 3.5.3               |
| 3.5           | 3.5.5 StoreInspector             | L      | 5-8       | 3.5.4               |
| 3.5           | 3.5.6 Container Integration      | M      | 3-5       | 3.5.5               |
| 3.5           | 3.5.7 Tracing Integration        | M      | 3-5       | 3.5.3               |
| 3.5           | 3.5.8 React Hooks                | M      | 3-5       | 3.5.3               |
| **3.5 Total** |                                  | **XL** | **26-43** |                     |
| 3.6           | 3.6.1 Package Setup              | S      | 1-2       | None                |
| 3.6           | 3.6.2 QueryPort Interface        | M      | 3-5       | 3.6.1               |
| 3.6           | 3.6.3 Cache Manager              | M      | 3-5       | 3.6.2               |
| 3.6           | 3.6.4 Request Deduplication      | M      | 3-5       | 3.6.3               |
| 3.6           | 3.6.5 Optimistic Updates         | M      | 3-5       | 3.6.3               |
| 3.6           | 3.6.6 QueryInspector             | L      | 5-8       | 3.6.5               |
| 3.6           | 3.6.7 Container Integration      | M      | 3-5       | 3.6.6               |
| 3.6           | 3.6.8 Tracing Integration        | M      | 3-5       | 3.6.3               |
| 3.6           | 3.6.9 React Hooks                | M      | 3-5       | 3.6.3               |
| **3.6 Total** |                                  | **XL** | **30-48** |                     |
| 3.7           | 3.7.1 Package Setup              | S      | 1-2       | None                |
| 3.7           | 3.7.2 SagaDefinition + Port      | M      | 3-5       | 3.7.1               |
| 3.7           | 3.7.3 Saga Runner                | L      | 5-8       | 3.7.2               |
| 3.7           | 3.7.4 Compensation Chains        | M      | 3-5       | 3.7.3               |
| 3.7           | 3.7.5 Transaction Boundaries     | M      | 3-5       | 3.7.4               |
| 3.7           | 3.7.6 SagaInspector              | L      | 5-8       | 3.7.5               |
| 3.7           | 3.7.7 Container Integration      | M      | 3-5       | 3.7.6               |
| 3.7           | 3.7.8 Tracing Integration        | M      | 3-5       | 3.7.3               |
| **3.7 Total** |                                  | **XL** | **29-46** |                     |
| 3.8           | 3.8.1 Package Setup              | S      | 1-2       | None                |
| 3.8           | 3.8.2 ToolPort Interface         | M      | 3-5       | 3.8.1               |
| 3.8           | 3.8.3 Tool Registry              | M      | 3-5       | 3.8.2               |
| 3.8           | 3.8.4 LLM Provider Port          | M      | 3-5       | 3.8.1               |
| 3.8           | 3.8.5 Conversation Context       | L      | 5-8       | 3.8.4               |
| 3.8           | 3.8.6 HITL Approval              | M      | 3-5       | 3.8.3               |
| 3.8           | 3.8.7 AgentInspector             | L      | 5-8       | 3.8.6               |
| 3.8           | 3.8.8 Container Integration      | M      | 3-5       | 3.8.7               |
| 3.8           | 3.8.9 Tracing Integration        | M      | 3-5       | 3.8.3               |
| **3.8 Total** |                                  | **XL** | **30-48** |                     |
| 3.9           | 3.9.1 LibraryInspector Interface | S      | 1-2       | None                |
| 3.9           | 3.9.2 UnifiedSnapshot Type       | M      | 3-5       | 3.9.1               |
| 3.9           | 3.9.3 Unified Query API          | L      | 5-8       | 3.9.2               |
| 3.9           | 3.9.4 Cross-Library Event Bus    | M      | 3-5       | 3.9.1               |
| **3.9 Total** |                                  | **L**  | **12-20** |                     |

**Grand Total:** 160-260 days (~6-10 months)

---

## Success Criteria

### 3.1 Tracing Query API (100%)

- [ ] TracingQueryAPI interface implemented
- [ ] MemoryTracer supports filtering by all filter criteria
- [ ] Aggregation functions work correctly (avg, error count, cache hit rate, percentiles)
- [ ] Slow resolution detection works
- [ ] Error span retrieval works
- [ ] Trace tree building works
- [ ] Container inspector integration complete
- [ ] Scope name attribute added to spans
- [ ] Unit tests for all query methods
- [ ] Integration tests with real container

### 3.2 Flow Reporting (100%)

- [ ] FlowRegistry implemented
- [ ] FlowInspector interface complete
- [ ] FlowAdapter registers/unregisters machines
- [ ] Container inspector integration complete
- [ ] Tracing integration emits spans for transitions
- [ ] Event queue introspection works
- [ ] Can query all machines for a port
- [ ] Can query machine state, valid transitions, running activities
- [ ] Unit tests for registry and inspector
- [ ] Integration tests with FlowAdapter

### 3.3 React Inspection Hooks (100%)

- [ ] useInspector hook works
- [ ] useSnapshot hook works with subscriptions
- [ ] useScopeTree hook works with subscriptions
- [ ] useTracingSummary hook works
- [ ] useFlowState hook works
- [ ] DevToolsProvider component works
- [ ] React DevTools integration functional
- [ ] All hooks handle unmounting correctly
- [ ] Unit tests for all hooks
- [ ] Example app demonstrates usage

### 3.4 Hono Inspection Utilities (100%)

- [ ] inspectContainer helper works
- [ ] createDiagnosticRoutes creates all 6 endpoints
- [ ] All endpoints return correct data
- [ ] Tracing response headers work
- [ ] Request-ID correlation works
- [ ] Endpoints handle errors gracefully
- [ ] Endpoints can be disabled in production
- [ ] Unit tests for helpers
- [ ] Integration tests with Hono app

### 3.5 Store Library (100%)

- [ ] Package structure complete
- [ ] StorePort interface implemented
- [ ] Signal-based adapter works
- [ ] Action history tracking works
- [ ] StoreInspector interface complete
- [ ] Container integration complete
- [ ] Tracing integration emits spans
- [ ] React hooks work
- [ ] Subscriber graph introspection works
- [ ] Unit tests for all components
- [ ] Integration tests with container

### 3.6 Query Library (100%)

- [ ] Package structure complete
- [ ] QueryPort interface implemented
- [ ] Cache manager with staleness works
- [ ] Request deduplication works
- [ ] Optimistic updates work
- [ ] QueryInspector interface complete
- [ ] Container integration complete
- [ ] Tracing integration emits spans
- [ ] React hooks work
- [ ] Unit tests for all components
- [ ] Integration tests with container

### 3.7 Saga Library (100%)

- [ ] Package structure complete
- [ ] SagaDefinition + SagaPort interfaces implemented
- [ ] Saga runner executes steps sequentially
- [ ] Compensation chains work correctly
- [ ] Transaction boundaries work
- [ ] SagaInspector interface complete
- [ ] Container integration complete
- [ ] Tracing integration emits spans
- [ ] Unit tests for all components
- [ ] Integration tests with container

### 3.8 Agent Library (100%)

- [ ] Package structure complete
- [ ] ToolPort interface implemented
- [ ] Tool registry with schema validation works
- [ ] LLM provider port works
- [ ] Conversation context management works
- [ ] HITL approval works
- [ ] AgentInspector interface complete
- [ ] Container integration complete
- [ ] Tracing integration emits spans
- [ ] Unit tests for all components
- [ ] Integration tests with container

### 3.9 Unified Knowledge Model (100%)

- [ ] LibraryInspector common interface defined
- [ ] UnifiedSnapshot type includes all libraries
- [ ] Unified query API works
- [ ] Cross-library event bus works
- [ ] Container inspector exposes unified snapshot
- [ ] Can query across libraries
- [ ] Event correlation works
- [ ] Unit tests for unified model
- [ ] Integration tests with all libraries

### Overall Phase 3 Success (100%)

- [ ] All 9 components at 100%
- [ ] All libraries report to container
- [ ] Unified snapshot includes all knowledge
- [ ] Cross-library queries work
- [ ] React hooks available for all inspectors
- [ ] Hono diagnostic routes work
- [ ] Tracing spans emitted for all operations
- [ ] Documentation complete
- [ ] Examples demonstrate all features
- [ ] Performance benchmarks meet targets

---

## Critical Gaps and Risks

### High Priority Gaps

1. **Tracing Query API Missing (3.1)**
   - **Impact:** Can't analyze performance or debug issues
   - **Risk:** High — blocks all performance analysis
   - **Mitigation:** Implement 3.1 first (Wave 1)

2. **Flow Registry Missing (3.2)**
   - **Impact:** Can't enumerate or inspect state machines
   - **Risk:** Medium — blocks flow debugging
   - **Mitigation:** Implement 3.2 in Wave 1

3. **No Store Library (3.5)**
   - **Impact:** Can't manage reactive state
   - **Risk:** High — core feature missing
   - **Mitigation:** Implement in Wave 2, follow established patterns

4. **No Query Library (3.6)**
   - **Impact:** Can't manage data fetching/caching
   - **Risk:** High — core feature missing
   - **Mitigation:** Implement in Wave 2, similar to Store

5. **No Unified Model (3.9)**
   - **Impact:** Can't get cross-library view
   - **Risk:** Medium — blocks unified debugging
   - **Mitigation:** Implement last (Wave 3)

### Technical Risks

1. **Performance Impact**
   - **Risk:** Inspection overhead slows down production
   - **Mitigation:** Make inspection opt-in, use efficient data structures

2. **Memory Leaks**
   - **Risk:** Registries hold references preventing GC
   - **Mitigation:** Use WeakMap/WeakSet, proper cleanup

3. **Type Safety**
   - **Risk:** Unified snapshot loses type safety
   - **Mitigation:** Use discriminated unions, type guards

4. **Complexity**
   - **Risk:** Too many moving parts
   - **Mitigation:** Follow established patterns, comprehensive tests

---

## Next Steps

1. **Immediate (Week 1-2):**
   - Start 3.1.1 (TracingQueryAPI Interface)
   - Start 3.2.1 (FlowRegistry)
   - Set up package structure for 3.5 (Store)

2. **Short-term (Month 1-2):**
   - Complete Wave 1 (3.1-3.4)
   - Begin Wave 2 planning
   - Create detailed specs for Store/Query/Saga/Agent

3. **Medium-term (Month 3-6):**
   - Complete Wave 2 (3.5-3.8)
   - Integration testing
   - Performance optimization

4. **Long-term (Month 7-10):**
   - Complete Wave 3 (3.9)
   - Documentation
   - Examples and demos
   - Phase 4 planning

---

## Conclusion

Phase 3 is the **critical convergence point** where HexDI transforms from a DI container into a **self-aware application nervous system**. By making every library report what it knows back to the container, the container becomes the single source of truth for all application knowledge.

**Current Status:** 15% complete — foundation exists but most reporting infrastructure is missing.

**Path to 100%:** 160-260 days across 3 waves:

- **Wave 1:** Foundation (3.1-3.4) — 33-55 days
- **Wave 2:** New Libraries (3.5-3.8) — 115-185 days
- **Wave 3:** Unification (3.9) — 12-20 days

**Success means:** Every library has an Inspector, unified snapshot works, cross-library queries work, React/Hono integrations complete, and the container truly knows everything about the application.

This phase is the **biggest gap** in the HexDI vision and the **most critical** for achieving self-aware applications.
