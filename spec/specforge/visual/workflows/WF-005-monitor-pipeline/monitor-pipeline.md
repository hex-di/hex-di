# WF-005: Monitor Pipeline

## Overview

The Monitor Pipeline workflow describes how users observe the progress of a session's pipeline through its phases. The user navigates between the Pipeline view (the authoritative progress tracker) and the detail views (ACP Session, Spec Viewer, Task Board, Coverage Dashboard) to inspect the work being produced at each phase. This workflow represents the read-heavy, observational portion of the session lifecycle.

---

## Journey Map

### Step 1 -- Navigate to Pipeline View

The user clicks the Pipeline nav item (or arrives from session selection). EVT-001-view-changed dispatches with `viewId: "pipeline"`. The Pipeline view (PG-003) renders with the phase indicator strip (CMP-011).

### Step 2 -- See Phase Overview

The phase indicator strip displays all pipeline phases in order. Each phase shows its name and status. The pipeline store (STR-005) provides the phase array and the current phase index.

### Step 3 -- Observe Active Phase Animation

The active phase is visually prominent:

- **Pending phases:** Muted text (#586E85), no animation
- **Active phase:** Cyan text (#00F0FF) with a pulsing glow animation
- **Completed phases:** Green text (#22C55E) with a checkmark icon
- **Failed phases:** Red text (#FF3B3B) with an error icon

### Step 4 -- Watch Pipeline Progression

As the backend processes each phase, EVT-004-session-status-changed fires. The pipeline store rebuilds the phase array. The UI updates in real-time:

- The previously active phase transitions to "completed" (green checkmark)
- The next phase transitions to "active" (cyan pulse)
- The progress selector (`completedCount / phases.length`) increases

**Decision Point:** If a phase fails, it transitions to "failed" (red). The pipeline halts. No subsequent phases become active.

### Step 5 -- Tab to ACP Session

The user navigates to PG-007-acp-session to observe agent-to-agent communication happening during the active phase. The ACP session messages store (STR-009) contains messages from various agents (orchestrator, analyst, writer, reviewer, architect). Messages are colored by severity:

- Critical: #FF3B3B
- Major: #FF8C00
- Minor: #FFD600
- Observation: #4FC3F7

The user can filter by agent role, message type, and phase to focus on relevant communications.

### Step 6 -- Tab to Spec Viewer

The user navigates to PG-004-spec-viewer to review the specification content being generated. The spec content store (STR-006) provides the markdown content. Changed sections (identified by EVT-015) are highlighted so the user can see what the agents modified recently.

### Step 7 -- Tab to Task Board

The user navigates to PG-005-task-board to check the tasks extracted from the specification. The task board store (STR-007) provides task groups with their statuses. The kanban board (CMP-013) shows groups in columns: pending, in-progress, completed, blocked. The DAG list (CMP-014) shows dependency relationships between task groups.

### Step 8 -- Tab to Coverage Dashboard

The user navigates to PG-006-coverage-dashboard to check implementation coverage progress. The coverage store (STR-008) provides file-level coverage data. The coverage file list (CMP-015) shows each file's coverage percentage and status. The user can identify gaps (files that need implementation or tests).

### Step 9 -- Return to Pipeline

The user returns to PG-003-pipeline to check overall progress. If all phases are completed, the progress is 100% and the `isComplete` selector returns true.

---

## ASCII Flow Diagram

```
                    +-------------------+
                    | PG-003 Pipeline   |
                    | CMP-011 Phase     |
                    | Indicator Strip   |
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
      [Phase: pending]  [Phase: active] [Phase: completed]
       #586E85 muted    #00F0FF pulse   #22C55E check
                             |
                    EVT-004 status-changed
                             |
              +--------------+--------------+-----------+
              |              |              |           |
              v              v              v           v
      PG-007          PG-004        PG-005       PG-006
      ACP Session      Spec          Tasks        Coverage
      +-----------+  +-----------+ +-----------+ +-----------+
      | STR-009   |  | STR-006   | | STR-007   | | STR-008   |
      | Messages  |  | Content   | | Groups    | | Files     |
      | by phase  |  | Sections  | | Kanban    | | Coverage  |
      | by agent  |  | Changes   | | DAG       | | Gaps      |
      +-----------+  +-----------+ +-----------+ +-----------+
              |              |              |           |
              +--------------+--------------+-----------+
                             |
                             v
                    +-------------------+
                    | PG-003 Pipeline   |
                    | All phases done?  |
                    +--------+----------+
                             |
                    +--------+--------+
                    |                 |
                    v                 v
              [All complete]    [Phase failed]
              isComplete=true   pipeline halted
              progress=100%     failed phase red
```

---

## Observation Pattern

The monitoring workflow follows a cyclical tab-through pattern. The user uses the Pipeline view as the anchor and tabs through detail views to inspect different facets of the work:

```
     +----------+
     | Pipeline |<---+
     | (anchor) |    |
     +----+-----+    |
          |          |
          v          |
     +----------+    |
     |ACP Session|    |
     +----+-----+    |
          |          |
          v          |
     +----------+    |
     |   Spec   |    |
     +----+-----+    |
          |          |
          v          |
     +----------+    |
     |  Tasks   |    |
     +----+-----+    |
          |          |
          v          |
     +----------+    |
     | Coverage +----+
     +----------+
```

This cycle repeats as new phases become active and produce new content. The user does not need to follow this exact order; they can skip to any view at any time. The nav rail provides direct access to all views.

---

## State Transitions Across Stores

### STR-005 (Pipeline Store)

```
Initial (no session):
  phases: [], currentPhase: -1

Session selected (discovery mode):
  phases: [
    { name: "discovery",       status: "active" },
    { name: "spec-generation", status: "pending" },
    { name: "implementation",  status: "pending" }
  ]
  currentPhase: 0

Discovery completes:
  phases: [
    { name: "discovery",       status: "completed" },
    { name: "spec-generation", status: "active" },
    { name: "implementation",  status: "pending" }
  ]
  currentPhase: 1

Spec generation completes:
  phases: [
    { name: "discovery",       status: "completed" },
    { name: "spec-generation", status: "completed" },
    { name: "implementation",  status: "active" }
  ]
  currentPhase: 2

All complete:
  phases: [
    { name: "discovery",       status: "completed" },
    { name: "spec-generation", status: "completed" },
    { name: "implementation",  status: "completed" }
  ]
  currentPhase: -1
  isComplete: true
  progress: 1.0

Phase failure:
  phases: [
    { name: "discovery",       status: "completed" },
    { name: "spec-generation", status: "failed" },
    { name: "implementation",  status: "pending" }
  ]
  currentPhase: -1 (no active phase)
```

### STR-006 (Spec Content Store)

```
Empty -> EVT-014 (content loaded) -> content populated
       -> EVT-015 (section changed) -> changedSections accumulates
       -> EVT-016 (content updated) -> content refreshed
       -> EVT-017 (changes acknowledged) -> changedSections cleared
```

### STR-007 (Task Board Store)

```
Empty -> EVT-021 (groups loaded) -> groups populated
       -> EVT-022 (group status changed) -> individual group status updates
       -> EVT-023 (group updated) -> individual group data refreshes
```

### STR-008 (Coverage Store)

```
Empty -> EVT-024 (coverage loaded) -> files populated
       -> EVT-025 (file updated) -> individual file coverage updates
```

### STR-009 (ACP Session Store)

```
Empty -> EVT-015 (messages loaded) -> messages populated
       -> EVT-014 (message received) -> new message appended
       -> EVT-016 (message dismissed) -> message removed
```

---

## Phase Visual States

| Status    | Text Color        | Background           | Icon           | Animation  |
| --------- | ----------------- | -------------------- | -------------- | ---------- |
| pending   | #586E85 (muted)   | transparent          | circle outline | none       |
| active    | #00F0FF (accent)  | rgba(0,240,255,0.15) | circle filled  | pulse glow |
| completed | #22C55E (success) | transparent          | checkmark      | none       |
| failed    | #FF3B3B (error)   | transparent          | x-circle       | none       |

---

## Key Decision Points and Branches

| Step | Condition         | Branch A                                    | Branch B                              |
| ---- | ----------------- | ------------------------------------------- | ------------------------------------- |
| 3    | Phase status      | Pending/Active/Completed renders normally   | Failed renders red and halts pipeline |
| 4    | Phase transition  | Success: next phase activates               | Failure: pipeline halts               |
| 5-8  | User navigation   | User can visit any detail view in any order | User can skip views entirely          |
| 9    | Pipeline complete | All green: session complete                 | Red present: user sees failure state  |

---

## Design Rationale

1. **Pipeline as the anchor:** The Pipeline view provides a single-glance overview of progress. It is intentionally sparse -- just phase names and statuses -- so the user can assess progress in under a second.

2. **Tab-through observation:** The detail views (ACP Session, Spec, Tasks, Coverage) provide depth. The user tabs to whichever facet they care about. This avoids cramming all information into a single dense dashboard.

3. **Real-time phase updates:** EVT-004 fires as the backend advances phases. The pipeline store rebuilds its array on each event, ensuring the UI is always current. There is no polling.

4. **ACP Session as the communication window:** The ACP Session gives transparency into agent-to-agent reasoning. This is particularly valuable during the active phase when the user wants to understand what the agents are doing and why.

5. **Changed section highlighting:** The Spec Viewer highlights changed sections rather than requiring the user to diff manually. This makes it easy to see what the current phase modified.

---

## Cross-References

- **Parent workflow:** WF-001-session-lifecycle (steps 8-9)
- **Related workflows:** WF-004 (filtering applies to ACP session/tasks/coverage), WF-006 (cost monitoring during pipeline)
- **Stores:** STR-005 (pipeline), STR-006 (spec), STR-007 (tasks), STR-008 (coverage), STR-009 (ACP session)
- **Components:** CMP-011 (phase indicator strip), CMP-012 (markdown section renderer), CMP-013 (kanban board), CMP-014 (DAG list), CMP-015 (coverage file list), CMP-016 (message entry list)
- **Events:** EVT-001, EVT-004, EVT-014 through EVT-017
