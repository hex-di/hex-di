# WF-003: Search and Navigate

## Overview

The Search and Navigate workflow describes the global search overlay (command palette) experience. The search lives in the app shell (PG-010) and is accessible from any view. It provides instant, keyboard-first search across sessions, specs, tasks, messages, and graph nodes, then navigates the user directly to the relevant view and entity.

---

## Journey Map

### Step 1 -- Open Search

The user presses `/` on the keyboard (when no input has focus) or clicks the search button pinned at the bottom of the nav rail (ELM-004). ACT-003 (open search) fires, dispatching EVT-030-search-opened. The search store (STR-012) sets `isOpen: true`.

**Alternate trigger:** The user presses `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) as an alternate shortcut.

### Step 2 -- Overlay Renders

The search overlay (CMP-003) fades in over the current view. A semi-transparent backdrop (ELM-009) covers the entire viewport. The search input (ELM-010) appears centered in the upper third of the screen and receives auto-focus. Hint text reads "Search specs, tasks, messages..."

### Step 3 -- Type Query

The user begins typing. Each keystroke triggers ACT-004 (search query), which debounces at 300ms before dispatching EVT-021-search-query-changed. The search store updates `query` and resets `selectedIndex` to -1.

**Decision Point:** If the query is empty, the overlay shows hint text. Once the user types at least one character and the debounce fires, a search request executes.

### Step 4 -- Results Appear

After the debounce, EVT-031-search-results-received fires with the result set. Results appear grouped by category with category labels (ELM-011) above each group. Each result item (ELM-012) shows a title, subtitle, and category icon.

**Decision Point:** If no results match, a "No results found" placeholder appears instead of grouped results.

### Step 5 -- Navigate Results

The user navigates results using keyboard or mouse:

- **ArrowDown:** Increments `selectedIndex`, dispatching EVT-032
- **ArrowUp:** Decrements `selectedIndex`, dispatching EVT-032
- **Mouse hover:** Visually highlights the hovered item (CSS-only, does not update selectedIndex)

The currently selected result item has an accent-dim background and a 1px accent outline.

### Step 6 -- Select Result

The user confirms selection via:

- **Enter key:** Selects the item at `selectedIndex`
- **Mouse click:** Directly selects the clicked item

ACT-025 (select result) fires, dispatching EVT-022-search-result-selected. The search store resets entirely: `isOpen: false`, `query: ""`, `results: []`, `selectedIndex: -1`.

### Step 7 -- Navigate to Target

The selected result's `navigateTo` field determines the target view. EVT-001-view-changed dispatches with the appropriate `viewId`. The router store updates, and the app shell renders the target view. Focus returns to the main content area.

**Alternate exit:** If the user presses Escape or clicks the backdrop (ACT-005), the overlay closes without navigation. EVT-023-search-closed fires and the store resets.

---

## ASCII Flow Diagram

```
+-------------------+
| Any View          |
| (PG-001..PG-009)  |
+--------+----------+
         |
         |  "/" key or nav search button
         v
+--------+----------+
| ACT-003 open      |
| EVT-030 opened    |
+--------+----------+
         |
         v
+-------------------+
| CMP-003 Search    |
| Overlay           |
| +---------------+ |
| | ELM-010 Input | |  <-- auto-focused
| +-------+-------+ |
|         |          |
|  (type query)      |
|         |          |
|         v          |
| +---------------+ |
| |  300ms        | |
| |  debounce     | |
| +-------+-------+ |
|         |          |
|         v          |
| EVT-021 query      |
| EVT-031 results    |
|         |          |
|    +----+----+     |
|    |         |     |
|    v         v     |
| [results] [none]   |
|    |         |     |
|    v         v     |
| ELM-011   "No      |
| Category  results   |
| Labels    found"    |
| ELM-012            |
| Result             |
| Items              |
|    |               |
+----+----+----------+
     |    |
     |    |  Escape / backdrop click
     |    +------> EVT-023 (close, no navigation)
     |
     v  Enter / click
+----+-----------+
| EVT-022 select |
| Store resets   |
+----+-----------+
     |
     v
+----+-----------+
| EVT-001 view-  |
| changed        |
| navigateTo     |
+----+-----------+
     |
     v
+----------------+
| Target View    |
| renders        |
+----------------+
```

---

## State Transitions Across Stores

### STR-012 (Search Store)

```
Closed State:
  { query: "", results: [], isOpen: false, selectedIndex: -1 }

  --> EVT-030 (opened)
  { query: "", results: [], isOpen: true, selectedIndex: -1 }

  --> EVT-021 (query changed)
  { query: "auth", results: [], isOpen: true, selectedIndex: -1 }

  --> EVT-031 (results received)
  { query: "auth", results: [...5 items], isOpen: true, selectedIndex: -1 }

  --> EVT-032 (selection moved, index 0)
  { query: "auth", results: [...5 items], isOpen: true, selectedIndex: 0 }

  --> EVT-032 (selection moved, index 1)
  { query: "auth", results: [...5 items], isOpen: true, selectedIndex: 1 }

  --> EVT-022 (result selected) -- full reset
  { query: "", results: [], isOpen: false, selectedIndex: -1 }
```

### STR-014 (Router Store)

```
currentView: "home"
  --> EVT-001 { viewId: "spec" }  --> currentView: "spec"
  (navigateTo derived from selected search result)
```

---

## Result Category Mapping

| Category    | Icon         | Default Navigation Target | Example Result           |
| ----------- | ------------ | ------------------------- | ------------------------ |
| Sessions    | session-icon | home                      | "Auth Module Session"    |
| Specs       | spec-icon    | spec                      | "Section 3: API Design"  |
| Tasks       | task-icon    | tasks                     | "Implement login flow"   |
| Messages    | message-icon | chat                      | "Agent: Found 3 modules" |
| Graph Nodes | graph-icon   | graph                     | "AuthService (port)"     |

---

## Keyboard Interaction Model

| Key                | Context                            | Action                            | Event   |
| ------------------ | ---------------------------------- | --------------------------------- | ------- |
| `/`                | Global (no input focused)          | Open search overlay               | EVT-030 |
| `Cmd+K` / `Ctrl+K` | Global                             | Open search overlay (alternate)   | EVT-030 |
| `Escape`           | Search overlay open                | Close overlay without selection   | EVT-023 |
| `ArrowDown`        | Search overlay open                | Move selection to next result     | EVT-032 |
| `ArrowUp`          | Search overlay open                | Move selection to previous result | EVT-032 |
| `Enter`            | Search overlay open, item selected | Select result and navigate        | EVT-022 |

### Selection Wrapping

- When `selectedIndex` is at the last result and ArrowDown is pressed, the selection does not wrap. It stays at the last item.
- When `selectedIndex` is 0 and ArrowUp is pressed, the selection does not wrap. It stays at 0.
- When `selectedIndex` is -1 (no selection) and ArrowDown is pressed, it moves to 0.

---

## Key Decision Points and Branches

| Step | Condition             | Branch A                 | Branch B        | Branch C          |
| ---- | --------------------- | ------------------------ | --------------- | ----------------- |
| 3    | Query is empty        | Show hint text           | Show results    | --                |
| 4    | No matching results   | "No results found"       | Grouped results | --                |
| 5    | User interaction mode | Keyboard (Up/Down/Enter) | Mouse click     | Escape to dismiss |

---

## Design Rationale

1. **Keyboard-first:** The overlay is designed for keyboard power users. The `/` shortcut, arrow navigation, and Enter selection allow the user to find and navigate without touching the mouse. Mouse interaction is supported as an alternative, not the primary path.

2. **Full reset on close:** Both selecting a result and dismissing the overlay reset the search store completely. This prevents stale results from appearing when the overlay is next opened.

3. **Debounced queries:** The 300ms debounce prevents excessive re-rendering during rapid typing. The store always reflects the latest query immediately, but the actual search execution is throttled.

4. **Category grouping:** Results are stored flat but displayed grouped by category. This makes the result list scannable without complicating the store's reducer logic.

5. **Overlay over navigation:** The search overlay renders on top of the current view rather than navigating to a search page. This preserves the user's context and makes the interaction feel lightweight -- like a command palette rather than a search engine.

---

## Cross-References

- **Parent workflow:** WF-001-session-lifecycle (cross-cutting navigation aid)
- **Stores:** STR-012 (search), STR-014 (router), STR-015 (keyboard shortcuts)
- **Actions:** ACT-003, ACT-004, ACT-005, ACT-025
- **Events:** EVT-001, EVT-021, EVT-022, EVT-023, EVT-030, EVT-031, EVT-032
- **Components:** CMP-003-search-overlay
- **Elements:** ELM-009 (backdrop), ELM-010 (input), ELM-011 (category label), ELM-012 (result item), ELM-013 (hint text)
