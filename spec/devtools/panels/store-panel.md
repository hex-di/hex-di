# Store Panel -- Detailed Specification

**Module**: `@hex-di/store/devtools`
**Inspiration**: Redux DevTools
**Parent Spec**: [04-panels.md, Section 15.4](../04-panels.md#154-store-panel-state-inspector--diff-viewer)

The Store Panel is a dedicated DevTools panel for the `@hex-di/store` library. It is shipped by `@hex-di/store` at the entry point `@hex-di/store/devtools` and discovered via the `panelModule` field on `LibraryInspector`. When the dashboard connects to a target app that has registered a store library inspector, this panel appears in the sidebar navigation under the Libraries section.

---

## 1. Purpose and Motivation

The Store Panel provides a specialized state inspector with an integrated diff viewer and action timeline. It exists because the generic JSON tree fallback (Section 12.3 of 04-panels.md) is inadequate for stateful debugging workflows:

**Why a dedicated panel matters over the JSON tree fallback**:

- **Action-to-state causality**: Developers need to see which dispatched action caused which state change. The generic tree shows only the current snapshot with no temporal dimension. The Store Panel correlates each action with its `prevState` and `nextState`, making causality explicit.

- **Visual diffing**: When state changes, developers need to see exactly what changed, not re-read the entire state tree. Side-by-side diff with color-coded additions (green), removals (red), and mutations (amber) makes changes instantly scannable.

- **Action timeline**: A chronological log of all dispatched actions with timestamps, payload data, effect status, and tracing correlation. This transforms debugging from "what is the state now?" to "how did the state get here?"

- **Multi-store overview**: Applications often register many store ports (state, atom, derived, async-derived). The overview table surfaces subscriber counts, action counts, and port kinds at a glance -- information invisible in a flat JSON tree.

- **Effect status visibility**: The Store library's action history records effect lifecycle (none, pending, completed, failed). The panel surfaces effect failures alongside the action that triggered them, connecting state management to side-effect debugging.

- **Subscriber graph awareness**: The panel exposes how derived ports depend on source ports and how many subscribers each port has, helping developers understand reactive data flow.

- **Tracing correlation**: Actions carry optional `traceId` and `spanId` fields from `@hex-di/tracing`. The panel renders these as clickable links to the Tracing panel, enabling end-to-end request tracing that spans DI resolution, state management, and side effects.

---

## 2. Data Model

### 2.1 StoreLibrarySnapshot

The top-level snapshot returned by the store library inspector's `getSnapshot()`. This is the `StoreSnapshot` from `@hex-di/store/core` (see `libs/store/core/src/types/inspection.ts`), serialized and transmitted over WebSocket.

```typescript
interface StoreLibrarySnapshot {
  /** Timestamp when the snapshot was taken (ms since epoch). */
  readonly timestamp: number;

  /** All registered port snapshots (state, atom, derived, async-derived). */
  readonly ports: readonly PortSnapshot[];

  /** Total subscriber count across all ports. */
  readonly totalSubscribers: number;

  /** Number of effects currently in-flight. */
  readonly pendingEffects: number;
}
```

### 2.2 PortSnapshot (Discriminated Union)

Each port in the snapshot is one of four kinds. The `kind` discriminant determines which fields are present.

```typescript
type PortSnapshot =
  | StatePortSnapshot
  | AtomPortSnapshot
  | DerivedPortSnapshot
  | AsyncDerivedPortSnapshot;

interface StatePortSnapshot {
  readonly kind: "state";
  readonly portName: string;
  readonly state: unknown;
  readonly subscriberCount: number;
  readonly actionCount: number;
  readonly lastActionAt: number | null;
  readonly scopeId?: string;
}

interface AtomPortSnapshot {
  readonly kind: "atom";
  readonly portName: string;
  readonly value: unknown;
  readonly subscriberCount: number;
  readonly scopeId?: string;
}

interface DerivedPortSnapshot {
  readonly kind: "derived";
  readonly portName: string;
  readonly value: unknown;
  readonly subscriberCount: number;
  readonly sourcePortNames: readonly string[];
  readonly isStale: boolean;
  readonly scopeId?: string;
}

interface AsyncDerivedPortSnapshot {
  readonly kind: "async-derived";
  readonly portName: string;
  readonly status: "idle" | "loading" | "success" | "error";
  readonly data: unknown;
  readonly error: unknown | undefined;
  readonly subscriberCount: number;
  readonly sourcePortNames: readonly string[];
  readonly scopeId?: string;
}
```

### 2.3 ActionHistoryEntry

Each recorded action in the history buffer. This is the `ActionHistoryEntry` from `libs/store/core/src/types/inspection.ts`.

```typescript
interface ActionHistoryEntry {
  /** Unique action entry identifier. */
  readonly id: string;

  /** Port name that dispatched this action. */
  readonly portName: string;

  /** Action name (key from the ActionMap). */
  readonly actionName: string;

  /** Action payload (unknown -- rendered as JSON tree). */
  readonly payload: unknown;

  /** State before the reducer ran. */
  readonly prevState: unknown;

  /** State after the reducer ran. */
  readonly nextState: unknown;

  /** Timestamp of dispatch (ms since epoch). */
  readonly timestamp: number;

  /** Effect lifecycle status. */
  readonly effectStatus: "none" | "pending" | "completed" | "failed";

  /** Effect error details (present when effectStatus is "failed"). */
  readonly effectError?: EffectFailedError;

  /** Parent action ID for chained/cascading actions. */
  readonly parentId: string | null;

  /** Ordering index within a batch of concurrent actions. */
  readonly order: number;

  /** W3C Trace Context trace ID (present when @hex-di/tracing is active). */
  readonly traceId?: string;

  /** W3C Trace Context span ID. */
  readonly spanId?: string;
}
```

### 2.4 ActionHistoryFilter

Filter criteria for querying the action history. Transmitted to the target app via WebSocket when the panel requests filtered history.

```typescript
interface ActionHistoryFilter {
  readonly portName?: string;
  readonly actionName?: string;
  readonly since?: number;
  readonly until?: number;
  readonly effectStatus?: "none" | "pending" | "completed" | "failed";
  readonly limit?: number;
  readonly traceId?: string;
}
```

### 2.5 ActionHistoryConfig

Configuration for the action history ring buffer on the target app side.

```typescript
interface ActionHistoryConfig {
  /** Maximum number of entries retained. Default: 1000. */
  readonly maxEntries: number;

  /**
   * Recording mode:
   * - "full": Records prevState and nextState.
   * - "lightweight": Strips prevState/nextState (saves memory, disables diffing).
   * - "off": No recording.
   */
  readonly mode: "full" | "lightweight" | "off";

  /** Probability of recording any given action (0-1). Default: 1. */
  readonly samplingRate?: number;

  /** Override sampling for specific conditions (always record these). */
  readonly alwaysRecord?: {
    readonly effectStatus?: readonly ("failed" | "pending")[];
    readonly portNames?: readonly string[];
    readonly actionNames?: readonly string[];
  };
}
```

### 2.6 StateDiff

Computed client-side in the dashboard when the user selects an action in Diff view. Not transmitted over WebSocket.

```typescript
interface StateDiff {
  /** Dot-bracket path notation (e.g., "items[0].qty", "user.name"). */
  readonly path: string;

  /** Type of change. */
  readonly operation: "add" | "remove" | "change";

  /** Value before the change (undefined for "add"). */
  readonly oldValue: unknown;

  /** Value after the change (undefined for "remove"). */
  readonly newValue: unknown;

  /** Nesting depth of this path (0 = root key). */
  readonly depth: number;
}
```

### 2.7 SubscriberGraph

The reactive dependency graph between store ports. Retrieved via `StoreInspectorAPI.getSubscriberGraph()`.

```typescript
interface SubscriberGraph {
  readonly correlationId: string;
  readonly nodes: readonly SubscriberNode[];
  readonly edges: readonly SubscriberEdge[];
}

interface SubscriberNode {
  readonly id: string;
  readonly kind: "state" | "atom" | "derived" | "async-derived";
  readonly subscriberCount: number;
}

interface SubscriberEdge {
  readonly from: string;
  readonly to: string;
  readonly type: "derives-from" | "subscribes-to" | "writes-to";
}
```

### 2.8 StorePanelState

Client-side UI state managed within the Store Panel component. Not persisted to localStorage.

```typescript
interface StorePanelState {
  /** Currently selected port name, or undefined for the overview table. */
  readonly selectedPortName: string | undefined;

  /** Index of the selected action in the timeline, or undefined. */
  readonly selectedActionId: string | undefined;

  /** Active view mode for the selected port. */
  readonly viewMode: "state" | "diff" | "actions";

  /** Text filter applied to action names in the timeline. */
  readonly actionFilter: string;

  /** Text filter applied to port names in the overview table. */
  readonly portFilter: string;

  /** Sort column and direction for the overview table. */
  readonly sortColumn: "portName" | "kind" | "subscriberCount" | "actionCount";
  readonly sortDirection: "asc" | "desc";

  /** Set of expanded paths in the JSON tree viewer (for State view). */
  readonly expandedPaths: ReadonlySet<string>;
}
```

### 2.9 StoreInspectorEvent

Events emitted by the store inspector, streamed over WebSocket. Used for real-time updates.

```typescript
type StoreInspectorEvent =
  | { readonly type: "action-dispatched"; readonly entry: ActionHistoryEntry }
  | { readonly type: "state-changed"; readonly portName: string }
  | { readonly type: "subscriber-added"; readonly portName: string; readonly count: number }
  | { readonly type: "subscriber-removed"; readonly portName: string; readonly count: number }
  | { readonly type: "effect-completed"; readonly portName: string; readonly actionName: string }
  | {
      readonly type: "effect-failed";
      readonly portName: string;
      readonly actionName: string;
      readonly error: EffectFailedError;
    }
  | { readonly type: "async-derived-failed"; readonly error: AsyncDerivedSelectError }
  | { readonly type: "snapshot-changed" };
```

---

## 3. Layout and Wireframes

### 3.1 Port Overview Table (Default View)

The landing view when the Store Panel is first selected. Shows all registered store ports.

```
+-----------------------------------------------------------------------+
| STORE                                                      [Refresh]  |
| Ports: 8  |  Subscribers: 23  |  Pending Effects: 1  |  [Filter ___] |
+-------+--------+-------------+----------+-------+--------+-----------+
| Port Name       | Kind        | Value    | Subs  | Actions| Scope     |
+-----------------+-------------+----------+-------+--------+-----------+
| cartState       | state       | {6 keys} | 3     | 42     | --        |
| authState       | state       | {3 keys} | 2     | 8      | --        |
| userAtom        | atom        | "jdoe"   | 1     | --     | --        |
| totalDerived    | derived     | 42.99    | 5     | --     | --        |
| searchAsync     | async-deriv | loading  | 2     | --     | req-123   |
| uiState         | state       | {2 keys} | 5     | 127    | --        |
| themeAtom       | atom        | "dark"   | 3     | --     | --        |
| filterDerived   | derived     | [3]      | 2     | --     | --        |
+-----------------+-------------+----------+-------+--------+-----------+
```

**Column definitions**:

- **Port Name**: `portName` from `PortSnapshot`. Monospace, clickable to drill into the port.
- **Kind**: `kind` discriminant. Displayed with a colored dot: state (indigo), atom (blue), derived (green), async-derived (amber).
- **Value**: Collapsed preview of the port's current value/state. For state ports: `state`; for atoms: `value`; for derived: `value`; for async-derived: `status` when not "success", otherwise `data`. Truncated to 20 characters with ellipsis.
- **Subs**: `subscriberCount`. Number badge.
- **Actions**: `actionCount` for state ports. "--" for non-state ports (atoms, derived, and async-derived do not have actions).
- **Scope**: `scopeId` if present, "--" otherwise. Clickable link to Scope Tree panel.

### 3.2 Selected Port View -- State Tab

After clicking a port in the overview table, the panel splits into the action timeline (left) and the state/diff inspector (right). The default tab is "State".

```
+-----------------------------------------------------------------------+
| STORE > cartState (state)              [<< Back]                      |
| Subs: 3  |  Actions: 42  |  Last Action: 2s ago                      |
|                                                [State] [Diff] [Actions]|
+---------------------------+-------------------------------------------+
| ACTION TIMELINE           | STATE INSPECTOR                           |
| [Filter: ___________]     |                                           |
|                           | {                                          |
| > 14:32:05 ADD_ITEM      |   items: [                                |
|   14:32:03 SET_QUANTITY   |     { id: 1, name: "Widget", qty: 2 },   |
|   14:32:01 LOAD_CART      |     { id: 7, name: "Gadget", qty: 1 },   |
|   14:31:58 INIT           |   ],                                      |
|                           |   total: 42.99,                           |
|   ... (38 more)           |   currency: "USD",                        |
|                           |   discount: null,                         |
|                           |   appliedCoupons: [],                     |
|                           |   lastUpdated: 1705330325000              |
|                           | }                                          |
+---------------------------+-------------------------------------------+
```

The selected action (indicated with `>`) is `ADD_ITEM`. The State tab shows the state **after** the selected action. If no action is selected, it shows the current live state.

### 3.3 Selected Port View -- Diff Tab

Side-by-side diff of `prevState` and `nextState` for the selected action.

```
+-----------------------------------------------------------------------+
| STORE > cartState (state)              [<< Back]                      |
| Subs: 3  |  Actions: 42  |  Last Action: 2s ago                      |
|                                                [State] [Diff] [Actions]|
+---------------------------+-------------------------------------------+
| ACTION TIMELINE           | DIFF: ADD_ITEM (14:32:05)                 |
| [Filter: ___________]     |                                           |
|                           |  BEFORE             | AFTER                |
| > 14:32:05 ADD_ITEM      |  {                  | {                    |
|   14:32:03 SET_QUANTITY   |    items: [         |   items: [           |
|   14:32:01 LOAD_CART      |      { id: 1,      |     { id: 1,         |
|   14:31:58 INIT           |        qty: 2 },   |       qty: 2 },      |
|                           |  -                  | +   { id: 7,         |
|   ... (38 more)           |                     |       name: "Gadget",|
|                           |                     |       qty: 1 },      |
|                           |    ],               |   ],                 |
|                           |  ~ total: 29.99     | ~ total: 42.99       |
|                           |    currency: "USD",  |   currency: "USD",   |
|                           |  }                  | }                    |
+---------------------------+-------------------------------------------+
```

**Diff markers**:

- `+` prefix with `--hex-success` background: Added keys/elements (green).
- `-` prefix with `--hex-error` background: Removed keys/elements (red).
- `~` prefix with `--hex-warning` background: Changed values (amber).
- Unchanged lines: default text color, no highlight.

### 3.4 Selected Port View -- Actions Tab

Full chronological action list with expandable payloads and effect status.

```
+-----------------------------------------------------------------------+
| STORE > cartState (state)              [<< Back]                      |
| Subs: 3  |  Actions: 42  |  Last Action: 2s ago                      |
|                                                [State] [Diff] [Actions]|
+-----------------------------------------------------------------------+
| ACTIONS                                          [Filter: ___________]|
+----------+-----------+----------+--------+--------+-------------------+
| Time     | Action    | Payload  | Effect | Trace  | Details           |
+----------+-----------+----------+--------+--------+-------------------+
| 14:32:05 | ADD_ITEM  | {id:7..} | none   | abc-1  | [Expand]          |
| 14:32:03 | SET_QTY   | {id:1,q} | done   | abc-2  | [Expand]          |
| 14:32:01 | LOAD_CART | {user:.} | done   | abc-3  | [Expand]          |
| 14:31:58 | INIT      | --       | none   | --     | [Expand]          |
|          |           |          |        |        |                   |
| v 14:31:55 BATCH_SET | {items:} | failed | abc-4  |                   |
|   Payload: { items: [{ id: 3, qty: 5 }] }                            |
|   Effect Error: BATCH_WRITE_FAILED                                    |
|     message: "Database write timeout"                                 |
|     cause: TimeoutError                                               |
|   Trace: abc-4 [-> Tracing]                                          |
+-----------------------------------------------------------------------+
```

**Column definitions**:

- **Time**: `timestamp` formatted as `HH:MM:SS`.
- **Action**: `actionName`. Monospace.
- **Payload**: Truncated JSON preview of `payload`. "--" when `payload` is undefined.
- **Effect**: Badge for `effectStatus`: "none" (gray), "pending" (blue spinner), "done" (green check), "failed" (red x).
- **Trace**: `traceId` truncated to 5 chars. Clickable link to Tracing panel. "--" when absent.
- **Details**: Expand button. When expanded, shows full payload JSON tree, effect error details (if any), and full traceId/spanId.

### 3.5 Derived/Atom Port View

When a derived or atom port is selected, the timeline pane is replaced with port metadata since these port kinds do not have actions.

```
+-----------------------------------------------------------------------+
| STORE > totalDerived (derived)         [<< Back]                      |
| Subs: 5  |  Stale: no  |  Sources: cartState, discountAtom           |
|                                                          [State]      |
+-----------------------------------------------------------------------+
| PORT DETAILS                | VALUE INSPECTOR                         |
|                             |                                         |
| Kind: derived               | 42.99                                   |
| Subscriber Count: 5         |                                         |
| Is Stale: false             | (primitive value -- no tree expansion)   |
| Source Ports:               |                                         |
|   cartState [->]            |                                         |
|   discountAtom [->]         |                                         |
| Scope: --                   |                                         |
+-----------------------------------------------------------------------+
```

Source port names are clickable links that navigate to that port within the Store Panel.

### 3.6 Async-Derived Port View

```
+-----------------------------------------------------------------------+
| STORE > searchAsync (async-derived)    [<< Back]                      |
| Subs: 2  |  Status: loading  |  Sources: searchQuery                 |
|                                                [State] [Error]        |
+-----------------------------------------------------------------------+
| PORT DETAILS                | DATA INSPECTOR                          |
|                             |                                         |
| Kind: async-derived         | Status: loading                         |
| Status: loading             | Data: (no data yet)                     |
| Subscriber Count: 2         |                                         |
| Source Ports:               | Error:                                   |
|   searchQuery [->]          |   (none)                                 |
| Scope: req-123 [->]        |                                         |
+-----------------------------------------------------------------------+
```

When status is "error", an Error tab appears showing the `error` field as a JSON tree with `--hex-error` styling.

### 3.7 Store Selector (Multiple Ports Header)

When more than 8 ports are registered, the overview table becomes scrollable. A quick-access dropdown appears next to the Back button for direct port navigation.

```
+-----------------------------------------------------------------------+
| STORE > [cartState       v]            [<< Back]                      |
|          +-----------------+                                          |
|          | cartState       |                                          |
|          | authState       |                                          |
|          | userAtom        |                                          |
|          | totalDerived    |                                          |
|          | searchAsync     |                                          |
|          | uiState         |                                          |
|          | themeAtom       |                                          |
|          | filterDerived   |                                          |
|          +-----------------+                                          |
```

The dropdown is filterable with type-ahead search when more than 15 ports are registered.

### 3.8 Empty State (No Ports Registered)

```
+-----------------------------------------------------------------------+
| STORE                                                      [Refresh]  |
+-----------------------------------------------------------------------+
|                                                                       |
|                                                                       |
|                     No store ports registered.                        |
|                                                                       |
|           Register state, atom, or derived ports with                 |
|           the store library to see them here.                         |
|                                                                       |
|                                                                       |
+-----------------------------------------------------------------------+
```

Text is centered, `--hex-text-muted` color, `--hex-font-size-md`.

### 3.9 Empty Action Timeline

When a state port has been registered but no actions have been dispatched.

```
+---------------------------+-------------------------------------------+
| ACTION TIMELINE           | STATE INSPECTOR                           |
|                           |                                           |
|                           | {                                          |
|   No actions dispatched.  |   items: [],                              |
|   Dispatch an action to   |   total: 0                                |
|   see the timeline.       | }                                          |
|                           |                                           |
+---------------------------+-------------------------------------------+
```

---

## 4. Component Tree

```
StorePanel (root)
  |
  +-- StoreHeader
  |     Displays summary metrics: port count, total subscribers, pending effects.
  |     Contains the port filter input and Refresh button.
  |
  +-- PortOverviewTable (shown when no port is selected)
  |     +-- PortOverviewRow (one per port)
  |           Displays portName, kind badge, value preview, subs, actions, scope.
  |           Click handler sets selectedPortName.
  |
  +-- SelectedPortView (shown when a port is selected)
        |
        +-- PortBreadcrumb
        |     Shows "STORE > portName (kind)" with Back button and optional dropdown.
        |
        +-- PortMetricsBar
        |     Shows subs, actions, lastAction, staleness, sources (varies by kind).
        |
        +-- ViewModeTabs
        |     Tab bar: State | Diff | Actions. Active tab highlighted with --hex-accent.
        |     For atom/derived: only State tab. For async-derived: State and Error tabs.
        |
        +-- SplitPane (for state ports; State and Diff tabs)
        |     |
        |     +-- ActionTimeline (left pane, 35% width)
        |     |     +-- ActionFilterInput
        |     |     +-- ActionTimelineEntry (one per action, virtualized)
        |     |           Displays timestamp, actionName, effect status badge.
        |     |           Selected entry highlighted with --hex-bg-active.
        |     |
        |     +-- StateViewer (right pane, 65% width; shown on State tab)
        |     |     +-- JsonTreeViewer (reused from generic panel, Section 12.4)
        |     |           Recursive tree rendering of the port's state/value.
        |     |
        |     +-- DiffViewer (right pane, 65% width; shown on Diff tab)
        |           +-- DiffHeader (action name, timestamp)
        |           +-- SideBySideDiff
        |                 +-- DiffLineLeft (prevState lines)
        |                 +-- DiffLineRight (nextState lines)
        |                 Color-coded: add/remove/change per StateDiff entries.
        |
        +-- ActionListView (shown on Actions tab; full width, no split pane)
        |     +-- ActionListHeader (column labels)
        |     +-- ActionListRow (one per action, virtualized)
        |           +-- ActionPayloadExpander
        |                 Inline expansion showing full payload, effect error, traceId.
        |
        +-- PortDetailView (for atom/derived/async-derived; replaces SplitPane)
              +-- PortMetadataList (kind, sources, scope, staleness)
              +-- ValueViewer
                    +-- JsonTreeViewer (for complex values)
                    +-- PrimitiveValueDisplay (for scalar values)
```

---

## 5. Interaction Model

### 5.1 Selecting a Port from the Overview Table

- **Click** a row in the `PortOverviewTable` to set `selectedPortName` to that port's `portName`.
- The panel transitions from the overview table to the `SelectedPortView`.
- Default `viewMode` is `"state"`. Default `selectedActionId` is `undefined` (shows current live state).
- For state ports: the `SplitPane` renders with `ActionTimeline` (left) and `StateViewer` (right).
- For atom/derived/async-derived: the `PortDetailView` renders without a timeline.

### 5.2 Navigating Back to Overview

- Click the `[<< Back]` button or press `Escape` to clear `selectedPortName` and return to the overview table.
- Previous scroll position in the overview table is restored.

### 5.3 Switching View Modes (State / Diff / Actions)

- Click a tab in `ViewModeTabs` to change `viewMode`.
- **State tab**: Right pane shows `StateViewer` with the state after the selected action (or current live state if no action is selected).
- **Diff tab**: Right pane shows `DiffViewer` with side-by-side `prevState` vs `nextState` for the selected action. If no action is selected, shows a prompt: "Select an action in the timeline to view its diff."
- **Actions tab**: The split pane is replaced by a full-width `ActionListView` table.
- The selected tab has `--hex-accent` underline and text color. Inactive tabs use `--hex-text-secondary`.

### 5.4 Selecting an Action in the Timeline

- **Click** an entry in the `ActionTimeline` to set `selectedActionId`.
- The selected entry receives `--hex-bg-active` background.
- On the State tab: `StateViewer` updates to show `nextState` of the selected action (state after the action).
- On the Diff tab: `DiffViewer` updates to show the diff between `prevState` and `nextState`.
- **Click the already-selected entry** to deselect (`selectedActionId` becomes `undefined`), returning to live state view.

### 5.5 Expanding/Collapsing JSON Tree Nodes

- **Click** the chevron (`>` / `v`) on any object or array node to toggle expansion.
- Expanded path is added to / removed from the `expandedPaths` set in `StorePanelState`.
- Default: root level expanded, all nested nodes collapsed.
- **Double-click** a collapsed node to expand it and all its children recursively (one level deep).

### 5.6 Filtering Actions by Type

- The `ActionFilterInput` in the timeline accepts text input.
- Filters `ActionHistoryEntry` entries by case-insensitive substring match on `actionName`.
- Debounced by 150ms.
- The filter persists across action selections but resets when navigating to a different port.

### 5.7 Filtering Ports in the Overview Table

- The filter input in the `StoreHeader` filters rows by case-insensitive substring match on `portName`.
- Debounced by 150ms.

### 5.8 Sorting the Overview Table

- Click a column header to sort by that column.
- First click: ascending. Second click on the same column: descending. Third click: resets to default (ascending by portName).
- Sort indicator arrow (`--hex-text-secondary`) appears next to the active sort column header.

### 5.9 Expanding an Action Row (Actions Tab)

- Click `[Expand]` or the row itself in `ActionListView` to toggle the `ActionPayloadExpander`.
- The expanded view shows:
  - Full `payload` as a JSON tree.
  - `effectStatus` badge with details.
  - `effectError` details if `effectStatus` is `"failed"` (error code, message, cause).
  - Full `traceId` and `spanId` as clickable links.
  - `parentId` as a clickable link that scrolls to the parent action (if present in the buffer).
- Only one action row can be expanded at a time. Expanding a new row collapses the previously expanded one.

### 5.10 Keyboard Navigation

| Key                        | Context                 | Action                                                   |
| -------------------------- | ----------------------- | -------------------------------------------------------- |
| `ArrowUp` / `ArrowDown`    | Action timeline focused | Move selection to previous/next action                   |
| `Enter`                    | Action timeline focused | Select the focused action                                |
| `Escape`                   | Port selected           | Return to overview table                                 |
| `Escape`                   | Action expanded         | Collapse expanded action                                 |
| `Tab`                      | Any                     | Move focus between panes (timeline -> inspector -> tabs) |
| `1` / `2` / `3`            | View mode tabs focused  | Switch to State / Diff / Actions tab                     |
| `ArrowLeft` / `ArrowRight` | JSON tree node focused  | Collapse / expand node                                   |
| `/`                        | Panel focused           | Focus the action filter input                            |

---

## 6. Diff Algorithm

### 6.1 Deep Recursive Comparison

The diff is computed client-side in the dashboard when the Diff tab is selected and an action is chosen. The algorithm recursively compares `prevState` and `nextState`:

1. **Primitive comparison**: If both values are primitives (string, number, boolean, null, undefined), compare with strict equality. If different, emit a `StateDiff` with `operation: "change"`.

2. **Type mismatch**: If `typeof prevState !== typeof nextState` or one is an array and the other is not, treat as a removal of the old value and addition of the new value.

3. **Object comparison**: For plain objects, iterate the union of keys from both objects:
   - Key exists only in `nextState`: emit `operation: "add"`.
   - Key exists only in `prevState`: emit `operation: "remove"`.
   - Key exists in both: recurse.

4. **Array comparison**: Compare element-by-element by index:
   - For each index `i` from `0` to `max(prev.length, next.length)`:
     - If `i >= prev.length`: emit `operation: "add"` for `path[i]`.
     - If `i >= next.length`: emit `operation: "remove"` for `path[i]`.
     - Otherwise: recurse on `prev[i]` vs `next[i]`.

### 6.2 Path Notation

Paths use dot notation for object keys and bracket notation for array indices:

- `"items"` -- root-level key
- `"items[0]"` -- first array element
- `"items[0].qty"` -- nested property within array element
- `"user.address.city"` -- deeply nested key

Keys containing dots or brackets are escaped with quotes: `"config[\"my.key\"]"`.

### 6.3 Performance Considerations

- **Lazy computation**: Diff is computed only when the Diff tab is active and an action is selected. Switching away from the Diff tab discards the diff result (it is re-computed on return).
- **Depth limit**: Recursion stops at depth 20. Deeper structures show "... (too deep)" in the diff output.
- **Large state truncation**: If the total number of `StateDiff` entries exceeds 500, the diff view shows the first 500 entries with a "Showing 500 of N changes. Click to show all." link.
- **Referential equality shortcut**: If `prevState === nextState` (same reference), skip the entire subtree and emit zero diffs. This is common for unchanged sub-objects in immutable state patterns.

### 6.4 Lightweight Mode Handling

When the target app's `ActionHistoryConfig.mode` is `"lightweight"`, `prevState` and `nextState` are `undefined`. The Diff tab shows: "Diffing unavailable. Action history is in lightweight mode (prevState/nextState not recorded)." with `--hex-text-muted` color.

---

## 7. Real-Time Updates

### 7.1 WebSocket Subscription

The Store Panel subscribes to `StoreInspectorEvent` messages from the `RemoteInspectorAPI`. Events arrive as library-scoped inspector events (source: `"store"`).

### 7.2 Event Handling

| Event Type                                | Panel Behavior                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action-dispatched`                       | Append the new `ActionHistoryEntry` to the timeline. If the current view is State with no action selected, the state viewer updates to reflect the new current state. If the new action's `portName` matches the selected port, the timeline scrolls to show the new entry (unless the user has scrolled away from the top). |
| `state-changed`                           | Refresh the `PortSnapshot` for the affected port. Update the overview table row. Update the State viewer if the affected port is selected.                                                                                                                                                                                   |
| `subscriber-added` / `subscriber-removed` | Update the `subscriberCount` in the overview table and the port metrics bar.                                                                                                                                                                                                                                                 |
| `effect-completed`                        | Update the `effectStatus` badge on the corresponding action in the timeline from "pending" to "done" (green).                                                                                                                                                                                                                |
| `effect-failed`                           | Update the `effectStatus` badge to "failed" (red). If the affected action is selected, the detail area shows the error.                                                                                                                                                                                                      |
| `snapshot-changed`                        | Re-fetch the full `StoreLibrarySnapshot` and update all views.                                                                                                                                                                                                                                                               |

### 7.3 Action Buffer Overflow

The action history on the target app is a ring buffer (default: 1000 entries). When the buffer is full, the oldest entry is evicted. On the dashboard side:

- If the evicted entry is visible in the current timeline, it disappears from the bottom of the list.
- If the evicted entry is the currently selected action, the selection is cleared and the State tab shows current live state.
- A subtle indicator at the bottom of the timeline shows: "Showing latest N of M total dispatches" when `M > N`.

### 7.4 Flash Animation on State Changes

When a property in the State viewer changes value due to a real-time update:

1. The changed property's value text briefly flashes with `--hex-warning` background color.
2. The flash animation lasts 600ms, fading from `--hex-warning-muted` to transparent.
3. This only applies in the live state view (no action selected). When viewing a historical action's state, no flash occurs.
4. Respects `prefers-reduced-motion`: when reduced motion is preferred, the flash is replaced by a 2-second border highlight (no animation).

---

## 8. Color and Styling

### 8.1 Diff Colors

| Change Type | Background            | Text                                    | Marker                 |
| ----------- | --------------------- | --------------------------------------- | ---------------------- |
| Added       | `--hex-success-muted` | `--hex-text-primary`                    | `+` in `--hex-success` |
| Removed     | `--hex-error-muted`   | `--hex-text-primary` with strikethrough | `-` in `--hex-error`   |
| Changed     | `--hex-warning-muted` | `--hex-text-primary`                    | `~` in `--hex-warning` |
| Unchanged   | transparent           | `--hex-text-muted`                      | (none)                 |

### 8.2 Port Kind Badges

| Kind            | Color                               | Background            |
| --------------- | ----------------------------------- | --------------------- |
| `state`         | `--hex-lifetime-singleton` (indigo) | `--hex-accent-muted`  |
| `atom`          | `--hex-info` (blue)                 | `--hex-info-muted`    |
| `derived`       | `--hex-success` (green)             | `--hex-success-muted` |
| `async-derived` | `--hex-warning` (amber)             | `--hex-warning-muted` |

### 8.3 Effect Status Badges

| Status      | Icon      | Color              |
| ----------- | --------- | ------------------ |
| `none`      | `--`      | `--hex-text-muted` |
| `pending`   | Spinner   | `--hex-info`       |
| `completed` | Checkmark | `--hex-success`    |
| `failed`    | X mark    | `--hex-error`      |

### 8.4 Action Timeline Styling

- Selected action: `--hex-bg-active` background, `--hex-accent` left border (3px).
- Hover: `--hex-bg-hover` background.
- Action name: `--hex-font-mono`, `--hex-font-size-sm`.
- Timestamp: `--hex-text-muted`, `--hex-font-size-xs`.

### 8.5 View Mode Tab Styling

- Active tab: `--hex-accent` text color, 2px `--hex-accent` bottom border.
- Inactive tab: `--hex-text-secondary`, no border.
- Hover: `--hex-text-primary`.
- Tab padding: `--hex-space-sm` horizontal, `--hex-space-xs` vertical.

### 8.6 JSON Tree Syntax Highlighting

Consistent with the generic JSON tree viewer from Section 12.4:

| Value Type           | Color                       |
| -------------------- | --------------------------- |
| String               | `--hex-success`             |
| Number               | `--hex-info`                |
| Boolean              | `--hex-accent`              |
| `null` / `undefined` | `--hex-text-muted` (italic) |
| Object key           | `--hex-text-primary`        |
| Bracket/brace        | `--hex-text-secondary`      |

### 8.7 Async-Derived Status Indicators

| Status    | Color              | Badge Style          |
| --------- | ------------------ | -------------------- |
| `idle`    | `--hex-text-muted` | Gray outline         |
| `loading` | `--hex-info`       | Blue pulse animation |
| `success` | `--hex-success`    | Green filled         |
| `error`   | `--hex-error`      | Red filled           |

---

## 9. Cross-Panel Navigation

### 9.1 Outbound Links (Store Panel -> Other Panels)

| Trigger                                         | Target Panel | Target Selection                             |
| ----------------------------------------------- | ------------ | -------------------------------------------- |
| Click `traceId` on any action entry             | Tracing      | Filter by that `traceId`                     |
| Click `spanId` on expanded action detail        | Tracing      | Select that span                             |
| Click `scopeId` on a scoped port                | Scope Tree   | Select that scope                            |
| Click `portName` in source ports list (derived) | Store Panel  | Navigate to that port within the Store panel |

### 9.2 Inbound Links (Other Panels -> Store Panel)

| Source Panel | Trigger                                     | Store Panel Behavior                            |
| ------------ | ------------------------------------------- | ----------------------------------------------- |
| Overview     | Click "Store" library summary card          | Switch to Store Panel, show overview table      |
| Event Log    | Click `store` library event (state-changed) | Switch to Store Panel, select the affected port |
| Container    | Click port name for a store-registered port | Switch to Store Panel, select that port         |

### 9.3 Navigation Implementation

All cross-panel navigation uses the shared `navigateTo(panel, selection)` callback from the dashboard navigation context (Section 12 of 04-panels.md). The Store Panel reads the `selection` parameter on mount:

```typescript
interface StoreNavigationSelection {
  readonly portName?: string;
  readonly traceId?: string;
  readonly actionId?: string;
}
```

When `portName` is provided, the panel auto-selects that port. When `traceId` is provided, the action filter is set to filter by that traceId.

---

## 10. Error States and Edge Cases

### 10.1 No Ports Registered

Display the empty state wireframe (Section 3.8). The Refresh button remains active.

### 10.2 Very Large State Object

When a port's state exceeds 1000 keys (at any nesting level), the JSON tree viewer virtualizes nodes using the same virtual scrolling strategy as the Event Log (Section 12.16 of 04-panels.md). Only visible nodes plus a 20-node overscan buffer are mounted as DOM elements. The tree expansion state (`expandedPaths`) determines which nodes are visible.

### 10.3 Circular References in Payload

The store library's inspection types use `unknown` for state and payload values. If the serialized data from WebSocket contains circular references (which should not happen since JSON serialization breaks cycles), the JSON tree viewer displays: "[Circular Reference]" in `--hex-error` color at the point of recursion.

In practice, the devtools-client performs `JSON.parse(JSON.stringify(...))` on snapshot data before transmission, which strips circular references. If the resulting value is `undefined` (serialization failed), the viewer shows: "Value could not be serialized" in `--hex-text-muted`.

### 10.4 1000+ Actions in Timeline Buffer

The `ActionTimeline` uses virtual scrolling. The scroll container renders only visible entries plus a 30-entry overscan buffer. With a default `maxEntries` of 1000, this means at most ~60 DOM elements regardless of buffer size.

The timeline footer shows: "Showing latest 1000 of 4,521 total dispatches" (where 4,521 is the total dispatches ever, including evicted ones). This count comes from the inspector's event stream tracking.

### 10.5 Port Disposed During Viewing

When a `port-unregistered` or `scope-unregistered` event fires for the currently selected port:

1. The port's row in the overview table is removed.
2. If the port is currently selected, a banner appears: "Port '[portName]' was unregistered." with `--hex-warning` background.
3. The state viewer shows the last known state (frozen) with `--hex-text-muted` styling.
4. After 5 seconds, auto-navigate back to the overview table.

### 10.6 Lightweight History Mode

When the target app's `ActionHistoryConfig.mode` is `"lightweight"`:

- Action timeline entries do not show state diffs.
- The Diff tab shows an informational message (Section 6.4).
- The Actions tab still shows action names, timestamps, payloads, and effect status.
- The State tab shows only the current live state (historical state viewing is unavailable).

### 10.7 History Mode Off

When `ActionHistoryConfig.mode` is `"off"`:

- The action timeline is empty.
- A message appears: "Action recording is disabled. Set history mode to 'full' or 'lightweight' to see action history."
- The State tab still shows current live state.

### 10.8 Async-Derived Error Display

When an `async-derived-failed` event fires for a selected async-derived port:

- The status badge updates to "error".
- The Error tab (if visible) updates with the new error details.
- The error is displayed as a JSON tree of the `AsyncDerivedSelectError`.

---

## 11. Time-Travel Concept

### 11.1 v1 Capability: Read-Only Historical State

The Store Panel supports selecting a past action to view the state as it was at that point. This is a read-only operation:

- Selecting action N shows `nextState` of action N in the State viewer.
- The Diff tab shows the diff between `prevState` and `nextState` of action N.
- The timeline visually indicates the "current viewing position" with a marker.

This is not true time-travel debugging. The target application's actual state is not rewound. The panel merely displays the recorded historical state snapshots.

### 11.2 Future: Action Replay

A future version could support:

- **Checkpoint selection**: Mark an action as a checkpoint. Store the full state at that point.
- **Replay from checkpoint**: Re-dispatch all actions from the checkpoint to the present, showing the state evolution step-by-step.
- **Dispatch from DevTools**: Send a synthetic action to the target app via WebSocket.

### 11.3 Why Read-Only in v1

- **Safety**: Dispatching actions from DevTools could corrupt application state if the action depends on side effects, user input, or server state that is no longer available.
- **Complexity**: True time-travel requires the store to support state rollback, action replay, and effect suppression. This is a significant runtime feature that belongs in `@hex-di/store` core, not in the DevTools panel.
- **Scope**: v1 focuses on inspection and debugging. The historical state viewer already provides the core debugging value (understanding how state evolved) without the risk of mutation.

---

## 12. Accessibility

### 12.1 Port Overview Table

- Table uses `role="grid"` with `role="row"` and `role="gridcell"` for each cell.
- Column headers use `role="columnheader"` with `aria-sort` attribute for the active sort column.
- Rows are focusable with `tabindex="0"`. Arrow keys navigate between rows.
- Selected row has `aria-selected="true"`.
- Filter input has `aria-label="Filter ports by name"`.

### 12.2 Action Timeline

- Timeline list uses `role="listbox"` with `role="option"` for each entry.
- Selected action has `aria-selected="true"`.
- Arrow keys navigate between entries.
- Screen reader announcement on selection: "Selected action [actionName] at [timestamp]".

### 12.3 View Mode Tabs

- Tab bar uses `role="tablist"` with `role="tab"` for each tab.
- Active tab has `aria-selected="true"`.
- Tab panels use `role="tabpanel"` with `aria-labelledby` pointing to the corresponding tab.
- Keyboard: `ArrowLeft`/`ArrowRight` to switch tabs within the tab bar.

### 12.4 JSON Tree Viewer

- Tree uses `role="tree"` with `role="treeitem"` for each node.
- Expandable nodes have `aria-expanded="true"` or `aria-expanded="false"`.
- Keyboard: `ArrowRight` to expand, `ArrowLeft` to collapse, `ArrowUp`/`ArrowDown` to navigate.

### 12.5 Diff Viewer

- Side-by-side diff uses `role="table"` with `role="row"` per diff line.
- Added lines have `aria-label="Added: [path] = [newValue]"`.
- Removed lines have `aria-label="Removed: [path] was [oldValue]"`.
- Changed lines have `aria-label="Changed: [path] from [oldValue] to [newValue]"`.
- Color is never the sole indicator of change type; the `+`, `-`, `~` markers and ARIA labels provide redundant channels.

### 12.6 Focus Management

- When selecting a port, focus moves to the first interactive element in the `SelectedPortView` (the first tab in `ViewModeTabs`).
- When pressing Escape to go back, focus returns to the previously selected row in the overview table.
- When selecting an action in the timeline, focus remains on the timeline (not moved to the state viewer).

---

## 13. Testing Requirements

### 13.1 Rendering Tests

- Renders the overview table with all port types (state, atom, derived, async-derived) and correct column values.
- Renders the correct kind badge color for each port type.
- Renders the empty state when no ports are registered.
- Renders the selected port view with correct breadcrumb and metrics bar.
- Renders the action timeline entries in reverse chronological order.
- Renders the State tab with a JSON tree of the selected action's `nextState`.
- Renders the Diff tab with side-by-side diff and correct color coding.
- Renders the Actions tab with all columns populated.
- Renders the derived port detail view with source port links.
- Renders the async-derived port view with status indicator.
- Renders the "lightweight mode" message when diffing is unavailable.
- Renders the "history off" message when recording is disabled.
- Renders the flash animation on state value change.
- Renders the disposed port banner.

### 13.2 Diff Computation Tests

- Computes correct diff for a simple flat object change (add, remove, change).
- Computes correct diff for nested object changes at multiple depths.
- Computes correct diff for array element addition at the end.
- Computes correct diff for array element removal from the middle.
- Computes correct diff for array element value change.
- Returns empty diff array when `prevState === nextState` (referential equality).
- Returns empty diff array when `prevState` deep-equals `nextState`.
- Handles `null` to object transitions as add operations.
- Handles object to `null` transitions as remove operations.
- Handles type changes (number to string) as change operations.
- Respects depth limit (20) and emits truncation marker.
- Respects max diff count (500) and emits overflow indicator.
- Handles deeply nested arrays of objects.
- Handles empty object `{}` to populated object transitions.
- Correct path notation for keys with dots and brackets.

### 13.3 Interaction Tests

- Clicking a port row transitions to the selected port view.
- Clicking Back returns to the overview table.
- Clicking a view mode tab switches the active tab and renders the correct panel.
- Clicking an action in the timeline selects it and updates the state/diff viewer.
- Clicking the selected action again deselects it.
- Typing in the action filter input filters timeline entries.
- Typing in the port filter input filters overview table rows.
- Clicking a column header sorts the overview table.
- Expanding an action row in the Actions tab shows payload and effect details.
- Clicking traceId navigates to the Tracing panel.
- Clicking scopeId navigates to the Scope Tree panel.
- Clicking a source port name navigates to that port within the Store Panel.
- Keyboard navigation (ArrowUp/ArrowDown) in the action timeline.
- Escape key returns to overview from selected port view.
- Tab key cycles focus between panes.

### 13.4 Real-Time Update Tests

- New `action-dispatched` event appends entry to the timeline.
- New `state-changed` event updates the state viewer when viewing the affected port.
- New `subscriber-added` event increments subscriber count in overview table.
- New `effect-completed` event updates the effect status badge from pending to done.
- New `effect-failed` event updates the effect status badge and shows error details.
- Buffer overflow: oldest action disappears from timeline when maxEntries is exceeded.
- Buffer overflow: clears selection if the selected action is evicted.
- `snapshot-changed` event triggers full re-render with updated data.

### 13.5 Large State Performance Tests

- Overview table with 100+ ports renders without layout jank (virtual scrolling).
- Action timeline with 1000 entries renders with virtual scrolling (DOM element count < 80).
- JSON tree with a 500-key root object renders with virtual scrolling.
- Diff computation for a state with 200 changed keys completes within 50ms.

### 13.6 Empty/Error State Tests

- No ports registered: displays empty state message.
- Port with zero actions: displays empty timeline message.
- Port disposed during viewing: displays disposed banner and auto-navigates.
- Lightweight mode: Diff tab shows informational message.
- History off: timeline shows disabled message.
- Async-derived error state: displays error details with correct styling.
- WebSocket disconnection: displays last known state with "disconnected" indicator.
