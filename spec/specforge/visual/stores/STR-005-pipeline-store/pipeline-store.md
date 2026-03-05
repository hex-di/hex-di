# STR-005 Pipeline Store

## Overview

The Pipeline Store tracks the progress of the pipeline execution for the active session. It maintains an ordered list of phase descriptors and a pointer to the currently active phase. The store is derived from session status change events -- when the session transitions, the phase array is rebuilt to reflect which phases are pending, active, completed, or failed.

## State Shape

```
PipelineState
+--------------------------------------------------------------+
| phases       | PhaseProgress[]                                |
|              | Ordered list of pipeline phases with status     |
+--------------+----------------------------------------------+
| currentPhase | number                                         |
|              | Index into phases for the active phase,         |
|              | -1 when no phase is active                      |
+--------------------------------------------------------------+

PhaseProgress
+--------------------------------------------------------------+
| name   | string                                              |
|        | Human-readable phase name (e.g. "Discovery",       |
|        | "Spec Generation", "Implementation")                |
+--------+----------------------------------------------------+
| status | "pending" | "active" | "completed" | "failed"       |
|        | Lifecycle status of this individual phase           |
+--------------------------------------------------------------+
```

### Phase Derivation Logic

When `EVT-004-session-status-changed` fires, the phases array is rebuilt based on the session's pipeline mode and new status:

```
Pipeline Mode: "discovery"
  Phases: [Discovery]

Pipeline Mode: "spec"
  Phases: [Discovery, Spec Generation]

Pipeline Mode: "implementation"
  Phases: [Discovery, Spec Generation, Implementation]

Status Mapping:
  "discovery"       -> Discovery=active,   rest=pending
  "spec-generation" -> Discovery=completed, Spec Generation=active, rest=pending
  "implementation"  -> Discovery=completed, Spec Generation=completed, Implementation=active
  "completed"       -> all=completed
  "error"           -> current phase=failed, prior=completed, rest=pending
```

## Selectors

| Selector         | Signature            | Description                                                                                 |
| ---------------- | -------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `activePhase`    | `() => PhaseProgress | null`                                                                                       | Returns the phase at `currentPhase` index, or `null` when `currentPhase` is -1. |
| `completedCount` | `() => number`       | Counts phases with `status === 'completed'`.                                                |
| `progress`       | `() => number`       | Returns `completedCount / phases.length` as a 0-1 fraction. Returns 0 when phases is empty. |
| `isComplete`     | `() => boolean`      | Returns `true` when all phases exist and every phase has `status === 'completed'`.          |

## Event Flow

| Event                            | Fields Affected      | Description                                                                                         |
| -------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| `EVT-004-session-status-changed` | phases, currentPhase | Triggers full re-derivation of the phase array based on the session's new status and pipeline mode. |

## Design Rationale

- **Derived, not directly mutated**: The phase array is rebuilt entirely from the session status rather than incrementally mutated. This eliminates ordering bugs and ensures the phase display is always consistent with the session state.
- **Single event source**: Unlike most stores that handle multiple events, the pipeline store listens only to `EVT-004`. This reflects the fact that pipeline progress is a pure projection of session status.
- **Pipeline mode awareness**: The number and names of phases depend on the pipeline mode stored in `STR-002-active-session-store`. A discovery-only session shows one phase; a full implementation session shows three.
- **currentPhase as index**: Using a numeric index rather than a phase name allows the phase-indicator-strip component to highlight the correct step without string matching.
