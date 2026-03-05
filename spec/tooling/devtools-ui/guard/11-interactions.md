_Previous: [10-visual-encoding.md](10-visual-encoding.md) | Next: [12-educational-features.md](12-educational-features.md)_

# 11. Interactions & Navigation

Mouse, keyboard, cross-panel navigation, and real-time update behaviors for the Guard Panel.

## 11.1 Global Keyboard Shortcuts

Shortcuts available in all views within the Guard Panel:

| Key                 | Action                                                                             |
| ------------------- | ---------------------------------------------------------------------------------- |
| `1` - `7`           | Switch to view (1=Tree, 2=Log, 3=Paths, 4=Sankey, 5=Timeline, 6=Roles, 7=Overview) |
| `?`                 | Toggle educational sidebar                                                         |
| `Escape`            | Close detail panel / deselect / close sidebar                                      |
| `Ctrl+F`            | Focus search/filter input                                                          |
| `Ctrl+E`            | Focus port selector                                                                |
| `Ctrl+Shift+E`      | Focus execution selector                                                           |
| `Tab` / `Shift+Tab` | Standard focus navigation                                                          |
| `Ctrl+[` / `Ctrl+]` | Navigate previous/next execution                                                   |

## 11.2 Policy Evaluation Tree Interactions

### Mouse

| Interaction  | Target     | Effect                                         |
| ------------ | ---------- | ---------------------------------------------- |
| Click        | Node       | Select node, open detail panel                 |
| Double-click | Node       | Toggle subtree expand/collapse                 |
| Hover        | Node       | Show tooltip with kind description and outcome |
| Hover        | Edge       | Highlight edge and connected nodes             |
| Click+drag   | Background | Pan the viewport                               |
| Mouse wheel  | Canvas     | Zoom centered on cursor position               |
| Right-click  | Node       | Context menu: Copy, Navigate to Log, Simulate  |

### Keyboard (when tree is focused)

| Key             | Action                                 |
| --------------- | -------------------------------------- |
| `Arrow Up/Down` | Navigate between sibling nodes         |
| `Arrow Left`    | Navigate to parent node                |
| `Arrow Right`   | Navigate to first child node           |
| `Enter`         | Select focused node (open detail)      |
| `Space`         | Toggle expand/collapse of focused node |
| `Home`          | Focus root node                        |
| `End`           | Focus last leaf node (depth-first)     |
| `+` / `-`       | Zoom in / out (10% increments)         |
| `0`             | Reset zoom to fit content              |
| `P`             | Play/pause evaluation playback         |
| `N`             | Step to next node (during playback)    |

## 11.3 Decision Log Interactions

### Mouse

| Interaction  | Target          | Effect                                                   |
| ------------ | --------------- | -------------------------------------------------------- |
| Click        | Row             | Select entry, open detail panel                          |
| Double-click | Row             | Navigate to Tree view with that execution                |
| Hover        | Row             | Highlight row                                            |
| Click        | Column header   | Sort by column (toggle asc/desc)                         |
| Click        | Filter dropdown | Open filter menu                                         |
| Right-click  | Row             | Context menu: Copy JSON, View in Tree, Filter to Subject |

### Keyboard (when log is focused)

| Key             | Action                                   |
| --------------- | ---------------------------------------- |
| `Arrow Up/Down` | Navigate between log entries             |
| `Enter`         | Select focused entry (open detail)       |
| `Ctrl+C`        | Copy selected entry as JSON to clipboard |
| `Page Up/Down`  | Scroll one page                          |
| `Home`          | Scroll to newest entry                   |
| `End`           | Scroll to oldest entry                   |

## 11.4 Policy Path Explorer Interactions

### Mouse

| Interaction | Target       | Effect                                 |
| ----------- | ------------ | -------------------------------------- |
| Click       | Path         | Select path, open detail panel         |
| Hover       | Path         | Highlight path; show frequency tooltip |
| Click       | Simulate     | Open what-if simulation panel          |
| Click       | Node in path | Highlight that node across all paths   |

### Keyboard

| Key             | Action                 |
| --------------- | ---------------------- |
| `Arrow Up/Down` | Navigate between paths |
| `Enter`         | Select focused path    |
| `S`             | Open simulation panel  |
| `R`             | Reset simulation       |

## 11.5 Access Flow Statistics Interactions

### Mouse

| Interaction  | Target        | Effect                                         |
| ------------ | ------------- | ---------------------------------------------- |
| Click        | Sankey node   | Filter flows through that node; show tooltip   |
| Hover        | Sankey node   | Highlight connected flows, dim others          |
| Hover        | Sankey link   | Show flow detail tooltip                       |
| Click        | Hotspot entry | Navigate to Decision Log filtered to that port |
| Double-click | Subject node  | Navigate to Decision Log filtered to subject   |
| Double-click | Port node     | Navigate to Tree view for that port            |

### Keyboard

| Key                | Action                                   |
| ------------------ | ---------------------------------------- |
| `Arrow Left/Right` | Navigate between Sankey columns          |
| `Arrow Up/Down`    | Navigate between nodes within column     |
| `Enter`            | Activate selected node (filter/navigate) |

## 11.6 Evaluation Timeline Interactions

### Mouse

| Interaction | Target    | Effect                                      |
| ----------- | --------- | ------------------------------------------- |
| Click       | Row bar   | Select that node, show timing detail        |
| Hover       | Row bar   | Show tooltip with duration and outcome      |
| Hover       | Async bar | Show resolver detail tooltip                |
| Click       | Compare   | Enable compare mode with execution selector |
| Click+drag  | Time axis | Zoom to selected time range                 |

### Keyboard

| Key             | Action                         |
| --------------- | ------------------------------ |
| `Arrow Up/Down` | Navigate between timeline rows |
| `Enter`         | Select focused row             |
| `C`             | Toggle compare mode            |
| `+` / `-`       | Zoom time scale in / out       |

## 11.7 Role Hierarchy Graph Interactions

### Mouse

| Interaction  | Target     | Effect                                    |
| ------------ | ---------- | ----------------------------------------- |
| Click        | Role node  | Select role, show detail panel            |
| Double-click | Role node  | Toggle expanded (show permissions inline) |
| Hover        | Role node  | Highlight ancestors and descendants       |
| Hover        | Edge       | Show "inherits" label                     |
| Click+drag   | Background | Pan the viewport                          |
| Mouse wheel  | Canvas     | Zoom centered on cursor                   |

### Keyboard

| Key                | Action                       |
| ------------------ | ---------------------------- |
| `Arrow Up`         | Navigate to parent role      |
| `Arrow Down`       | Navigate to first child role |
| `Arrow Left/Right` | Navigate between siblings    |
| `Enter`            | Select focused role          |
| `Space`            | Toggle expanded mode         |
| `+` / `-`          | Zoom in / out                |
| `0`                | Reset zoom to fit            |

## 11.8 Cross-View Navigation

Clicking elements in one view can navigate to another view with context:

| Source View | Trigger                     | Target View         | Context Passed                |
| ----------- | --------------------------- | ------------------- | ----------------------------- |
| Log         | Double-click entry          | Tree                | `executionId`, `descriptorId` |
| Log         | "View in Tree" button       | Tree                | `executionId`, `descriptorId` |
| Tree        | Click policy kind in detail | Educational sidebar | `policyKind` for explanation  |
| Tree        | "View Paths" button         | Paths               | `descriptorId`                |
| Paths       | Click execution link        | Tree                | `executionId`, `descriptorId` |
| Paths       | Click node in path          | Tree                | `nodeId`, `descriptorId`      |
| Sankey      | Double-click port node      | Tree                | `descriptorId`                |
| Sankey      | Click hotspot entry         | Log                 | `portName` filter             |
| Sankey      | Double-click subject node   | Log                 | `subjectId` filter            |
| Timeline    | Click node row              | Tree                | `nodeId`, `executionId`       |
| Roles       | Click role in tree detail   | Roles               | `roleName` highlight          |
| Overview    | Click port stat card        | Log                 | `portName` filter             |
| Overview    | Click deny reason           | Log                 | `decision: deny` filter       |

### Navigation State

When navigating between views, the `GuardPanelNavigation` (see [Section 1.4.13](01-overview.md)) carries context:

```typescript
// Example: Log entry click navigates to Tree
navigation = {
  descriptorId: "UserService-policy",
  executionId: "eval-847",
  nodeId: undefined, // No specific node
  view: "tree",
  subjectId: undefined,
  timeRange: undefined, // Preserve current
};
```

## 11.9 Cross-Panel Navigation

Navigation between the Guard Panel and other DevTools panels:

| Source Panel | Trigger                    | Target Panel | Context                      |
| ------------ | -------------------------- | ------------ | ---------------------------- |
| Graph Panel  | Click guard badge on node  | Guard Panel  | `portName` in tree view      |
| Guard Panel  | Click port name in log     | Graph Panel  | Highlight port node in graph |
| Guard Panel  | Click subject auth method  | Container    | Show scope/session details   |
| Result Panel | Click guard error in chain | Guard Panel  | `executionId` in log view    |

## 11.10 Real-Time Updates

When connected to a live container, the Guard Panel receives real-time events:

### Event Types

| Event Type                  | Source              | Panel Behavior                         |
| --------------------------- | ------------------- | -------------------------------------- |
| `guardDescriptorRegistered` | New guard() adapter | Add port to selectors; update overview |
| `guardEvaluationExecuted`   | evaluate() call     | New log entry; update tree if selected |
| `guardStatisticsUpdated`    | Periodic            | Update overview stats, Sankey data     |

### Live Indicator

```
┌──────────────────────┐
│ ● Connected          │   ← Green dot: real-time
│ ○ Disconnected       │   ← Red dot: connection lost
│ ◌ Paused             │   ← Gray dot: updates paused
└──────────────────────┘
```

### Update Debouncing

| Trigger              | Debounce | Reason                               |
| -------------------- | -------- | ------------------------------------ |
| New evaluation event | 16ms     | Batch per animation frame            |
| Statistics update    | 500ms    | Aggregate recalculation is expensive |
| Filter change        | 150ms    | User typing in search                |
| Sort change          | 0ms      | Immediate feedback expected          |
| View switch          | 0ms      | Immediate feedback expected          |

### Pause/Resume

Users can pause real-time updates:

- Click the live indicator to toggle pause
- Keyboard: `Ctrl+Shift+P` to toggle
- When paused: queued events are retained and applied on resume
- Maximum queue: 1000 events (oldest dropped if exceeded)

## 11.11 Drag and Drop

No drag-and-drop interactions are defined for the Guard Panel. All node movement is handled via pan/zoom gestures on the canvas views (Tree, Roles).

## 11.12 Context Menus

Right-click context menus for key elements:

### Tree Node Context Menu

```
┌─────────────────────────────┐
│ Copy node info              │
│ View in Decision Log        │
│ Simulate with this node     │
│ ───────────────             │
│ Expand all children         │
│ Collapse subtree            │
│ ───────────────             │
│ What does this policy do?   │
└─────────────────────────────┘
```

### Log Entry Context Menu

```
┌─────────────────────────────┐
│ Copy as JSON                │
│ View in Tree                │
│ ───────────────             │
│ Filter to this port         │
│ Filter to this subject      │
│ Filter to this decision     │
│ ───────────────             │
│ Export this entry            │
└─────────────────────────────┘
```

### Role Node Context Menu

```
┌─────────────────────────────┐
│ Copy permissions             │
│ View subjects with this role │
│ ───────────────              │
│ Expand permissions           │
│ Collapse permissions         │
│ ───────────────              │
│ Check SoD constraints       │
└──────────────────────────────┘
```

## 11.13 Preferences Persistence

User preferences saved to `localStorage`:

| Key                            | Type    | Default      | Description                   |
| ------------------------------ | ------- | ------------ | ----------------------------- |
| `hex-guard-active-view`        | string  | `"overview"` | Last active view              |
| `hex-guard-tree-layout`        | string  | `"auto"`     | Tree layout mode preference   |
| `hex-guard-show-permissions`   | boolean | `false`      | Role graph permission display |
| `hex-guard-detect-cycles`      | boolean | `true`       | Cycle detection enabled       |
| `hex-guard-time-range`         | string  | `"1h"`       | Default time range filter     |
| `hex-guard-playback-speed`     | number  | `1`          | Tree playback speed           |
| `hex-guard-live-updates`       | boolean | `true`       | Real-time updates enabled     |
| `hex-guard-detail-panel-width` | number  | `400`        | Detail panel width in pixels  |

_Previous: [10-visual-encoding.md](10-visual-encoding.md) | Next: [12-educational-features.md](12-educational-features.md)_
