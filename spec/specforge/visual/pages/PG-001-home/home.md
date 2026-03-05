# PG-001 Home

**ID:** PG-001-home
**Route:** `#home` (default view)
**Layout:** single-column

---

## Overview

The Home page is the default landing view for SpecForge. It provides session management -- listing all sessions in a filterable, sortable table with an inline form to create new sessions. When no sessions exist, the page displays a welcome state that encourages the user to create their first session.

The page route is `#home` and requires no guard (no active session needed).

---

## ASCII Wireframe

```
+------------------------------------------------------------------------+
|                        PG-001 Home (full width)                        |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-004 Filter Bar                                              |  |
|  |  +----------+ +---------------+ +------------------+ +--------+  |  |
|  |  | Status v | | Pipeline Mode | | Search sessions  | | Sort v |  |  |
|  |  |   all    | |     all       | | [______________] | | last.. |  |  |
|  |  +----------+ +---------------+ +------------------+ +--------+  |  |
|  |                                                                  |  |
|  |  [Active Filter Chips: status:running  x | mode:spec  x ]       |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-006 New Session Form                                        |  |
|  |  +-------------------+ +-------------------+ +----------------+  |  |
|  |  | Package name      | | Spec path         | | Create Session |  |  |
|  |  | [_______________] | | [_______________] | | [   Submit   ] |  |  |
|  |  +-------------------+ +-------------------+ +----------------+  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-005 Session Table                                           |  |
|  |  +--------------------------------------------------------------+|  |
|  |  | Package   | Spec Path  | Status  | Mode | Last Activity |Act ||  |
|  |  |-----------|------------|---------|------|---------------|----||  |
|  |  | @hex/core | spec/auth  | running | spec | 2 min ago     | x  ||  |
|  |  | @hex/flow | spec/flow  | paused  | full | 1 hr ago      |R x ||  |
|  |  | @hex/saga | spec/saga  | done    | spec | 3 days ago    | x  ||  |
|  |  | @hex/guard| spec/guard | failed  | full | 5 min ago     | x  ||  |
|  |  |           |            |         |      |               |    ||  |
|  |  |           |            |         |      |               |    ||  |
|  |  +--------------------------------------------------------------+|  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### Empty State Wireframe

```
+------------------------------------------------------------------------+
|                        PG-001 Home (empty)                             |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |                                                                  |  |
|  |                     Welcome to SpecForge                         |  |
|  |                                                                  |  |
|  |            Create your first session to get started.             |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-006 New Session Form                                        |  |
|  |  +-------------------+ +-------------------+ +----------------+  |  |
|  |  | Package name      | | Spec path         | | Create Session |  |  |
|  |  | [_______________] | | [_______________] | | [   Submit   ] |  |  |
|  |  +-------------------+ +-------------------+ +----------------+  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |                                                                  |  |
|  |           No sessions found. Create one to get started.          |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### Loading State Wireframe

```
+------------------------------------------------------------------------+
|                        PG-001 Home (loading)                           |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-004 Filter Bar (disabled during load)                       |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-006 New Session Form                                        |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-005 Session Table (skeleton)                                |  |
|  |  +--------------------------------------------------------------+|  |
|  |  | Package   | Spec Path  | Status  | Mode | Last Activity |Act ||  |
|  |  |-----------|------------|---------|------|---------------|----||  |
|  |  | xxxxxxxx  | xxxxxxxxx  | xxxxx   | xxxx | xxxxxxxxxxx   |    ||  |
|  |  | xxxxxxxx  | xxxxxxxxx  | xxxxx   | xxxx | xxxxxxxxxxx   |    ||  |
|  |  | xxxxxxxx  | xxxxxxxxx  | xxxxx   | xxxx | xxxxxxxxxxx   |    ||  |
|  |  +--------------------------------------------------------------+|  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

---

## Component Inventory

| Component ID | Name             | Position         | Description                                    |
| ------------ | ---------------- | ---------------- | ---------------------------------------------- |
| CMP-004      | Filter Bar       | Top              | Status, pipeline mode, search, sort controls   |
| CMP-006      | New Session Form | Below filter bar | Inline form: package name + spec path + submit |
| CMP-005      | Session Table    | Main content     | Sortable, filterable table of all sessions     |

---

## States

### Empty State

- **Condition:** `sessions.length === 0` and `isLoading === false`
- **Behavior:** Filter bar is hidden. A centered welcome message is displayed: "Welcome to SpecForge / Create your first session to get started." The new session form is shown. Below the form, the session table shows its empty state text.

### Loading State

- **Condition:** `isLoading === true`
- **Behavior:** Filter bar controls are disabled (grayed out). The new session form is still interactive. The session table renders 3-5 skeleton rows with pulsing placeholder blocks for each column.

### Error State

- **Condition:** `error !== null`
- **Behavior:** An error banner appears between the filter bar and the new session form. The banner has a `--sf-error` left border, displays the error message, and includes a dismiss action. The session table may still show stale data if previously populated.

### Populated State

- **Condition:** `sessions.length > 0` and `isLoading === false`
- **Behavior:** All components are fully interactive. The filter bar applies filters to STR-001 home slice. The session table reflects the filtered, sorted session list from STR-003. Clicking a row triggers ACT-006-select-session and navigates to the Chat view.

---

## Token / Design Token Usage

| Token               | Usage                                         |
| ------------------- | --------------------------------------------- |
| `--sf-bg`           | Page background                               |
| `--sf-surface`      | Session table row background, form background |
| `--sf-text`         | Primary text (package name, column headers)   |
| `--sf-text-muted`   | Secondary text (spec path, timestamps)        |
| `--sf-accent`       | Active status badge, submit button background |
| `--sf-accent-dim`   | Filter chip background, resume button bg      |
| `--sf-error`        | Error banner border, failed status badge      |
| `--sf-warning`      | Paused status badge color                     |
| `--sf-border`       | Row separator lines                           |
| `--sf-font-body`    | All text in the page                          |
| `--sf-font-display` | Welcome heading in empty state                |

---

## Interaction Flow

1. **Page Load:** On mount, if `STR-003.sessions` is empty, dispatch `EVT-006-sessions-loaded` to fetch sessions. Show loading state.
2. **Filter Interaction:** Changing any filter dispatches `EVT-018-filter-changed` with `{ view: "home", key, value }`. The filter bar updates active chips. Session table re-renders with filtered data.
3. **Create Session:** User fills package name and spec path in CMP-006, clicks "Create Session". Dispatches `ACT-008-create-session`. On success, `EVT-003-session-created` appends the session to STR-003 and sets it as active in STR-002. The view navigates to Chat.
4. **Select Session:** Clicking a session row dispatches `ACT-006-select-session` with the sessionId. STR-002 updates. The view navigates to Chat.
5. **Resume Session:** Clicking the resume button on a paused session dispatches `ACT-009-resume-session`. The session status changes to active.
6. **Delete Session:** Clicking the delete button shows a confirmation dialog. On confirm, dispatches `ACT-010-delete-session`. The session is removed from STR-003 via `EVT-007-session-deleted`. If it was the active session in STR-002, the active session is cleared.
7. **Sort Interaction:** Changing the sort dropdown dispatches `EVT-018-filter-changed` with `{ view: "home", key: "sort", value }`. Session table re-sorts.

---

## Cross-References

- **Components:** CMP-004 (filter-bar), CMP-005 (session-table), CMP-006 (new-session-form)
- **Stores:** STR-001 (filter-store, home slice), STR-002 (active-session-store), STR-003 (sessions-store)
- **Actions:** ACT-006 (select-session), ACT-008 (create-session), ACT-009 (resume-session), ACT-010 (delete-session)
- **Events:** EVT-003, EVT-006, EVT-007, EVT-018
- **Navigation:** Selecting or creating a session navigates to PG-002-chat
