# STR-016: Session Subscription Store

## Overview

The Session Subscription Store provides a monotonically increasing tick counter that increments on every ACP session event. Downstream stores and hooks observe this tick to trigger data refreshes, decoupling the "something changed in the ACP session" signal from specific event payloads.

**Hook:** `useSessionTick()`

---

## State Shape

```
+----------------------+-------------------------------------------------------+
| Field                | Type                                                  |
+----------------------+-------------------------------------------------------+
| tick                 | number (monotonically increasing, starts at 0)        |
| isSubscribed         | boolean (WebSocket subscription active?)              |
| lastEventTimestamp   | number | null (Unix ms of last received event)        |
+----------------------+-------------------------------------------------------+
```

---

## Selectors

| Selector             | Parameters | Description                                                            |
| -------------------- | ---------- | ---------------------------------------------------------------------- |
| `currentTick`        | (none)     | Returns the current tick counter value.                                |
| `isSubscribed`       | (none)     | Returns `true` when the ACP session WebSocket subscription is active.  |
| `timeSinceLastEvent` | (none)     | Returns milliseconds since the last event, or `null` if no events yet. |

---

## Event Flow

```
EVT-017 (session-subscription-tick)
  --> increment tick by 1
  --> set lastEventTimestamp to payload.timestamp

EVT-033 (session-subscribed)
  --> set isSubscribed to true

EVT-034 (session-unsubscribed)
  --> set isSubscribed to false
```

### Event-to-Field Mapping

| Event   | Field              | Operation |
| ------- | ------------------ | --------- |
| EVT-017 | tick               | increment |
| EVT-017 | lastEventTimestamp | set       |
| EVT-033 | isSubscribed       | set       |
| EVT-034 | isSubscribed       | set       |

---

## Tick Consumption Pattern

The tick is consumed by downstream stores and hooks as a dependency signal:

```
STR-016 (tick increments)
  |
  +--> STR-005 (pipeline store) -- re-fetches phase data
  +--> STR-006 (spec content store) -- re-fetches spec snapshots
  +--> STR-007 (task board store) -- re-fetches task list
  +--> STR-008 (coverage store) -- re-fetches coverage metrics
  +--> STR-009 (ACP session store) -- receives new messages
  +--> STR-010 (cost tracker store) -- re-fetches cost summaries
```

Each downstream consumer uses the tick as a React effect dependency:

```
useEffect(() => {
  refreshData();
}, [tick]);
```

This pattern ensures that:

- All session-dependent data stays fresh.
- No consumer needs to understand the specific ACP session event types.
- The refresh rate is bounded by the event frequency, not by polling intervals.

---

## Monotonic Guarantee

The tick counter has the following invariants:

1. **Starts at 0** -- The initial tick value is always 0.
2. **Increments by 1** -- Each EVT-017 increases tick by exactly 1.
3. **Never decreases** -- There is no event that decrements or resets the tick.
4. **Never skips** -- The tick does not jump by more than 1 per event.

These invariants allow consumers to detect "has anything changed since I last checked" by comparing their last-seen tick with the current value.

---

## Subscription Lifecycle

```
App Shell mounts
  |
  +--> WebSocket client connects to /ws
  |
  +--> On connection established:
  |      dispatch EVT-033 (session-subscribed)
  |        --> isSubscribed = true
  |
  +--> On ACP session event received:
  |      dispatch EVT-017 (session-subscription-tick)
  |        --> tick++, lastEventTimestamp = now
  |
  +--> On connection lost:
  |      dispatch EVT-034 (session-unsubscribed)
  |        --> isSubscribed = false
  |
  +--> On reconnection:
         dispatch EVT-033 again
           --> isSubscribed = true
```

---

## Design Rationale

1. **Tick as indirection layer:** The tick counter decouples "something happened in the ACP session" from "what specifically happened." Downstream stores do not need to parse session event payloads to know they should refresh.

2. **Monotonic counter over boolean flag:** A boolean "dirty" flag would require manual clearing and risks race conditions between setter and consumer. A monotonic counter naturally supports multiple concurrent consumers, each tracking their own last-seen value.

3. **lastEventTimestamp for staleness detection:** The `timeSinceLastEvent` selector enables the UI to show "last updated X seconds ago" indicators and to detect if the subscription has gone stale (no events for an unexpectedly long time).

4. **isSubscribed for connection health:** The `isSubscribed` flag lets the status bar (CMP-002) and connection banners indicate whether the app is receiving live updates. This is separate from the graph store's `connectionStatus` since the session subscription and graph connection are independent.

5. **No persistence:** The tick and subscription state are transient. On reload, the tick resets to 0 and the subscription is re-established, triggering fresh data loads in all downstream stores.

---

## Cross-References

- **Consumers:** STR-005, STR-006, STR-007, STR-008, STR-009, STR-010 (all session-dependent stores)
- **Events:** EVT-017 (session-subscription-tick), EVT-033 (session-subscribed), EVT-034 (session-unsubscribed)
- **Architecture:** [c3-web-dashboard.md](../../../architecture/c3-web-dashboard.md) -- WebSocket Client
- **Behaviors:** [05-acp-session.md](../../../behaviors/BEH-SF-033-blackboard.md) -- BEH-SF-033 through BEH-SF-040
