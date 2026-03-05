# Routing Events

## Overview

The routing event group contains a single event, `EVT-001-view-changed`, which is dispatched whenever the user navigates to a different top-level view in the application. This event drives the router store and triggers URL hash updates and analytics tracking as side effects.

---

## EVT-001-view-changed

**Trigger:** User clicks a navigation item in CMP-001-nav-rail, selects a search result that targets a different view, or a programmatic navigation occurs (e.g., after session selection).

### Payload

| Field  | Type   | Required | Description                                  |
| ------ | ------ | -------- | -------------------------------------------- |
| viewId | string | yes      | The target ViewId (one of the 9 valid views) |

### Event Flow

```
User clicks nav item / search result / programmatic trigger
  |
  v
dispatch EVT-001-view-changed { viewId }
  |
  +---> [Store] STR-014-router-store
  |       set currentView = payload.viewId
  |       --> PG-010-app-shell re-renders main content area
  |       --> CMP-001-nav-rail highlights the active item
  |       --> CMP-004-filter-bar shows/hides via isFilterableView selector
  |
  +---> [Side Effect: navigation]
  |       Update window.location.hash to "#/<viewId>"
  |
  +---> [Side Effect: analytics]
          Track page view: { page: viewId, timestamp: now }
```

### Store Mutations

| Store                | Field       | Operation | Value          |
| -------------------- | ----------- | --------- | -------------- |
| STR-014-router-store | currentView | set       | payload.viewId |

### Side Effects

| Type       | Description                                                                 |
| ---------- | --------------------------------------------------------------------------- |
| navigation | Updates the URL hash so the browser's address bar reflects the active view. |
| analytics  | Emits a page-view tracking event with the target viewId for usage metrics.  |

---

## Design Rationale

1. **Single event for all navigation:** Every view transition flows through the same event, creating a single observation point for analytics, logging, and debugging. There is no need for per-view navigation events.

2. **Side effects are fire-and-forget:** Hash updates and analytics calls do not feed back into store state. If analytics fails, the navigation still succeeds. This keeps the store reducer pure.

3. **ViewId validation happens at dispatch time:** The event payload carries a raw string, but the dispatching component is responsible for sending a valid ViewId. The store reducer trusts the payload -- invalid values would result in a no-op render in the app shell.

---

## Cross-References

- **Source components:** CMP-001-nav-rail, CMP-003-search-overlay (via EVT-022 chaining)
- **Target store:** STR-014-router-store
- **Related events:** EVT-002-session-selected (may trigger navigation to chat), EVT-022-search-result-selected (may chain into EVT-001)
