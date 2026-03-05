# Session Events

## Overview

Session events govern the lifecycle of agent sessions: selection, creation, status transitions, errors, bulk loading, and deletion. These events coordinate between the active session store (STR-002), the sessions list store (STR-003), and the pipeline store (STR-005) to keep the UI consistent as sessions move through their lifecycle.

---

## EVT-002-session-selected

**Trigger:** User clicks a row in CMP-005-session-table, or null is dispatched to deselect.

### Payload

| Field     | Type          | Required | Description                                        |
| --------- | ------------- | -------- | -------------------------------------------------- |
| sessionId | string / null | yes      | UUID of the selected session, or null for deselect |

### Event Flow

```
User clicks session row in CMP-005-session-table
  |
  v
dispatch EVT-002-session-selected { sessionId }
  |
  +---> [Store] STR-002-active-session-store
  |       set sessionId = payload.sessionId
  |       set status = payload.status (from session data)
  |       set pipelineMode = payload.pipelineMode
  |       clear error = null
  |
  +---> [Side Effect: navigation]
          If sessionId is non-null, dispatch EVT-001 { viewId: "chat" }
          If sessionId is null (deselect), no navigation
```

### Store Mutations

| Store                        | Field        | Operation | Value                |
| ---------------------------- | ------------ | --------- | -------------------- |
| STR-002-active-session-store | sessionId    | set       | payload.sessionId    |
| STR-002-active-session-store | status       | set       | payload.status       |
| STR-002-active-session-store | pipelineMode | set       | payload.pipelineMode |
| STR-002-active-session-store | error        | clear     | null                 |

### Side Effects

| Type       | Description                                                         |
| ---------- | ------------------------------------------------------------------- |
| navigation | Navigates to chat view when a session is selected (not on deselect) |

---

## EVT-003-session-created

**Trigger:** User submits CMP-006-new-session-form and the backend confirms creation.

### Payload

| Field   | Type   | Required | Description                      |
| ------- | ------ | -------- | -------------------------------- |
| session | object | yes      | SessionSummary shape (see below) |

**SessionSummary shape:**

```
{
  sessionId:      string       (UUID)
  packageName:    string       (target package name)
  specPath:       string       (path to the spec file)
  status:         string       (initial status, typically "active")
  createdAt:      string       (ISO-8601 timestamp)
  pipelineMode:   string       ("discovery" | "spec" | "implementation")
  lastActivityAt: string       (ISO-8601 timestamp)
}
```

### Event Flow

```
CMP-006-new-session-form submit --> backend confirms
  |
  v
dispatch EVT-003-session-created { session }
  |
  +---> [Store] STR-003-sessions-store
  |       append session to sessions[]
  |
  +---> [Store] STR-002-active-session-store
          set sessionId = session.sessionId
          set status = "active"
          set pipelineMode = session.pipelineMode
          clear error = null
```

### Store Mutations

| Store                        | Field        | Operation | Value                        |
| ---------------------------- | ------------ | --------- | ---------------------------- |
| STR-003-sessions-store       | sessions     | append    | payload.session              |
| STR-002-active-session-store | sessionId    | set       | payload.session.sessionId    |
| STR-002-active-session-store | status       | set       | "active"                     |
| STR-002-active-session-store | pipelineMode | set       | payload.session.pipelineMode |
| STR-002-active-session-store | error        | clear     | null                         |

---

## EVT-004-session-status-changed

**Trigger:** Backend pushes a status update as the session progresses through pipeline phases.

### Payload

| Field        | Type   | Required | Description                  |
| ------------ | ------ | -------- | ---------------------------- |
| sessionId    | string | yes      | UUID of the affected session |
| status       | string | yes      | New lifecycle status         |
| pipelineMode | string | yes      | Current pipeline mode        |

### Event Flow

```
Backend pushes status update via WebSocket / SSE
  |
  v
dispatch EVT-004-session-status-changed { sessionId, status, pipelineMode }
  |
  +---> [Store] STR-002-active-session-store
  |       set status = payload.status
  |
  +---> [Store] STR-005-pipeline-store
          rebuild phases[] from payload.status
          update currentPhase index
```

### Store Mutations

| Store                        | Field        | Operation | Value                       |
| ---------------------------- | ------------ | --------- | --------------------------- |
| STR-002-active-session-store | status       | set       | payload.status              |
| STR-005-pipeline-store       | phases       | set       | derived from payload.status |
| STR-005-pipeline-store       | currentPhase | set       | index of the active phase   |

---

## EVT-005-session-error

**Trigger:** Backend reports an error for the active session, or a local operation fails.

### Payload

| Field | Type   | Required | Description                  |
| ----- | ------ | -------- | ---------------------------- |
| error | string | yes      | Human-readable error message |

### Event Flow

```
Backend error / local operation failure
  |
  v
dispatch EVT-005-session-error { error }
  |
  +---> [Store] STR-002-active-session-store
          set status = "error"
          set error = payload.error
```

### Store Mutations

| Store                        | Field  | Operation | Value         |
| ---------------------------- | ------ | --------- | ------------- |
| STR-002-active-session-store | status | set       | "error"       |
| STR-002-active-session-store | error  | set       | payload.error |

---

## EVT-006-sessions-loaded

**Trigger:** Application startup or refresh triggers a fetch of all sessions from the backend.

### Payload

| Field    | Type  | Required | Description                     |
| -------- | ----- | -------- | ------------------------------- |
| sessions | array | yes      | Array of SessionSummary objects |

### Event Flow

```
App startup / manual refresh --> fetch sessions from backend
  |
  v
dispatch EVT-006-sessions-loaded { sessions }
  |
  +---> [Store] STR-003-sessions-store
          set sessions = payload.sessions
          set isLoading = false
```

### Store Mutations

| Store                  | Field     | Operation | Value            |
| ---------------------- | --------- | --------- | ---------------- |
| STR-003-sessions-store | sessions  | set       | payload.sessions |
| STR-003-sessions-store | isLoading | set       | false            |

---

## EVT-007-session-deleted

**Trigger:** User deletes a session from the session table and the backend confirms deletion.

### Payload

| Field     | Type   | Required | Description                 |
| --------- | ------ | -------- | --------------------------- |
| sessionId | string | yes      | UUID of the deleted session |

### Event Flow

```
User confirms delete action --> backend confirms
  |
  v
dispatch EVT-007-session-deleted { sessionId }
  |
  +---> [Store] STR-003-sessions-store
  |       remove session where sessionId matches
  |
  +---> [Store] STR-002-active-session-store
          if deleted session is the active session:
            set sessionId = null
            set status = "idle"
            set pipelineMode = null
            clear error = null
```

### Store Mutations

| Store                        | Field        | Operation | Value                                  |
| ---------------------------- | ------------ | --------- | -------------------------------------- |
| STR-003-sessions-store       | sessions     | remove    | item.sessionId === payload.sessionId   |
| STR-002-active-session-store | sessionId    | set       | null (if active session was deleted)   |
| STR-002-active-session-store | status       | set       | "idle" (if active session was deleted) |
| STR-002-active-session-store | pipelineMode | set       | null (if active session was deleted)   |
| STR-002-active-session-store | error        | clear     | null (if active session was deleted)   |

---

## Design Rationale

1. **Selection clears errors:** Both EVT-002 and EVT-003 clear the error field in the active session store. Switching sessions should always start with a clean state, preventing stale error messages from a previous session leaking into the new one.

2. **Session list is append/remove only:** The sessions store (STR-003) treats the list as a simple collection. Created sessions are appended, deleted sessions are removed. There is no in-place mutation of session objects in the list -- status changes flow through STR-002 and STR-005 for the active session only.

3. **Deletion conditionally resets active session:** EVT-007 only resets STR-002 when the deleted session matches the currently active session. If a non-active session is deleted, the active session store remains untouched.

4. **Pipeline store derives from status:** EVT-004 feeds both the active session store (simple status field) and the pipeline store (derived phase array). This dual-write ensures the pipeline indicator strip and the status bar stay synchronized.

5. **Navigation as a side effect:** EVT-002 triggers navigation to the chat view, but this is a side effect, not a store mutation. The store update completes first, then the navigation fires. This prevents circular dependencies between the router store and the session store.

---

## Cross-References

- **Source components:** CMP-005-session-table, CMP-006-new-session-form
- **Target stores:** STR-002-active-session-store, STR-003-sessions-store, STR-005-pipeline-store
- **Related events:** EVT-001-view-changed (chained from EVT-002 side effect)
