# ACP Session Events

## Overview

ACP session events manage the inter-agent communication feed displayed in the ACP session view. Agents post findings, clarifications, and broadcasts to the message exchange, and these events flow into the ACP session store (STR-009) for display in the CMP-016-message-entry-list component. A subscription tick event (EVT-017) signals the session subscription layer that new data may be available.

---

## EVT-014-acp-session-message-received

**Trigger:** Backend pushes a new ACP session message via WebSocket when an agent posts a finding, clarification, or broadcast.

### Payload

| Field   | Type   | Required | Description                  |
| ------- | ------ | -------- | ---------------------------- |
| message | object | yes      | AgentMessageView (see below) |

**AgentMessageView shape:**

```
{
  messageId:   string                                          (unique identifier)
  agentRole:   string                                          (e.g., "architect", "reviewer")
  content:     string                                          (markdown text)
  timestamp:   number                                          (Unix epoch milliseconds)
  messageType: "finding" | "clarification" | "broadcast"       (type of message)
  severity:    "critical" | "major" | "minor" | "observation"  (importance level)
  phase:       string                                          (pipeline phase name)
}
```

### Event Flow

```
Agent posts message to ACP session --> backend pushes via WebSocket
  |
  v
dispatch EVT-014-acp-session-message-received { message }
  |
  +---> [Store] STR-009-acp-session-store
          append message to messages[]
          --> CMP-016-message-entry-list re-renders with new message
          --> criticalCount selector may update badge count
```

### Store Mutations

| Store                     | Field    | Operation | Value           |
| ------------------------- | -------- | --------- | --------------- |
| STR-009-acp-session-store | messages | append    | payload.message |

---

## EVT-015-acp-session-messages-loaded

**Trigger:** Application loads the ACP session view and fetches historical messages from the backend, or a manual refresh is triggered.

### Payload

| Field    | Type  | Required | Description                       |
| -------- | ----- | -------- | --------------------------------- |
| messages | array | yes      | Array of AgentMessageView objects |

### Event Flow

```
ACP session view loaded / manual refresh --> fetch messages from backend
  |
  v
dispatch EVT-015-acp-session-messages-loaded { messages }
  |
  +---> [Store] STR-009-acp-session-store
          set messages = payload.messages (replaces entire array)
          --> CMP-016-message-entry-list re-renders with full list
```

### Store Mutations

| Store                     | Field    | Operation | Value            |
| ------------------------- | -------- | --------- | ---------------- |
| STR-009-acp-session-store | messages | set       | payload.messages |

---

## EVT-016-acp-session-message-dismissed

**Trigger:** User clicks the dismiss button on a session message entry in CMP-016-message-entry-list.

### Payload

| Field     | Type   | Required | Description                  |
| --------- | ------ | -------- | ---------------------------- |
| messageId | string | yes      | ID of the message to dismiss |

### Event Flow

```
User clicks dismiss on a message in CMP-016-message-entry-list
  |
  v
dispatch EVT-016-acp-session-message-dismissed { messageId }
  |
  +---> [Store] STR-009-acp-session-store
          remove message where messageId matches payload.messageId
          --> CMP-016-message-entry-list re-renders without the dismissed message
          --> criticalCount selector may update badge count
```

### Store Mutations

| Store                     | Field    | Operation | Value                                |
| ------------------------- | -------- | --------- | ------------------------------------ |
| STR-009-acp-session-store | messages | remove    | item.messageId === payload.messageId |

---

## EVT-017-acp-session-subscription-tick

**Trigger:** The session subscription layer emits a periodic tick when it detects data changes from the backend.

### Payload

| Field     | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| tick      | number | yes      | Monotonically increasing tick counter |
| timestamp | string | yes      | ISO-8601 timestamp of the tick        |

### Event Flow

```
Session subscription layer detects data change
  |
  v
dispatch EVT-017-acp-session-subscription-tick { tick, timestamp }
  |
  +---> [Store] STR-016-session-subscription
          update tick counter and last-seen timestamp
          --> May trigger a fetch that results in EVT-014 or EVT-015
```

### Store Mutations

| Store                        | Field     | Operation | Value             |
| ---------------------------- | --------- | --------- | ----------------- |
| STR-016-session-subscription | tick      | set       | payload.tick      |
| STR-016-session-subscription | timestamp | set       | payload.timestamp |

---

## Design Rationale

1. **Append for real-time, set for bulk load:** EVT-014 appends a single message for real-time updates, while EVT-015 replaces the entire array for initial/bulk loads. This ensures the UI is never in a half-loaded state after a page navigation.

2. **Dismiss is a local remove:** EVT-016 removes the message from the local store only. It does not call the backend to persist the dismissal. If the user refreshes, dismissed messages reappear. This keeps the interaction instant and avoids backend round-trips for a UI convenience feature.

3. **Subscription tick as a coordination signal:** EVT-017 does not carry message data itself. It signals that the subscription layer detected a change, which may trigger a fetch (EVT-015) or the backend may push individual messages (EVT-014). This decoupling keeps the tick lightweight.

4. **Severity in payload enables filtering without re-fetch:** Each AgentMessageView carries its severity, allowing the `messagesBySeverity` and `criticalCount` selectors to filter in-memory without additional backend calls.

---

## Cross-References

- **Source components:** CMP-016-message-entry-list (EVT-016 dismiss)
- **Backend triggers:** ACP session WebSocket channel (EVT-014, EVT-015), subscription layer (EVT-017)
- **Target stores:** STR-009-acp-session-store, STR-016-session-subscription
- **Consumer components:** CMP-016-message-entry-list
- **Related stores:** STR-001-filter-store (ACP session view filters applied via selectors)
