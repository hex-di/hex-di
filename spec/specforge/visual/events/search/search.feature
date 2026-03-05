@search-events
Feature: Search Events
  As a global search system
  I want to dispatch search lifecycle events
  So that the search overlay and navigation stay synchronized

  Background:
    Given the store "search-store" is initialized with defaults
    And the store "router-store" is initialized with defaults

  # -- EVT-021-search-query-changed: store mutations --

  Scenario: Typing a query updates the search store
    When event "EVT-021-search-query-changed" is dispatched with:
      | query      |
      | auth module|
    Then the state "query" in STR-012-search-store equals "auth module"
    And the state "selectedIndex" in STR-012-search-store equals -1

  Scenario: Changing the query resets keyboard selection
    Given event "EVT-021-search-query-changed" was dispatched with:
      | query | selectedIndex |
      | auth  | 2             |
    When event "EVT-021-search-query-changed" is dispatched with:
      | query   |
      | auth mo |
    Then the state "selectedIndex" in STR-012-search-store equals -1

  Scenario: Empty query is valid
    When event "EVT-021-search-query-changed" is dispatched with:
      | query |
      |       |
    Then the state "query" in STR-012-search-store equals ""
    And the state "selectedIndex" in STR-012-search-store equals -1

  Scenario: Successive query changes overwrite the previous query
    Given event "EVT-021-search-query-changed" was dispatched with:
      | query |
      | auth  |
    When event "EVT-021-search-query-changed" is dispatched with:
      | query  |
      | flow   |
    Then the state "query" in STR-012-search-store equals "flow"

  # -- EVT-022-search-result-selected: store mutations --

  Scenario: Selecting a result closes the overlay and clears state
    Given event "EVT-021-search-query-changed" was dispatched with:
      | query |
      | auth  |
    When event "EVT-022-search-result-selected" is dispatched with:
      | resultId | resultType | viewId |
      | sess-001 | sessions   | chat   |
    Then the state "isOpen" in STR-012-search-store equals false
    And the state "query" in STR-012-search-store equals ""
    And the state "results" in STR-012-search-store has length 0
    And the state "selectedIndex" in STR-012-search-store equals -1

  Scenario: Selecting a task result clears search and targets tasks view
    When event "EVT-022-search-result-selected" is dispatched with:
      | resultId  | resultType | viewId |
      | task-042  | tasks      | tasks  |
    Then the state "isOpen" in STR-012-search-store equals false
    And the state "query" in STR-012-search-store equals ""

  # -- EVT-022-search-result-selected: side effects --

  Scenario: Selecting a result navigates to the target view
    When event "EVT-022-search-result-selected" is dispatched with:
      | resultId | resultType | viewId   |
      | spec-007 | specs      | spec     |
    Then a navigation side effect fires dispatching EVT-001-view-changed with viewId "spec"

  Scenario: Selecting a session result navigates to chat
    When event "EVT-022-search-result-selected" is dispatched with:
      | resultId | resultType | viewId |
      | sess-001 | sessions   | chat   |
    Then a navigation side effect fires dispatching EVT-001-view-changed with viewId "chat"

  Scenario: Selecting a graph-nodes result navigates to graph
    When event "EVT-022-search-result-selected" is dispatched with:
      | resultId  | resultType  | viewId |
      | node-099  | graph-nodes | graph  |
    Then a navigation side effect fires dispatching EVT-001-view-changed with viewId "graph"

  # -- EVT-023-search-closed: store mutations --

  Scenario: Closing the search overlay resets all search state
    Given event "EVT-021-search-query-changed" was dispatched with:
      | query     |
      | some text |
    When event "EVT-023-search-closed" is dispatched
    Then the state "isOpen" in STR-012-search-store equals false
    And the state "query" in STR-012-search-store equals ""
    And the state "results" in STR-012-search-store has length 0
    And the state "selectedIndex" in STR-012-search-store equals -1

  Scenario: Closing an already-closed overlay is a no-op
    When event "EVT-023-search-closed" is dispatched
    Then the state "isOpen" in STR-012-search-store equals false
    And the state "query" in STR-012-search-store equals ""

  Scenario: Closing preserves the router store state
    Given event "EVT-001-view-changed" was dispatched with:
      | viewId   |
      | pipeline |
    When event "EVT-023-search-closed" is dispatched
    Then the state "currentView" in STR-014-router-store equals "pipeline"

  # -- Selector integration --

  Scenario: hasResults returns false after search closed
    Given event "EVT-021-search-query-changed" was dispatched with:
      | query |
      | auth  |
    When event "EVT-023-search-closed" is dispatched
    Then selector "hasResults" in STR-012-search-store returns false

  Scenario: resultCount returns zero after result selected
    When event "EVT-022-search-result-selected" is dispatched with:
      | resultId | resultType | viewId |
      | sess-001 | sessions   | chat   |
    Then selector "resultCount" in STR-012-search-store returns 0

  Scenario: selectedResult returns null after search closed
    When event "EVT-023-search-closed" is dispatched
    Then selector "selectedResult" in STR-012-search-store returns null
