@STR-012
Feature: Search Store
  As a view consumer
  I want reliable state management for global search
  So that the search overlay reflects the current query and results

  Background:
    Given the store "search-store" is initialized with defaults
    And the initial query is ""
    And the initial results list is empty
    And the initial isOpen is false
    And the initial selectedIndex is -1

  # --- Opening and closing ---

  Scenario: Open search overlay
    When the event "EVT-030" is dispatched
    Then isOpen is true

  Scenario: Close search overlay resets all state
    Given isOpen is true
    And the query is "auth module"
    And the results list contains 3 entries
    And the selectedIndex is 1
    When the event "EVT-023" is dispatched
    Then isOpen is false
    And the query is ""
    And the results list is empty
    And the selectedIndex is -1

  # --- Query changes ---

  Scenario: Update search query
    Given isOpen is true
    When the event "EVT-021" is dispatched with query "pipeline"
    Then the query is "pipeline"
    And the selectedIndex is -1

  Scenario: Query change resets selection index
    Given the selectedIndex is 2
    When the event "EVT-021" is dispatched with query "new query"
    Then the selectedIndex is -1

  # --- Receiving results ---

  Scenario: Receive search results
    Given the query is "auth"
    When the event "EVT-031" is dispatched with 5 results
    Then the results list contains 5 entries

  Scenario: New results replace previous results
    Given the results list contains 3 entries
    When the event "EVT-031" is dispatched with 2 results
    Then the results list contains exactly 2 entries

  # --- Selection navigation ---

  Scenario: Move selection down
    Given the results list contains 4 entries
    When the event "EVT-032" is dispatched with index 0
    Then the selectedIndex is 0

  Scenario: Move selection further down
    Given the results list contains 4 entries
    And the selectedIndex is 1
    When the event "EVT-032" is dispatched with index 2
    Then the selectedIndex is 2

  Scenario: Move selection up
    Given the results list contains 4 entries
    And the selectedIndex is 3
    When the event "EVT-032" is dispatched with index 2
    Then the selectedIndex is 2

  # --- Selecting a result ---

  Scenario: Select a result resets all state
    Given isOpen is true
    And the query is "auth module"
    And the results list contains 3 entries
    And the selectedIndex is 1
    When the event "EVT-022" is dispatched
    Then isOpen is false
    And the query is ""
    And the results list is empty
    And the selectedIndex is -1

  # --- Selectors ---

  Scenario: hasResults is true when results exist
    Given the results list contains 2 entries
    When the selector "hasResults" is evaluated
    Then the result is true

  Scenario: hasResults is false when no results
    Given the results list is empty
    When the selector "hasResults" is evaluated
    Then the result is false

  Scenario: resultCount returns total count
    Given the results list contains 7 entries
    When the selector "resultCount" is evaluated
    Then the result is 7

  Scenario: selectedResult returns the result at selectedIndex
    Given the results list contains:
      | id   | title        | category  |
      | r-01 | Auth Module  | specs     |
      | r-02 | Login Flow   | sessions  |
      | r-03 | Auth Task    | tasks     |
    And the selectedIndex is 1
    When the selector "selectedResult" is evaluated
    Then the result id is "r-02"
    And the result title is "Login Flow"

  Scenario: selectedResult is null when selectedIndex is -1
    Given the results list contains 3 entries
    And the selectedIndex is -1
    When the selector "selectedResult" is evaluated
    Then the result is null

  Scenario: selectedResult is null when selectedIndex exceeds bounds
    Given the results list contains 2 entries
    And the selectedIndex is 5
    When the selector "selectedResult" is evaluated
    Then the result is null

  Scenario: resultsByCategory groups results
    Given the results list contains:
      | id   | category    |
      | r-01 | specs       |
      | r-02 | sessions    |
      | r-03 | specs       |
      | r-04 | tasks       |
      | r-05 | sessions    |
    When the selector "resultsByCategory" is evaluated
    Then the "specs" group contains 2 results
    And the "sessions" group contains 2 results
    And the "tasks" group contains 1 result
