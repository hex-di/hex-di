# 09 - Container Observation

## Prerequisites

Container observation requires the container to expose a binding-change notification mechanism (event emitter or subscription API) so that `@hex-di/stream` can react to lifecycle events.

- `ContainerEvent` is defined in `@hex-di/stream` (see §54 below), but the **event emission protocol** -- the mechanism by which the container emits these events -- must be added to `@hex-di/runtime` before implementation. This is a cross-cutting `@hex-di/runtime` enhancement.
- Specifically, `@hex-di/runtime` must provide a way for libraries to subscribe to adapter registration, adapter replacement, scope creation/disposal, and port resolution events. The exact API (event emitter, callback registration, or observable) is an implementation detail of `@hex-di/runtime`.
- Until this runtime enhancement is in place, `observePort` and `observeContainer` cannot be implemented.

## 52. observePort

Returns a `Stream` that emits the resolved service instance whenever the container's binding for that port changes. Uses BehaviorSubject semantics -- emits the current value immediately on subscription.

### Signature

```typescript
function observePort<P extends Port<unknown, string>>(
  container: Container,
  port: P
): Stream<InferService<P>, never>;
```

### Behavior

1. On subscription, immediately emits the current resolved value for the port
2. Emits a new value whenever the container's binding for the port changes (adapter replacement, scope override)
3. Completes when the container/scope is disposed
4. Uses a `BehaviorSubject` internally to provide current-value semantics

### Example

```typescript
import { observePort } from "@hex-di/stream";

// Observe the current theme setting
const theme$ = observePort(container, ThemePort);

theme$.subscribe({
  next: theme => {
    console.log("Current theme:", theme);
    document.body.className = theme;
  },
  complete: () => console.log("Container disposed"),
});
// Immediately logs: "Current theme: light"
// Later, if adapter changes: "Current theme: dark"
```

### Scope Observation

When observing a port within a scope, the stream emits values specific to that scope:

```typescript
const scope = container.createScope();
const scopedConfig$ = observePort(scope, ConfigPort);

// Emits the scope's ConfigPort value (which may override the root's)
// Completes when this specific scope is disposed
```

### Use Cases

| Use Case                    | Description                                                    |
| --------------------------- | -------------------------------------------------------------- |
| **Config hot-reload**       | React to configuration changes without restart                 |
| **Feature flags**           | Stream of feature flag values as they change                   |
| **Service health**          | Observe when a service is replaced (failover)                  |
| **Multi-tenant adaptation** | Observe tenant-specific service instances in scoped containers |

## 53. observeContainer

Returns a `Stream<ContainerEvent, never>` that emits all container lifecycle events. Hot stream, shared across subscribers.

### Signature

```typescript
function observeContainer(container: Container): Stream<ContainerEvent, never>;
```

### Behavior

1. Emits events for all container lifecycle activities
2. Hot stream -- shared across all subscribers (internally backed by a `Subject`)
3. Late subscribers receive only future events (no replay)
4. Completes when the container is disposed

### Example

```typescript
import { observeContainer } from "@hex-di/stream";

const events$ = observeContainer(container);

events$.subscribe({
  next: event => {
    switch (event.type) {
      case "adapter-registered":
        console.log(`Adapter registered for ${event.portName}`);
        break;
      case "scope-created":
        console.log(`Scope created: ${event.scopeId}`);
        break;
      case "port-resolved":
        console.log(`Port resolved: ${event.portName} in ${event.scopeId ?? "root"}`);
        break;
    }
  },
});
```

### Filtering Events

Combine with operators for targeted observation:

```typescript
// Only adapter registration events
const registrations$ = observeContainer(container).pipe(
  filter(e => e.type === "adapter-registered")
);

// Only events for a specific port
const userEvents$ = observeContainer(container).pipe(
  filter(e => "portName" in e && e.portName === "UserService")
);
```

## 54. ContainerEvent

Discriminated union on the `type` field:

```typescript
type ContainerEvent =
  | AdapterRegisteredEvent
  | AdapterReplacedEvent
  | ScopeCreatedEvent
  | ScopeDisposedEvent
  | PortResolvedEvent;

interface AdapterRegisteredEvent {
  readonly type: "adapter-registered";
  readonly portName: string;
  readonly lifetime: string;
  readonly timestamp: number;
  readonly sequenceNumber: number;
  readonly correlationId: string;
}

interface AdapterReplacedEvent {
  readonly type: "adapter-replaced";
  readonly portName: string;
  readonly previousLifetime: string;
  readonly newLifetime: string;
  readonly timestamp: number;
  readonly sequenceNumber: number;
  readonly correlationId: string;
}

interface ScopeCreatedEvent {
  readonly type: "scope-created";
  readonly scopeId: string;
  readonly parentScopeId: string | undefined;
  readonly timestamp: number;
  readonly sequenceNumber: number;
  readonly correlationId: string;
}

interface ScopeDisposedEvent {
  readonly type: "scope-disposed";
  readonly scopeId: string;
  readonly timestamp: number;
  readonly sequenceNumber: number;
  readonly correlationId: string;
}

interface PortResolvedEvent {
  readonly type: "port-resolved";
  readonly portName: string;
  readonly scopeId: string | undefined;
  readonly lifetime: string;
  readonly timestamp: number;
  readonly sequenceNumber: number;
  readonly correlationId: string;
}
```

### Event Properties

All events carry:

- `type` -- discriminant for `switch` exhaustiveness checking
- `timestamp` -- `Date.now()` at event emission time
- `sequenceNumber` -- monotonically incrementing counter (per-container) that guarantees deterministic ordering even when system clock adjustments cause `timestamp` values to be non-monotonic
- `correlationId` -- unique identifier for correlating related events across systems (e.g., tracing, logging). Generated via the same correlation utility used throughout HexDI.

Port-related events carry:

- `portName` -- the string name of the port involved

Scope-related events carry:

- `scopeId` -- unique identifier for the scope

### Integration with Introspection

Container events feed into the `StreamInspector` when the stream library's inspector adapter is registered. The inspector uses these events to track stream port lifecycle:

```typescript
// The inspector adapter listens to container events internally
const graph = GraphBuilder.create()
  .provide(streamAdapters)
  .provide(createStreamInspectorAdapter())
  .build();

// When a scope is created, the inspector begins tracking scoped stream instances
// When a scope is disposed, the inspector cleans up those entries
```

### Circular Observation

`observePort` on a `StreamPort` that itself triggers container events (e.g., a stream adapter whose resolution emits a `port-resolved` event observed by `observeContainer`) is a potential re-entrant loop. The implementation must guard against this:

- Container events are emitted **after** resolution completes, not during resolution.
- The `observeContainer` Subject defers event delivery when it detects re-entrant emission (i.e., an event emitted from within a subscriber's `next` handler is queued and delivered after the current notification cycle completes).
- Infinite loops caused by adapter resolution triggering observation that triggers further resolution are a programming error. The implementation should detect and break such cycles with a `CircularStreamError` (error code `STRM008`).

---

_Previous: [08 - Backpressure](./08-backpressure.md)_

_Next: [10 - Integration](./10-integration.md)_
