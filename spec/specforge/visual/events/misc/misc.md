# Misc Events

## Overview

The misc events group contains general-purpose events that do not belong to a specific domain. Currently, it contains a single event for clearing error banners across multiple stores.

---

## EVT-024-error-cleared

**Trigger:** User dismisses an error banner or notification in the UI, such as the error bar in the chat panel or the session error indicator in the status bar.

### Payload

| Field  | Type   | Required | Description                                                     |
| ------ | ------ | -------- | --------------------------------------------------------------- |
| source | string | yes      | Identifies which store's error was cleared: "chat" or "session" |

### Event Flow

```
User clicks dismiss on an error banner
  |
  v
dispatch EVT-024-error-cleared { source }
  |
  +---> [Conditional: source === "chat"]
  |       [Store] STR-004-chat-store
  |         set error = null
  |         --> Error banner in CMP-009-message-list disappears
  |
  +---> [Conditional: source === "session"]
          [Store] STR-002-active-session-store
            set error = null
            --> Error indicator in CMP-002-status-bar disappears
            (Note: status remains "error" -- only the error message is cleared)
```

### Store Mutations

**When source === "chat":**

| Store              | Field | Operation | Value |
| ------------------ | ----- | --------- | ----- |
| STR-004-chat-store | error | set       | null  |

**When source === "session":**

| Store                        | Field | Operation | Value |
| ---------------------------- | ----- | --------- | ----- |
| STR-002-active-session-store | error | set       | null  |

---

## Design Rationale

1. **Source-based routing:** A single event type with a `source` discriminator is simpler than defining separate `clear-chat-error` and `clear-session-error` events. The reducer inspects the `source` field and updates only the relevant store. This scales to additional error sources without new event types.

2. **Error cleared, not status reset:** For the session store, clearing the error does not change the session status back from "error". The status transition requires an explicit EVT-004 (session-status-changed) from the backend. This prevents the UI from showing a "healthy" session when the underlying error condition may still exist.

3. **Implicit clearing vs. explicit clearing:** EVT-008 (message-sent) implicitly clears chat errors, and EVT-002 (session-selected) implicitly clears session errors. EVT-024 provides an explicit clearing path for cases where the user wants to dismiss the error banner without sending a new message or switching sessions.

4. **No side effects:** Clearing an error is a purely local UI action. No backend calls or analytics events are triggered.

---

## Cross-References

- **Source components:** CMP-009-message-list (chat error banner), CMP-002-status-bar (session error indicator)
- **Target stores:** STR-004-chat-store, STR-002-active-session-store
- **Related events:** EVT-005-session-error (sets session error), EVT-010-chat-error (sets chat error), EVT-008-message-sent (implicitly clears chat error), EVT-002-session-selected (implicitly clears session error)
