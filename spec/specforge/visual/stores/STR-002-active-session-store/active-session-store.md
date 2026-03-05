# STR-002 Active Session Store

## Overview

The Active Session Store tracks which session the user is currently working with. It holds the session identity, its lifecycle status, the pipeline mode, and any error that has occurred. This is the central coordination point that many components read to determine what content to display.

## State Shape

```
ActiveSessionState
+--------------------------------------------------------------+
| sessionId    | string | null                                 |
|              | The UUID of the currently selected session    |
+--------------+----------------------------------------------+
| status       | "idle" | "active" | "discovery" |            |
|              | "spec-generation" | "implementation" |        |
|              | "completed" | "error"                         |
|              | Lifecycle status of the active session        |
+--------------+----------------------------------------------+
| pipelineMode | "discovery" | "spec" | "implementation" |     |
|              | null                                          |
|              | The pipeline mode the session was started with |
+--------------+----------------------------------------------+
| error        | string | null                                 |
|              | Error message if the session entered error    |
|              | state                                         |
+--------------------------------------------------------------+
```

## Selectors

| Selector          | Signature       | Description                                                                                    |
| ----------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| `isSessionActive` | `() => boolean` | Returns `true` when a session is selected and its status is neither `idle` nor `error`.        |
| `hasError`        | `() => boolean` | Returns `true` when the `error` field is non-null, signaling the UI should render error state. |

## Event Flow

| Event                            | Fields Affected                        | Description                                                              |
| -------------------------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| `EVT-002-session-selected`       | sessionId, status, pipelineMode, error | User picks an existing session from the session table. Error is cleared. |
| `EVT-003-session-created`        | sessionId, status, pipelineMode, error | A new session is created. Status becomes `active`, error is cleared.     |
| `EVT-004-session-status-changed` | status                                 | The session progresses through pipeline phases or completes.             |
| `EVT-005-session-error`          | status, error                          | An error occurs. Status is forced to `error` and the message is stored.  |

## Design Rationale

- **Single active session**: The application supports one active session at a time. This simplifies data flow significantly -- downstream components subscribe to one store rather than multiplexing across sessions.
- **Error as first-class state**: Rather than using a separate error store, the error is co-located with the session it belongs to. When `EVT-005-session-error` fires, the status automatically transitions to `error`, keeping the two fields consistent.
- **Clearing on selection/creation**: Both `EVT-002` and `EVT-003` clear the error field, ensuring that switching to a new or different session starts with a clean slate.
- **No persistence**: The active session is ephemeral per browser tab. Reloading starts from idle, and the user picks a session from the list.
