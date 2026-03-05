@routing-events
Feature: Routing Events
  As a navigation system
  I want to dispatch view-changed events
  So that the router store and side effects stay synchronized

  Background:
    Given the store "router-store" is initialized with defaults
    And the initial currentView is "home"

  # -- EVT-001-view-changed: dispatch conditions --

  Scenario: Nav rail click dispatches view-changed
    When the user clicks nav item "pipeline" in CMP-001-nav-rail
    Then event "EVT-001-view-changed" is dispatched with:
      | viewId   |
      | pipeline |

  Scenario: Programmatic navigation dispatches view-changed
    When a programmatic navigation to "chat" is triggered
    Then event "EVT-001-view-changed" is dispatched with:
      | viewId |
      | chat   |

  # -- EVT-001-view-changed: store mutations --

  Scenario: View-changed updates router store
    When event "EVT-001-view-changed" is dispatched with:
      | viewId     |
      | acp-session |
    Then the state "currentView" in STR-014-router-store equals "acp-session"

  Scenario: View-changed from one view to another
    Given event "EVT-001-view-changed" was dispatched with:
      | viewId   |
      | pipeline |
    When event "EVT-001-view-changed" is dispatched with:
      | viewId |
      | costs  |
    Then the state "currentView" in STR-014-router-store equals "costs"

  Scenario: Navigating to the same view is idempotent
    Given event "EVT-001-view-changed" was dispatched with:
      | viewId |
      | graph  |
    When event "EVT-001-view-changed" is dispatched with:
      | viewId |
      | graph  |
    Then the state "currentView" in STR-014-router-store equals "graph"

  Scenario Outline: View-changed accepts all valid view IDs
    When event "EVT-001-view-changed" is dispatched with:
      | viewId   |
      | <viewId> |
    Then the state "currentView" in STR-014-router-store equals "<viewId>"

    Examples:
      | viewId     |
      | home       |
      | chat       |
      | pipeline   |
      | spec       |
      | tasks      |
      | coverage   |
      | acp-session |
      | costs      |
      | graph      |

  # -- EVT-001-view-changed: side effects --

  Scenario: View-changed triggers URL hash update
    When event "EVT-001-view-changed" is dispatched with:
      | viewId   |
      | pipeline |
    Then the URL hash is updated to "#/pipeline"

  Scenario: View-changed triggers analytics page view
    When event "EVT-001-view-changed" is dispatched with:
      | viewId |
      | tasks  |
    Then an analytics page-view event is tracked with viewId "tasks"

  Scenario: Side effects do not block store update
    When event "EVT-001-view-changed" is dispatched with:
      | viewId |
      | spec   |
    Then the state "currentView" in STR-014-router-store equals "spec"
    And the URL hash update and analytics call are fire-and-forget
