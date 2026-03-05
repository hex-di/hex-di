# STR-009: ACP Session Store

## Overview

The ACP Session Store manages the collection of inter-agent messages exchanged via the ACP session message exchange pattern. Each message represents a finding, clarification request, or broadcast from an agent during a specification flow execution.

**Hook:** `useSessionMessages()`

---

## State Shape

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| messages          | AgentMessageView[]                                  |
+-------------------+----------------------------------------------------------+
```

### AgentMessageView

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| messageId         | string                                                   |
| agentRole         | string                                                   |
| content           | string                                                   |
| timestamp         | number                                                   |
| messageType       | "finding" | "clarification" | "broadcast"                |
| severity          | "critical" | "major" | "minor" | "observation"          |
| phase             | string                                                   |
+-------------------+----------------------------------------------------------+
```

---

## Selectors

| Selector             | Parameters | Description                                                   |
| -------------------- | ---------- | ------------------------------------------------------------- |
| `messagesByPhase`    | `phase`    | Filters messages to those belonging to the given flow phase.  |
| `messagesBySeverity` | `severity` | Filters messages by severity level.                           |
| `criticalCount`      | (none)     | Returns the count of messages with `severity === "critical"`. |

---

## Event Flow

```
EVT-014 (acp-session-message-received)
  --> append new message to messages[]

EVT-015 (acp-session-messages-loaded)
  --> replace messages[] with full payload (bulk load on view mount)

EVT-016 (acp-session-message-dismissed)
  --> remove message matching payload.messageId from messages[]

EVT-017 (session-subscription-tick)
  --> no direct state mutation (consumed by STR-016 subscription store)
```

### Event-to-Field Mapping

| Event   | Field    | Operation |
| ------- | -------- | --------- |
| EVT-014 | messages | append    |
| EVT-015 | messages | set       |
| EVT-016 | messages | remove    |
| EVT-017 | (none)   | (none)    |

---

## Design Rationale

1. **Flat message list:** Messages are stored in a flat array rather than nested by phase or severity. Selectors derive filtered views, keeping the state shape simple and serializable.

2. **Bulk load pattern:** EVT-015 replaces the entire list on initial load. This avoids incremental reconstruction from history and supports the common pattern of fetching historical messages on view mount, then appending new ones via EVT-014.

3. **Dismiss vs. delete:** EVT-016 removes a message from the local view state. This is a UI-level dismissal; the ACP session's authoritative state lives server-side. The dashboard renders only what the user has not explicitly dismissed.

4. **Severity as a first-class dimension:** The `criticalCount` selector exists because the status bar (CMP-002) and the ACP session view both surface critical counts prominently. Pre-computing this avoids repeated filter passes.

5. **No persistence:** Messages are transient view state. The server/graph is the source of truth. Refreshing the page triggers a fresh EVT-015 bulk load.

---

## Cross-References

- **Consumer:** CMP-016-message-entry-list
- **Events:** EVT-014, EVT-015, EVT-016, EVT-017
- **Related stores:** STR-016 (session subscription), STR-001 (filters)
- **Architecture:** [c3-web-dashboard.md](../../../architecture/c3-web-dashboard.md) -- Findings View
- **Behaviors:** [05-acp-session.md](../../../behaviors/BEH-SF-033-blackboard.md) -- BEH-SF-033 through BEH-SF-040
