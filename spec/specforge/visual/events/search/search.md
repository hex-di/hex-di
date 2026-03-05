# Search Events

## Overview

Search events manage the global search overlay (CMP-003-search-overlay) lifecycle: query changes, result selection, and closing. These events target the search store (STR-012), which tracks the query text, search results, overlay visibility, and keyboard navigation index. Selecting a result triggers a navigation side effect to the target view.

---

## EVT-021-search-query-changed

**Trigger:** User types in the search input field within CMP-003-search-overlay.

### Payload

| Field         | Type   | Required | Description                                     |
| ------------- | ------ | -------- | ----------------------------------------------- |
| query         | string | yes      | The current search query text                   |
| selectedIndex | number | no       | Optional selected index for keyboard navigation |

### Event Flow

```
User types in CMP-003-search-overlay input
  |
  v
dispatch EVT-021-search-query-changed { query, selectedIndex? }
  |
  +---> [Store] STR-012-search-store
          set query = payload.query
          set selectedIndex = -1 (reset keyboard selection)
          --> Triggers debounced search request to backend
          --> Results arrive via separate EVT-031 (search-results-received)
```

### Store Mutations

| Store                | Field         | Operation | Value         |
| -------------------- | ------------- | --------- | ------------- |
| STR-012-search-store | query         | set       | payload.query |
| STR-012-search-store | selectedIndex | set       | -1            |

---

## EVT-022-search-result-selected

**Trigger:** User clicks a search result in the results list, or presses Enter with a result highlighted via keyboard navigation.

### Payload

| Field      | Type   | Required | Description                                              |
| ---------- | ------ | -------- | -------------------------------------------------------- |
| resultId   | string | yes      | ID of the selected search result                         |
| resultType | string | yes      | Category (sessions, specs, tasks, messages, graph-nodes) |
| viewId     | string | yes      | Target view to navigate to                               |

### Event Flow

```
User clicks result or presses Enter on highlighted result
  |
  v
dispatch EVT-022-search-result-selected { resultId, resultType, viewId }
  |
  +---> [Store] STR-012-search-store
  |       set isOpen = false
  |       set query = ""
  |       clear results = []
  |       set selectedIndex = -1
  |
  +---> [Side Effect: navigation]
          dispatch EVT-001-view-changed { viewId: payload.viewId }
          --> Router store updates, app shell switches to target view
```

### Store Mutations

| Store                | Field         | Operation | Value |
| -------------------- | ------------- | --------- | ----- |
| STR-012-search-store | isOpen        | set       | false |
| STR-012-search-store | query         | set       | ""    |
| STR-012-search-store | results       | clear     | []    |
| STR-012-search-store | selectedIndex | set       | -1    |

### Side Effects

| Type       | Description                                                        |
| ---------- | ------------------------------------------------------------------ |
| navigation | Dispatches EVT-001-view-changed with the target viewId to navigate |

---

## EVT-023-search-closed

**Trigger:** User presses Escape, clicks outside the search overlay, or clicks the close button.

### Payload

None. This event carries no payload.

### Event Flow

```
User presses Escape / clicks outside / clicks close button
  |
  v
dispatch EVT-023-search-closed {}
  |
  +---> [Store] STR-012-search-store
          set isOpen = false
          set query = ""
          clear results = []
          set selectedIndex = -1
```

### Store Mutations

| Store                | Field         | Operation | Value |
| -------------------- | ------------- | --------- | ----- |
| STR-012-search-store | isOpen        | set       | false |
| STR-012-search-store | query         | set       | ""    |
| STR-012-search-store | results       | clear     | []    |
| STR-012-search-store | selectedIndex | set       | -1    |

---

## Design Rationale

1. **Query reset on close and select:** Both EVT-022 and EVT-023 clear the query and results, ensuring the search overlay opens fresh each time. There is no "recent searches" feature -- the overlay is stateless between openings.

2. **selectedIndex reset on query change:** When the query text changes, the keyboard selection index resets to -1 (nothing selected). This prevents stale keyboard highlights from pointing to a result that no longer exists after the results update.

3. **Navigation as a side effect of selection:** EVT-022 closes the overlay first (store mutation), then triggers navigation (side effect). This ordering prevents the overlay from being visible during the view transition.

4. **ResultType for context:** The `resultType` field in EVT-022 carries the category of the selected result. While not used by the store reducer directly, it provides context for the navigation logic (e.g., selecting a "tasks" result navigates to the tasks view and may pre-select the task).

5. **No payload on close:** EVT-023 needs no parameters because it always fully resets the search state. The close action is unconditional.

---

## Cross-References

- **Source component:** CMP-003-search-overlay
- **Target store:** STR-012-search-store
- **Chained events:** EVT-001-view-changed (from EVT-022 side effect)
- **Related store events:** EVT-030 (search-opened), EVT-031 (search-results-received), EVT-032 (search-selection-moved) -- defined in STR-012 search store spec
