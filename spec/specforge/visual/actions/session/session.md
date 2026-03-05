# Session Actions

**IDs:** ACT-006 through ACT-010
**Context:** Session lifecycle management -- selecting, creating, resuming, deselecting, and deleting sessions from the home view.

---

## Action Flow Diagrams

### ACT-006 Select Session

```
  User clicks session row
         |
         v
  ELM-022-session-table-row (click)
         |
         v
  ACT-006-select-session
         |
         v
  EVT-002-session-selected { sessionId }
         |
         +---> STR-002-active-session-store (activeSession = session)
         +---> STR-014-router-store (currentView = "chat")
         +---> Chat view panel mounts with session context
         +---> Status bar updates (ELM-005 dot, ELM-006 id, ELM-007 status)
```

### ACT-007 Deselect Session

```
  Programmatic trigger (navigate away / session deleted)
         |
         v
  ACT-007-deselect-session
         |
         v
  EVT-002-session-selected { sessionId: null }
         |
         +---> STR-002-active-session-store (activeSession = null)
         +---> STR-014-router-store (currentView = "home")
         +---> Chat view panel unmounts
         +---> Status bar shows idle state
```

### ACT-008 Create Session

```
  User fills in form and clicks submit
         |
         v
  ELM-026-new-session-submit-button (click)
         |
         v
  [preconditions: packageName non-empty, specPath non-empty]
         |
         v
  ACT-008-create-session
         |
         v
  EVT-003-session-created { session }
         |
         +---> STR-003-sessions-store (sessions list appended)
         +---> CMP-006-new-session-form fields cleared
         +---> ACT-006-select-session triggered for new session
         +---> User navigated to chat view with new session
```

### ACT-009 Resume Session

```
  User clicks resume button on a paused session row
         |
         v
  ELM-028-session-resume-button (click)
         |
         v
  [precondition: session.status === "paused"]
         |
         v
  ACT-009-resume-session
         |
         v
  EVT-004-session-status-changed { sessionId, status: "running" }
         |
         +---> STR-003-sessions-store (session status updated)
         +---> STR-002-active-session-store (status updated if active)
         +---> ELM-023-session-status-badge re-renders
         +---> ELM-028-session-resume-button hides (status no longer "paused")
```

### ACT-010 Delete Session

```
  User clicks delete button on a session row
         |
         v
  ELM-027-session-delete-button (click)
         |
         v
  [confirmation dialog: "Are you sure?"]
         |
     yes / no
     /        \
    v          v
  ACT-010     (abort)
  delete-session
         |
         v
  EVT-007-session-deleted { sessionId }
         |
         +---> STR-003-sessions-store (session removed)
         +---> If active session was deleted:
         |       +---> ACT-007-deselect-session
         |       +---> Navigate to home
         +---> Session table re-renders (row removed)
```

## Action Summary

| ID      | Name             | Type        | Trigger       | Preconditions                    | Event Dispatched                |
| ------- | ---------------- | ----------- | ------------- | -------------------------------- | ------------------------------- |
| ACT-006 | Select Session   | list-select | ELM-022 click | --                               | EVT-002-session-selected        |
| ACT-007 | Deselect Session | list-select | programmatic  | --                               | EVT-002-session-selected (null) |
| ACT-008 | Create Session   | form-submit | ELM-026 click | packageName + specPath non-empty | EVT-003-session-created         |
| ACT-009 | Resume Session   | data-update | ELM-028 click | session.status === "paused"      | EVT-004-session-status-changed  |
| ACT-010 | Delete Session   | data-delete | ELM-027 click | confirmation dialog              | EVT-007-session-deleted         |

## Cross-References

- **Element:** ELM-022-session-table-row (ACT-006 trigger)
- **Element:** ELM-026-new-session-submit-button (ACT-008 trigger)
- **Element:** ELM-027-session-delete-button (ACT-010 trigger)
- **Element:** ELM-028-session-resume-button (ACT-009 trigger)
- **Store:** STR-002-active-session-store (ACT-006, ACT-007, ACT-009, ACT-010)
- **Store:** STR-003-sessions-store (ACT-008, ACT-009, ACT-010)
- **Component:** CMP-005-session-table (contains trigger elements)
- **Component:** CMP-006-new-session-form (ACT-008 form container)
