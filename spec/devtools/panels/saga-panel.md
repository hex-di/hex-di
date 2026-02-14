# Saga Panel -- Pipeline Visualization

**Module**: `@hex-di/saga/devtools`
**Inspiration**: Temporal UI, GitHub Actions workflow view
**Parent Spec**: [04-panels.md Section 15.5](../04-panels.md#155-saga-panel-pipeline-visualization), [05-visual-design.md Section 14.11.4](../05-visual-design.md#14114-saga-panel-pipeline)

The Saga Panel is a dedicated DevTools panel shipped by the `@hex-di/saga` library at the entry point `@hex-di/saga/devtools`. It is discovered by the dashboard via the `panelModule` field on the saga `LibraryInspector`. When the connected application has `@hex-di/saga` registered with its container inspector, this panel appears in the sidebar navigation under the "Libraries" section. If the dynamic import of `@hex-di/saga/devtools` fails, the dashboard falls back to the generic JSON tree viewer.

---

## 1. Purpose and Motivation

The Saga Panel provides a pipeline visualization for saga executions that far exceeds what the generic JSON tree fallback can offer. The saga orchestration pattern is inherently sequential and compensatory -- a chain of steps that either all succeed or unwind through compensation. Representing this as a flat JSON tree loses the spatial and temporal relationships that make saga debugging intuitive.

**Problems the panel solves:**

- **Understanding saga progress.** Developers need to see at a glance which step a running saga is on, which steps completed, and which remain. The pipeline diagram conveys this instantly through positional and color cues, whereas a JSON tree requires mental reconstruction of sequence from a flat list of step status fields.

- **Debugging compensation flows.** When a saga fails, compensation steps execute in reverse to undo completed work. The compensation track rendered below the forward pipeline makes the undo-redo relationship explicit: each compensation step aligns visually with the forward step it undoes. The JSON tree has no way to express this spatial correspondence.

- **Monitoring retry behavior.** Steps can retry on transient failures. The retry indicator on each pipeline step box shows the current attempt count against the maximum, giving immediate visibility into whether a step is stuck in a retry loop. A pulsing animation on the running step distinguishes active retries from idle waiting.

- **Identifying slow steps.** The elapsed time displayed inside or beside each step box lets developers spot bottlenecks without digging into trace data. Steps exceeding a warning threshold are visually escalated. A ticking live counter on the currently running step provides real-time duration feedback.

- **Navigating to related infrastructure.** Each step references a DI port. Clicking the port name cross-navigates to the Container panel, and trace IDs link to the Tracing panel. This turns the Saga Panel into a navigation hub for understanding how saga orchestration interacts with the rest of the DI system.

---

## 2. Data Model

### 2.1 SagaLibrarySnapshot

The saga `LibraryInspector` (`createSagaLibraryInspector`) produces a snapshot with the following shape. This is the top-level data object received by the panel via WebSocket.

```typescript
/**
 * Snapshot shape returned by the saga LibraryInspector.getSnapshot().
 * Corresponds to the frozen object produced by createSagaLibraryInspector.
 */
interface SagaLibrarySnapshot {
  /** Structural metadata for all registered saga definitions */
  readonly definitions: readonly SagaDefinitionInfo[];
  /** Currently active (pending | running | compensating) execution summaries */
  readonly activeExecutions: readonly InspectorSagaExecutionSummary[];
  /** Aggregated compensation metrics across all executions */
  readonly compensationStats: CompensationStats;
  /** MAPE-K suggestions for improving saga definitions */
  readonly suggestions: readonly SagaSuggestion[];
}
```

### 2.2 SagaDefinitionInfo

Structural metadata for a registered saga definition. Used to render the pipeline skeleton (step count, step names, compensation availability) even when no execution is active.

```typescript
interface SagaDefinitionInfo {
  readonly name: string;
  readonly steps: readonly StepDefinitionInfo[];
  readonly options: {
    readonly compensationStrategy: "sequential" | "parallel" | "best-effort";
    readonly timeout: number | undefined;
    readonly retryPolicy: RetryPolicyInfo | undefined;
  };
  readonly portDependencies: readonly string[];
}
```

### 2.3 StepDefinitionInfo

Structural metadata for a step within a saga definition. Drives pipeline skeleton rendering and enriches runtime step data with static configuration.

```typescript
interface StepDefinitionInfo {
  readonly name: string;
  readonly port: string;
  readonly hasCompensation: boolean;
  readonly isConditional: boolean;
  readonly retryPolicy: RetryPolicyInfo | undefined;
  readonly timeout: number | undefined;
}
```

### 2.4 RetryPolicyInfo

Retry policy configuration for display in the step detail card and retry indicator badge.

```typescript
interface RetryPolicyInfo {
  readonly maxAttempts: number;
  readonly backoffStrategy: "fixed" | "exponential" | "linear";
  readonly initialDelay: number;
}
```

### 2.5 InspectorSagaExecutionSummary

Rich execution summary produced by `SagaInspector.getActiveExecutions()` and `SagaInspector.getHistory()`. This is the primary data backing each row in the saga list table and each pipeline rendering.

```typescript
interface InspectorSagaExecutionSummary {
  readonly executionId: string;
  readonly sagaName: string;
  readonly status: SagaStatusType;
  readonly currentStepName: string | null;
  readonly currentStepIndex: number;
  readonly totalSteps: number;
  readonly completedStepCount: number;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
  readonly durationMs: number | null;
  readonly error: {
    readonly _tag: string;
    readonly stepName: string;
    readonly causeTags: readonly string[];
  } | null;
  readonly compensationState: {
    readonly active: boolean;
    readonly compensatedSteps: readonly string[];
    readonly failedSteps: readonly string[];
  };
  readonly metadata: Record<string, unknown>;
}

type SagaStatusType = "pending" | "running" | "compensating" | "completed" | "failed" | "cancelled";
```

### 2.6 CompensationStats

Aggregated compensation metrics. Displayed in the summary bar and used for the compensation statistics detail view.

```typescript
interface CompensationStats {
  readonly totalCompensations: number;
  readonly successfulCompensations: number;
  readonly failedCompensations: number;
  readonly averageCompensationTime: number;
  readonly mostCompensatedSaga: string | null;
  readonly bySaga: readonly SagaCompensationBreakdown[];
}

interface SagaCompensationBreakdown {
  readonly sagaName: string;
  readonly totalCompensations: number;
  readonly successRate: number;
  readonly averageCompensationTime: number;
  readonly mostFailedStep: string | null;
  readonly errorTagDistribution: Readonly<Record<string, number>>;
}
```

### 2.7 SagaSuggestion

MAPE-K diagnostic suggestions for saga definition improvement. Rendered in an optional suggestions section or tooltip overlay.

```typescript
type SagaSuggestionType =
  | "saga_step_without_compensation"
  | "saga_long_timeout_without_persistence"
  | "saga_no_retry_on_external_port"
  | "saga_singleton_with_scoped_deps";

interface SagaSuggestion {
  readonly type: SagaSuggestionType;
  readonly sagaName: string;
  readonly stepName?: string;
  readonly message: string;
  readonly action: string;
}
```

### 2.8 ExecutionTrace

Detailed per-step trace data retrieved via `SagaInspector.getTrace(executionId)`. Used when a saga is selected to enrich the pipeline with precise timing, attempt counts, and compensation step traces.

```typescript
interface ExecutionTrace {
  readonly executionId: string;
  readonly sagaName: string;
  readonly input: unknown;
  readonly status: "pending" | "running" | "compensating" | "completed" | "failed" | "cancelled";
  readonly steps: ReadonlyArray<StepTrace>;
  readonly compensation: CompensationTrace | undefined;
  readonly startedAt: number;
  readonly completedAt: number | undefined;
  readonly totalDurationMs: number | undefined;
  readonly metadata: Record<string, unknown> | undefined;
}

interface StepTrace {
  readonly stepName: string;
  readonly stepIndex: number;
  readonly status: "completed" | "failed" | "skipped";
  readonly startedAt: number | undefined;
  readonly completedAt: number | undefined;
  readonly durationMs: number | undefined;
  readonly attemptCount: number;
  readonly error: unknown | undefined;
  readonly skippedReason: string | undefined;
}

interface CompensationTrace {
  readonly triggeredBy: string;
  readonly triggeredByIndex: number;
  readonly steps: ReadonlyArray<CompensationStepTrace>;
  readonly status: "completed" | "failed";
  readonly startedAt: number;
  readonly completedAt: number;
  readonly totalDurationMs: number;
}

interface CompensationStepTrace {
  readonly stepName: string;
  readonly stepIndex: number;
  readonly status: "completed" | "failed";
  readonly startedAt: number;
  readonly completedAt: number;
  readonly durationMs: number;
  readonly error: unknown | undefined;
}
```

### 2.9 PipelineStep (View Model)

Derived view model used by the pipeline renderer. Computed by merging `StepDefinitionInfo`, `StepTrace` (when available), and the execution summary's status/currentStep information.

```typescript
interface PipelineStep {
  readonly stepId: string;
  readonly label: string;
  readonly status: "pending" | "running" | "completed" | "failed" | "skipped" | "compensating";
  readonly duration: number | undefined;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly portName: string;
  readonly hasCompensation: boolean;
  readonly isConditional: boolean;
  readonly error: unknown | undefined;
  readonly skippedReason: string | undefined;
}
```

### 2.10 CompensationPipelineStep (View Model)

Derived view model for compensation track rendering. Computed from `CompensationStepTrace` merged with `StepDefinitionInfo`.

```typescript
interface CompensationPipelineStep {
  readonly stepId: string;
  readonly label: string;
  readonly compensatesFor: string;
  readonly status: "pending" | "running" | "completed" | "failed";
  readonly duration: number | undefined;
  readonly error: unknown | undefined;
}
```

### 2.11 SagaStats (Derived Aggregate)

Computed client-side from the snapshot data for the summary bar display.

```typescript
interface SagaStats {
  readonly activeSagaCount: number;
  readonly completedCount: number;
  readonly failedCount: number;
  readonly compensatingCount: number;
  readonly cancelledCount: number;
  readonly definitionCount: number;
  readonly avgDuration: number | undefined;
  readonly p95Duration: number | undefined;
  readonly compensationSuccessRate: number | undefined;
}
```

### 2.12 SagaPanelState (Internal UI State)

Internal state managed by the panel component for user interaction tracking.

```typescript
interface SagaPanelState {
  readonly selectedSagaId: string | undefined;
  readonly selectedStepId: string | undefined;
  readonly statusFilter: SagaStatusType | "all";
  readonly nameFilter: string;
  readonly showCompletedHistory: boolean;
  readonly sagaListSortColumn: "executionId" | "sagaName" | "status" | "startedAt" | "duration";
  readonly sagaListSortDirection: "asc" | "desc";
}
```

### 2.13 Saga Events (WebSocket Push)

Real-time events received via the library inspector's `subscribe()` method, bridged through `createSagaLibraryInspector`. These events drive live pipeline updates.

```typescript
type SagaEvent =
  | {
      readonly type: "saga:started";
      readonly executionId: string;
      readonly sagaName: string;
      readonly timestamp: number;
      readonly stepCount: number;
    }
  | {
      readonly type: "step:started";
      readonly executionId: string;
      readonly sagaName: string;
      readonly stepName: string;
      readonly stepIndex: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "step:completed";
      readonly executionId: string;
      readonly sagaName: string;
      readonly stepName: string;
      readonly stepIndex: number;
      readonly durationMs: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "step:failed";
      readonly executionId: string;
      readonly sagaName: string;
      readonly stepName: string;
      readonly stepIndex: number;
      readonly error: unknown;
      readonly attemptCount: number;
      readonly retriesExhausted: boolean;
      readonly timestamp: number;
    }
  | {
      readonly type: "step:skipped";
      readonly executionId: string;
      readonly sagaName: string;
      readonly stepName: string;
      readonly stepIndex: number;
      readonly reason: string;
      readonly timestamp: number;
    }
  | {
      readonly type: "compensation:started";
      readonly executionId: string;
      readonly sagaName: string;
      readonly failedStepName: string;
      readonly stepsToCompensate: ReadonlyArray<string>;
      readonly timestamp: number;
    }
  | {
      readonly type: "compensation:step";
      readonly executionId: string;
      readonly sagaName: string;
      readonly stepName: string;
      readonly success: boolean;
      readonly durationMs: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "compensation:completed";
      readonly executionId: string;
      readonly sagaName: string;
      readonly compensatedSteps: readonly string[];
      readonly totalDurationMs: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "compensation:failed";
      readonly executionId: string;
      readonly sagaName: string;
      readonly failedCompensationStep: string;
      readonly compensatedSteps: readonly string[];
      readonly remainingSteps: readonly string[];
      readonly timestamp: number;
    }
  | {
      readonly type: "saga:completed";
      readonly executionId: string;
      readonly sagaName: string;
      readonly totalDurationMs: number;
      readonly stepsExecuted: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "saga:failed";
      readonly executionId: string;
      readonly sagaName: string;
      readonly failedStepName: string;
      readonly compensated: boolean;
      readonly totalDurationMs: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "saga:cancelled";
      readonly executionId: string;
      readonly sagaName: string;
      readonly stepName: string;
      readonly compensated: boolean;
      readonly timestamp: number;
    };
```

---

## 3. Layout and Wireframes

### 3.1 Full Panel Layout

The Saga Panel is divided into three vertical sections: (1) summary bar, (2) saga list table, (3) selected saga detail area (pipeline + step detail).

```
+---------------------------------------------------------------------+
| SAGAS                                                                |
| Active: 3   Completed: 47   Failed: 2   Compensating: 1   Defs: 4  |
+---------------------------------------------------------------------+
| [Status: all v]  [Definition: all v]  [Show history]  [Search: ___] |
+--------+-----------+----------+----------+-----------+--------------+
| ID     | Definition| Status   | Step     | Started   | Duration     |
+--------+-----------+----------+----------+-----------+--------------+
| ord-1  | order     | running  | payment  | 14:32:00  | 2.4s         |
| ord-4  | order     | compens. | refund   | 14:31:30  | 12.8s        |
| inv-2  | invoice   | running  | validate | 14:31:55  | 4.1s         |
| ord-2  | order     | completed| --       | 14:31:00  | 1.8s         |
| ord-3  | order     | failed   | shipping | 14:30:00  | 45.2s        |
+--------+-----------+----------+----------+-----------+--------------+
|                                                                      |
| SAGA: ord-1 -- order (running)                                       |
+---------------------------------------------------------------------+
| FORWARD PIPELINE                                                     |
|                                                                      |
| [validate] ───> [reserve] ───> [payment] ───> [shipping]            |
|     ✓              ✓            ◉ 2.4s          ○                    |
|                                 0/3                                   |
|                                                                      |
| COMPENSATION TRACK                                    (not triggered)|
|                                                                      |
| [unreserve] <─── [refund]                                            |
|      ○               ○                                               |
|                                                                      |
+---------------------------------------------------------------------+
| STEP: payment                                                        |
| Status: running  |  Retries: 0/3  |  Elapsed: 2.4s  |  Port: PaymentGateway  |
| Definition: order step 3 of 4  |  Has compensation: yes             |
| Timeout: 30000ms  |  Backoff: exponential (500ms initial)           |
+---------------------------------------------------------------------+
```

### 3.2 Summary Bar

```
+---------------------------------------------------------------------+
| SAGAS                                                                |
| +---------+ +-----------+ +--------+ +-------------+ +------+       |
| | Active  | | Completed | | Failed | | Compensating| | Defs |       |
| |    3    | |    47     | |    2   | |      1      | |   4  |       |
| +---------+ +-----------+ +--------+ +-------------+ +------+       |
+---------------------------------------------------------------------+
```

Each stat card uses the same card style as the Container panel summary (Section 8.3 of 04-panels.md). Cards are clickable -- clicking a status card sets the status filter to that status.

### 3.3 Saga List Table

```
+--------+-----------+----------+----------+-----------+--------------+
| ID     | Definition| Status   | Step     | Started   | Duration     |
+--------+-----------+----------+----------+-----------+--------------+
| ord-1  | order     | RUNNING  | payment  | 14:32:00  | 2.4s (live)  |
| ord-4  | order     | COMPENS. | refund▼  | 14:31:30  | 12.8s (live) |
| inv-2  | invoice   | RUNNING  | validate | 14:31:55  | 4.1s (live)  |
| ord-2  | order     | DONE     | --       | 14:31:00  | 1.8s         |
| ord-3  | order     | FAILED   | shipping | 14:30:00  | 45.2s        |
+--------+-----------+----------+----------+-----------+--------------+
```

- **ID**: `executionId` truncated to last 8 characters, monospace, full ID in tooltip.
- **Definition**: `sagaName` from the execution summary.
- **Status**: `SagaStatusBadge` component. Color-coded pill.
- **Step**: `currentStepName`. Shows "--" when saga is completed/cancelled. Shows the compensation step name when compensating, with a down-arrow indicator.
- **Started**: Relative time ("2m ago") with absolute time in tooltip.
- **Duration**: For active sagas, a live-ticking counter. For completed sagas, the final `durationMs`.

The table supports sorting by any column (click header). Default sort: active sagas first (pending, running, compensating sorted by startedAt descending), then completed/failed/cancelled by startedAt descending.

### 3.4 Compensating Saga -- Pipeline with Active Compensation

When a saga enters the compensating state, the compensation track activates and shows progress right-to-left.

```
+---------------------------------------------------------------------+
| SAGA: ord-4 -- order (compensating)                                  |
+---------------------------------------------------------------------+
| FORWARD PIPELINE                                                     |
|                                                                      |
| [validate] ───> [reserve] ───> [payment] ───> [shipping]            |
|     ✓              ✓              ✓              ✗                   |
|                                                                      |
| COMPENSATION TRACK                                        (active)   |
|                                                                      |
| [undo-validate] <─── [unreserve] <─── [refund]                      |
|       ○                   ◉ 1.2s          ✓                          |
|                                                                      |
+---------------------------------------------------------------------+
| STEP: unreserve (compensation)                                       |
| Status: running  |  Compensates for: reserve                        |
| Elapsed: 1.2s  |  Port: InventoryService                            |
+---------------------------------------------------------------------+
```

### 3.5 Failed Saga with Compensation Failure

```
+---------------------------------------------------------------------+
| SAGA: ord-5 -- order (failed)                                        |
+---------------------------------------------------------------------+
| FORWARD PIPELINE                                                     |
|                                                                      |
| [validate] ───> [reserve] ───> [payment] ───> [shipping]            |
|     ✓              ✓              ✗              ○                   |
|                                                              14.2s   |
| COMPENSATION TRACK                          (compensation failed)    |
|                                                                      |
| [unreserve] <─── [refund]                                            |
|     ✗ !!            ✓                                                |
|                                                                      |
+---------------------------------------------------------------------+
| ERROR: StepFailed at payment                                         |
| Cause: PaymentTimeout                                                |
| Compensation failed at: unreserve                                    |
| Compensated steps: refund                                            |
| Failed compensation steps: unreserve                                 |
+---------------------------------------------------------------------+
```

### 3.6 Step Detail Card

Shown below the pipeline when a step is clicked.

```
+---------------------------------------------------------------------+
| STEP: payment                                                        |
+--------------------+------------------------------------------------+
| Status             | running                                         |
| Retry Count        | 2 / 3                                           |
| Elapsed            | 8.4s (ticking)                                  |
| Port               | PaymentGateway  [->]                             |
| Definition         | order step 3 of 4                                |
| Has Compensation   | yes                                              |
| Timeout            | 30000ms                                          |
| Retry Policy       | exponential backoff, 500ms initial                |
| Conditional        | no                                                |
+--------------------+------------------------------------------------+
```

The `[->]` indicator on Port is a clickable cross-panel navigation link to the Container panel.

### 3.7 Empty State -- No Sagas

```
+---------------------------------------------------------------------+
| SAGAS                                                                |
| Active: 0   Completed: 0   Failed: 0   Compensating: 0   Defs: 0   |
+---------------------------------------------------------------------+
|                                                                      |
|                    No saga definitions registered.                    |
|                                                                      |
|     Register sagas with the container to see pipeline                |
|     visualizations here.                                             |
|                                                                      |
|     import { defineSaga } from "@hex-di/saga";                       |
|                                                                      |
+---------------------------------------------------------------------+
```

### 3.8 Empty State -- Definitions But No Executions

```
+---------------------------------------------------------------------+
| SAGAS                                                                |
| Active: 0   Completed: 0   Failed: 0   Compensating: 0   Defs: 3   |
+---------------------------------------------------------------------+
|                                                                      |
|     3 saga definitions registered:                                   |
|     order (4 steps), invoice (3 steps), refund (2 steps)             |
|                                                                      |
|     No saga executions have been recorded yet.                       |
|     Execute a saga to see its pipeline here.                         |
|                                                                      |
+---------------------------------------------------------------------+
```

### 3.9 Long Pipeline (Horizontal Scroll)

When a saga has many steps (>6), the pipeline area becomes horizontally scrollable.

```
+---------------------------------------------------------------------+
| FORWARD PIPELINE                                           [< >]     |
|                                                                      |
| ◄ [validate] ─> [enrich] ─> [score] ─> [reserve] ─> [payment] ─>  |
|       ✓            ✓           ✓           ✓          ◉ 2.4s        |
|                                                                      |
|    ─> [notify] ─> [ship] ─> [confirm] ─> [archive] ─> [close] ►    |
|         ○           ○          ○            ○            ○           |
|                                                                      |
+---------------------------------------------------------------------+
```

The `[< >]` indicators and `◄ ►` edge markers indicate horizontal scroll availability.

---

## 4. Component Tree

```
SagaPanel (root)
├── SagaSummaryBar
│   └── StatCard (x5: active, completed, failed, compensating, definitions)
├── SagaListToolbar
│   ├── StatusFilterDropdown
│   ├── DefinitionFilterDropdown
│   ├── HistoryToggle
│   └── SearchInput
├── SagaListTable
│   └── SagaListRow (repeated)
│       ├── TruncatedId
│       └── SagaStatusBadge
├── SagaDetailArea (visible when a saga is selected)
│   ├── SagaDetailHeader
│   │   └── SagaStatusBadge
│   ├── PipelineViewer
│   │   ├── PipelineStepBox (repeated for each forward step)
│   │   │   ├── StepStatusIndicator (✓ / ◉ / ○ / ✗ / ⊘)
│   │   │   ├── StepLabel
│   │   │   ├── StepDuration
│   │   │   └── RetryIndicator (badge showing N/M when retries configured)
│   │   └── PipelineArrow (repeated between steps)
│   ├── CompensationTrack
│   │   ├── CompensationStepBox (repeated for each compensation step)
│   │   │   ├── StepStatusIndicator
│   │   │   ├── StepLabel
│   │   │   └── StepDuration
│   │   └── CompensationArrow (repeated, reversed direction)
│   └── StepDetailCard (visible when a step is selected)
│       ├── StepStatusRow
│       ├── StepRetryRow
│       ├── StepTimingRow
│       ├── StepPortLink (cross-panel navigation)
│       ├── StepErrorDisplay (visible when step has error)
│       └── StepConfigDisplay (timeout, retry policy, conditional flag)
└── SagaEmptyState (visible when no data)
```

### Component Descriptions

- **SagaPanel**: Root component. Receives `LibraryPanelProps` with `snapshot: SagaLibrarySnapshot`. Manages `SagaPanelState` via `useReducer`. Merges definition info and execution summaries to produce derived view models.

- **SagaSummaryBar**: Displays five stat cards in a horizontal flex row. Each card is clickable to filter the saga list by that status.

- **SagaListTable**: Sortable, filterable table. Receives filtered and sorted saga execution summaries. Selected row highlighted with `--hex-bg-active`.

- **SagaStatusBadge**: Inline pill badge rendering the saga or step status with color mapping. Used in both the list table and the pipeline.

- **PipelineViewer**: Renders the forward pipeline as a horizontal sequence of `PipelineStepBox` components connected by `PipelineArrow` components. Implemented as a CSS flexbox container with `overflow-x: auto` for long pipelines.

- **PipelineStepBox**: A rectangular box (fixed width `120px`, height `56px`) showing the step label, status indicator icon, and optional duration/retry badge. Click to select the step. Hover to show timing tooltip.

- **PipelineArrow**: An SVG or CSS-drawn arrow connecting adjacent step boxes. Solid line for completed connections, dashed for pending. Arrow direction: left-to-right for forward pipeline, right-to-left for compensation track.

- **CompensationTrack**: Conditional component. Only rendered when the selected saga definition has at least one step with `hasCompensation: true`. Visually dimmed when compensation has not been triggered. Activated (full opacity) when saga status is `"compensating"` or `"failed"` with compensation data.

- **StepDetailCard**: Expandable detail view shown below the pipeline when a step is selected. Displays all available metadata for the step: status, retry count, elapsed time, port name (clickable), definition info, error details.

- **RetryIndicator**: Small badge overlaid on the step box bottom-right corner showing `{attemptCount}/{maxAttempts}`. Uses `--hex-warning` color when retries are active, `--hex-text-muted` when at 0.

---

## 5. Interaction Model

### 5.1 Selecting a Saga from the List Table

- Click a row in the saga list table to select that saga.
- The selected row receives `--hex-bg-active` background.
- The saga detail area below the table populates with the selected saga's pipeline, compensation track, and step detail.
- If a different saga was previously selected, the previous selection is deselected (single-selection model).
- When the selected saga's execution completes or fails (received via WebSocket event), the selection is preserved and the pipeline updates in place.
- Clicking the already-selected row deselects it, hiding the detail area.

### 5.2 Clicking a Step in the Pipeline

- Click a `PipelineStepBox` to select that step.
- The selected step receives a `--hex-accent` border ring (using `--hex-shadow-focus`).
- The `StepDetailCard` appears or updates below the pipeline with the selected step's information.
- Only one step can be selected at a time (across both forward pipeline and compensation track).
- Clicking the already-selected step deselects it, hiding the step detail card.
- Clicking a compensation step selects it and shows compensation-specific detail (compensatesFor field, compensation error if any).

### 5.3 Hovering a Step

- Hovering a `PipelineStepBox` shows a tooltip with:
  - Step name
  - Status
  - Duration (if completed or running)
  - Retry count / max retries (if retry policy configured)
  - Port name
- Tooltip uses `--hex-shadow-tooltip` and `--hex-bg-secondary` background.
- Tooltip appears after a 200ms delay to avoid flicker during mouse traversal.

### 5.4 Filtering the Saga List

- **Status filter dropdown**: Options are "All", "Pending", "Running", "Compensating", "Completed", "Failed", "Cancelled". Default: "All". When a stat card in the summary bar is clicked, the status filter is set to that status.
- **Definition filter dropdown**: Dynamically populated from `snapshot.definitions[].name`. Options are "All" plus each definition name. Default: "All".
- **Search input**: Filters by execution ID substring match (case-insensitive). Debounced by 150ms.
- **History toggle**: When enabled, includes completed/failed/cancelled sagas in the list (they are excluded by default to keep the list focused on active work). Label: "Show history".
- All filters are AND-composed: a saga must match all active filters to appear.

### 5.5 Sorting the Saga List

- Click a column header to sort by that column (ascending first click, descending on second click).
- Sortable columns: ID (string), Definition (string), Status (custom order: running > compensating > pending > failed > completed > cancelled), Step (string), Started (timestamp), Duration (numeric, active sagas with ticking counters sort by elapsed time).
- Default sort: Status custom order (active first), then Started descending.

### 5.6 Cross-Panel Navigation

- **Port name in step detail card**: Rendered as a clickable link (monospace, `--hex-accent` color, underline on hover). Clicking dispatches a `set-active-panel` action with `panelId: "container"` and passes the port name as navigation context so the Container panel can highlight/scroll to that port in its registry table.
- **Trace ID on execution**: If `metadata.traceId` exists on the execution summary, rendered as a clickable link. Clicking navigates to the Tracing panel with the trace ID as context.
- **Scope ID on execution**: If `metadata.scopeId` exists, rendered as a clickable link. Clicking navigates to the Scope Tree panel and selects that scope.

### 5.7 Keyboard Navigation

- **Saga list**: `ArrowDown`/`ArrowUp` moves selection through the saga list rows. `Enter` selects/deselects the focused row.
- **Pipeline steps**: When a saga is selected, `Tab` moves focus between pipeline steps (forward pipeline first, then compensation track). `Enter` or `Space` selects the focused step. `Escape` deselects the current step.
- **Global**: `Escape` when in step detail view deselects the step. `Escape` when no step is selected deselects the saga.

---

## 6. Pipeline Layout Algorithm

### 6.1 Forward Pipeline

The forward pipeline is rendered as a CSS flexbox row with the following layout rules:

- **Container**: `display: flex; flex-direction: row; align-items: center; gap: 0; overflow-x: auto; padding: var(--hex-space-md);`
- **Step boxes**: Fixed width `120px`, height `56px`. Border radius `--hex-radius-sm`. Background color determined by step status (see Section 9). Flex shrink: 0 (never compress).
- **Step label**: Centered horizontally in the box. Monospace font at `--hex-font-size-sm`. Truncated with ellipsis if longer than the box width minus padding. Full label in tooltip.
- **Status indicator**: Centered below the label, inside the box. Icon size: 16px.
- **Duration**: Right-aligned below the status indicator, `--hex-font-size-xs`, monospace.

### 6.2 Arrow Routing

- Arrows are rendered as inline SVG elements between step boxes, each `32px` wide.
- Forward arrows: horizontal line with right-pointing arrowhead.
- Completed connections (both connected steps have status completed/running/failed): solid line, `--hex-border-strong` color, 1.5px stroke.
- Pending connections (at least one connected step is pending): dashed line, `--hex-border` color, 1px stroke.

### 6.3 Compensation Track

- Rendered below the forward pipeline, separated by a `--hex-space-md` gap and a label ("COMPENSATION TRACK" in `--hex-text-secondary` at `--hex-font-size-xs`).
- Step boxes are rendered in reverse order (right-to-left), matching the compensation execution direction.
- Arrows point left (right-to-left arrowheads).
- Each compensation step box aligns vertically with the forward step it compensates for when possible. When the compensation track has fewer steps than the forward pipeline (steps without compensation handlers are omitted), the compensation boxes are right-aligned to start from the failing step and proceed leftward.

### 6.4 Long Pipeline Handling

- When the pipeline exceeds the panel's available width, the flexbox container scrolls horizontally.
- The currently running step is auto-scrolled into view when the panel first renders and when the running step advances.
- Scroll indicators (fade gradients) appear on the left and right edges of the pipeline area when content overflows in that direction.

### 6.5 Step Status Indicator Placement

Inside each step box, the layout is:

```
+------------------+
|    step-label    |  (top, centered, --hex-font-size-sm)
|       ✓          |  (middle, centered, 16px icon)
|     1.2s  0/3   |  (bottom row: duration left, retry right, --hex-font-size-xs)
+------------------+
```

The retry badge (`0/3`) is only shown when `maxRetries > 0`. When not shown, the duration takes the full bottom row width.

---

## 7. Real-Time Updates

### 7.1 WebSocket Subscription

The panel subscribes to saga events via the remote inspector's library event stream. The `createSagaLibraryInspector` bridges `SagaEvent` instances to `LibraryEvent` instances with `source: "saga"`. The dashboard's `RemoteInspectorAPI` receives these and updates its internal state, triggering React re-renders via `useSyncExternalStore`.

The panel does not poll. All updates are event-driven.

### 7.2 Step Status Transition Animation

When a step transitions between statuses, the step box background color transitions over `--hex-transition-fast` (100ms):

- `pending` -> `running`: Background fades from neutral to `--hex-info-muted`. Status indicator changes from `○` to `◉`.
- `running` -> `completed`: Background fades from `--hex-info-muted` to `--hex-success-muted`. Indicator changes from `◉` to `✓`.
- `running` -> `failed`: Background fades from `--hex-info-muted` to `--hex-error-muted`. Indicator changes from `◉` to `✗`.

All transitions respect `prefers-reduced-motion: reduce` (durations set to 0ms).

### 7.3 Running Step Pulse Animation

The currently running step box has a subtle pulse animation: the `--hex-info` border alternates opacity between 0.4 and 1.0 over a 2-second cycle. This draws the eye to the active step. Animation is implemented via CSS keyframes. Disabled when `prefers-reduced-motion: reduce` is active.

### 7.4 Duration Counter

For the currently running step and for the overall saga duration in the list table, the displayed duration is a live-ticking counter. Implemented via `requestAnimationFrame` throttled to 1 update per second (not faster, to avoid excessive re-renders). The counter is computed as `Date.now() - startedAt` and formatted as seconds with one decimal place (e.g., "2.4s"). When the step completes, the counter stops and shows the final `durationMs` from the completion event.

### 7.5 New Saga Appearing

When a `saga:started` event arrives:

- A new row appears at the top of the saga list (if sort is by Started descending and status filter matches).
- The row fades in over `--hex-transition-normal` (200ms).
- The summary bar's "Active" count increments.

### 7.6 Saga Completion/Failure

When a `saga:completed` or `saga:failed` event arrives:

- The saga row's status badge transitions color.
- The duration counter stops and displays the final value.
- The summary bar counts update (Active decrements, Completed or Failed increments).
- If this saga is currently selected and the pipeline is visible, the pipeline updates in place to show the final state.

---

## 8. Compensation Flow Visualization

### 8.1 Compensation Track Visibility

The compensation track section is always rendered in the DOM when the selected saga definition has at least one step with `hasCompensation: true`, but its visual treatment depends on the saga state:

- **Saga status is `pending` or `running`**: Compensation track is rendered at 40% opacity with dashed borders on all step boxes. Label reads "COMPENSATION TRACK (not triggered)".
- **Saga status is `compensating`**: Compensation track is rendered at full opacity. Label reads "COMPENSATION TRACK (active)". Active compensation steps show full color.
- **Saga status is `failed`**: Compensation track is rendered at full opacity. Label reads "COMPENSATION TRACK (completed)" or "COMPENSATION TRACK (compensation failed)" depending on the compensation outcome.
- **Saga status is `completed`**: Compensation track returns to 40% opacity. Label reads "COMPENSATION TRACK (not triggered)".

### 8.2 Compensation Step Mapping

Each compensation step in `CompensationTrace.steps` has a `stepName` that corresponds to a forward step name. The compensation track renders only the steps that have compensation handlers (determined from `StepDefinitionInfo.hasCompensation`). Steps are ordered in reverse -- the last completed forward step with compensation is the first compensation step to execute.

The compensation step boxes are visually aligned with their corresponding forward step boxes where possible, using CSS grid or absolute positioning, so that vertical lines could conceptually be drawn between a forward step and its compensation counterpart.

### 8.3 Compensation Progress Direction

Compensation steps execute right-to-left (reversing the forward pipeline). The compensation track renders arrows pointing left. Steps "light up" from right to left as compensation progresses:

1. Rightmost compensation step transitions from pending to running (receives `◉` indicator and `--hex-warning-muted` background).
2. When it completes, it transitions to completed (receives `✓` indicator and `--hex-success-muted` background). The next step to the left transitions to running.
3. This continues until all compensation steps are complete or one fails.

### 8.4 Failed Compensation

When a compensation step fails:

- The failed compensation step box shows `✗` indicator with `--hex-error-muted` background.
- A `!!` badge appears on the step box.
- The remaining unexecuted compensation steps stay in pending state.
- The compensation track label updates to "COMPENSATION TRACK (compensation failed)".
- The step detail card for the failed compensation step shows the compensation error in addition to the original forward step error.

### 8.5 Compensation Color Coding

Compensation steps use a slightly different color palette to visually distinguish them from forward steps:

- Running compensation step: `--hex-warning-muted` background (amber tint, vs blue for forward running).
- Completed compensation step: `--hex-success-muted` background (same as forward completed).
- Failed compensation step: `--hex-error-muted` background (same as forward failed).
- Pending compensation step: `--hex-bg-tertiary` background (same as forward pending).

The running compensation step pulse animation uses `--hex-warning` instead of `--hex-info`.

---

## 9. Color and Styling

### 9.1 Status Colors

| Status                   | Step Box Background   | Indicator Icon | Border Color       | Badge Text |
| ------------------------ | --------------------- | -------------- | ------------------ | ---------- |
| `pending`                | `--hex-bg-tertiary`   | `○` (hollow)   | `--hex-border`     | muted      |
| `running`                | `--hex-info-muted`    | `◉` (filled)   | `--hex-info`       | blue       |
| `completed`              | `--hex-success-muted` | `✓` (check)    | `--hex-success`    | green      |
| `failed`                 | `--hex-error-muted`   | `✗` (cross)    | `--hex-error`      | red        |
| `skipped`                | `--hex-bg-secondary`  | `⊘` (slash)    | `--hex-text-muted` | gray       |
| `compensating` (forward) | `--hex-warning-muted` | `◉` (filled)   | `--hex-warning`    | amber      |

### 9.2 Saga Status Badge Colors

Used in the list table and saga detail header:

| Status         | Background            | Text Color         |
| -------------- | --------------------- | ------------------ |
| `pending`      | `--hex-bg-badge`      | `--hex-text-muted` |
| `running`      | `--hex-info-muted`    | `--hex-info`       |
| `compensating` | `--hex-warning-muted` | `--hex-warning`    |
| `completed`    | `--hex-success-muted` | `--hex-success`    |
| `failed`       | `--hex-error-muted`   | `--hex-error`      |
| `cancelled`    | `--hex-bg-badge`      | `--hex-text-muted` |

### 9.3 Pipeline Arrows

- Completed connection (step to next step where the first step is completed): solid line, `--hex-border-strong`, 1.5px.
- Pending connection: dashed line (4px dash, 4px gap), `--hex-border`, 1px.
- Compensation arrows: same rules but reversed direction. Compensation arrows use `--hex-warning` color when both connected compensation steps are active/completed.

### 9.4 Retry Badge

- Background: `--hex-bg-badge`.
- Text: `--hex-text-secondary` when `attemptCount === 0`. `--hex-warning` when `0 < attemptCount < maxAttempts`. `--hex-error` when `attemptCount === maxAttempts` (retries exhausted).
- Font: `--hex-font-mono`, `--hex-font-size-xs`.
- Shape: pill (`--hex-radius-pill`).

### 9.5 Compensation Track Dimming

When the compensation track is inactive (saga is pending/running/completed), all elements in the compensation track section receive:

- `opacity: 0.4`
- Step box borders: dashed
- Arrow color: `--hex-border` (faded)

When the compensation track activates, `opacity` transitions to `1.0` over `--hex-transition-normal` (200ms).

### 9.6 Selected Step Highlight

The selected step box receives:

- Border: 2px solid `--hex-accent`
- Box shadow: `--hex-shadow-focus`
- Background: unchanged (determined by status)

### 9.7 Duration Warning

When a running step's elapsed time exceeds its configured `timeout * 0.8` (80% of timeout), the duration text changes from `--hex-text-secondary` to `--hex-warning`. When it exceeds the timeout, it changes to `--hex-error`.

---

## 10. Cross-Panel Navigation

### 10.1 Port Name -> Container Panel

Every step has an associated port name (from `StepDefinitionInfo.port`). In the step detail card, the port name is rendered as a clickable link. Clicking it:

1. Dispatches `{ type: "set-active-panel", panelId: "container" }` to the dashboard state.
2. Passes navigation context: `{ portName }`.
3. The Container panel receives this context and scrolls to / highlights the port row in its registry table.

### 10.2 Trace ID -> Tracing Panel

If the saga execution's `metadata` contains a `traceId` field (string), a "View Trace" link is rendered in the saga detail header. Clicking it navigates to the Tracing panel with `{ traceId }` as context.

### 10.3 Scope ID -> Scope Tree Panel

If the saga execution's `metadata` contains a `scopeId` field (string), a "View Scope" link is rendered in the saga detail header. Clicking it navigates to the Scope Tree panel with `{ scopeId }` as context.

### 10.4 Definition-Level Port Dependencies

In the saga detail header, the list of `portDependencies` from `SagaDefinitionInfo` is rendered as a comma-separated list of clickable port name links. Each navigates to the Container panel highlighting that port.

---

## 11. Error States and Edge Cases

### 11.1 No Saga Definitions Registered

When `snapshot.definitions` is empty, the panel shows the empty state wireframe (Section 3.7). No summary bar stats, no table, no pipeline. Centered message with a code hint for registering sagas.

### 11.2 Definitions Registered, No Executions

When `snapshot.definitions` is non-empty but `snapshot.activeExecutions` is empty (and history is not toggled), the panel shows the definitions summary empty state (Section 3.8). The summary bar shows `Defs: N` with all other counts at 0.

### 11.3 Saga with 20+ Steps

The pipeline area becomes horizontally scrollable. The currently running step is auto-scrolled into view. Scroll indicators (gradient fades) appear at the edges. The step boxes maintain their fixed `120px` width -- they are never compressed.

### 11.4 Step with High Retry Count

When `attemptCount` exceeds `maxAttempts / 2` (half the max), the retry badge background changes from `--hex-bg-badge` to `--hex-warning-muted`. When `attemptCount === maxAttempts`, the badge shows `--hex-error-muted` background and `--hex-error` text. The step box itself receives a `--hex-warning` border when retry count is elevated.

### 11.5 Parallel Saga Steps (Future)

The current saga runtime supports parallel step definitions via `ParallelDefinition`. The v0.1.0 panel does not render branching pipeline visualizations. Parallel steps are rendered sequentially in the pipeline with a "[parallel]" annotation on each parallel step box. Full branching pipeline visualization is deferred to a future version.

### 11.6 Saga Stuck in Running State

When a running saga's elapsed time exceeds 5 minutes (or 2x its configured timeout, whichever is shorter), the saga list row receives a `--hex-warning` left border and the duration text in the list table changes to `--hex-warning` color. A tooltip warns: "This saga has been running longer than expected."

### 11.7 WebSocket Disconnection During Saga Execution

When the WebSocket connection is lost:

- The panel continues to display the last known state.
- A "Disconnected" banner appears at the top of the panel (consistent with the global disconnection indicator in the connection header).
- Duration counters freeze at the last known value.
- When the connection is restored, the panel receives a fresh snapshot and reconciles the display. Running sagas that completed during disconnection will update to their final state.

### 11.8 Saga Definition Changed Between Snapshot and Trace

If an `ExecutionTrace` references steps that no longer appear in the current `SagaDefinitionInfo` (e.g., the definition was updated while a saga was executing), the pipeline falls back to rendering step names from the trace data without the definition metadata enrichment (no port name, no retry policy info). A subtle warning indicator shows: "Definition may have changed since this execution started."

### 11.9 Very Long Step Names

Step labels in pipeline boxes are truncated with ellipsis at the box width minus padding (~100 characters visible). The full name is shown in the tooltip and in the step detail card.

### 11.10 Multiple Concurrent Sagas of the Same Definition

When multiple sagas share the same definition name, the saga list table shows all of them with their distinct execution IDs. Selecting any one shows its specific pipeline state. The definition filter dropdown can filter to show only sagas of that definition.

---

## 12. Accessibility

### 12.1 ARIA Roles

- **Saga list table**: `role="table"` with `role="row"` for each saga row and `role="cell"` for each column. Column headers use `role="columnheader"` with `aria-sort` indicating current sort state.
- **Pipeline viewer**: `role="list"` containing `role="listitem"` for each step. The list has `aria-label="Forward pipeline steps"` or `aria-label="Compensation pipeline steps"`.
- **Step boxes**: Each step box has `role="button"` with `aria-pressed` indicating selection state and `aria-label` of the form "Step: {stepName}, Status: {status}, Duration: {duration}".
- **Summary bar stat cards**: Each card has `role="button"` with `aria-label` of the form "Filter by {status}: {count} sagas".
- **Status badges**: `aria-label` describing the status (e.g., "Status: running").

### 12.2 Progress Announcements

- When a step transitions from running to completed, an `aria-live="polite"` region announces: "Step {stepName} completed in {duration}ms."
- When a saga completes or fails, the live region announces: "Saga {executionId} {completed|failed} after {duration}ms."
- When compensation starts, the live region announces: "Compensation started for saga {executionId}, {N} steps to compensate."

### 12.3 Keyboard Pipeline Traversal

- The pipeline is focusable via `Tab` from the saga detail area.
- Within the pipeline, `ArrowRight` moves focus to the next step, `ArrowLeft` to the previous step.
- `Enter` or `Space` on a focused step selects it (showing the step detail card).
- `Escape` returns focus from the pipeline to the saga list.
- Focus indicators use `--hex-shadow-focus` outline, visible in both light and dark themes.
- The compensation track is reachable by continuing `ArrowRight` past the last forward step (focus wraps from forward to compensation) or by pressing `ArrowDown` from a forward step to jump to the compensation track.

### 12.4 Color Independence

All status information is conveyed through both color and icon/shape:

- Completed: green background AND checkmark icon
- Running: blue background AND filled circle icon
- Failed: red background AND cross icon
- Pending: neutral background AND hollow circle icon
- Skipped: gray background AND slashed circle icon

This ensures that color-blind users can distinguish statuses.

---

## 13. Testing Requirements

### 13.1 Rendering Tests

- Renders the summary bar with correct counts from snapshot data.
- Renders the saga list table with all columns populated from execution summaries.
- Renders the forward pipeline with correct number of step boxes for the selected saga's definition.
- Renders the compensation track when the definition has steps with compensation handlers.
- Renders the correct status indicator icon for each step status (pending, running, completed, failed, skipped).
- Renders the retry badge when a step has `maxRetries > 0`.
- Renders the step detail card with all fields when a step is selected.
- Renders the correct saga status badge color for each status variant.
- Renders the empty state when no definitions are registered.
- Renders the "no executions" state when definitions exist but no executions are recorded.
- Renders pipeline arrows with correct styling (solid for completed, dashed for pending).

### 13.2 Status Transition Tests

- Step transitions from pending to running: icon changes from `○` to `◉`, background changes.
- Step transitions from running to completed: icon changes from `◉` to `✓`, background changes.
- Step transitions from running to failed: icon changes from `◉` to `✗`, background changes.
- Saga transitions from running to compensating: compensation track activates (opacity increases).
- Saga transitions from compensating to failed: compensation track shows final state.
- Saga transitions from running to completed: all steps show completed indicators.
- Duration counter ticks for running step and stops on completion.
- Summary bar counts update when saga events arrive.

### 13.3 Compensation Flow Tests

- Compensation track renders dimmed when saga is running.
- Compensation track activates when saga enters compensating state.
- Compensation steps light up right-to-left as compensation progresses.
- Failed compensation step shows error indicator and `!!` badge.
- Compensation track label updates to reflect compensation outcome.
- Only steps with `hasCompensation: true` appear in the compensation track.
- Compensation steps are rendered in reverse order.

### 13.4 Interaction Tests

- Clicking a saga row selects it and shows the detail area.
- Clicking the selected saga row deselects it and hides the detail area.
- Clicking a step in the pipeline selects it and shows the step detail card.
- Hovering a step shows a tooltip with timing and retry information.
- Status filter dropdown filters the saga list correctly.
- Definition filter dropdown filters the saga list by saga name.
- Search input filters by execution ID substring.
- History toggle shows/hides completed sagas.
- Column header click sorts the table (ascending, then descending on second click).
- Cross-panel navigation on port name dispatches the correct navigation action.
- Keyboard: ArrowDown/Up navigates saga list rows.
- Keyboard: Tab navigates into the pipeline, ArrowRight/Left traverses steps.
- Keyboard: Enter selects focused step, Escape deselects.

### 13.5 Real-Time Update Tests

- New `saga:started` event adds a row to the saga list.
- `step:started` event transitions the correct step to running state in the pipeline.
- `step:completed` event transitions the correct step to completed state.
- `step:failed` event transitions the correct step to failed state.
- `compensation:started` event activates the compensation track.
- `compensation:step` event updates the compensation step status.
- `saga:completed` event updates the saga row status and stops the duration counter.
- `saga:failed` event updates the saga row and shows error information.
- Duration counter displays live elapsed time for running steps.

### 13.6 Edge Case Tests

- Pipeline with 20+ steps scrolls horizontally and auto-scrolls to the running step.
- Step with retry count at maximum shows escalated retry badge styling.
- Long step names are truncated with ellipsis in pipeline boxes.
- Multiple concurrent sagas of the same definition are listed separately.
- Saga stuck for >5 minutes shows duration warning styling.
- Panel handles WebSocket disconnection gracefully (displays last known state).
- Panel handles missing definition data for active executions (fallback rendering from trace data).

### 13.7 Accessibility Tests

- All pipeline steps are keyboard-navigable.
- ARIA labels are present on step boxes, table rows, and stat cards.
- Status changes are announced via `aria-live` region.
- Focus indicators are visible in both light and dark themes.
- Color is not the sole indicator of status (icon shapes verify this).
