# 11 - Introspection

Stream introspection provides runtime visibility into reactive streams -- every port's active streams, subscriber counts, lifecycle events, and health status. It follows the same patterns used throughout HexDI:

- `InspectorAPI` pattern: pull-based queries + push-based subscriptions
- `ContainerSnapshot` pattern: frozen data with discriminated unions by kind
- `InspectorEvent` pattern: discriminated union events

## 59. StreamRegistry

Tracks live stream instances. Event-based registry with discriminated union events.

### Interface

```typescript
interface StreamRegistry {
  /** Register a stream instance. */
  register(entry: StreamRegistryEntry): void;

  /** Unregister a stream instance. */
  unregister(portName: string, instanceId: string): void;

  /** Get all registered streams. */
  getAllStreams(): readonly StreamRegistryEntry[];

  /** Get a specific stream by port name and instance ID. */
  getStream(portName: string, instanceId: string): StreamRegistryEntry | undefined;

  /** Get all streams for a specific port. */
  getStreamsByPort(portName: string): readonly StreamRegistryEntry[];

  /** Subscribe to registry events. */
  subscribe(listener: StreamRegistryListener): () => void;

  /** Dispose the registry and clean up all entries. */
  dispose(): void;
}

type StreamRegistryListener = (event: StreamRegistryEvent) => void;
```

### StreamRegistryEntry

```typescript
interface StreamRegistryEntry {
  /** Port name this stream was resolved from */
  readonly portName: string;

  /** Unique instance identifier */
  readonly instanceId: string;

  /** Stream kind */
  readonly kind: "cold" | "hot" | "subject";

  /** Function returning current subscriber count */
  readonly subscriberCount: () => number;

  /** Function returning whether the stream has completed/terminated */
  readonly isCompleted: () => boolean;

  /** Timestamp of stream creation */
  readonly createdAt: number;

  /** Monotonic sequence number for deterministic ordering. */
  readonly sequenceNumber: number;

  /** Scope ID if stream is scoped (undefined for root container) */
  readonly scopeId?: string;
}
```

`createdAt` uses `Date.now()` for human-readable wall-clock time. `sequenceNumber` is a monotonically incrementing counter (per-registry) that guarantees deterministic ordering even when system clock adjustments cause `createdAt` values to be non-monotonic.

### StreamRegistryEvent

```typescript
type StreamRegistryEvent =
  | {
      readonly type: "stream-registered";
      readonly entry: StreamRegistryEntry;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "stream-unregistered";
      readonly portName: string;
      readonly instanceId: string;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "scoped-stream-registered";
      readonly entry: StreamRegistryEntry;
      readonly scopeId: string;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "scope-unregistered";
      readonly scopeId: string;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "registry-disposed";
      readonly entryCount: number;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    };
```

The `registry-disposed` event fires **before** entries are removed, allowing subscribers to capture the final state.

### Implementation

```typescript
function createStreamRegistryImpl(): StreamRegistry;
```

The registry is created via `createStreamRegistryImpl()` following the same factory pattern as `createStoreRegistryImpl()`.

## 60. StreamInspector

Read-only query API for stream state. Combines pull-based queries with push-based subscriptions.

### Interface

```typescript
interface StreamInspector {
  /** Snapshot of all stream state at this instant. */
  getSnapshot(): StreamSnapshot;

  /** Snapshot of a single port's streams. */
  getStreamState(portName: string): StreamPortSnapshot | undefined;

  /** List all registered stream ports with metadata. */
  listStreams(): readonly StreamInfo[];

  /** Subscriber dependency graph. */
  getSubscriberGraph(): StreamSubscriberGraph;

  /** Event history with optional filtering. */
  getEventHistory(filter?: StreamEventFilter): readonly StreamEventEntry[];

  /** Subscribe to inspector events. */
  subscribe(listener: StreamInspectorListener): () => void;
}

type StreamInspectorListener = (event: StreamInspectorEvent) => void;
```

### StreamInfo

```typescript
interface StreamInfo {
  readonly portName: string;
  readonly kind: "cold" | "hot" | "subject";
  readonly lifetime: "singleton" | "scoped" | "transient";
  readonly activeInstances: number;
  readonly totalSubscribers: number;
  readonly isCompleted: boolean;
}
```

### Implementation

```typescript
function createStreamInspectorImpl(config?: StreamInspectorConfig): StreamInspector;
```

The inspector adapter discovers stream ports at initialization time by scanning the container's graph for adapters with stream-specific brand symbols (`__streamAdapterBrand`, `__subjectAdapterBrand`, `__operatorAdapterBrand`).

## 61. StreamSnapshot

A serializable snapshot of all stream state at a point in time.

```typescript
interface StreamSnapshot {
  readonly timestamp: number;
  readonly sequenceNumber: number;
  readonly ports: readonly StreamPortSnapshot[];
  readonly totalSubscribers: number;
  readonly totalActiveStreams: number;
}

type StreamPortSnapshot = ColdStreamSnapshot | HotStreamSnapshot | SubjectSnapshot;

interface ColdStreamSnapshot {
  readonly kind: "cold";
  readonly portName: string;
  readonly activeInstances: number;
  readonly totalSubscribers: number;
  readonly createdAt: number;
  readonly scopeId?: string;
}

interface HotStreamSnapshot {
  readonly kind: "hot";
  readonly portName: string;
  readonly subscriberCount: number;
  readonly isCompleted: boolean;
  readonly createdAt: number;
}

interface SubjectSnapshot {
  readonly kind: "subject";
  readonly portName: string;
  readonly subjectType: "basic" | "behavior" | "replay";
  readonly subscriberCount: number;
  readonly closed: boolean;
  readonly createdAt: number;
  /** Present for BehaviorSubject -- the current value (serialized). */
  readonly currentValue?: unknown;
  /** Present for ReplaySubject -- buffer size. */
  readonly bufferSize?: number;
}
```

All returned data is frozen with `Object.freeze()`. Snapshots are safe to serialize for devtools or logging.

### Usage

```typescript
const snapshot = inspector.getSnapshot();

for (const port of snapshot.ports) {
  switch (port.kind) {
    case "cold":
      console.log(
        `${port.portName}: ${port.activeInstances} instances, ${port.totalSubscribers} subscribers`
      );
      break;
    case "hot":
      console.log(
        `${port.portName}: ${port.subscriberCount} subscribers, completed=${port.isCompleted}`
      );
      break;
    case "subject":
      console.log(
        `${port.portName}: ${port.subjectType}, ${port.subscriberCount} subscribers, closed=${port.closed}`
      );
      break;
  }
}
```

## 62. StreamInspectorEvent

Push-based events emitted by the inspector when stream state changes.

```typescript
type StreamInspectorEvent =
  | {
      readonly type: "stream-created";
      readonly portName: string;
      readonly kind: "cold" | "hot" | "subject";
      readonly instanceId: string;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "stream-completed";
      readonly portName: string;
      readonly instanceId: string;
      readonly reason: "complete" | "terminate";
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "subscriber-added";
      readonly portName: string;
      readonly instanceId: string;
      readonly count: number;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "subscriber-removed";
      readonly portName: string;
      readonly instanceId: string;
      readonly count: number;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "stream-error";
      readonly portName: string;
      readonly instanceId: string;
      readonly errorType: "recoverable" | "terminal";
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "stream-disposed";
      readonly portName: string;
      readonly instanceId: string;
      readonly scopeId?: string;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "snapshot-changed";
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "reconfiguration-rejected";
      readonly timestamp: number;
      readonly sequenceNumber: number;
    };
```

### Event Ordering

Events are emitted in the following order:

1. `stream-created` -- when a stream adapter resolves
2. `subscriber-added` / `subscriber-removed` -- when subscriptions change
3. `stream-error` -- on recoverable or terminal errors
4. `stream-completed` -- when a stream completes or terminates
5. `stream-disposed` -- when a stream is cleaned up
6. `snapshot-changed` -- after any of the above (coalesced)

### Usage

```typescript
const unsubscribe = inspector.subscribe(event => {
  switch (event.type) {
    case "stream-created":
      console.log(`Stream created: ${event.portName} (${event.kind})`);
      break;
    case "stream-error":
      console.warn(`Stream error: ${event.portName} [${event.errorType}]`);
      break;
    case "stream-disposed":
      console.log(`Stream disposed: ${event.portName}`);
      break;
  }
});
```

## 63. MCP Resource Readiness

The stream introspection API maps directly to MCP resources:

| MCP Resource URI              | Introspection API                   | Return Type                       |
| ----------------------------- | ----------------------------------- | --------------------------------- |
| `hexdi://stream/snapshot`     | `inspector.getSnapshot()`           | `StreamSnapshot`                  |
| `hexdi://stream/ports`        | `inspector.listStreams()`           | `readonly StreamInfo[]`           |
| `hexdi://stream/ports/{name}` | `inspector.getStreamState(name)`    | `StreamPortSnapshot \| undefined` |
| `hexdi://stream/graph`        | `inspector.getSubscriberGraph()`    | `StreamSubscriberGraph`           |
| `hexdi://stream/events`       | `inspector.getEventHistory(filter)` | `readonly StreamEventEntry[]`     |

### StreamSubscriberGraph

```typescript
interface StreamSubscriberGraph {
  readonly correlationId: string;
  readonly nodes: readonly StreamGraphNode[];
  readonly edges: readonly StreamGraphEdge[];
}

interface StreamGraphNode {
  readonly id: string;
  readonly kind: "cold" | "hot" | "subject" | "operator";
  readonly subscriberCount: number;
}

interface StreamGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly type: "subscribes-to" | "pipes-through" | "multicasts";
}
```

### AI Diagnostic Query Example

```
Agent: "Which streams have subscriber leaks?"

  → GET hexdi://stream/snapshot
  ← { ports: [...], totalSubscribers: 47, totalActiveStreams: 12 }
  → GET hexdi://stream/ports
  ← [{ portName: "PriceTicker", totalSubscribers: 23, ... }]

Agent: "PriceTicker has 23 subscribers but only 3 React components use it.
        20 subscriptions are leaked. Check for missing unsubscribe in
        custom hooks or imperative code."
```

---

_Previous: [10 - Integration](./10-integration.md)_

_Next: [12 - React Integration](./12-react-integration.md)_
