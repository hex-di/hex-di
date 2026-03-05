# Navigation Actions

**IDs:** ACT-001 through ACT-005
**Context:** Navigation between views, opening/closing the search overlay, and querying search results.

---

## Action Flow Diagrams

### ACT-001 Navigate to View

```
  User clicks nav button
         |
         v
  ELM-001-nav-button (click)
         |
         v
  ACT-001-navigate-to-view
         |
         v
  EVT-001-view-changed { viewId }
         |
         +---> STR-014-router-store (currentView = viewId)
         +---> CMP-001-nav-rail re-renders (active button updates)
         +---> PG-010-app-shell swaps the view panel
```

### ACT-002 Navigate Back

```
  User presses Alt+Left
         |
         v
  keyboard: Alt+ArrowLeft
         |
         v
  ACT-002-navigate-back
         |
         v
  EVT-001-view-changed { viewId: previousView }
         |
         +---> STR-014-router-store (currentView = previousView)
         +---> Browser history.back()
```

### ACT-003 Open Search

```
  User clicks search button         User presses "/"
         |                                  |
         v                                  v
  ELM-004-nav-search-button (click)   keyboard: "/" (global)
         |                                  |
         +----------+----------+------------+
                    |
                    v
           ACT-003-open-search
                    |
                    v
           EVT-021-search-opened
                    |
                    +---> STR-012-search-store (isOpen = true)
                    +---> ELM-009-search-backdrop renders
                    +---> ELM-010-search-input receives auto-focus
```

### ACT-004 Search Query

```
  User types in search input
         |
         v
  ELM-010-search-input (change)
         |
         v
  [debounce 300ms]
         |
         v
  ACT-004-search-query
         |
         v
  EVT-021-search-query-changed { query }
         |
         +---> STR-012-search-store (query = text, results recomputed)
         +---> Search result list re-renders
```

### ACT-005 Close Search

```
  User clicks backdrop              User presses Escape
         |                                  |
         v                                  v
  ELM-009-search-backdrop (click)    keyboard: Escape
         |                                  |
         +----------+----------+------------+
                    |
                    v
           ACT-005-close-search
                    |
                    v
           EVT-023-search-closed
                    |
                    +---> STR-012-search-store (isOpen = false, query cleared)
                    +---> Search overlay unmounts
                    +---> Focus returns to previous element
```

## Action Summary

| ID      | Name             | Type          | Trigger                         | Event Dispatched             |
| ------- | ---------------- | ------------- | ------------------------------- | ---------------------------- |
| ACT-001 | Navigate to View | navigate      | ELM-001 click                   | EVT-001-view-changed         |
| ACT-002 | Navigate Back    | navigate-back | Alt+Left keyboard               | EVT-001-view-changed         |
| ACT-003 | Open Search      | open-modal    | ELM-004 click / "/" key         | EVT-021-search-opened        |
| ACT-004 | Search Query     | search-submit | ELM-010 change (300ms debounce) | EVT-021-search-query-changed |
| ACT-005 | Close Search     | close-modal   | ELM-009 click / Escape key      | EVT-023-search-closed        |

## Cross-References

- **Element:** ELM-001-nav-button (ACT-001 trigger)
- **Element:** ELM-004-nav-search-button (ACT-003 trigger)
- **Element:** ELM-009-search-backdrop (ACT-005 trigger)
- **Element:** ELM-010-search-input (ACT-004 trigger)
- **Store:** STR-012-search-store (ACT-003, ACT-004, ACT-005)
- **Store:** STR-014-router-store (ACT-001, ACT-002)
- **Component:** CMP-001-nav-rail (contains trigger elements)
