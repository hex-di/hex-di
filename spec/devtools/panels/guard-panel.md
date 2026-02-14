# Guard Panel Specification

**Module**: `@hex-di/guard/devtools`
**Library**: `@hex-di/guard`
**Panel ID**: `library:guard`
**Inspiration**: AWS IAM Policy Simulator, Oso Debugger, Open Policy Agent Playground
**Parent Spec**: [04-panels.md -- Section 15.7](../04-panels.md)
**Guard Spec**: [spec/guard/12-inspection.md](../../guard/12-inspection.md)

---

## Table of Contents

- [1. Purpose and Motivation](#1-purpose-and-motivation)
- [2. Data Model](#2-data-model)
- [3. Layout and Wireframes](#3-layout-and-wireframes)
- [4. Component Tree](#4-component-tree)
- [5. Interaction Model](#5-interaction-model)
- [6. Evaluation Trace Tree Rendering](#6-evaluation-trace-tree-rendering)
- [7. Policy Tree Visualization](#7-policy-tree-visualization)
- [8. Permission Matrix](#8-permission-matrix)
- [9. Real-Time Updates](#9-real-time-updates)
- [10. Color and Styling](#10-color-and-styling)
- [11. Cross-Panel Navigation](#11-cross-panel-navigation)
- [12. Error States and Edge Cases](#12-error-states-and-edge-cases)
- [13. Security Considerations](#13-security-considerations)
- [14. Accessibility](#14-accessibility)
- [15. Testing Requirements](#15-testing-requirements)

---

## 1. Purpose and Motivation

The Guard Panel is the dedicated DevTools panel for the `@hex-di/guard` authorization library. It provides a visual authorization debugging and auditing dashboard that makes the application's access control model inspectable, testable, and understandable at runtime.

Authorization is the hardest cross-cutting concern to debug. When a user reports "I can't access X," the developer must reconstruct the evaluation path: which policy was attached to the port, what permissions the subject carried, which sub-policy in a composite tree caused the denial, and whether the denial was intentional or a misconfiguration. Without tooling, this investigation involves log-grepping, printf-debugging, and mental policy tree traversal.

The Guard Panel solves five specific problems:

1. **Debugging denied access** -- When a request is denied, the panel shows the full evaluation trace tree for that decision, revealing exactly which sub-policy in a composite `allOf`/`anyOf`/`not` tree caused the denial, with the same output as `explainPolicy()`.

2. **Understanding policy composition** -- Policies in `@hex-di/guard` are algebraic trees. The Policies tab renders these trees as interactive, expandable visualizations, making it immediately clear how `allOf`, `anyOf`, and `not` compose leaf permissions and roles.

3. **Auditing authorization patterns** -- The Decisions tab provides a chronological feed of all authorization evaluations with filtering by verdict, port, and subject. The Statistics tab aggregates this data into charts showing allow/deny ratios per port and per subject.

4. **Identifying over-permissioned subjects** -- The Matrix tab displays a subjects-by-ports grid showing which subjects have been allowed or denied at each guarded port. Subjects with all-green rows may be over-permissioned. Subjects with unexpected denials are immediately visible.

5. **Detecting unauthorized access attempts** -- Repeated denials from the same subject against the same port are visible in both the Decisions feed and the Statistics charts, surfacing potential unauthorized access patterns or brute-force attempts.

The panel is shipped by `@hex-di/guard` at the entry point `@hex-di/guard/devtools` and discovered by the dashboard via the `panelModule` field on the `GuardLibraryInspector`. It replaces the generic JSON tree viewer with a purpose-built authorization dashboard.

---

## 2. Data Model

### 2.1 GuardLibrarySnapshot

The panel receives its data from the `GuardInspectionSnapshot` defined in the guard spec (Section 43). The DevTools panel extends this with computed fields needed for rendering.

```typescript
/**
 * The snapshot shape received from the guard library inspector.
 * This is the GuardInspectionSnapshot from @hex-di/guard, serialized
 * over WebSocket by the devtools-client.
 */
interface GuardLibrarySnapshot {
  /** Active policies: port name -> serialized policy string. */
  readonly activePolicies: ReadonlyMap<string, string>;
  /** Recent decisions: ring buffer of the last N evaluations. */
  readonly recentDecisions: ReadonlyArray<GuardDecisionEntry>;
  /** Permission statistics: allow/deny counts per port, per subject. */
  readonly permissionStats: GuardPermissionStats;
}
```

### 2.2 GuardDecisionEntry

From the guard spec (Section 43). Each entry represents a single authorization evaluation result.

```typescript
interface GuardDecisionEntry {
  /** ISO 8601 timestamp of when the decision was recorded. */
  readonly timestamp: string;
  /** The port that was being guarded. */
  readonly portName: string;
  /** The subject ID that was evaluated. */
  readonly subjectId: string;
  /** The authorization outcome. */
  readonly verdict: "allow" | "deny";
  /** Serialized policy string (from serializePolicy). */
  readonly policy: string;
  /** Human-readable reason for denial. Empty string for allows. */
  readonly reason: string;
  /** Evaluation duration in milliseconds. */
  readonly durationMs: number;
}
```

When a decision is selected for detailed inspection, the panel requests the full evaluation trace. The trace is either embedded in the decision entry (if the guard inspector includes it) or reconstructed by deserializing the policy and re-evaluating it client-side using `explainPolicy`. The detailed view uses:

```typescript
/**
 * Extended decision entry with full evaluation trace for the detail pane.
 */
interface GuardDecisionDetail extends GuardDecisionEntry {
  /** Full evaluation trace tree. Present when the decision is selected. */
  readonly evaluationTrace: EvaluationTrace | undefined;
}
```

### 2.3 GuardPermissionStats

From the guard spec (Section 43). Aggregated counters for the statistics dashboard.

```typescript
interface GuardPermissionStats {
  /** Total allow count across all evaluations. */
  readonly totalAllows: number;
  /** Total deny count across all evaluations. */
  readonly totalDenies: number;
  /** Per-port allow/deny counts. */
  readonly byPort: ReadonlyMap<string, { allows: number; denies: number }>;
  /** Per-subject allow/deny counts. */
  readonly bySubject: ReadonlyMap<string, { allows: number; denies: number }>;
}
```

### 2.4 EvaluationTrace

From the guard spec (Section 20). The recursive tree structure recording how each policy node was evaluated.

```typescript
interface EvaluationTrace {
  /** The policy kind that was evaluated. */
  readonly policyKind: PolicyKind;
  /** Human-readable label (e.g., "hasPermission(user:read)"). */
  readonly label: string;
  /** The decision for this specific node. */
  readonly decision: "allow" | "deny";
  /** Evaluation duration in milliseconds. */
  readonly durationMs: number;
  /** Child traces for composite policies. Empty for leaf policies. */
  readonly children: readonly EvaluationTrace[];
}

type PolicyKind = "hasPermission" | "hasRole" | "hasAttribute" | "allOf" | "anyOf" | "not";
```

### 2.5 PolicyTreeNode

Derived from the deserialized policy for the policy tree visualization in the Policies tab. Each node in the policy tree is transformed into this flat-with-depth structure for rendering.

```typescript
interface PolicyTreeNode {
  /** Unique node identifier within the tree (e.g., "0", "0.1", "0.1.2"). */
  readonly nodeId: string;
  /** The policy kind for this node. */
  readonly policyKind: PolicyKind;
  /** Human-readable label (e.g., "hasPermission(user:read)", "allOf", "not"). */
  readonly label: string;
  /**
   * The evaluation decision when a test subject is selected.
   * Undefined when no test subject is active.
   */
  readonly decision: "allow" | "deny" | undefined;
  /**
   * The evaluation duration when a test subject is selected.
   * Undefined when no test subject is active.
   */
  readonly durationMs: number | undefined;
  /** Child nodes. Empty for leaf policies. */
  readonly children: readonly PolicyTreeNode[];
  /** Nesting depth (0 = root). */
  readonly depth: number;
  /** Whether this composite node is expanded in the UI. */
  readonly isExpanded: boolean;
}
```

### 2.6 PermissionMatrixRow

Computed from `recentDecisions` for the Matrix tab. Each row represents a unique subject and their evaluation history against each guarded port.

```typescript
interface PermissionMatrixRow {
  /** The subject identifier. */
  readonly subjectId: string;
  /** Map from port name to the observed verdict. */
  readonly permissions: ReadonlyMap<string, MatrixCellValue>;
  /** Total deny count for this subject (for sorting). */
  readonly denyCount: number;
  /** Total allow count for this subject (for sorting). */
  readonly allowCount: number;
}

type MatrixCellValue = "allow" | "deny" | "not_evaluated";
```

### 2.7 HeatmapDataPoint

Aggregated data for the access pattern heatmap in the Statistics tab. Each data point represents authorization activity in a time bucket.

```typescript
interface HeatmapDataPoint {
  /** The time bucket start (ISO 8601). */
  readonly timestamp: string;
  /** The guarded port. */
  readonly portName: string;
  /** The subject evaluated. */
  readonly subjectId: string;
  /** The evaluation outcome. */
  readonly verdict: "allow" | "deny";
  /** Number of evaluations in this time bucket. */
  readonly count: number;
}
```

### 2.8 GuardPanelState

Internal state managed by the Guard Panel component. Persisted in the parent panel state holder so it survives tab switches within the dashboard.

```typescript
interface GuardPanelState {
  /** The currently active tab within the Guard Panel. */
  readonly activeTab: "decisions" | "policies" | "statistics" | "matrix";
  /** Index of the selected decision in the decisions table. -1 if none. */
  readonly selectedDecisionIndex: number;
  /** Port name selected in the Policies tab. Undefined if none. */
  readonly selectedPolicyPort: string | undefined;
  /** Subject ID filter applied to Decisions and Matrix. Empty = no filter. */
  readonly subjectFilter: string;
  /** Port name filter applied to Decisions and Matrix. Empty = no filter. */
  readonly portFilter: string;
  /** Verdict filter for the Decisions tab. */
  readonly verdictFilter: "all" | "allow" | "deny";
  /** Time range filter for the Decisions tab. */
  readonly timeRange: TimeRange;
  /** Test subject ID selected in the Policies tab for simulation. */
  readonly testSubjectId: string | undefined;
  /** Whether PII masking is enabled for subject IDs. */
  readonly piiMaskingEnabled: boolean;
}

type TimeRange = "all" | "1m" | "5m" | "15m" | "1h";
```

---

## 3. Layout and Wireframes

The Guard Panel uses a tab-based layout with four tabs: **Decisions** (default), **Policies**, **Statistics**, and **Matrix**. All four tabs share the same panel header.

### 3.1 Panel Header

```
+---------------------------------------------------------------------+
|  GUARD                                                               |
|  Policies: 8  |  Evaluations: 1,247  |  Allows: 1,198  |  Denies: 49  |  Deny Rate: 3.9%  |
+---------------------------------------------------------------------+
|  [Decisions]  [Policies]  [Statistics]  [Matrix]                     |
+---------------------------------------------------------------------+
```

The header shows aggregate guard metrics from `permissionStats`. The tab bar uses horizontal tabs. Active tab: `--hex-accent` bottom border (3px), `--hex-text-primary` text. Inactive tabs: `--hex-text-secondary` text, no border.

### 3.2 Tab 1: Decisions (Default)

The Decisions tab is the primary view, showing a chronological feed of authorization decisions with filtering and a detail pane for the selected decision.

```
+---------------------------------------------------------------------+
|  DECISIONS                                                           |
+---------------------------------------------------------------------+
|  SUMMARY                                                             |
|  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────────┐   |
|  │ Total     │ │ Allows    │ │ Denies    │ │ Deny Rate         │   |
|  │ 1,247     │ │ 1,198     │ │ 49        │ │ 3.9%              │   |
|  └───────────┘ └───────────┘ └───────────┘ └───────────────────┘   |
+---------------------------------------------------------------------+
|  FILTERS                                                             |
|  Verdict: [All v]  Port: [All v]  Subject: [All v]  Time: [All v]  |
+---------------------------------------------------------------------+
|  DECISION TABLE                                                      |
|  Time         Verdict  Port             Subject     Policy     Dur  |
|  ────────────────────────────────────────────────────────────────── |
|  14:23:01.234 ALLOW    UserRepository   admin-1     allOf(...) 0.12 |
|  14:23:01.456 DENY     UserRepository   viewer-1    hasRole..  0.08 |
|  14:23:02.789 ALLOW    SettingsStore    admin-1     hasPerm..  0.15 |
|  14:23:03.012 DENY     PaymentGateway   editor-1    allOf(...) 0.09 |
|  14:23:04.567 ALLOW    UserRepository   editor-1    allOf(...) 0.11 |
|  ...                                                                 |
+---------------------------------------------------------------------+
|  DECISION DETAIL (selected: 14:23:01.456)                            |
|  ───────────────────────────────────────────────────────────────── |
|  Port: UserRepository  Subject: viewer-1  Verdict: DENY             |
|  Reason: Subject lacks role 'admin'                                  |
|  Duration: 0.08ms                                                    |
|                                                                      |
|  EVALUATION TRACE                                                    |
|  ▼ allOf [DENY] (0.08ms)                                            |
|    ├─ hasPermission(user:read) [ALLOW] (0.02ms)                      |
|    └─ hasRole('admin') [DENY] (0.01ms)                               |
|         subject 'viewer-1' does not have role 'admin'                |
+---------------------------------------------------------------------+
```

**Summary bar**: Four metric cards showing total evaluations, allow count, deny count, and deny rate percentage. Data source: `permissionStats.totalAllows`, `permissionStats.totalDenies`. Deny rate is computed: `totalDenies / (totalAllows + totalDenies) * 100`.

**Filter bar**: Four dropdown filters that compose. Verdict filter: All / Allow / Deny. Port filter: dynamically populated from `activePolicies` keys. Subject filter: dynamically populated from `permissionStats.bySubject` keys. Time range filter: All / 1m / 5m / 15m / 1h (filters by `timestamp` relative to now).

**Decision table**: Sortable columns. Default sort: timestamp descending (newest first). Columns: Time (HH:MM:SS.mmm format, monospace, `--hex-font-size-xs`), Verdict (badge: ALLOW in `--hex-success`, DENY in `--hex-error`), Port (monospace), Subject (monospace), Policy (truncated to 30 chars with ellipsis), Duration (ms, right-aligned). Click a row to select it and populate the detail pane below.

**Decision detail pane**: Visible only when a decision is selected. Shows the full decision metadata and the evaluation trace tree (see Section 6 for trace tree rendering). The detail pane is a collapsible region below the table, occupying approximately 40% of the vertical space when open.

### 3.3 Tab 2: Policies

The Policies tab displays all guarded ports and their policy trees. Users can select a port to visualize its policy as an expandable tree, and optionally select a test subject to simulate evaluation.

```
+---------------------------------------------------------------------+
|  POLICIES                                                            |
+--------------------------+------------------------------------------+
|  GUARDED PORTS           |  POLICY TREE: UserRepository             |
|                          |                                           |
|  ● UserRepository        |  ▼ allOf                                  |
|    allOf(hasPerm...,     |    ├─ hasPermission(user:read)             |
|    hasRole('admin'))     |    └─ hasRole('admin')                     |
|                          |                                           |
|  ○ SettingsStore         |  TEST SUBJECT: [Select subject... v]      |
|    hasPermission(        |                                           |
|    settings:read)        |  (select a subject to see evaluation      |
|                          |   results highlighted on the tree)        |
|  ○ PaymentGateway        |                                           |
|    anyOf(hasPerm...,     +------------------------------------------+
|    hasRole('admin'))     |  POLICY JSON                              |
|                          |  {                                        |
|  ○ AuditService          |    "kind": "allOf",                       |
|    allOf(hasRole(...),   |    "policies": [                          |
|    hasAttr(...))         |      { "kind": "hasPermission",           |
|                          |        "permission": "user:read" },       |
|                          |      { "kind": "hasRole",                 |
|                          |        "roleName": "admin" }              |
|                          |    ]                                       |
|                          |  }                                        |
|                          |                                           |
|                          |  [Explain]                                |
+--------------------------+------------------------------------------+
```

**Guarded ports list (left pane, 30% width)**: Vertical list of all ports from `activePolicies`. Each entry shows the port name (monospace, `--hex-font-weight-semibold`) and a truncated serialized policy string (`--hex-text-secondary`, `--hex-font-size-xs`). Selected port has `--hex-bg-active` background. Click a port to show its policy tree in the right pane.

**Policy tree (right pane, top half)**: Interactive expandable tree rendering of the deserialized policy. See Section 7 for details. When no test subject is selected, nodes have neutral styling. When a test subject is selected, nodes are colored by evaluation result (green for allow, red for deny).

**Test subject selector**: Dropdown populated from `permissionStats.bySubject` keys. When a subject is selected, the panel simulates policy evaluation for that subject and colors the policy tree nodes accordingly. The simulation uses the most recent decision data for that subject-port pair.

**Policy JSON (right pane, bottom half)**: The raw serialized policy as formatted JSON with syntax highlighting. Keys in `--hex-text-secondary`, strings in `--hex-success`, booleans in `--hex-accent`. Monospace font, `--hex-bg-tertiary` background.

**Explain button**: When a test subject is selected, clicking "Explain" shows the text output of `explainPolicy(policy, subject)` in a modal or inline panel. Uses monospace font with verdict-colored lines.

**Split divider**: Horizontal, between policy tree and JSON view. Default split: 55% tree / 45% JSON. Vertical divider between ports list and right pane: 30% / 70%. Both draggable with min pane width of 180px.

### 3.4 Tab 3: Statistics

The Statistics tab provides aggregated charts and tables for authorization pattern analysis.

```
+---------------------------------------------------------------------+
|  STATISTICS                                                          |
+---------------------------------------------------------------------+
|                                                                      |
|  ALLOW / DENY RATIO                                                  |
|  ┌─────────────────────────────────────────────────────────────┐    |
|  │  ████████████████████████████████████████████░░░░  96.1%    │    |
|  │  ALLOW: 1,198                    DENY: 49                   │    |
|  └─────────────────────────────────────────────────────────────┘    |
|                                                                      |
|  PER-PORT BREAKDOWN                       PER-SUBJECT BREAKDOWN     |
|  ┌─────────────────────────┐             ┌─────────────────────┐    |
|  │ UserRepository          │             │ admin-1             │    |
|  │ ███████████████████ ░░  │             │ ████████████████████│    |
|  │                         │             │                     │    |
|  │ SettingsStore           │             │ editor-1            │    |
|  │ ████████████████████    │             │ ██████████████░░░░  │    |
|  │                         │             │                     │    |
|  │ PaymentGateway          │             │ viewer-1            │    |
|  │ ████████████░░░░░░░░░   │             │ ██████░░░░░░░░░░░░ │    |
|  └─────────────────────────┘             └─────────────────────┘    |
|                                                                      |
|  MOST DENIED PORTS              MOST ACTIVE SUBJECTS                 |
|  ───────────────────            ──────────────────                   |
|  1. PaymentGateway  18 denies   1. admin-1     520 evaluations      |
|  2. UserRepository  12 denies   2. editor-1    380 evaluations      |
|  3. AuditService     8 denies   3. viewer-1    210 evaluations      |
|                                                                      |
|  EVALUATION DURATION DISTRIBUTION                                    |
|  ┌─────────────────────────────────────────────────────────────┐    |
|  │         ██                                                   │    |
|  │      ██ ██ ██                                                │    |
|  │   ██ ██ ██ ██ ██                                             │    |
|  │   ██ ██ ██ ██ ██ ██ ██                                       │    |
|  │  0.01  0.05  0.1  0.2  0.5  1.0+  (ms)                     │    |
|  └─────────────────────────────────────────────────────────────┘    |
|                                                                      |
+---------------------------------------------------------------------+
```

**Allow/deny ratio gauge**: Horizontal bar, green fill for allows, red fill for denies. Percentage label on the right. Data: `totalAllows / (totalAllows + totalDenies)`.

**Per-port bar chart**: Horizontal stacked bars for each port. Green section = allows, red section = denies. Sorted by total evaluations descending. Data: `permissionStats.byPort`. Clicking a bar filters the Decisions tab to that port.

**Per-subject bar chart**: Same layout as per-port. Data: `permissionStats.bySubject`. Clicking a bar filters the Decisions tab to that subject.

**Most denied ports table**: Top 5 ports by deny count. Columns: rank, port name (monospace), deny count. Data derived from `byPort`.

**Most active subjects table**: Top 5 subjects by total evaluation count. Columns: rank, subject ID (monospace, with PII masking if enabled), total evaluations. Data derived from `bySubject`.

**Evaluation duration histogram**: Vertical bar chart showing the distribution of `durationMs` values across all recent decisions. Bucket boundaries: 0-0.01ms, 0.01-0.05ms, 0.05-0.1ms, 0.1-0.2ms, 0.2-0.5ms, 0.5-1.0ms, 1.0ms+. Data computed from `recentDecisions[].durationMs`.

### 3.5 Tab 4: Matrix

The Matrix tab displays a permission matrix showing subjects (rows) versus guarded ports (columns), with cells indicating the observed authorization outcome.

```
+---------------------------------------------------------------------+
|  PERMISSION MATRIX                                                   |
+---------------------------------------------------------------------+
|  Sort: [Subject ID v]  [Column: Port Name v]  [Show: evaluated v]   |
+---------------------------------------------------------------------+
|                    UserRepo   Settings   Payment   Audit             |
|  ─────────────── ────────── ────────── ────────── ──────────        |
|  admin-1          ALLOW      ALLOW      ALLOW      ALLOW            |
|  editor-1         ALLOW      ALLOW      DENY       ----             |
|  viewer-1         DENY       ALLOW      DENY       ----             |
|  anonymous        DENY       DENY       DENY       DENY             |
+---------------------------------------------------------------------+
|  Cell tooltip: Last evaluated 14:23:01 | 12 allows, 3 denies        |
+---------------------------------------------------------------------+
```

**Matrix grid**: Rows are unique subjects from `recentDecisions`. Columns are unique ports from `activePolicies`. Cell values are determined by the most recent decision for that subject-port pair: ALLOW (green cell, `--hex-success-muted` background), DENY (red cell, `--hex-error-muted` background), or `----` (gray cell, `--hex-bg-tertiary` background) when no evaluation has occurred for that combination.

**Sort controls**: Row sorting: alphabetical by subject ID (default) or by deny count descending. Column sorting: alphabetical by port name (default) or by deny count descending.

**Cell interaction**: Hovering a cell shows a tooltip with the last evaluation timestamp, total allow count, total deny count, and the deny reason (if the last verdict was deny). Clicking a cell navigates to the Decisions tab with that subject and port pre-filtered.

**Row highlighting**: Clicking a subject row header highlights the entire row. Clicking a port column header highlights the entire column. Useful for scanning a single subject's access across all ports, or a single port's access across all subjects.

**Virtual scrolling**: When the matrix exceeds 50 rows or 50 columns, only visible cells are rendered. Row headers and column headers remain sticky.

---

## 4. Component Tree

```
<GuardPanel>
  |
  <GuardPanelHeader />                    Panel title and aggregate metrics
  |
  <GuardTabBar />                          Tab navigation (Decisions/Policies/Statistics/Matrix)
  |
  +-- [activeTab === "decisions"]:
  |   <DecisionsTab>
  |     |
  |     <DecisionSummaryBar />             Four metric cards
  |     <DecisionFilterBar />              Verdict, port, subject, time range dropdowns
  |     <DecisionTable />                  Sortable decision list
  |     |
  |     +-- [selectedDecisionIndex >= 0]:
  |         <DecisionDetail>
  |           |
  |           <DecisionMetadata />         Port, subject, verdict, reason, duration
  |           <EvaluationTraceTree />      Recursive trace tree (Section 6)
  |         </DecisionDetail>
  |   </DecisionsTab>
  |
  +-- [activeTab === "policies"]:
  |   <PoliciesTab>
  |     |
  |     <SplitPane direction="horizontal">
  |       |
  |       <GuardedPortsList />             Left pane: port names + policy summaries
  |       |
  |       <SplitPane direction="vertical">
  |         |
  |         <PolicyTreeViewer>             Top: interactive policy tree
  |           |
  |           <TestSubjectSelector />      Subject dropdown for simulation
  |           <PolicyTreeNode />           Recursive tree node component
  |         </PolicyTreeViewer>
  |         |
  |         <PolicyJsonView />             Bottom: raw JSON + Explain button
  |       </SplitPane>
  |     </SplitPane>
  |   </PoliciesTab>
  |
  +-- [activeTab === "statistics"]:
  |   <StatisticsTab>
  |     |
  |     <AllowDenyGauge />                 Horizontal ratio bar
  |     <PerPortChart />                   Stacked horizontal bar chart
  |     <PerSubjectChart />                Stacked horizontal bar chart
  |     <DeniedPortsTable />               Top denied ports table
  |     <ActiveSubjectsTable />            Top active subjects table
  |     <DurationHistogram />              Duration distribution chart
  |   </StatisticsTab>
  |
  +-- [activeTab === "matrix"]:
      <MatrixTab>
        |
        <MatrixControls />                 Sort and filter controls
        <PermissionMatrix>
          |
          <PortColumnHeader />             Sticky column headers
          <SubjectRowHeader />             Sticky row headers
          <MatrixCell />                   Individual ALLOW/DENY/NOT_EVALUATED cell
        </PermissionMatrix>
      </MatrixTab>
</GuardPanel>
```

### Component Descriptions

| Component             | Responsibility                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `GuardPanel`          | Root component. Receives `LibraryPanelProps`. Manages `GuardPanelState`. Routes to active tab. |
| `GuardPanelHeader`    | Renders panel title ("Guard") and aggregate stats from `permissionStats`.                      |
| `GuardTabBar`         | Four tab buttons. Dispatches `activeTab` changes.                                              |
| `DecisionsTab`        | Composes the summary, filter, table, and detail sub-components.                                |
| `DecisionSummaryBar`  | Four metric cards (total, allows, denies, deny rate).                                          |
| `DecisionFilterBar`   | Dropdown filters for verdict, port, subject, and time range.                                   |
| `DecisionTable`       | Sortable, virtualized table of `GuardDecisionEntry` rows.                                      |
| `DecisionDetail`      | Expanded view for a selected decision with metadata and trace tree.                            |
| `EvaluationTraceTree` | Recursive tree renderer for `EvaluationTrace`. See Section 6.                                  |
| `PoliciesTab`         | Split layout with guarded ports list, policy tree, and JSON view.                              |
| `GuardedPortsList`    | Vertical list of ports from `activePolicies`. Click to select.                                 |
| `PolicyTreeViewer`    | Interactive policy tree with test subject selector.                                            |
| `PolicyTreeNode`      | Single node in the policy tree. Recursive for composite policies.                              |
| `TestSubjectSelector` | Dropdown to pick a subject for policy simulation.                                              |
| `PolicyJsonView`      | Raw JSON display of the serialized policy with syntax highlighting.                            |
| `StatisticsTab`       | Composes all chart and table sub-components.                                                   |
| `AllowDenyGauge`      | Horizontal stacked bar showing overall allow/deny ratio.                                       |
| `PerPortChart`        | Horizontal stacked bar chart, one bar per port.                                                |
| `PerSubjectChart`     | Horizontal stacked bar chart, one bar per subject.                                             |
| `DeniedPortsTable`    | Top 5 most-denied ports ranked by deny count.                                                  |
| `ActiveSubjectsTable` | Top 5 most-active subjects ranked by evaluation count.                                         |
| `DurationHistogram`   | Vertical bar chart of evaluation duration distribution.                                        |
| `MatrixTab`           | Composes the matrix controls and the permission matrix grid.                                   |
| `MatrixControls`      | Sort dropdowns for row and column ordering.                                                    |
| `PermissionMatrix`    | Grid of subjects x ports with virtualized rendering.                                           |
| `MatrixCell`          | Single cell: renders ALLOW, DENY, or NOT_EVALUATED indicator.                                  |
| `SubjectRowHeader`    | Sticky row header showing subject ID (with optional PII masking).                              |
| `PortColumnHeader`    | Sticky column header showing port name (rotated for space).                                    |

---

## 5. Interaction Model

### 5.1 Tab Switching

- Clicking a tab button switches `activeTab` in `GuardPanelState`.
- Tab content unmounts/mounts. No crossfade animation.
- Tab-specific state (e.g., selected decision, selected port) is preserved when switching away and back.
- Keyboard: `Ctrl+1..4` switches tabs (1=Decisions, 2=Policies, 3=Statistics, 4=Matrix) when the Guard Panel is active.

### 5.2 Decisions Tab Interactions

**Filtering**: Changing any filter dropdown immediately filters the `recentDecisions` array. Filters compose with AND logic. The filtered count is shown: "Showing 12 of 1,247 decisions."

**Row selection**: Clicking a decision table row selects it. The row receives `--hex-bg-active` background. The detail pane below expands (or updates) to show the selected decision's metadata and evaluation trace tree.

**Row deselection**: Clicking the selected row again deselects it, collapsing the detail pane. Pressing `Escape` also deselects.

**Sorting**: Clicking a column header sorts the table. Default: timestamp descending. Clicking again reverses. Third click removes sort. Sort indicator arrow shown on the active column header.

**Keyboard navigation**: Arrow keys move row selection up/down. `Enter` selects/deselects. `Tab` moves focus between the filter bar and the table.

### 5.3 Policies Tab Interactions

**Port selection**: Clicking a port in the left pane selects it. The right pane populates with the deserialized policy tree and raw JSON. First port is auto-selected on tab mount.

**Tree expand/collapse**: Clicking the chevron on a composite node (`allOf`, `anyOf`, `not`) toggles expansion. All composite nodes start expanded. Leaf nodes (`hasPermission`, `hasRole`, `hasAttribute`) have no expand/collapse control.

**Test subject selection**: Selecting a subject from the dropdown triggers policy evaluation simulation. Each node in the policy tree is colored by its evaluation result. The "Explain" button becomes active.

**Explain action**: Clicking "Explain" displays the `explainPolicy` text output in an inline panel below the policy JSON view. Uses monospace font with indented, verdict-colored lines matching the format from guard spec Section 33.

### 5.4 Statistics Tab Interactions

**Bar chart click**: Clicking a bar in the per-port chart switches to the Decisions tab with the port filter pre-set to the clicked port. Clicking a bar in the per-subject chart does the same with the subject filter.

**Histogram hover**: Hovering a bucket in the duration histogram shows a tooltip with the bucket range and count.

### 5.5 Matrix Tab Interactions

**Cell click**: Clicking a matrix cell navigates to the Decisions tab with the corresponding subject and port pre-filtered. If the cell is `not_evaluated`, the filters are set but the result list will be empty.

**Row/column highlighting**: Clicking a subject row header toggles highlighting for that entire row (all cells in the row get a stronger border). Clicking a port column header toggles highlighting for that entire column.

**Cell tooltip**: Hovering a cell shows: last evaluation timestamp, total allow count, total deny count, and the deny reason (if last verdict was deny).

### 5.6 Cross-Tab Navigation

Several interactions cause a cross-tab jump:

- Statistics: clicking a bar jumps to Decisions tab with pre-set filter
- Matrix: clicking a cell jumps to Decisions tab with pre-set filters
- Decisions: clicking a port name in the detail pane could link to the Policies tab with that port selected

These transitions set `activeTab` and the relevant filter state atomically in a single state update to avoid intermediate renders.

### 5.7 Keyboard Shortcuts

| Shortcut          | Context                | Action                             |
| ----------------- | ---------------------- | ---------------------------------- |
| `Ctrl+1`          | Guard Panel            | Switch to Decisions tab            |
| `Ctrl+2`          | Guard Panel            | Switch to Policies tab             |
| `Ctrl+3`          | Guard Panel            | Switch to Statistics tab           |
| `Ctrl+4`          | Guard Panel            | Switch to Matrix tab               |
| `ArrowUp/Down`    | Decision table focused | Move row selection                 |
| `Enter`           | Decision table focused | Toggle row selection/detail pane   |
| `Escape`          | Detail pane open       | Deselect decision, collapse detail |
| `ArrowLeft/Right` | Policy tree focused    | Collapse/expand composite nodes    |
| `/`               | Guard Panel            | Focus the filter search input      |

---

## 6. Evaluation Trace Tree Rendering

The evaluation trace tree is the centerpiece of the Decisions tab detail pane. It renders the `EvaluationTrace` structure as a recursive, indented, color-coded tree that matches the output format of `explainPolicy()`.

### 6.1 Node Rendering

Each `EvaluationTrace` node renders as a single row containing:

1. **Indentation**: `20px * depth` left padding, with tree connector lines (`--hex-border` color, 1px vertical and horizontal segments).
2. **Expand/collapse chevron**: For composite nodes (`allOf`, `anyOf`, `not`) that have children. Leaf nodes show no chevron.
3. **Policy kind icon**: A small inline icon identifying the policy type:
   - `hasPermission`: key icon
   - `hasRole`: shield icon
   - `hasAttribute`: tag icon
   - `allOf`: ampersand icon (logical AND)
   - `anyOf`: pipe icon (logical OR)
   - `not`: exclamation icon (negation)
4. **Label**: The `label` field (e.g., `"hasPermission(user:read)"`, `"allOf"`, `"not"`). Monospace font, `--hex-font-size-sm`.
5. **Verdict badge**: `[ALLOW]` in `--hex-success` background or `[DENY]` in `--hex-error` background. Pill shape, `--hex-font-size-xs`.
6. **Duration**: `(0.02ms)` in `--hex-text-muted`, `--hex-font-size-xs`.

### 6.2 Color Coding

- **Allow nodes**: The entire row has a subtle `--hex-success-muted` left border (3px).
- **Deny nodes**: The entire row has a subtle `--hex-error-muted` left border (3px).
- **Node label text**: Allow nodes in `--hex-text-primary`, deny nodes in `--hex-text-primary` (same -- the verdict badge provides the color distinction, not the text).

### 6.3 Short-Circuit Indication

The `allOf` and `anyOf` policies use short-circuit evaluation. The trace tree visually indicates which children were not evaluated due to short-circuiting:

- **`allOf` short-circuit**: When a child evaluates to `deny`, subsequent children are not evaluated. In the trace tree, the deny child is rendered normally. If the trace has fewer children than the policy, the un-evaluated children are shown as grayed-out placeholder rows with label text in `--hex-text-muted` and a `[--]` badge instead of a verdict badge. The label reads "not evaluated (short-circuited)".
- **`anyOf` short-circuit**: When a child evaluates to `allow`, subsequent children are not evaluated. Same treatment: un-evaluated children are grayed out.

Since the `EvaluationTrace` only includes children that were actually evaluated (the evaluator stops at the short-circuit point), the panel determines the full child count from the deserialized policy and renders placeholder rows for the difference.

### 6.4 Example Rendering

For the policy `allOf(hasPermission(user:read), anyOf(hasRole('admin'), hasPermission(user:delete)))` evaluated against a subject with `user:read` but not `admin` role or `user:delete`:

```
▼ allOf [DENY] (0.15ms)
  ├─ hasPermission(user:read) [ALLOW] (0.02ms)
  └─ ▼ anyOf [DENY] (0.08ms)
       ├─ hasRole('admin') [DENY] (0.01ms)
       │    subject 'viewer-1' does not have role 'admin'
       └─ hasPermission(user:delete) [DENY] (0.01ms)
              subject 'viewer-1' does not have permission 'user:delete'
```

Deny leaf nodes optionally show the denial reason as a sub-line in `--hex-text-muted`, `--hex-font-size-xs`, indented one level deeper than the node.

### 6.5 Large Traces

For deeply nested policy trees with more than 50 nodes, the trace tree virtualizes its rendering. Only visible rows (plus a buffer of 10 above/below) are rendered. A counter at the bottom shows "Showing N of M trace nodes."

---

## 7. Policy Tree Visualization

The Policies tab renders the deserialized policy as an interactive tree. This differs from the evaluation trace tree (Section 6) in that it shows the **policy structure** rather than the **evaluation result**. When a test subject is selected, evaluation results are overlaid onto the structural tree.

### 7.1 Tree Layout

The policy tree uses the same indented tree layout as the scope tree in the Scopes Panel (spec/devtools/05-visual-design.md Section 14.6). Each node renders:

1. **Chevron**: For composite nodes. Expanded by default.
2. **Node label**: Formatted based on policy kind:
   - `hasPermission(user:read)` -- permission in monospace
   - `hasRole('admin')` -- role name in single quotes
   - `hasAttribute('ownerId', eq(subject('id')))` -- attribute and matcher expression
   - `allOf` / `anyOf` -- combinator name with child count badge: "allOf (2 policies)"
   - `not` -- "not" with the child label inline if the child is a leaf

### 7.2 Color Coding (Without Test Subject)

When no test subject is selected, nodes use neutral colors based on policy kind:

| Policy Kind     | Node Color                                 |
| --------------- | ------------------------------------------ |
| `allOf`         | `--hex-info` left border (blue)            |
| `anyOf`         | `--hex-accent` left border (indigo/purple) |
| `not`           | `--hex-warning` left border (amber)        |
| `hasPermission` | default (no colored border)                |
| `hasRole`       | default (no colored border)                |
| `hasAttribute`  | default (no colored border)                |

### 7.3 Color Coding (With Test Subject)

When a test subject is selected, each node receives a verdict-based color:

- **Allow**: `--hex-success-muted` background, `--hex-success` left border
- **Deny**: `--hex-error-muted` background, `--hex-error` left border
- **Not evaluated** (due to short-circuit): `--hex-bg-tertiary` background, `--hex-text-muted` text

This provides an instant visual answer to "why was this subject denied?" -- the red deny path through the tree is immediately visible.

### 7.4 Policy Serialization View

Below the tree, the raw JSON view renders the policy's serialized form. This uses `serializePolicy(policy)` formatted with 2-space indentation. Syntax highlighting:

- Keys: `--hex-text-secondary`
- String values: `--hex-success`
- Number values: `--hex-info`
- `kind` discriminant values: `--hex-accent`, `--hex-font-weight-semibold`

### 7.5 Explain Button

The "Explain" button is enabled only when a test subject is selected. Clicking it renders the `explainPolicy(policy, subject)` output as preformatted monospace text, using the same format described in guard spec Section 33:

```
DENY: allOf failed
  ALLOW: hasPermission(user:read) passed -- subject 'viewer-1' has permission 'user:read'
  DENY: hasRole('admin') failed -- subject 'viewer-1' does not have role 'admin'
```

Each line is colored by its verdict prefix: `ALLOW` lines in `--hex-success`, `DENY` lines in `--hex-error`.

---

## 8. Permission Matrix

The Matrix tab renders a grid of subjects (rows) versus guarded ports (columns). Each cell represents the observed authorization outcome for that subject-port pair based on actual evaluations from `recentDecisions`.

### 8.1 Data Construction

The matrix is computed from three data sources:

1. **Rows (subjects)**: Unique `subjectId` values from `recentDecisions`.
2. **Columns (ports)**: All keys from `activePolicies` (even if no evaluation has occurred yet).
3. **Cell values**: For each subject-port pair, look up the most recent `GuardDecisionEntry` matching that pair. If found, use its `verdict`. If not found, the cell value is `not_evaluated`.

### 8.2 Cell Rendering

| Value           | Background            | Text               | Badge   |
| --------------- | --------------------- | ------------------ | ------- |
| `allow`         | `--hex-success-muted` | `--hex-success`    | "ALLOW" |
| `deny`          | `--hex-error-muted`   | `--hex-error`      | "DENY"  |
| `not_evaluated` | `--hex-bg-tertiary`   | `--hex-text-muted` | "----"  |

Cell size: minimum 80px wide, 32px tall. Font: `--hex-font-size-xs`, monospace. Text centered.

### 8.3 Row Sorting

- **By subject ID** (default): Alphabetical ascending.
- **By deny count**: Subjects with the most denies at the top. Secondary sort: alphabetical for ties.

### 8.4 Column Sorting

- **By port name** (default): Alphabetical ascending.
- **By deny count**: Ports with the most denies on the left. Secondary sort: alphabetical for ties.

### 8.5 Cell Tooltip

On hover, the cell displays a tooltip containing:

```
Subject: admin-1 | Port: UserRepository
Last evaluated: 14:23:01.234 (2m ago)
Allows: 12 | Denies: 3
Reason: Subject lacks role 'superadmin'
```

The "Reason" line is only shown when the most recent verdict was `deny`.

### 8.6 Virtual Scrolling

When the matrix exceeds 50 rows or 50 columns, the grid uses virtualized rendering. Only cells within the visible viewport (plus a buffer of 5 rows/columns in each direction) are rendered. Row headers (left column) and column headers (top row) use `position: sticky` to remain visible during scroll.

### 8.7 Cell Click Navigation

Clicking a matrix cell dispatches a cross-tab navigation:

1. Sets `activeTab` to `"decisions"`.
2. Sets `subjectFilter` to the cell's subject ID.
3. Sets `portFilter` to the cell's port name.
4. Sets `verdictFilter` to `"all"`.

This shows all decisions for that specific subject-port pair.

---

## 9. Real-Time Updates

The Guard Panel receives live data via the same WebSocket-driven mechanism as all other library panels. The guard inspector in the target application emits `GuardInspectionEvent` events which are streamed to the dashboard via the devtools-client.

### 9.1 WebSocket Subscription

The panel subscribes to guard events via the `RemoteInspectorAPI`:

- `guard.evaluate` events: Indicate that an evaluation has begun (not rendered directly, but used for activity indication).
- `guard.allow` events: A new allow decision. Appended to `recentDecisions`, stats incremented.
- `guard.deny` events: A new deny decision. Appended to `recentDecisions`, stats incremented.

### 9.2 Snapshot Updates

The guard library inspector sends periodic snapshot updates (default: every 1000ms) containing the full `GuardInspectionSnapshot`. The panel uses `useSyncExternalStore` via a `useRemoteGuardSnapshot()` hook that returns the latest snapshot. React re-renders only when the snapshot has structurally changed.

### 9.3 Update Animations

**Decision feed (Decisions tab)**: When a new decision arrives while the Decisions tab is active:

- If auto-scroll is active (table scrolled to top, since newest-first ordering), the new row slides in at the top with a brief `--hex-transition-fast` fade-in.
- The summary bar counters increment with a subtle number transition.

**Statistics (Statistics tab)**: Chart bars animate their width change using `--hex-transition-normal`. Counter values in tables and the gauge animate using a counting transition.

**Matrix (Matrix tab)**: When a new decision changes a cell's value, the cell briefly flashes with `--hex-accent-muted` background before settling to its new verdict color. Duration: `--hex-transition-normal`.

**All animations respect `prefers-reduced-motion`**: When reduced motion is preferred, all transitions are instant (0ms duration).

---

## 10. Color and Styling

The Guard Panel follows the design token system from spec/devtools/05-visual-design.md Section 13. Guard-specific color usage:

### 10.1 Verdict Badges

| Verdict | Background            | Text            | Border |
| ------- | --------------------- | --------------- | ------ |
| ALLOW   | `--hex-success-muted` | `--hex-success` | none   |
| DENY    | `--hex-error-muted`   | `--hex-error`   | none   |

Badges use pill shape (`--hex-radius-pill`), `--hex-font-size-xs`, `--hex-font-weight-medium`, uppercase text.

### 10.2 Decision Table Rows

- Deny rows: subtle `--hex-error-muted` left border (3px) to make denied decisions scannable.
- Allow rows: no colored left border (default).
- Hover: `--hex-bg-hover` background.
- Selected: `--hex-bg-active` background.

### 10.3 Policy Tree Node Colors

| Policy Kind     | Color Usage                                                            |
| --------------- | ---------------------------------------------------------------------- |
| `allOf`         | `--hex-info` left border / icon tint (blue -- logical conjunction)     |
| `anyOf`         | `--hex-accent` left border / icon tint (indigo -- logical disjunction) |
| `not`           | `--hex-warning` left border / icon tint (amber -- logical negation)    |
| `hasPermission` | Default text, key icon                                                 |
| `hasRole`       | Default text, shield icon                                              |
| `hasAttribute`  | Default text, tag icon                                                 |

### 10.4 Matrix Cell Colors

| Cell Value    | Background            | Text               |
| ------------- | --------------------- | ------------------ |
| ALLOW         | `--hex-success-muted` | `--hex-success`    |
| DENY          | `--hex-error-muted`   | `--hex-error`      |
| NOT_EVALUATED | `--hex-bg-tertiary`   | `--hex-text-muted` |

### 10.5 Statistics Charts

- Allow portions: `--hex-success` fill.
- Deny portions: `--hex-error` fill.
- Chart backgrounds: `--hex-bg-secondary`.
- Axis labels: `--hex-text-muted`, `--hex-font-size-xs`.
- Bar labels: `--hex-text-primary`, `--hex-font-mono`, `--hex-font-size-sm`.

### 10.6 Tab Navigation

- Active tab: `--hex-accent` bottom border (3px), `--hex-text-primary` text.
- Inactive tab: transparent bottom border, `--hex-text-secondary` text.
- Hover (inactive): `--hex-bg-hover` background.
- Tab font: `--hex-font-sans`, `--hex-font-size-sm`, `--hex-font-weight-medium`.

---

## 11. Cross-Panel Navigation

The Guard Panel provides navigation links to other panels in the devtools dashboard. These links trigger `dispatch({ type: "set-active-panel", panelId })` on the dashboard state.

### 11.1 Port Name to Container Panel

When a port name appears in the Decisions tab detail pane, the Policies tab port list, or the Matrix column headers, it is rendered as a clickable link. Clicking navigates to the Container Panel (`panelId: "container"`) and, where supported, pre-selects the port row in the container's port registry table.

### 11.2 Trace ID to Tracing Panel

If the guard inspector embeds a `traceId` on decision entries (from the tracing integration described in guard spec Section 10), the trace ID is rendered as a clickable link in the decision detail pane. Clicking navigates to the Tracing Panel (`panelId: "tracing"`) and filters the span waterfall to the relevant resolution trace.

### 11.3 Subject ID to Logger Panel

When a subject ID appears in the Decisions tab or the Matrix row headers, clicking it navigates to the Logger Panel (`panelId: "library:logger"`) with a pre-set filter for that subject ID. This shows all log entries associated with the subject's session, useful for correlating authorization denials with the subject's broader activity.

### 11.4 Link Styling

Cross-panel links use `--hex-accent` color with `cursor: pointer` and underline on hover. They render the same as standard hyperlinks but dispatch in-app navigation instead of URL changes.

---

## 12. Error States and Edge Cases

### 12.1 No Guard Policies Registered

When `activePolicies` is an empty map (the target application has no guarded ports):

- **Decisions tab**: Empty state message: "No guard policies registered. Wrap an adapter with `guard(adapter, { resolve: policy })` to see authorization data here."
- **Policies tab**: Empty left pane with help text: "No guarded ports. Register guard policies to inspect them."
- **Statistics tab**: All counters show 0. Charts are empty with placeholder text: "No data yet."
- **Matrix tab**: Empty grid with message: "No policies or decisions to display."

### 12.2 No Decisions Yet

When `activePolicies` is populated but `recentDecisions` is empty (policies registered but no resolutions have triggered guard evaluation):

- **Decisions tab**: Table is empty: "No authorization decisions recorded yet. Resolve a guarded port to see decisions."
- **Policies tab**: Fully functional. Policy trees are displayed from `activePolicies`.
- **Statistics tab**: All counters at 0, charts empty.
- **Matrix tab**: Column headers shown (from `activePolicies` keys), but no subject rows.

### 12.3 Very Large Policy Trees

When a policy tree has more than 100 nodes (deeply nested `allOf`/`anyOf` compositions):

- The policy tree starts with top-level nodes expanded and deeper levels collapsed.
- A "Expand all" button at the top of the tree expands the entire tree.
- A depth counter shows the maximum nesting depth: "Depth: 7 levels".
- Virtualized rendering: only visible nodes are in the DOM.

### 12.4 Large Matrix Dimensions

When the matrix has more than 50 subjects or 50 ports:

- Virtual scrolling is activated (see Section 8.6).
- A counter displays: "42 subjects x 8 ports" in the matrix header.
- Sticky row and column headers ensure context is never lost during scrolling.

### 12.5 Subject with Only Allows

If a subject has only allow verdicts across all evaluated ports, the Matrix row is entirely green. This is a visual signal for potentially over-permissioned subjects. No special annotation is added -- the solid green row speaks for itself.

### 12.6 Policy Evaluation Errors

`PolicyEvaluationError` is distinct from a `Deny` decision. When an evaluation error occurs (e.g., `ACL003`), the guard inspector emits it differently from a clean deny. In the decision feed, evaluation errors appear with a distinct badge: `[ERROR]` in `--hex-warning` (amber, not red -- to distinguish from denials). The detail pane shows the error code and message instead of an evaluation trace tree.

### 12.7 Disconnected State

When the WebSocket connection to the target application is lost:

- The panel displays the last known snapshot data.
- A "Disconnected" banner appears at the top of the panel in `--hex-warning-muted` background.
- All data is read-only. Filters and tab switching continue to work against the stale snapshot.
- When the connection is restored, the panel receives a fresh snapshot and resumes real-time updates.

### 12.8 Deserialization Failure

If a policy string from `activePolicies` fails to deserialize (invalid JSON, unknown policy kind), the Policies tab shows an error indicator next to that port name: a warning icon with tooltip "Policy deserialization failed: {error message}". The raw string is displayed in the JSON view as-is, and the policy tree shows "Unable to render policy tree" with the error details.

---

## 13. Security Considerations

The Guard Panel displays authorization data, which may contain sensitive information. Special care is taken to ensure the panel itself does not become a security liability.

### 13.1 Subject ID Masking

Subject IDs may contain PII (email addresses, usernames, internal employee IDs). The panel provides a configurable PII masking toggle (`piiMaskingEnabled` in `GuardPanelState`):

- **Masking off** (default in development): Subject IDs displayed in full.
- **Masking on**: Subject IDs are partially masked: first 3 characters shown, remainder replaced with asterisks. Example: `admin-1` becomes `adm****`. The mask is applied in the rendering layer only; the underlying data is unchanged. Hover tooltip still shows the full ID (to enable debugging while masking casual observation).

The toggle is accessible via a small privacy icon button in the panel header. When toggled, all subject ID displays across all four tabs update immediately.

### 13.2 Decision Data Retention

The `recentDecisions` ring buffer in the guard inspector has a configurable maximum size (default: 100 entries, configurable via `createGuardInspector({ maxRecentDecisions })`). The DevTools panel displays only what the inspector provides; it does not independently accumulate history beyond the inspector's buffer.

The devtools dashboard does not persist guard decision data to disk or `localStorage`. When the dashboard tab is closed, all guard data is lost. This is a deliberate security choice: authorization audit trails should be persisted by the application's audit infrastructure, not by a development tool.

### 13.3 Read-Only Enforcement

The Guard Panel is strictly read-only. There is no ability to:

- Modify policies from the DevTools
- Create, update, or delete permissions or roles
- Override or bypass guard enforcement
- Replay decisions with different subjects

The panel consumes data from the `LibraryInspector.getSnapshot()` method and processes events. It never sends commands back to the target application that would modify authorization state.

### 13.4 Dashboard Access

In production environments where DevTools is enabled (not recommended, but possible), the dashboard itself should be access-controlled. The Guard Panel spec does not define access control for the dashboard -- that is the responsibility of the `DevToolsServerConfig` (spec/devtools/03-panel-architecture.md Section 6.6). However, this panel's documentation should note that exposing authorization decision data to unauthorized users defeats the purpose of the authorization system.

---

## 14. Accessibility

The Guard Panel follows the accessibility patterns established in spec/devtools/05-visual-design.md Section 15.8. Guard-specific ARIA roles and patterns:

### 14.1 Tab Panel

- The tab bar uses `role="tablist"` on the container.
- Each tab button uses `role="tab"` with `aria-selected="true|false"` and `aria-controls` pointing to the tab panel ID.
- Each tab content area uses `role="tabpanel"` with `aria-labelledby` pointing to the tab button ID.
- `Tab`/`Shift+Tab` moves focus between tabs. Arrow keys move between tab buttons within the tab list.

### 14.2 Decision Table

- The decision table uses native `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` elements.
- Column headers use `<th scope="col">` with `aria-sort="ascending|descending|none"` reflecting the current sort state.
- The selected row uses `aria-selected="true"`.
- Verdict badges include `aria-label="Allowed"` or `aria-label="Denied"` (not just the visual badge text).

### 14.3 Evaluation Trace Tree

- The trace tree uses `role="tree"` on the container.
- Each trace node uses `role="treeitem"` with `aria-expanded="true|false"` for composite nodes.
- `aria-level` reflects the nesting depth (1 for root, 2 for first-level children, etc.).
- Each node's text includes the full label and verdict, so screen readers announce: "allOf, Denied, 0.15 milliseconds, expanded".

### 14.4 Policy Tree

- Same tree ARIA pattern as the evaluation trace tree.
- Test subject selector uses native `<select>` with `<label>` association.
- When a test subject is selected, the tree's `aria-description` updates to include: "Showing evaluation results for subject {subjectId}".

### 14.5 Permission Matrix

- The matrix uses `role="grid"` on the container.
- Row headers use `role="rowheader"`.
- Column headers use `role="columnheader"`.
- Each cell uses `role="gridcell"` with `aria-label` describing the full context: "Subject admin-1, Port UserRepository, Allowed".
- The `not_evaluated` state is announced as "Not evaluated".

### 14.6 Statistics Charts

Charts do not use SVG with ARIA labels. Instead, each chart is accompanied by a visually hidden `<table>` containing the same data in tabular form. Screen readers access the table; sighted users see the chart. The table uses `aria-label` describing the chart (e.g., "Allow and deny counts by port").

### 14.7 Focus Management

- When switching tabs, focus is placed on the first interactive element within the new tab panel.
- When selecting a decision row, focus remains on the row. The detail pane is accessible by tabbing past the table.
- When the "Explain" button produces output, focus moves to the explanation text area.

---

## 15. Testing Requirements

### 15.1 Rendering Tests

Tests that verify all four tabs render correctly with provided snapshot data.

- **Decisions tab**: Renders summary cards with correct counts. Renders filter dropdowns with correct options. Renders decision table rows with correct data. Renders verdict badges with correct colors.
- **Policies tab**: Renders guarded ports list from `activePolicies`. Renders policy tree for selected port. Renders JSON view with syntax highlighting.
- **Statistics tab**: Renders allow/deny gauge with correct ratio. Renders per-port and per-subject charts. Renders tables with correct rankings.
- **Matrix tab**: Renders correct grid dimensions. Renders cells with correct verdict indicators. Renders sticky headers.

### 15.2 Evaluation Trace Tree Tests

- **Simple leaf policy**: Renders a single node with correct label, verdict, and duration.
- **Two-level allOf**: Renders parent `allOf` node with two leaf children.
- **Deeply nested composite**: Renders a 5-level tree with correct indentation and tree lines.
- **Short-circuit display for allOf**: When `allOf` short-circuits on first deny, subsequent children show as grayed-out "not evaluated" placeholders.
- **Short-circuit display for anyOf**: When `anyOf` short-circuits on first allow, subsequent children show as grayed-out placeholders.
- **Not policy inversion**: `not` node shows inverted verdict from its child.
- **All-allow trace**: All nodes green, no deny styling.
- **All-deny trace**: Root and failing children red, allow children still green.

### 15.3 Policy Tree Visualization Tests

- **Without test subject**: Tree renders with neutral colors and kind-based border colors.
- **With test subject**: Tree renders with verdict-based colors on each node.
- **Expand/collapse**: Composite nodes toggle between expanded and collapsed.
- **hasAttribute node**: Renders attribute name and matcher expression correctly.
- **Explain button disabled**: When no test subject selected, button is disabled.
- **Explain button output**: When test subject selected, button renders formatted explanation text.

### 15.4 Permission Matrix Tests

- **Cell rendering**: ALLOW cells green, DENY cells red, NOT_EVALUATED cells gray.
- **Row sorting by deny count**: Subject with most denies appears first.
- **Column sorting by deny count**: Port with most denies appears first.
- **Cell tooltip content**: Shows correct last evaluation time, allow count, deny count.
- **Cell click navigation**: Clicking a cell sets correct filters and switches to Decisions tab.
- **Empty matrix**: Shows correct empty state when no decisions exist.

### 15.5 Statistics Tests

- **Allow/deny gauge ratio**: Correct percentage calculation and bar width.
- **Per-port chart**: Correct bar lengths and colors for each port.
- **Per-subject chart**: Correct bar lengths and colors for each subject.
- **Duration histogram**: Correct bucket counts from decision durations.
- **Most denied table ranking**: Ports ranked correctly by deny count.
- **Chart bar click**: Clicking a bar navigates to Decisions tab with correct filter.

### 15.6 Filtering and Interaction Tests

- **Verdict filter**: Filtering by "deny" shows only deny decisions.
- **Port filter**: Filtering by a specific port shows only that port's decisions.
- **Subject filter**: Filtering by a specific subject shows only that subject's decisions.
- **Combined filters**: Applying verdict + port + subject filters composes correctly.
- **Time range filter**: Filtering by "5m" excludes decisions older than 5 minutes.
- **Filter count display**: "Showing X of Y decisions" updates correctly.
- **Decision row selection**: Clicking a row opens the detail pane. Clicking again closes it.
- **Port selection in Policies tab**: Clicking a port updates the tree and JSON view.

### 15.7 Real-Time Update Tests

- **New decision appended**: A new `guard.allow` event adds a row to the decisions table.
- **Stats increment**: A new decision increments the summary card counters.
- **Matrix cell update**: A new decision updates the relevant matrix cell.
- **Snapshot refresh**: A new snapshot from WebSocket updates all four tabs.

### 15.8 Empty and Error State Tests

- **No policies**: All tabs show appropriate empty state messages.
- **No decisions**: Decisions, Statistics, Matrix show empty; Policies tab is functional.
- **Deserialization failure**: Policies tab shows error indicator for the invalid policy.
- **Evaluation error**: Decision table shows `[ERROR]` badge distinct from `[DENY]`.
- **Disconnected**: Disconnected banner shown; stale data displayed.

### 15.9 Security Tests

- **PII masking toggle**: When enabled, subject IDs are masked across all tabs.
- **PII masking format**: Only first 3 characters shown, rest asterisked.
- **PII masking hover**: Full subject ID available on hover tooltip even when masked.
- **Read-only**: No component renders any mutation controls (no edit buttons, no write operations).

---

> **Previous**: [04-panels.md -- Section 15.7](../04-panels.md) | **Guard Spec**: [spec/guard/12-inspection.md](../../guard/12-inspection.md)
