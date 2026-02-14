_Previous: [10-visual-encoding.md](10-visual-encoding.md) | Next: [12-educational-features.md](12-educational-features.md)_

# 11. Interactions & Navigation

Mouse, keyboard, cross-panel, and real-time update interactions across all Result Panel views.

## 11.1 View Switcher

The toolbar at the top contains 7 view toggle buttons. Exactly one view is active at a time.

| Action               | Result                                          |
| -------------------- | ----------------------------------------------- |
| Click view button    | Activates that view, deactivates the previous   |
| Active view button   | Accent underline, slightly different background |
| Inactive view button | No underline, default background                |

The active view persists across chain/execution selections. Switching chains or executions updates the active view's content without changing which view is displayed.

## 11.2 Chain Selection

### Chain Selector Dropdown

Located in the toolbar area. Lists all registered Result chains.

| Action         | Result                                                                    |
| -------------- | ------------------------------------------------------------------------- |
| Click dropdown | Opens chain list with search filter                                       |
| Type in search | Filters chains by name (case-insensitive substring match, 150ms debounce) |
| Select chain   | Updates all views to show data for the selected chain                     |
| Click away     | Closes dropdown without changing selection                                |

### Chain List Entry Format

```
[trace-icon] chainLabel   Ok: NN%   NNN runs
```

- Trace icon: `⬤` for fully traced (Level 1), `◇` for port-level only (Level 0)
- Chain label: `ResultChainDescriptor.label`
- Ok rate: percentage badge (green > 95%, amber 80-95%, red < 80%)
- Run count: total executions

## 11.3 Execution Selection

### Execution Selector Dropdown

Available in views that show per-execution data (Railway Pipeline, Operation Log, Async Waterfall, Combinator Matrix).

| Action           | Result                                                |
| ---------------- | ----------------------------------------------------- |
| Click dropdown   | Opens recent executions list (newest first)           |
| Select execution | Updates the active view to show that execution's data |
| `◀ Prev` button  | Selects the previous (older) execution                |
| `▶ Next` button  | Selects the next (newer) execution                    |

### Execution List Entry Format

```
#NNN  [● Ok / ○ Err]  YYYY-MM-DD HH:MM:SS  N.NNms
```

## 11.4 Railway Pipeline Interactions

### Node Click

| Action               | Result                                              |
| -------------------- | --------------------------------------------------- |
| Single click on node | Selects node, opens Node Detail Panel (Section 4.7) |
| Click on background  | Deselects node, closes Node Detail Panel            |
| Hover on node        | Shows tooltip with short description                |

### Node Detail Panel

- Slides in from the right side of the canvas
- Contains: category badge, track flow, input/output values, execution stats, educational content
- Close button (`×`) or click background to dismiss
- Cross-view links: "View in Operation Log", "View Cases"

### Canvas Navigation

| Action                     | Result                           |
| -------------------------- | -------------------------------- |
| Mouse wheel                | Zoom centered on cursor position |
| Click + drag on background | Pan                              |
| `[⊞ Fit]` button           | Zoom/pan to fit entire chain     |
| Double-click on node       | Zoom to fit that node centered   |
| Minimap click              | Pan to clicked position          |

### Zoom Constraints

| Property            | Value          |
| ------------------- | -------------- |
| Min zoom            | 0.2            |
| Max zoom            | 4.0            |
| Zoom step (buttons) | 0.25           |
| Zoom step (wheel)   | 0.1 per detent |
| Default zoom        | fit-to-content |

## 11.5 Operation Log Interactions

### Step Selection

| Action               | Result                                                          |
| -------------------- | --------------------------------------------------------------- |
| Click on a step row  | Selects step, shows input/output in Value Inspector             |
| Arrow Up/Down        | Move selection to previous/next step                            |
| Double-click on step | Opens that step in Railway Pipeline view (scrolled to position) |

### Value Inspector

| Action                      | Result                                                     |
| --------------------------- | ---------------------------------------------------------- |
| Click expand triangle (▸)   | Expands JSON tree node                                     |
| Click collapse triangle (▾) | Collapses JSON tree node                                   |
| Toggle "Diff Mode"          | Switches between separate input/output and structural diff |
| Click value (primitive)     | Copies value to clipboard                                  |
| Hover on truncated value    | Shows full value in tooltip                                |

### Filtering

| Action                         | Result                                         |
| ------------------------------ | ---------------------------------------------- |
| Toggle "Switch only"           | Shows only steps where `switched === true`     |
| Toggle "Err steps only"        | Shows only steps where `outputTrack === "err"` |
| Select methods in multi-select | Shows only steps matching selected methods     |
| Adjust duration slider         | Shows only steps exceeding the threshold       |

## 11.6 Case Explorer Interactions

### Path Tree Navigation

| Action                                | Result                                           |
| ------------------------------------- | ------------------------------------------------ |
| Click on a leaf node (path end)       | Selects path, opens Path Detail Panel            |
| Click on a branch node                | Expands/collapses that branch                    |
| Click on collapsed badge (`[2 maps]`) | Expands to show individual non-switch operations |
| Hover on any node                     | Highlights the full path from root to this node  |

### Path Detail Panel

- Shows path classification, frequency, switch points, recent executions
- "View in Pipeline": opens Railway Pipeline with an execution of this path
- "View in Log": opens Operation Log with an execution of this path
- "Simulate This": opens What-If Simulator with this path forced

### What-If Simulator

| Action                             | Result                                                         |
| ---------------------------------- | -------------------------------------------------------------- |
| Click "Force Ok" for an operation  | Forces that operation's output to Ok in simulation             |
| Click "Force Err" for an operation | Forces that operation's output to Err in simulation            |
| Click "Auto" for an operation      | Uses most likely outcome from observed data                    |
| Click "Reset All"                  | Returns all operations to Auto mode                            |
| Path tree updates                  | Highlights the path matching the forced configuration          |
| "Apply to Pipeline View"           | Opens Railway Pipeline with a matching execution (if observed) |

## 11.7 Sankey Statistics Interactions

### Node Interaction

| Action               | Result                                                      |
| -------------------- | ----------------------------------------------------------- |
| Hover on Ok/Err node | Highlights all connected links, shows tooltip (Section 7.3) |
| Click on node        | Freezes the highlight, opens detail popover                 |
| Click away           | Un-freezes highlight                                        |

### Link Interaction

| Action        | Result                                           |
| ------------- | ------------------------------------------------ |
| Hover on link | Highlights the link, shows tooltip (Section 7.4) |
| Click on link | Freezes highlight, opens detail popover          |

### Hotspot Table

| Action                                   | Result                                                |
| ---------------------------------------- | ----------------------------------------------------- |
| Click on operation name in hotspot table | Opens Railway Pipeline view focused on that operation |
| Sort column header                       | Sorts hotspot table by that column                    |

### Time Range

| Action                          | Result                                     |
| ------------------------------- | ------------------------------------------ |
| Select time range from dropdown | Recomputes all node counts and link widths |
| Custom range: pick start/end    | Same recomputation                         |

### Port Filter

| Action               | Result                                  |
| -------------------- | --------------------------------------- |
| Select specific port | Shows Sankey for that port's chain only |
| Select "All"         | Shows aggregate Sankey across all ports |

## 11.8 Async Waterfall Interactions

### Row Selection

| Action                | Result                                            |
| --------------------- | ------------------------------------------------- |
| Click on a row        | Highlights row, shows duration details in tooltip |
| Hover on duration bar | Shows exact start time, duration, end time        |

### Scale Controls

| Action                     | Result                               |
| -------------------------- | ------------------------------------ |
| Select scale from dropdown | Adjusts horizontal time axis scaling |
| Mouse wheel (horizontal)   | Zooms time axis                      |
| Shift + mouse wheel        | Zooms vertical axis (row height)     |

### Comparison Mode

| Action                                | Result                                      |
| ------------------------------------- | ------------------------------------------- |
| Select second execution from dropdown | Shows side-by-side comparison (Section 8.7) |
| Click "Exit Comparison"               | Returns to single-execution view            |

## 11.9 Combinator Matrix Interactions

### Input Cell Click

| Action                          | Result                                        |
| ------------------------------- | --------------------------------------------- |
| Click on input cell             | Expands value preview to full JSON tree       |
| Click on nested combinator cell | Drills into that combinator's own matrix view |
| Click "Back" (breadcrumb)       | Returns to parent combinator view             |

### Playback

Same playback controls as Railway Pipeline (Section 4.5). For async combinators, inputs resolve in real-time order.

### Statistics Toggle

| Action                 | Result                                                      |
| ---------------------- | ----------------------------------------------------------- |
| Click "Statistics" tab | Switches from single-execution view to aggregate statistics |
| Click "Execution" tab  | Returns to single-execution view                            |

## 11.10 Overview Dashboard Interactions

### Stat Cards

| Action                        | Result                                               |
| ----------------------------- | ---------------------------------------------------- |
| Click "Total Calls" card      | Opens Sankey Statistics view (all ports)             |
| Click "Ok Rate" card          | Opens Sankey Statistics view with stability timeline |
| Click "Chains" card           | Opens chain selector dropdown                        |
| Click "Active Err Ports" card | Opens filter view showing only ports with errors     |

### Error Distribution Chart

| Action                       | Result                                         |
| ---------------------------- | ---------------------------------------------- |
| Click on a pie/donut segment | Filters the Top Errors list to that error type |
| Hover on segment             | Shows error type name and count                |

### Stability Timeline

| Action                   | Result                                            |
| ------------------------ | ------------------------------------------------- |
| Hover on sparkline       | Shows tooltip with exact percentage and timestamp |
| Click on a sparkline dip | Opens Sankey view filtered to that time range     |

### Top Errors List

| Action             | Result                                                  |
| ------------------ | ------------------------------------------------------- |
| Click on error row | Opens Operation Log filtered to that error's executions |

## 11.11 Cross-View Navigation

Every view provides contextual links to related views. These links preserve context (chain, execution, step).

| From                                        | To                | Context Preserved                   |
| ------------------------------------------- | ----------------- | ----------------------------------- |
| Railway Pipeline node click → "View in Log" | Operation Log     | Chain, execution, step index        |
| Railway Pipeline node click → "View Cases"  | Case Explorer     | Chain                               |
| Operation Log step → "View in Pipeline"     | Railway Pipeline  | Chain, execution, step index        |
| Operation Log step → "View Cases"           | Case Explorer     | Chain, path matching this execution |
| Operation Log step → "View Waterfall"       | Async Waterfall   | Chain, execution                    |
| Case Explorer path → "View in Pipeline"     | Railway Pipeline  | Chain, matching execution           |
| Case Explorer path → "View in Log"          | Operation Log     | Chain, matching execution           |
| Sankey hotspot → click operation name       | Railway Pipeline  | Chain, focused on that operation    |
| Overview top error → click row              | Operation Log     | Chain, filtered to that error type  |
| Overview stability dip → click              | Sankey Statistics | Chain, time range around the dip    |

## 11.12 Cross-Panel Navigation

The Result Panel integrates with other DevTools panels:

| From Result Panel                           | To Panel         | Context                             |
| ------------------------------------------- | ---------------- | ----------------------------------- |
| Click port name in chain selector           | Graph Panel      | Port selected and centered in graph |
| Click "View Container" in execution details | Container Panel  | Container selected                  |
| Click scope ID in execution details         | Scope Tree Panel | Scope node selected                 |

| From Other Panel                              | To Result Panel | Context                                 |
| --------------------------------------------- | --------------- | --------------------------------------- |
| Graph Panel: click "View Results" on node     | Result Panel    | Chain selector set to that port's chain |
| Container Panel: click "View Results" on port | Result Panel    | Chain selector set to that port's chain |

### Navigation Callback Signature

Uses `ResultPanelNavigation` from [Section 1.4.12](01-overview.md). The `navigateTo` callback receives this interface:

```typescript
navigateTo(panel: string, context: ResultPanelNavigation): void;
```

## 11.13 Keyboard Shortcuts

| Key       | Context                     | Action                                                                            |
| --------- | --------------------------- | --------------------------------------------------------------------------------- |
| `1` - `7` | Panel focused               | Switch to view 1-7 (Railway, Log, Cases, Sankey, Waterfall, Combinator, Overview) |
| `Tab`     | Any view                    | Cycle focus between interactive elements                                          |
| `Enter`   | Focused element             | Activate (select node, expand tree, etc.)                                         |
| `Escape`  | Detail panel open           | Close detail panel                                                                |
| `Escape`  | What-If Simulator open      | Close simulator                                                                   |
| `Space`   | Railway Pipeline            | Toggle playback (play/pause)                                                      |
| `←` / `→` | Railway Pipeline (playback) | Step backward / forward                                                           |
| `←` / `→` | Operation Log               | Select previous / next step                                                       |
| `↑` / `↓` | Operation Log               | Same as ← / →                                                                     |
| `+` / `-` | Railway Pipeline            | Zoom in / out                                                                     |
| `0`       | Railway Pipeline            | Fit to view                                                                       |
| `d`       | Operation Log               | Toggle diff mode                                                                  |
| `f`       | Any view                    | Open filter controls                                                              |
| `?`       | Any view                    | Toggle educational sidebar                                                        |
| `/`       | Any view                    | Open global search                                                                |
| `s`       | Case Explorer               | Open What-If Simulator                                                            |

## 11.14 Real-Time Updates

When the data source emits new data (live container connection):

| Event                        | UI Update                                                   |
| ---------------------------- | ----------------------------------------------------------- |
| New execution arrives        | Execution selector dropdown updates, badge count increments |
| Chain ok/err counts change   | Status bar updates, Overview dashboard refreshes            |
| New chain registered         | Chain selector dropdown updates                             |
| Error rate crosses threshold | Status bar stability color changes                          |
| Stability score changes      | Overview sparkline extends                                  |

### Update Frequency

- Execution selector: immediate on new execution
- Aggregate statistics: debounced at 500ms
- Sankey diagram: recomputed on time range change or debounced at 1000ms
- Overview dashboard: debounced at 500ms
- Status bar: immediate for badge, debounced at 200ms for counts

### Live Indicator

When connected to a live data source, a green pulsing dot appears next to the chain selector. When disconnected, a red dot with "Disconnected" label appears. Stale data remains interactive.

_Previous: [10-visual-encoding.md](10-visual-encoding.md) | Next: [12-educational-features.md](12-educational-features.md)_
