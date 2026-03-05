# WF-004: Filter, Refine, Observe

## Overview

The Filter, Refine, Observe workflow describes how users apply, manage, and clear filters across the application's filterable views. Filtering is a cross-cutting concern that touches Home, Task Board, Coverage Dashboard, ACP Session, Cost Tracker, and Graph Explorer. The filter store (STR-001) maintains per-view filter state, and the filter bar component (CMP-004) provides a consistent UI across all filterable views.

---

## Journey Map

### Step 1 -- Arrive at a Filterable View

The user navigates to a view that supports filtering. The filter bar (CMP-004) renders at the top of the content area with controls appropriate to the current view. Each view has its own filter configuration stored under a view-specific key in STR-001.

### Step 2 -- Apply a Filter

The user interacts with a filter control. Depending on the filter type:

- **Dropdown:** Selects a single value from a dropdown menu (e.g., status: "completed")
- **Multi-select:** Checks one or more values from a multi-select popover (e.g., severities: ["critical", "major"])
- **Text search:** Types into a search input (e.g., search: "auth")
- **Boolean toggle:** Clicks a toggle switch (e.g., showGapsOnly: true)
- **Preset (ACP session):** Selects a named filter combination (e.g., "critical-only")

ACT-016 (set filter) or the appropriate variant fires, dispatching EVT-018-filter-changed with the view, key, and new value.

### Step 3 -- Filter Chip Appears

For each non-default filter value, a chip appears in the filter bar area. The chip displays a label (the filter key in human-readable form) and the selected value. Each chip has an X button to remove that individual filter.

### Step 4 -- Data Re-filters

The view's data components (session table, kanban board, coverage list, message list, cost tables, graph lists) re-render with filtered data. Filtering happens client-side using the filter store's selectors to derive the filtered subset from the data store's full dataset.

### Step 5 -- Remove Individual Filter

The user clicks the X button on a filter chip. ACT-022 (remove filter chip) fires, dispatching EVT-018-filter-changed with the filter key reset to its default value. The chip disappears and the data re-expands.

### Step 6 -- Clear All Filters

The user clicks "Clear All" in the filter bar. ACT-018 (reset view filters) fires, dispatching EVT-019-filters-reset with the current view ID. All filters for that view return to defaults.

### Step 7 -- Data Shows Unfiltered

All chips disappear. The data components render with no filter constraints, showing the full dataset.

---

## ASCII Flow Diagram

```
+---------------------------+
| User on filterable view   |
| (home/tasks/coverage/     |
|  ACP session/costs/graph)  |
+------------+--------------+
             |
             v
+---------------------------+
| CMP-004 Filter Bar        |
| +--------+ +--------+    |
| |Dropdown| |Multi-  |    |
| |        | |select  |    |
| +---+----+ +---+----+    |
|     |           |         |
|  +--+-----------+--+      |
|  | +------+ +----+ |      |
|  | |Toggle| |Text| |      |
|  | +--+---+ +--+-+ |      |
|  |    |        |    |      |
|  +----+--------+----+      |
+-------+--------+-----------+
        |        |
        v        v
   ACT-016    ACT-024
   set        set text
   filter     search
        |        |
        v        v
   EVT-018 filter-changed
   { view, key, value }
        |
        v
+---------------------------+
| STR-001 Filter Store      |
| [view][key] = value       |
+------------+--------------+
             |
        +----+----+
        |         |
        v         v
   Filter chips  Data re-filters
   appear in     in view component
   CMP-004
        |
        v
+---------------------------+
| Chip: [status: completed] |
|        [X]                |
+------------+--------------+
             |  click X
             v
   EVT-018 filter-changed
   { view, key, default }
             |
             v
   Chip removed, data
   re-expands
             |
             v
+---------------------------+
| "Clear All" button        |
+------------+--------------+
             |  click
             v
   EVT-019 filters-reset
   { view }
             |
             v
   All chips cleared,
   full data displayed
```

---

## Per-View Filter Configurations

### Home (PG-001)

| Filter Key   | Type     | Options                                 | Default         |
| ------------ | -------- | --------------------------------------- | --------------- |
| status       | dropdown | all, running, paused, completed, failed | "all"           |
| pipelineMode | dropdown | all, spec-author, full-pipeline         | "all"           |
| search       | text     | --                                      | ""              |
| sort         | dropdown | last-activity, created, package         | "last-activity" |

### Task Board (PG-005)

| Filter Key    | Type         | Options                                  | Default  |
| ------------- | ------------ | ---------------------------------------- | -------- |
| statuses      | multi-select | pending, in-progress, completed, blocked | []       |
| requirementId | text         | --                                       | ""       |
| search        | text         | --                                       | ""       |
| viewMode      | toggle       | kanban, dag                              | "kanban" |

### Coverage Dashboard (PG-006)

| Filter Key        | Type         | Options                                     | Default          |
| ----------------- | ------------ | ------------------------------------------- | ---------------- |
| statuses          | multi-select | covered, implemented-only, tested-only, gap | []               |
| specFile          | dropdown     | (dynamic)                                   | "all"            |
| sort              | dropdown     | requirement-id, coverage-percent, file-name | "requirement-id" |
| showGapsOnly      | boolean      | --                                          | false            |
| fileCategory      | multi-select | (dynamic)                                   | []               |
| showUncoveredOnly | boolean      | --                                          | false            |

### ACP Session (PG-007)

| Filter Key   | Type         | Options                                                 | Default |
| ------------ | ------------ | ------------------------------------------------------- | ------- |
| agentRole    | dropdown     | all, orchestrator, analyst, writer, reviewer, architect | "all"   |
| messageTypes | multi-select | finding, clarification, broadcast                       | []      |
| severities   | multi-select | critical, major, minor, observation                     | []      |
| phase        | dropdown     | (dynamic)                                               | "all"   |
| search       | text         | --                                                      | ""      |
| preset       | preset       | none, critical-only, current-phase, my-agent            | "none"  |

### Cost Tracker (PG-008)

| Filter Key | Type         | Options            | Default    |
| ---------- | ------------ | ------------------ | ---------- |
| phases     | multi-select | (dynamic)          | []         |
| agentRoles | multi-select | (dynamic)          | []         |
| viewMode   | toggle       | by-phase, by-agent | "by-phase" |

### Graph Explorer (PG-009)

| Filter Key        | Type         | Options                  | Default      |
| ----------------- | ------------ | ------------------------ | ------------ |
| nodeTypes         | multi-select | (dynamic)                | []           |
| relationshipTypes | multi-select | (dynamic)                | []           |
| viewMode          | toggle       | full-graph, session-only | "full-graph" |
| search            | text         | --                       | ""           |

---

## State Transitions Across Stores

### STR-001 (Filter Store)

```
Initial state (all defaults):
  home:       { status: "all", pipelineMode: "all", search: "", sort: "last-activity" }
  ACP session: { agentRole: "all", messageTypes: [], severities: [], phase: "all", search: "", preset: "none" }
  tasks:      { statuses: [], requirementId: "", search: "", viewMode: "kanban" }
  coverage:   { statuses: [], specFile: "all", sort: "requirement-id", showGapsOnly: false, fileCategory: [], showUncoveredOnly: false }
  spec:       { showChangesOnly: false, search: "" }
  costs:      { phases: [], agentRoles: [], viewMode: "by-phase" }
  graph:      { nodeTypes: [], relationshipTypes: [], viewMode: "full-graph", search: "" }

EVT-018 { view: "acp-session", key: "severities", value: ["critical", "major"] }
  --> acp-session.severities = ["critical", "major"]

EVT-018 { view: "acp-session", key: "severities", value: [] }
  --> acp-session.severities = [] (back to default, chip removed)

EVT-019 { view: "acp-session" }
  --> ACP session = { ...initial defaults }

EVT-020 (reset all)
  --> every view key returns to initial defaults
```

---

## Chip Lifecycle

```
Filter applied (non-default value)
  --> Chip rendered: { view, key, label, value }
  --> User clicks X
  --> EVT-018 { view, key, default-value }
  --> Chip removed

"Clear All" clicked
  --> EVT-019 { view }
  --> All chips for that view removed simultaneously
```

### Active Filter Count

The `activeFilterCount(view)` selector counts how many filters in a given view differ from their default values. This count is used to:

- Show a badge on the filter bar when filters are active
- Enable/disable the "Clear All" button
- Display filter state in the status bar

---

## Preset Filters (ACP Session Only)

The ACP session view supports named presets that apply multiple filters at once:

| Preset        | Filters Applied                      |
| ------------- | ------------------------------------ |
| none          | All filters at defaults              |
| critical-only | severities: ["critical"]             |
| current-phase | phase: <current active phase name>   |
| my-agent      | agentRole: <context-dependent agent> |

When a preset is selected, ACT-023 (apply preset) fires. The preset handler translates the preset name into individual filter values and dispatches the appropriate EVT-018 events. The preset dropdown reflects the currently applied preset (or "none" if the user has manually modified filters).

---

## Key Decision Points and Branches

| Step | Condition      | Branch A                     | Branch B                              | Branch C                                       |
| ---- | -------------- | ---------------------------- | ------------------------------------- | ---------------------------------------------- |
| 1    | Current view   | Home filters                 | Tasks filters                         | Coverage / ACP Session / Costs / Graph filters |
| 2    | Filter type    | Dropdown (single)            | Multi-select (array)                  | Toggle / Text / Boolean                        |
| 5    | Filter removed | One chip gone, others remain | Was last filter, "Clear All" disables | --                                             |

---

## Design Rationale

1. **Per-view filter isolation:** Each view's filters are stored under their own key in STR-001. Changing filters on the Task Board does not affect ACP Session filters. This prevents surprising cross-view interactions.

2. **Chips as feedback:** Filter chips provide immediate visual confirmation of what filters are active. The X button on each chip enables precise removal without needing to re-open dropdown menus.

3. **Client-side filtering:** All filtering happens in the browser by intersecting the filter store with the data store. This provides instant feedback without server round-trips. The tradeoff is that the full dataset must be loaded, but SpecForge sessions contain bounded data.

4. **Presets as shortcuts:** ACP Session presets encode common filter combinations. This reduces the cognitive load of configuring multi-filter views by offering one-click access to frequent use cases.

5. **Reset granularity:** Two reset levels (per-view and all-views) give the user control. Per-view reset is the common case; all-views reset is a power-user escape hatch.

---

## Cross-References

- **Parent workflow:** WF-001-session-lifecycle (cross-cutting data refinement)
- **Store:** STR-001 (filter store)
- **Component:** CMP-004 (filter bar)
- **Events:** EVT-018, EVT-019, EVT-020
- **Pages:** PG-001, PG-005, PG-006, PG-007, PG-008, PG-009
- **Related workflows:** WF-005 (pipeline observation uses filters), WF-006 (cost investigation uses cost filters)
