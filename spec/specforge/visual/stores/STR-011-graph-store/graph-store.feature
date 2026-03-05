@STR-011
Feature: Graph Store
  As a view consumer
  I want reliable state management for graph data
  So that the UI reflects the current knowledge graph state

  Background:
    Given the store "graph-store" is initialized with defaults
    And the initial nodes list is empty
    And the initial edges list is empty
    And the initial connectionStatus is "disconnected"

  # --- Bulk loading nodes ---

  Scenario: Load nodes in bulk
    When the event "EVT-024" is dispatched with 5 graph nodes
    Then the nodes list contains 5 entries

  Scenario: Bulk load replaces existing nodes
    Given the nodes list contains 3 entries
    When the event "EVT-024" is dispatched with 2 graph nodes
    Then the nodes list contains exactly 2 entries

  # --- Bulk loading edges ---

  Scenario: Load edges in bulk
    When the event "EVT-025" is dispatched with 4 graph edges
    Then the edges list contains 4 entries

  Scenario: Bulk load replaces existing edges
    Given the edges list contains 6 entries
    When the event "EVT-025" is dispatched with 3 graph edges
    Then the edges list contains exactly 3 entries

  # --- Incremental node additions ---

  Scenario: Append a single node
    Given the nodes list contains 2 entries
    When the event "EVT-026" is dispatched with a node:
      | id     | type        | label          | sessionId | properties |
      | node-3 | Requirement | Auth Module    | sess-001  | {}         |
    Then the nodes list contains 3 entries
    And the node with id "node-3" has type "Requirement"

  # --- Incremental edge additions ---

  Scenario: Append a single edge
    Given the edges list contains 1 entry
    When the event "EVT-027" is dispatched with an edge:
      | id     | source | target | relationship |
      | edge-2 | node-1 | node-3 | DEPENDS_ON   |
    Then the edges list contains 2 entries
    And the edge with id "edge-2" has relationship "DEPENDS_ON"

  # --- Connection status ---

  Scenario Outline: Connection status transitions
    Given the connectionStatus is "<from>"
    When the event "EVT-028" is dispatched with status "<to>"
    Then the connectionStatus is "<to>"

    Examples:
      | from          | to          |
      | disconnected  | connecting  |
      | connecting    | connected   |
      | connected     | disconnected|
      | connecting    | error       |
      | error         | connecting  |

  # --- Graph clear ---

  Scenario: Clear graph resets nodes and edges
    Given the nodes list contains 5 entries
    And the edges list contains 8 entries
    When the event "EVT-029" is dispatched
    Then the nodes list is empty
    And the edges list is empty
    And the connectionStatus remains unchanged

  # --- Selectors ---

  Scenario: Filter nodes by type
    Given the nodes list contains:
      | id     | type        |
      | node-1 | Requirement |
      | node-2 | Decision    |
      | node-3 | Requirement |
      | node-4 | Session     |
    When the selector "nodesByType" is called with type "Requirement"
    Then the result contains 2 nodes
    And the result contains nodes "node-1" and "node-3"

  Scenario: Filter edges by relationship
    Given the edges list contains:
      | id     | relationship |
      | edge-1 | TRACES_TO    |
      | edge-2 | DEPENDS_ON   |
      | edge-3 | TRACES_TO    |
    When the selector "edgesByRelationship" is called with relationship "TRACES_TO"
    Then the result contains 2 edges

  Scenario: Node count selector
    Given the nodes list contains 7 entries
    When the selector "nodeCount" is evaluated
    Then the result is 7

  Scenario: Edge count selector
    Given the edges list contains 12 entries
    When the selector "edgeCount" is evaluated
    Then the result is 12

  Scenario: isConnected selector when connected
    Given the connectionStatus is "connected"
    When the selector "isConnected" is evaluated
    Then the result is true

  Scenario: isConnected selector when disconnected
    Given the connectionStatus is "disconnected"
    When the selector "isConnected" is evaluated
    Then the result is false

  Scenario: isConnected selector when in error state
    Given the connectionStatus is "error"
    When the selector "isConnected" is evaluated
    Then the result is false
