# 10 - Integration

## 55. DI Ports

The stream library exposes three DI ports for integration with the HexDI container inspection system, following the pattern established by `@hex-di/flow` and `@hex-di/store`:

```typescript
import { port, createLibraryInspectorPort } from "@hex-di/core";

/** Port for the stream inspector service */
const StreamInspectorPort = port<StreamInspector>()({
  name: "StreamInspector",
});

/** Port for the stream registry service */
const StreamRegistryPort = port<StreamRegistry>()({
  name: "StreamRegistry",
});

/** Port for the library-level inspector bridge */
const StreamLibraryInspectorPort = createLibraryInspectorPort()({
  name: "StreamLibraryInspector",
});
```

These ports are resolved from Container like any other service. They must be explicitly registered via their respective adapter factories.

## 56. Registry & Inspector Adapters

### createStreamRegistryAdapter

Creates an adapter that provides the `StreamRegistry` singleton:

```typescript
function createStreamRegistryAdapter(): Adapter<typeof StreamRegistryPort, [], "singleton", "sync">;
```

### createStreamInspectorAdapter

Creates an adapter that provides the `StreamInspector` singleton:

```typescript
function createStreamInspectorAdapter(
  config?: StreamInspectorConfig
): Adapter<typeof StreamInspectorPort, [typeof StreamRegistryPort], "singleton", "sync">;

interface StreamInspectorConfig {
  /** Maximum event history entries. Default: 500. */
  readonly maxEventHistory?: number;

  /**
   * History recording mode:
   * - "full": Record all events with full metadata (development default)
   * - "lightweight": Record event metadata without payloads
   * - "off": Disable history recording
   */
  readonly mode?: "full" | "lightweight" | "off";

  /** When true, prevents runtime changes to inspector configuration. Default: false. */
  readonly locked?: boolean;
}
```

When `locked` is `true`, reconfiguration attempts are rejected and a `reconfiguration-rejected` event is emitted via the inspector's event stream (see §62). This is useful for production deployments where audit recording mode should not be changed after initialization.

### createStreamLibraryInspectorAdapter

Creates the bridge adapter that exposes stream state through the unified container inspection system:

```typescript
function createStreamLibraryInspectorAdapter(): Adapter<
  typeof StreamLibraryInspectorPort,
  [typeof StreamInspectorPort],
  "singleton",
  "sync"
>;
```

### Graph Registration

```typescript
const graph = GraphBuilder.create()
  // Application adapters
  .provide(priceTickerAdapter)
  .provide(eventBusAdapter)
  // Introspection adapters (explicit registration)
  .provide(createStreamRegistryAdapter())
  .provide(createStreamInspectorAdapter({ maxEventHistory: 1000 }))
  .provide(createStreamLibraryInspectorAdapter())
  .build();

const container = await createContainer({ graph, name: "app" }).initialize();
const inspector = container.resolve(StreamInspectorPort);
```

## 57. Tracing Bridge

Optional integration with `@hex-di/tracing`. When a tracer is available in the container, stream lifecycle events produce tracing spans.

### StreamTracingHook

```typescript
interface StreamTracingHook {
  /** Called when a new stream is created via an adapter */
  onStreamCreated(info: StreamCreatedInfo): void;

  /** Called when a subscriber is added */
  onSubscription(info: SubscriptionInfo): void;

  /** Called for each value emission (opt-in, may have performance impact) */
  onEmission?(info: EmissionInfo): void;

  /** Called on recoverable error */
  onError(info: StreamErrorInfo): void;

  /** Called when a stream completes or terminates */
  onCompleted(info: StreamCompletedInfo): void;

  /** Called when a stream is disposed */
  onDisposed(info: StreamDisposedInfo): void;
}
```

### Span Attributes

Stream tracing spans use HexDI conventions:

| Attribute                        | Type   | Description                                                              |
| -------------------------------- | ------ | ------------------------------------------------------------------------ |
| `hex-di.stream.port_name`        | string | Port name (e.g., "PriceTicker")                                          |
| `hex-di.stream.kind`             | string | `"cold"`, `"hot"`, or `"subject"`                                        |
| `hex-di.stream.subscriber_count` | number | Active subscribers at time of event                                      |
| `hex-di.stream.event`            | string | `"created"`, `"subscribed"`, `"completed"`, `"terminated"`, `"disposed"` |
| `hex-di.stream.scope_id`         | string | Scope ID if stream is scoped                                             |

### Span Hierarchy

```
[stream] PriceTicker/created                     (lifetime)
  ├── [subscription] PriceTicker/subscribe#1     (subscription lifetime)
  │     ├── [emission] PriceTicker/next           (instant)
  │     ├── [emission] PriceTicker/next           (instant)
  │     └── [emission] PriceTicker/error          (instant)
  ├── [subscription] PriceTicker/subscribe#2     (subscription lifetime)
  └── [stream] PriceTicker/completed             (instant)
```

### Conditional Integration

Tracing is opt-in. When `@hex-di/tracing` is not in the dependency graph, no spans are created and no overhead is incurred:

```typescript
// With tracing: spans are created for stream lifecycle
const graph = GraphBuilder.create()
  .provide(priceTickerAdapter)
  .provide(tracerAdapter) // Optional: enables stream tracing
  .build();

// Without tracing: no overhead
const graph = GraphBuilder.create().provide(priceTickerAdapter).build();
```

## 58. Lifecycle Management

### Auto-Dispose on Scope Disposal

When a container scope is disposed, all streams owned by that scope are automatically cleaned up:

1. All active subscriptions are unsubscribed
2. Producer `AbortSignal`s are triggered
3. Teardown functions are called
4. Registry entries for scoped streams are removed

```typescript
const scope = container.createScope();
const producer = scope.resolve(PriceTickerPort);
const stream = producer();
const sub = stream.subscribe({ next: v => console.log(v) });

// When scope is disposed:
scope.dispose();
// - sub.closed === true
// - Producer's AbortSignal is aborted
// - Registry entry removed
// - Inspector notified
```

### Singleton Stream Lifecycle

Singleton streams live for the lifetime of the root container:

```typescript
const eventBus = container.resolve(EventBusPort); // Singleton subject
eventBus.subscribe({ next: e => console.log(e) });

// EventBus lives until container.dispose()
container.dispose();
// - EventBus subject closed
// - All subscribers notified with complete()
```

### Disposal Order

```
Container.dispose()
  │
  ├── 1. Signal all scoped streams to abort
  ├── 2. Unsubscribe all scoped subscriptions
  ├── 3. Call scoped teardown functions
  ├── 4. Signal all singleton streams to abort
  ├── 5. Unsubscribe all singleton subscriptions
  ├── 6. Call singleton teardown functions
  ├── 7. Notify registry of all removals
  └── 8. Notify inspector of disposal events
```

### Subject Disposal

Subjects follow the same lifecycle rules but have additional behavior:

- On scope disposal, subjects receive `complete()` (graceful shutdown)
- Pending `next()` calls after disposal are no-ops
- `subject.closed` becomes `true`
- Late subscribers receive `complete()` immediately

---

_Previous: [09 - Container Observation](./09-container-observation.md)_

_Next: [11 - Introspection](./11-introspection.md)_
