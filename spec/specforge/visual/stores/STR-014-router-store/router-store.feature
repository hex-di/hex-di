@STR-014
Feature: Router Store
  As a view consumer
  I want reliable routing state
  So that the app shell renders the correct view

  Background:
    Given the store "router-store" is initialized with defaults
    And the initial currentView is "home"

  # --- View navigation ---

  Scenario: Navigate to a different view
    When the event "EVT-001" is dispatched with viewId "pipeline"
    Then the currentView is "pipeline"

  Scenario: Navigate to chat view
    When the event "EVT-001" is dispatched with viewId "chat"
    Then the currentView is "chat"

  Scenario: Navigate back to home
    Given the currentView is "pipeline"
    When the event "EVT-001" is dispatched with viewId "home"
    Then the currentView is "home"

  Scenario Outline: Navigate to each valid view
    When the event "EVT-001" is dispatched with viewId "<viewId>"
    Then the currentView is "<viewId>"

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

  # --- currentView selector ---

  Scenario: currentView selector returns active view
    Given the currentView is "tasks"
    When the selector "currentView" is evaluated
    Then the result is "tasks"

  # --- isFilterableView selector ---

  Scenario Outline: Filterable views return true
    Given the currentView is "<viewId>"
    When the selector "isFilterableView" is evaluated
    Then the result is true

    Examples:
      | viewId     |
      | pipeline   |
      | tasks      |
      | coverage   |
      | acp-session |

  Scenario Outline: Non-filterable views return false
    Given the currentView is "<viewId>"
    When the selector "isFilterableView" is evaluated
    Then the result is false

    Examples:
      | viewId |
      | home   |
      | chat   |
      | spec   |
      | costs  |
      | graph  |

  # --- Idempotent navigation ---

  Scenario: Navigating to the current view is a no-op
    Given the currentView is "graph"
    When the event "EVT-001" is dispatched with viewId "graph"
    Then the currentView is "graph"

  # --- Default state ---

  Scenario: Default view is home on fresh initialization
    Then the currentView is "home"
