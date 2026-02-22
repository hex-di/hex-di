# 05b - Store Introspection

_Previous: [05 - Reactivity](./05-reactivity.md)_

---

Store introspection provides runtime visibility into reactive state -- every port's current value, action history, subscriber dependencies, and effect status. It follows the same patterns used throughout HexDI:

- `InspectorAPI` pattern: pull-based queries + push-based subscriptions
- `ContainerSnapshot` pattern: frozen data with discriminated unions by kind
- `TracingAPI` pattern: tree structure via parentId, filters, correlation IDs
- `InspectorEvent` pattern: discriminated union events

Introspection is resolved from Container like any other service: `container.resolve(StoreInspectorPort)`.

## A. StoreInspectorAPI

The inspector combines pull-based queries for current state with push-based subscriptions for live updates.

```typescript
interface StoreInspectorAPI {
  /** Snapshot of all store state at this instant */
  getSnapshot(): StoreSnapshot;

  /** Snapshot of a single port's state */
  getPortState(portName: string): PortSnapshot | undefined;

  /** List all registered state ports with metadata */
  listStatePorts(): readonly StatePortInfo[];

  /** Subscriber dependency graph (which ports depend on which) */
  getSubscriberGraph(): SubscriberGraph;

  /** Action history with optional filtering */
  getActionHistory(filter?: ActionHistoryFilter): readonly ActionHistoryEntry[];

  /** Subscribe to inspector events */
  subscribe(listener: StoreInspectorListener): () => void;
}

type StoreInspectorListener = (event: StoreInspectorEvent) => void;
```

### Resolution

```typescript
import { StoreInspectorPort, createStoreInspectorAdapter } from "@hex-di/store";

const graph = GraphBuilder.create()
  .provide(counterAdapter)
  .provide(todoAdapter)
  .provide(createStoreInspectorAdapter()) // Explicit registration
  .build();

const container = await createContainer({ graph, name: "app" }).initialize();
const inspector = container.resolve(StoreInspectorPort);
const snapshot = inspector.getSnapshot();
```

`StoreInspectorPort` must be explicitly registered via `createStoreInspectorAdapter()`. This follows the principle that the graph builder is store-agnostic -- it has no special knowledge of state adapters. If `StoreInspectorPort` is resolved without being registered, the standard `PortNotFoundError` is thrown.

#### Port kind discovery mechanism

The inspector adapter discovers and classifies state ports at initialization time through a two-step process:

**Step 1: Adapter scanning.** When `StoreInspectorPort` is resolved, the inspector queries the container's graph for all registered adapters. Each adapter is classified by checking for branded properties on the adapter object:

| Brand check                                                                        | Classification               |
| ---------------------------------------------------------------------------------- | ---------------------------- |
| Adapter created via `createStateAdapter` → has `__stateAdapterBrand`               | `kind: "state"`              |
| Adapter created via `createAtomAdapter` → has `__atomAdapterBrand`                 | `kind: "atom"`               |
| Adapter created via `createDerivedAdapter` → has `__derivedAdapterBrand`           | `kind: "derived"`            |
| Adapter created via `createAsyncDerivedAdapter` → has `__asyncDerivedAdapterBrand` | `kind: "async-derived"`      |
| Adapter created via `createEffectAdapter` → has `__effectBrand`                    | (skipped — not a state port) |

Each `create*Adapter` factory stamps its returned adapter with a `unique symbol` brand, following the same pattern as `createEffectAdapter`'s `__effectBrand`. This enables O(1) classification per adapter without inspecting the port's service type at runtime.

**Step 2: Caching.** The discovered port metadata (name, kind, lifetime) is cached in a frozen `ReadonlyMap<string, StatePortInfo>`. Subsequent calls to `listStatePorts()`, `getSnapshot()`, and `getPortState()` read from this cache.

```
resolve(StoreInspectorPort):
  → Scan graph: classify each adapter by brand
  → Build portMetadata: Map<"Counter" → { kind: "state", lifetime: "singleton" }, ...>
  → Freeze cache
```

#### Scoped instance tracking

The inspector is registered as a **singleton** adapter, but it can observe scoped state ports through the container's scope event system:

1. At initialization, the inspector subscribes to the container's `scope-created` and `scope-disposed` lifecycle events (already available via `Container.inspector`)
2. When a scope is created, the inspector lazily discovers scoped state instances when they are first resolved within that scope (using the scope's `port-resolved` event)
3. When a scope is disposed, the inspector removes all tracked instances for that scope from its internal state

This means `getSnapshot()` returns only **currently live** instances — singleton instances from the root container plus scoped instances from active (non-disposed) scopes. Disposed scopes' state is not included.

```
inspector.getSnapshot():
  → Singleton ports: always included (CounterPort, ThemePort)
  → Scoped ports: included only for active scopes
     → scope "form-1" active → FormPort instance A included
     → scope "form-2" disposed → FormPort instance B excluded
```

For `getPortState(portName)`, if the port is scoped and exists in multiple active scopes, the inspector returns the instance from the **most recently created** active scope. To query a specific scope's instance, resolve the inspector from within that scope (the inspector resolves the port relative to its own resolution context).

### StatePortInfo

```typescript
interface StatePortInfo {
  readonly portName: string;
  readonly kind: "state" | "atom" | "derived" | "async-derived";
  readonly lifetime: "singleton" | "scoped";
  readonly subscriberCount: number;
  readonly hasEffects: boolean;
}
```

## B. StoreSnapshot

A serializable snapshot of all store state at a point in time. Each port's snapshot uses a discriminated union by `kind`.

```typescript
interface StoreSnapshot {
  readonly timestamp: number;
  readonly ports: readonly PortSnapshot[];
  readonly totalSubscribers: number;
  readonly pendingEffects: number;
}

type PortSnapshot =
  | StatePortSnapshot
  | AtomPortSnapshot
  | DerivedPortSnapshot
  | AsyncDerivedPortSnapshot;

interface StatePortSnapshot {
  readonly kind: "state";
  readonly portName: string;
  readonly state: unknown;
  readonly subscriberCount: number;
  readonly actionCount: number;
  readonly lastActionAt: number | null;
}

interface AtomPortSnapshot {
  readonly kind: "atom";
  readonly portName: string;
  readonly value: unknown;
  readonly subscriberCount: number;
}

interface DerivedPortSnapshot {
  readonly kind: "derived";
  readonly portName: string;
  readonly value: unknown;
  readonly subscriberCount: number;
  readonly sourcePortNames: readonly string[];
  readonly isStale: boolean;
}

interface AsyncDerivedPortSnapshot {
  readonly kind: "async-derived";
  readonly portName: string;
  readonly status: "idle" | "loading" | "success" | "error";
  readonly data: unknown;
  readonly error: unknown | undefined;
  readonly subscriberCount: number;
  readonly sourcePortNames: readonly string[];
}
```

All returned data is frozen with `Object.freeze()`. Snapshots are safe to serialize (e.g., for devtools transport or logging). The `unknown` typed fields contain the actual state values -- consumers narrow them based on their knowledge of the port types.

### Usage

```typescript
const snapshot = inspector.getSnapshot();

for (const port of snapshot.ports) {
  switch (port.kind) {
    case "state":
      console.log(
        `${port.portName}: ${port.actionCount} actions, ${port.subscriberCount} subscribers`
      );
      break;
    case "derived":
      console.log(
        `${port.portName}: stale=${port.isStale}, sources=[${port.sourcePortNames.join(", ")}]`
      );
      break;
    case "async-derived":
      console.log(
        `${port.portName}: status=${port.status}, sources=[${port.sourcePortNames.join(", ")}]`
      );
      break;
    case "atom":
      console.log(`${port.portName}: value=${JSON.stringify(port.value)}`);
      break;
  }
}
```

## C. Action History

Action history provides a tree-structured timeline of all state transitions, following the `TraceEntry` pattern from `@hex-di/tracing`.

```typescript
interface ActionHistoryEntry {
  /** Unique identifier for this entry */
  readonly id: string;
  /** Port that dispatched the action */
  readonly portName: string;
  /** Action name (e.g., "increment", "addItem") */
  readonly actionName: string;
  /** Payload passed to the action */
  readonly payload: unknown;
  /** State before the reducer ran */
  readonly prevState: unknown;
  /** State after the reducer ran */
  readonly nextState: unknown;
  /** When the action was dispatched */
  readonly timestamp: number;
  /** Effect status for this action's effect */
  readonly effectStatus: "none" | "pending" | "completed" | "failed";
  /** Error from a failed effect (present when effectStatus is "failed"). See §42a Operational Error Types. */
  readonly effectError?: EffectFailedError;
  /** Parent entry ID for batched actions (null for top-level) */
  readonly parentId: string | null;
  /** Global ordering counter */
  readonly order: number;
  /** W3C Trace Context trace ID (present when @hex-di/tracing is active) */
  readonly traceId?: string;
  /** Span ID within the trace (present when @hex-di/tracing is active) */
  readonly spanId?: string;
}
```

### History configuration

```typescript
interface ActionHistoryConfig {
  /** Maximum entries retained (oldest evicted first). Default: 1000. */
  readonly maxEntries: number;
  /**
   * History recording mode:
   * - "full": Record all actions with full state snapshots (development default)
   * - "lightweight": Record action metadata without state snapshots (production recommended)
   * - "off": Disable history recording entirely
   *
   * Default: "full" in development, "off" in production.
   */
  readonly mode: "full" | "lightweight" | "off";
  /**
   * Sampling rate for lightweight mode (0.0 to 1.0).
   * Only applies when mode is "lightweight".
   * Default: 1.0 (record all actions).
   * Set to 0.1 to record ~10% of actions for low-overhead production monitoring.
   */
  readonly samplingRate?: number;
  /**
   * Always record actions matching these criteria, regardless of sampling.
   * Useful for ensuring error paths and critical actions are never dropped.
   */
  readonly alwaysRecord?: {
    readonly effectStatus?: readonly ("failed" | "pending")[];
    readonly portNames?: readonly string[];
    readonly actionNames?: readonly string[];
  };
}
```

History configuration is passed to `createStoreInspectorAdapter()` at graph construction time.

#### Production mode: `"lightweight"`

In production, recording full `prevState`/`nextState` snapshots for every action creates significant memory pressure. The `"lightweight"` mode records action metadata (port name, action name, timestamp, effect status, traceId) without serializing state snapshots. This keeps the nervous system's behavioral layer alive in production at minimal cost.

```typescript
// Production configuration: lightweight history with 10% sampling
const graph = GraphBuilder.create()
  .provide(counterAdapter)
  .provide(
    createStoreInspectorAdapter({
      history: {
        mode: "lightweight",
        maxEntries: 500,
        samplingRate: 0.1,
        alwaysRecord: {
          effectStatus: ["failed"], // Always record failures
        },
      },
    })
  )
  .build();
```

A lightweight `ActionHistoryEntry` has `prevState: undefined` and `nextState: undefined` but retains all other fields (`id`, `portName`, `actionName`, `timestamp`, `effectStatus`, `effectError`, `traceId`, `spanId`, `parentId`, `order`). Consumers must check for `undefined` state fields.

```typescript
// Full mode entry (development)
{
  id: "act_1", portName: "Cart", actionName: "addItem",
  prevState: { items: [] },          // ← present
  nextState: { items: [{ ... }] },   // ← present
  timestamp: 1705312345678,
  effectStatus: "completed",
  traceId: "abc123",
}

// Lightweight mode entry (production)
{
  id: "act_1", portName: "Cart", actionName: "addItem",
  prevState: undefined,              // ← omitted for memory
  nextState: undefined,              // ← omitted for memory
  timestamp: 1705312345678,
  effectStatus: "completed",
  traceId: "abc123",
}
```

#### Sampling

When `samplingRate` is less than 1.0, the store runtime applies reservoir sampling to select which actions are recorded. The `alwaysRecord` configuration overrides sampling for critical events -- effect failures are never dropped even at low sampling rates. This ensures an AI diagnostic agent always has failure data to work with.

### Filtering

```typescript
interface ActionHistoryFilter {
  /** Filter by port name */
  readonly portName?: string;
  /** Filter by action name */
  readonly actionName?: string;
  /** Filter by time range */
  readonly since?: number;
  readonly until?: number;
  /** Filter by effect status */
  readonly effectStatus?: "none" | "pending" | "completed" | "failed";
  /** Maximum entries to return */
  readonly limit?: number;
  /** Filter by W3C trace ID (find all actions within a distributed trace) */
  readonly traceId?: string;
}
```

### Usage

```typescript
// All actions on the Counter port
const counterActions = inspector.getActionHistory({ portName: "Counter" });

// Failed effects in the last 5 seconds
const failures = inspector.getActionHistory({
  effectStatus: "failed",
  since: Date.now() - 5000,
});

// Last 10 actions globally
const recent = inspector.getActionHistory({ limit: 10 });
```

## D. Subscriber Dependency Graph

The subscriber graph exposes which ports depend on which, enabling visualization of the reactive dependency tree.

```typescript
interface SubscriberGraph {
  /** Unique identifier for this graph snapshot */
  readonly correlationId: string;
  /** All port nodes */
  readonly nodes: readonly SubscriberNode[];
  /** All dependency edges */
  readonly edges: readonly SubscriberEdge[];
}

interface SubscriberNode {
  /** Port name */
  readonly id: string;
  /** Port kind */
  readonly kind: "state" | "atom" | "derived" | "async-derived";
  /** Number of active subscribers (React components, effects, etc.) */
  readonly subscriberCount: number;
}

interface SubscriberEdge {
  /** Source port name (the dependency) */
  readonly from: string;
  /** Dependent port name (the subscriber) */
  readonly to: string;
  /** Relationship type */
  readonly type: "derives-from" | "subscribes-to" | "writes-to";
}
```

- `"derives-from"` edges connect derived ports to their source ports (declared in the adapter's `requires`).
- `"subscribes-to"` edges connect effect ports to the state ports they observe.
- `"writes-to"` edges connect linked derived ports to the source ports they mutate via `write()` (declared in the adapter's `writesTo`). These reverse edges make bidirectional data flow visible to graph analysis -- without them, the `write` path would be invisible to diagnostic tools and AI agents.

### Usage

```typescript
const graph = inspector.getSubscriberGraph();

// Find all sources for a derived port
const cartTotalSources = graph.edges
  .filter(e => e.to === "CartTotal" && e.type === "derives-from")
  .map(e => e.from);
// ["Cart"]

// Find all ports with no subscribers (potentially unused)
const orphans = graph.nodes.filter(n => n.subscriberCount === 0);
```

## E. Tracing Integration

When `@hex-di/tracing` is available, state transitions become tracing spans. The store runtime creates spans automatically -- no manual instrumentation required.

### Span attributes

State action spans use OpenTelemetry semantic conventions:

| Attribute                       | Type   | Description                                               |
| ------------------------------- | ------ | --------------------------------------------------------- |
| `hex-di.store.port_name`        | string | Port name (e.g., "Counter")                               |
| `hex-di.store.action_name`      | string | Action name (e.g., "increment")                           |
| `hex-di.store.action_type`      | string | `"state"` or `"atom"`                                     |
| `hex-di.store.effect_status`    | string | `"none"`, `"pending"`, `"completed"`, or `"failed"`       |
| `hex-di.store.subscriber_count` | number | Active subscribers at time of action                      |
| `hex-di.store.batch_id`         | string | Batch identifier (present when action is part of a batch) |

### Span hierarchy

Batched actions create a parent span with child spans for each action:

```
[batch] batch_123                              (50ms)
  ├── [action] Counter/increment               (1ms)
  ├── [action] Counter/increment               (1ms)
  └── [action] Todo/addItem                    (2ms)
       └── [effect] Todo/addItem               (45ms)
```

### Trace correlation

When tracing is active, `ActionHistoryEntry` records gain `traceId` and `spanId` fields linking to the tracing span created for the action. This enables cross-system diagnostic queries:

```typescript
// Find the tracing span for a failed action
const failures = inspector.getActionHistory({ effectStatus: "failed", limit: 1 });
const entry = failures[0];

if (entry.traceId) {
  // Query the tracing system for the full resolution chain
  // e.g., MCP: hexdi://tracing/spans?traceId=<entry.traceId>
  // This reveals which container resolution triggered the action,
  // what scope it ran in, and the full parent-child span tree.
}
```

The `traceId` is the W3C Trace Context trace ID propagated from the active trace at the time of action dispatch. The `spanId` identifies the specific span for this action within that trace. Together they enable:

- **Cross-referencing** store actions with distributed tracing spans
- **AI diagnostic queries** like "show me the trace for the action that failed" without parsing logs
- **Causal chain reconstruction** from a store action back through the resolution tree that triggered it

When `@hex-di/tracing` is not in the graph, both fields are `undefined` and no overhead is incurred.

### Conditional integration

Tracing integration is opt-in. When `@hex-di/tracing` is not in the dependency graph, no spans are created and no overhead is incurred. The store runtime checks for `TracerPort` availability at initialization:

```typescript
// Tracing spans are created only if TracerPort is registered
const graph = GraphBuilder.create()
  .provide(counterAdapter)
  .provide(tracerAdapter) // Optional: enables store tracing
  .build();
```

## F. StoreInspectorEvent

Push-based events emitted by the inspector when store state changes. Uses a discriminated union on `type`.

```typescript
type StoreInspectorEvent =
  | { readonly type: "action-dispatched"; readonly entry: ActionHistoryEntry }
  | { readonly type: "state-changed"; readonly portName: string }
  | { readonly type: "subscriber-added"; readonly portName: string; readonly count: number }
  | { readonly type: "subscriber-removed"; readonly portName: string; readonly count: number }
  | { readonly type: "effect-completed"; readonly portName: string; readonly actionName: string }
  | {
      readonly type: "effect-failed";
      readonly portName: string;
      readonly actionName: string;
      readonly error: EffectFailedError;
    }
  | { readonly type: "async-derived-failed"; readonly error: AsyncDerivedSelectError }
  | { readonly type: "snapshot-changed" };
```

### Usage

```typescript
const unsubscribe = inspector.subscribe(event => {
  switch (event.type) {
    case "action-dispatched":
      console.log(`[${event.entry.portName}] ${event.entry.actionName}`);
      break;
    case "effect-failed":
      console.error(`Effect failed: ${event.portName}/${event.actionName}`, event.error);
      break;
    case "async-derived-failed":
      console.error(
        `Async derived failed: ${event.error.portName} after ${event.error.attempts} attempts`,
        event.error
      );
      break;
    case "subscriber-added":
    case "subscriber-removed":
      console.log(`${event.portName} subscribers: ${event.count}`);
      break;
  }
});
```

### Event ordering

Events are emitted synchronously during state transitions in the following order:

1. `action-dispatched` -- immediately after the reducer runs
2. `state-changed` -- after the signal propagates to dependents
3. `effect-completed` or `effect-failed` -- after the effect resolves (async); `async-derived-failed` -- after an async derived `select` returns `Err` and all retries exhaust
4. `subscriber-added` / `subscriber-removed` -- when subscriptions change
5. `snapshot-changed` -- after any of the above (coalesced in batches)

Within a batch, `snapshot-changed` fires once after all actions complete.

## G. MCP Resource Readiness

The store introspection API is designed to map directly to MCP (Model Context Protocol) resources for AI-to-application communication. While `@hex-di/mcp` is a future package, the introspection contracts are MCP-ready by design -- all data is serializable, frozen, and structured for external consumption.

### Resource mappings

The following table shows how store introspection maps to MCP resources:

| MCP Resource URI                     | Introspection API                         | Return Type                     |
| ------------------------------------ | ----------------------------------------- | ------------------------------- |
| `hexdi://store/snapshot`             | `inspector.getSnapshot()`                 | `StoreSnapshot`                 |
| `hexdi://store/ports`                | `inspector.listStatePorts()`              | `readonly StatePortInfo[]`      |
| `hexdi://store/ports/{name}`         | `inspector.getPortState(name)`            | `PortSnapshot \| undefined`     |
| `hexdi://store/graph`                | `inspector.getSubscriberGraph()`          | `SubscriberGraph`               |
| `hexdi://store/history`              | `inspector.getActionHistory(filter)`      | `readonly ActionHistoryEntry[]` |
| `hexdi://store/history?traceId={id}` | `inspector.getActionHistory({ traceId })` | `readonly ActionHistoryEntry[]` |

### MCP resource contract: `hexdi://store/snapshot`

```json
{
  "timestamp": 1705312345678,
  "ports": [
    {
      "kind": "state",
      "portName": "Cart",
      "state": { "items": [{ "id": "1", "name": "Widget", "price": 10 }] },
      "subscriberCount": 3,
      "actionCount": 47,
      "lastActionAt": 1705312345600
    },
    {
      "kind": "atom",
      "portName": "Theme",
      "value": "dark",
      "subscriberCount": 1
    },
    {
      "kind": "derived",
      "portName": "CartTotal",
      "value": { "subtotal": 10, "discount": 0, "total": 10, "itemCount": 1 },
      "subscriberCount": 2,
      "sourcePortNames": ["Cart"],
      "isStale": false
    },
    {
      "kind": "async-derived",
      "portName": "ExchangeRate",
      "status": "success",
      "data": { "from": "USD", "to": "EUR", "rate": 0.92, "updatedAt": 1705312340000 },
      "error": null,
      "subscriberCount": 1,
      "sourcePortNames": ["Currency"]
    }
  ],
  "totalSubscribers": 7,
  "pendingEffects": 0
}
```

### MCP resource contract: `hexdi://store/graph`

```json
{
  "correlationId": "sg_abc123",
  "nodes": [
    { "id": "Cart", "kind": "state", "subscriberCount": 3 },
    { "id": "Theme", "kind": "atom", "subscriberCount": 1 },
    { "id": "CartTotal", "kind": "derived", "subscriberCount": 2 },
    { "id": "ExchangeRate", "kind": "async-derived", "subscriberCount": 1 },
    { "id": "Currency", "kind": "atom", "subscriberCount": 0 }
  ],
  "edges": [
    { "from": "Cart", "to": "CartTotal", "type": "derives-from" },
    { "from": "Currency", "to": "ExchangeRate", "type": "derives-from" },
    { "from": "Cart", "to": "ActionLogger", "type": "subscribes-to" },
    { "from": "Fahrenheit", "to": "Celsius", "type": "writes-to" }
  ]
}
```

### MCP resource contract: `hexdi://store/history`

```json
{
  "entries": [
    {
      "id": "act_001",
      "portName": "Cart",
      "actionName": "addItem",
      "payload": { "item": { "id": "1", "name": "Widget", "price": 10 } },
      "prevState": { "items": [] },
      "nextState": { "items": [{ "id": "1", "name": "Widget", "price": 10 }] },
      "timestamp": 1705312345678,
      "effectStatus": "completed",
      "parentId": null,
      "order": 47,
      "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
      "spanId": "00f067aa0ba902b7"
    }
  ],
  "totalCount": 47,
  "filter": { "limit": 10 }
}
```

### MCP tool mappings

Store state is also actionable through MCP tools:

| MCP Tool                 | Description           | Input                               | Maps To                                |
| ------------------------ | --------------------- | ----------------------------------- | -------------------------------------- |
| `hexdi://store/dispatch` | Dispatch an action    | `{ portName, actionName, payload }` | `service.actions[actionName](payload)` |
| `hexdi://store/set-atom` | Set an atom value     | `{ portName, value }`               | `service.set(value)`                   |
| `hexdi://store/refresh`  | Refresh async derived | `{ portName }`                      | `service.refresh()`                    |

### AI diagnostic query examples

The MCP contracts enable AI agents to perform structured queries against the running application:

```
Agent: "What state ports exist and which have errors?"

  → GET hexdi://store/snapshot
  ← { ports: [...], pendingEffects: 0 }
  → GET hexdi://store/history?effectStatus=failed&limit=5
  ← { entries: [{ portName: "Cart", actionName: "checkout", effectStatus: "failed", traceId: "abc" }] }
  → GET hexdi://tracing/spans?traceId=abc
  ← { spans: [{ name: "resolve:PaymentPort", status: "error", duration: 5043 }] }

Agent: "The Cart/checkout action failed because PaymentPort resolution timed out (5043ms).
        The trace shows a DNS resolution spike. Recommend: enable connection keep-alive."
```

This is the "diagnostic port" pattern from VISION.md -- the AI doesn't read source files, it queries the running application through structured MCP resources and gets truthful answers.

---

_Previous: [05 - Reactivity](./05-reactivity.md) | Next: [06 - Lifecycle](./06-lifecycle.md)_
