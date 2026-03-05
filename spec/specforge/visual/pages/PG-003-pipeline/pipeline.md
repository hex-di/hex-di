# PG-003 Pipeline

**ID:** PG-003-pipeline
**Route:** `#pipeline`
**Layout:** single-column

---

## Overview

The Pipeline page provides a rich visualization of the SpecForge pipeline execution. It shows six sequential phases (Discovery, Spec Authoring, Code Analysis, Test Design, Validation, Review) as connected horizontal nodes. Each phase has a status indicator, and an overall progress bar sits at the top. Clicking a phase node reveals a detail panel below the strip.

This page requires an active session. If `STR-002.sessionId` is null, the page redirects to `#home`.

---

## ASCII Wireframe

```
+------------------------------------------------------------------------+
|                      PG-003 Pipeline (full width)                      |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  Overall Progress                                          67%   |  |
|  |  [==========================================                ] 4/6|  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-011 Phase Indicator Strip                                   |  |
|  |                                                                  |  |
|  |   [Done]---[Done]---[Done]---[ACTIVE]---[    ]---[    ]          |  |
|  |     (1)      (2)      (3)      (4)       (5)      (6)           |  |
|  |   Discov.  Spec    Code     Test       Valid.  Review            |  |
|  |   Author.  Analy.  Design                                       |  |
|  |                                                                  |  |
|  |  Legend: [Done] = green circle with checkmark                    |  |
|  |          [ACTIVE] = accent circle with pulse animation           |  |
|  |          [    ] = gray circle (pending)                          |  |
|  |          --- = connecting line (solid when both sides done,      |  |
|  |                animated flow when active)                        |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  Phase Detail Panel (for selected phase)                         |  |
|  |                                                                  |  |
|  |  Phase: Test Design                                              |  |
|  |  Status: Active                                                  |  |
|  |  Iteration: 2 of 3                                               |  |
|  |  Progress: [================            ] 65%                    |  |
|  |                                                                  |  |
|  |  Description: Generating test scenarios for the specification.   |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### No-Session State Wireframe

```
+------------------------------------------------------------------------+
|                    PG-003 Pipeline (no session)                        |
|                                                                        |
|                                                                        |
|                    No active session selected.                         |
|                                                                        |
|                  [Go to Home to select a session]                      |
|                                                                        |
|                                                                        |
+------------------------------------------------------------------------+
```

### Idle State Wireframe

```
+------------------------------------------------------------------------+
|                    PG-003 Pipeline (idle)                              |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  Overall Progress                                           0%   |  |
|  |  [                                                          ] 0/6|  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |                                                                  |  |
|  |   [    ]---[    ]---[    ]---[    ]---[    ]---[    ]            |  |
|  |     (1)      (2)      (3)      (4)      (5)      (6)           |  |
|  |   Discov.  Spec    Code     Test     Valid.  Review             |  |
|  |                                                                  |  |
|  |         No pipeline has been started for this session.           |  |
|  |         Start a conversation in Chat to begin discovery.         |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### Failed State Wireframe

```
+------------------------------------------------------------------------+
|                    PG-003 Pipeline (failed)                            |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  Overall Progress                                          50%   |  |
|  |  [===============================                          ] 3/6 |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |                                                                  |  |
|  |   [Done]---[Done]---[Done]---[FAIL]---[    ]---[    ]           |  |
|  |     (1)      (2)      (3)     (4)      (5)      (6)            |  |
|  |   Discov.  Spec    Code    Test      Valid.  Review             |  |
|  |                    Analy.  Design                               |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  Phase Detail Panel                                              |  |
|  |                                                                  |  |
|  |  Phase: Test Design                                              |  |
|  |  Status: FAILED                                                  |  |
|  |  Error: Test generation exceeded retry limit (3/3)               |  |
|  |                                                                  |  |
|  |  [Retry Phase]                                                   |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### Completed State Wireframe

```
+------------------------------------------------------------------------+
|                  PG-003 Pipeline (completed)                           |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  Overall Progress                                         100%   |  |
|  |  [==========================================================] 6/6|  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |                                                                  |  |
|  |   [Done]---[Done]---[Done]---[Done]---[Done]---[Done]           |  |
|  |     (1)      (2)      (3)      (4)      (5)      (6)           |  |
|  |   Discov.  Spec    Code     Test     Valid.  Review             |  |
|  |                                                                  |  |
|  |           Pipeline completed successfully.                       |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

---

## Component Inventory

| Component ID | Name                  | Position     | Description                                       |
| ------------ | --------------------- | ------------ | ------------------------------------------------- |
| CMP-011      | Phase Indicator Strip | Main content | Horizontal phase nodes with connectors and detail |

---

## States

### No-Session State

- **Condition:** `STR-002.sessionId === null`
- **Behavior:** All pipeline components are hidden. A centered prompt is displayed with a link to `#home`.

### Idle State

- **Condition:** `STR-005.phases.length === 0`
- **Behavior:** The overall progress bar shows 0%. All six phase nodes are rendered in the pending (gray) state. A message says: "No pipeline has been started for this session. Start a conversation in Chat to begin discovery." No detail panel is shown.

### Running State

- **Condition:** At least one phase has `status === 'active'`
- **Behavior:** Completed phases show green circle with checkmark. The active phase shows an accent-colored circle with a subtle pulse animation. Pending phases remain gray. Connecting lines between completed phases are solid accent color. The line leading into the active phase has an animated flow effect (moving dashes). The overall progress bar reflects `completedCount / phases.length`. Clicking any phase node opens its detail panel below the strip.

### Completed State

- **Condition:** `STR-005.isComplete === true`
- **Behavior:** All six phase nodes show green circles with checkmarks. All connecting lines are solid green. The overall progress bar shows 100%. A success message: "Pipeline completed successfully." may appear below the strip.

### Failed State

- **Condition:** At least one phase has `status === 'failed'`
- **Behavior:** The failed phase node shows a red circle with an "X" icon. Phases after the failed one remain pending (gray). The detail panel for the failed phase auto-opens, showing the error message. A "Retry Phase" button may be available in the detail panel.

---

## Token / Design Token Usage

| Token                    | Usage                                            |
| ------------------------ | ------------------------------------------------ |
| `--sf-bg`                | Page background                                  |
| `--sf-surface`           | Phase node background (pending), detail panel    |
| `--sf-text`              | Phase labels, detail panel text                  |
| `--sf-text-muted`        | Pending phase labels, progress text              |
| `--sf-accent`            | Active phase node, progress bar fill, flow lines |
| `--sf-accent-dim`        | Active phase background glow                     |
| `--sf-success` / #22C55E | Completed phase nodes, completed connections     |
| `--sf-error` / #FF3B3B   | Failed phase node, error text                    |
| `--sf-border`            | Connecting lines (pending state)                 |
| `--sf-font-body`         | Phase labels, detail text                        |
| `--sf-font-display`      | Overall progress percentage                      |

---

## Interaction Flow

1. **Page Guard:** On navigation to `#pipeline`, the guard checks `STR-002.sessionId`. If null, redirect to `#home`.
2. **Initial Render:** Read `STR-005.phases`. If empty, render idle state. Otherwise render the phase strip with current statuses.
3. **Phase Updates:** When `EVT-004-session-status-changed` fires, the pipeline store recalculates phase statuses. The strip re-renders with updated node states and connections.
4. **Phase Selection:** Clicking a phase node opens the detail panel for that phase, showing its name, status, iteration count, and progress.
5. **Active Phase Animation:** The active phase node pulses. The connecting line into it uses an animated dash pattern to indicate flow direction.
6. **Completion:** When all phases complete, the strip transitions to the completed state. All nodes turn green.
7. **Failure:** When a phase fails, it turns red and the detail panel auto-opens with the error. The pipeline halts at that phase.

---

## Cross-References

- **Components:** CMP-011 (phase-indicator-strip)
- **Stores:** STR-005 (pipeline-store), STR-002 (active-session-store)
- **Events:** EVT-004 (session-status-changed)
- **Guard:** Requires STR-002.sessionId to be non-null
- **Navigation:** Redirects to PG-001-home if no active session
