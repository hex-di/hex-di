# WF-001: Session Lifecycle

## Overview

The Session Lifecycle is the primary workflow of the SpecForge application. It traces the complete journey from a user's first arrival through session creation, discovery, pipeline execution, and session completion. This workflow references all 11 pages and serves as the backbone that every other workflow plugs into.

---

## Journey Map

### Step 1 -- Landing Page

The user opens the application URL. The landing page (PG-011) renders with the hero section, feature grid, how-it-works flow, CLI demo terminal, and CTA section. The user clicks "Get Started" or navigates to the app shell.

### Step 2 -- Home View (Session Table)

The app shell (PG-010) loads with the nav rail, status bar, and the Home view (PG-001) as the default content area. The sessions store (STR-003) dispatches a load request. While loading, skeleton rows appear. Once EVT-006 fires, the session table populates.

**Decision Point:** If `sessions.length === 0`, the Home view renders an empty-state welcome message with the create form prominently displayed. Otherwise, the full filter bar (CMP-004), create form (CMP-006), and session table (CMP-005) render.

### Step 3 -- Create Session

The user fills the new session form: package name, spec path, and pipeline mode (discovery / spec / implementation). On submit, ACT-008 fires, which dispatches EVT-003-session-created. The sessions store appends the new session, and the active session store sets the new session as active.

### Step 4 -- Session Appears in Table

The session table re-renders with the new row. The row shows the session's package name, spec path, pipeline mode badge, status badge ("active"), and creation timestamp. The new row may briefly highlight with an accent glow to draw attention.

### Step 5 -- Select Session

The user clicks a session row. ACT-006 fires, dispatching EVT-002-session-selected. The active session store (STR-002) updates with the selected session's ID, status, and pipeline mode.

**Decision Point:** Based on the session status:

- **idle / paused:** ACT-009 (resume) may be offered as a secondary action
- **active:** Direct navigation to Chat view
- **completed:** Navigation to Spec Viewer or Pipeline summary
- **error:** Navigation to Chat with error details visible

### Step 6 -- Navigate to Chat

EVT-001-view-changed dispatches with `viewId: "chat"`. The router store (STR-014) updates, the nav rail highlights the Chat icon, and PG-002-chat renders in the main content area.

### Step 7 -- Discovery Conversation

The user begins the discovery conversation (detailed in WF-002). As messages are exchanged, EVT-004-session-status-changed fires to advance the session through statuses: `discovery` -> `spec-generation` -> `implementation`.

**Decision Point:** If the agent encounters an error, EVT-005 dispatches, setting the session status to "error" and populating the error field in STR-002.

### Step 8 -- Monitor Pipeline

The user navigates to the Pipeline view (PG-003) to observe phase progress. The phase indicator strip (CMP-011) shows each phase with its status (pending / active / completed / failed). The active phase animates with a cyan pulse.

### Step 9 -- Pipeline Progression

As the backend processes each phase, EVT-004 fires repeatedly. The pipeline store (STR-005) rebuilds its phase array. Completed phases turn green, the active phase pulses cyan, and pending phases remain muted. The user can also check:

- **PG-004 Spec Viewer:** Review generated specification content
- **PG-005 Task Board:** See tasks extracted from the spec
- **PG-006 Coverage Dashboard:** Track implementation coverage
- **PG-007 ACP Session:** Observe agent-to-agent communication
- **PG-008 Cost Tracker:** Monitor token usage and budget
- **PG-009 Graph Explorer:** Inspect the dependency graph

### Step 10 -- Session Completes

When all phases complete, the session status becomes "completed." The Home view session table reflects this. The user can revisit the session at any time to review outputs.

---

## ASCII Flow Diagram

```
+------------------+
| PG-011 Landing   |
| "Get Started"    |
+--------+---------+
         |
         v
+------------------+       +---------------------+
| PG-001 Home      |<------| PG-010 App Shell    |
| Session Table    |       | (wraps all views)   |
+--------+---------+       +---------------------+
         |
    +----+----+
    |         |
    v         v
 [empty]   [populated]
    |         |
    v         v
 CMP-006   CMP-005
 Create    Session
 Form      Table
    |         |
    +----+----+
         |
         v  ACT-008 (create) or ACT-006 (select)
         |
+--------+---------+
| EVT-003 created  |     EVT-002 selected
| EVT-002 selected |--+
+--------+---------+  |
         |            |
         v            v
+------------------+     +-----------------+
| PG-002 Chat      |     | PG-003 Pipeline |
| Discovery        |<--->| Phase Monitor   |
+--------+---------+     +--------+--------+
         |                        |
         v                        v
  EVT-004 status-changed   Phase progression
         |                   pending -> active
         |                   active -> completed
         v
+--------+---------+
| Session complete |
| status: completed|
+------------------+
         |
    +----+----+----+----+----+
    |    |    |    |    |    |
    v    v    v    v    v    v
 PG-004 PG-005 PG-006 PG-007 PG-008 PG-009
 Spec   Tasks  Cover  Board  Costs  Graph
```

---

## State Transitions Across Stores

### STR-002 (Active Session Store)

```
null (no session)
  --> EVT-002 --> { sessionId, status, pipelineMode }
  --> EVT-003 --> { sessionId, status: "active", pipelineMode }
  --> EVT-004 --> { status: <new status> }
  --> EVT-005 --> { status: "error", error: <message> }
```

### STR-003 (Sessions Store)

```
sessions: []
  --> EVT-006 --> sessions: [loaded sessions]
  --> EVT-003 --> sessions: [..., new session]
  --> EVT-007 --> sessions: [filtered without deleted]
```

### STR-005 (Pipeline Store)

```
phases: [], currentPhase: -1
  --> EVT-004 --> phases: [rebuilt from status], currentPhase: <active index>
```

### STR-014 (Router Store)

```
currentView: "home"
  --> EVT-001 { viewId: "chat" }     --> currentView: "chat"
  --> EVT-001 { viewId: "pipeline" } --> currentView: "pipeline"
  --> EVT-001 { viewId: "home" }     --> currentView: "home"
```

---

## Key Decision Points and Branches

| Step | Condition               | Branch A                     | Branch B                           | Branch C                    |
| ---- | ----------------------- | ---------------------------- | ---------------------------------- | --------------------------- |
| 2    | `sessions.length === 0` | Empty state with create form | Populated table                    | --                          |
| 5    | `session.status`        | idle/paused: offer resume    | active: navigate to chat           | completed: navigate to spec |
| 7    | Discovery outcome       | Success: pipeline advances   | Error: session enters error state  | --                          |
| 9    | Phase completion        | All complete: session done   | Phase fails: session enters failed | Pending: wait               |

---

## Design Rationale

1. **Single entry point:** All sessions funnel through the Home view. This centralizes session management and gives the user a dashboard they can always return to.

2. **Selection-then-navigation pattern:** The user first selects a session (updating STR-002), then navigates to a detail view. This ensures every detail view knows which session it is operating on without prop-drilling or URL-based session resolution.

3. **Pipeline as a spine:** The pipeline phases provide a natural progress indicator. Users can check any detail view (spec, tasks, coverage, ACP session) at any time, but the pipeline view serves as the authoritative progress tracker.

4. **Error recovery via chat:** When a session errors, the user returns to the Chat view where the error context is visible. This avoids dead-end error screens and keeps the user in a conversational recovery flow.

5. **All 11 pages referenced:** This workflow is the root workflow. It references PG-001 through PG-011 because the session lifecycle touches every page in the application. Other workflows (WF-002 through WF-006) are sub-journeys that focus on specific portions of this lifecycle.

---

## Cross-References

- **Sub-workflows:** WF-002 (discovery conversation), WF-003 (search and navigate), WF-004 (filter/refine/observe), WF-005 (monitor pipeline), WF-006 (cost investigation)
- **Stores:** STR-002, STR-003, STR-005, STR-014
- **Actions:** ACT-001, ACT-006, ACT-008, ACT-009, ACT-010
- **Events:** EVT-001 through EVT-007
- **Pages:** PG-001 through PG-011
