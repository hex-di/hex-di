# STR-013: Service Context Store

## Overview

The Service Context Store is a write-once store that holds the initialization state of the application's core services. It does not respond to user-driven events. Instead, it is populated exactly once during app bootstrap and then provides read-only access to singleton service instances (SessionManager, GraphStore, WebSocket client, etc.) for all downstream views.

**Hook:** `useServices()`

---

## State Shape

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| initialized       | boolean (false until services are ready)                  |
| error             | ServiceContextError | null                               |
+-------------------+----------------------------------------------------------+
```

### ServiceContextError

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| _tag              | "ServiceInitError"                                       |
| message           | string (human-readable error description)                |
| service           | string (name of the service that failed to initialize)   |
+-------------------+----------------------------------------------------------+
```

---

## Selectors

| Selector   | Parameters | Description                                                  |
| ---------- | ---------- | ------------------------------------------------------------ |
| `isReady`  | (none)     | Returns `true` when initialization succeeded with no errors. |
| `hasError` | (none)     | Returns `true` when initialization produced an error.        |

---

## Initialization Flow

```
App Bootstrap
  |
  +--> Instantiate services (SessionManager, GraphStore, WS Client, ...)
  |
  +--> Success?
  |      |
  |      +-- Yes --> dispatch INIT-001 (services-initialized)
  |      |              --> initialized = true
  |      |
  |      +-- No  --> dispatch INIT-002 (services-initialization-failed)
  |                     --> error = { _tag: "ServiceInitError", message, service }
  |
  +--> Views check useServices().isReady before rendering content
```

### Event-to-Field Mapping

| Event    | Field       | Operation |
| -------- | ----------- | --------- |
| INIT-001 | initialized | set       |
| INIT-002 | error       | set       |

---

## No Runtime Events

Unlike other stores, the Service Context Store has no user-facing events after initialization. It is explicitly designed as a write-once provider:

- **No EVT-xxx events** -- The store does not subscribe to the event bus.
- **No reducers for user actions** -- State is sealed after bootstrap.
- **Services are singletons** -- The hook returns stable references that do not change across re-renders.

---

## Consumer Pattern

All connected views consume this store indirectly through `useServices()`. The hook provides:

1. **Guard rendering on readiness** -- Components gate on `isReady` before accessing services.
2. **Error boundary integration** -- When `hasError` is true, the app shell renders an error screen with the failing service name and message.
3. **Stable references** -- Because the store is write-once, service references are referentially stable and safe to use in dependency arrays.

---

## Design Rationale

1. **Write-once simplicity:** The store has exactly two state transitions: uninitialized to initialized, or uninitialized to error. This eliminates an entire class of state management complexity.

2. **Separate from other stores:** Service instances are not mixed into domain stores (sessions, pipeline, etc.) because they are infrastructure concerns. Separating them avoids coupling domain state transitions with service lifecycle.

3. **Error carries service name:** The `service` field in `ServiceContextError` enables the error screen to pinpoint which service failed (e.g., "Failed to connect: GraphStore"). This aids debugging without requiring users to inspect console logs.

4. **No persistence:** Service initialization is performed fresh on every app load. Persisting this state would be meaningless since services must be re-instantiated regardless.

---

## Cross-References

- **Consumers:** All connected views (read-only)
- **Events:** INIT-001 (services-initialized), INIT-002 (services-initialization-failed)
- **Architecture:** [c3-web-dashboard.md](../../../architecture/c3-web-dashboard.md) -- SPA Shell (bootstrap)
- **Related stores:** All domain stores depend on services being ready before they can load data
