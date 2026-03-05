@CMP-020
Feature: Graph Node List
  A filterable, scrollable list of knowledge graph nodes with colored type badges.

  Background:
    Given the graph node list component is rendered
    And STR-011 graph-store has node data loaded
    And STR-001 filter-store has graph filters at default values

  # -- Rendering --

  Scenario: List displays all nodes when no filter is active
    Given the graph store contains 25 nodes
    And no node type filter is active
    Then 25 node rows are rendered

  Scenario: Node count header displays total
    Given the graph store has nodeCount 142
    Then the node count header displays "142"

  Scenario: Each node row displays type badge, label, and property count
    Given a node with id "n-001", type "spec", label "auth-module-spec", and 4 properties
    Then the row displays a type badge "spec" colored "#4FC3F7"
    And the row displays label "auth-module-spec"
    And the row displays "4 props"

  # -- Node type colors --

  Scenario Outline: Type badge color matches node type
    Given a node with type "<type>"
    Then the type badge color is "<color>"

    Examples:
      | type        | color   |
      | spec        | #4FC3F7 |
      | requirement | #A78BFA |
      | task        | #22C55E |
      | test        | #FFD600 |
      | finding     | #FF3B3B |
      | agent       | #F472B6 |
      | phase       | #FF8C00 |
      | entity      | #60A5FA |

  # -- Row layout --

  Scenario: Rows are separated by subtle borders
    Then each row has a bottom border "1px solid rgba(0, 240, 255, 0.06)"

  Scenario: Row highlights on hover
    When the user hovers over a node row
    Then the row background changes to "rgba(0, 240, 255, 0.03)"

  Scenario: Property count shows singular form
    Given a node with 1 property
    Then the row displays "1 prop"

  Scenario: Property count shows plural form
    Given a node with 5 properties
    Then the row displays "5 props"

  # -- Filtering by node type --

  Scenario: Filter by single node type
    Given nodes of types "spec", "requirement", "task", and "test" exist
    When the filter graph.nodeTypes is set to ["spec"]
    Then only nodes of type "spec" are displayed

  Scenario: Filter by multiple node types
    When the filter graph.nodeTypes is set to ["spec", "requirement"]
    Then only nodes of type "spec" or "requirement" are displayed

  Scenario: Empty node type filter shows all nodes
    When the filter graph.nodeTypes is empty
    Then all node rows are displayed

  # -- Search filtering --

  Scenario: Search filters nodes by label
    Given nodes with labels "auth-module-spec", "auth-token-test", and "user-session"
    When the filter graph.search is set to "auth"
    Then only nodes with "auth" in the label are displayed

  Scenario: Search is case-insensitive
    Given a node with label "AuthModule"
    When the filter graph.search is set to "auth"
    Then the node "AuthModule" is displayed

  Scenario: Combined type and search filters use AND logic
    Given nodes of type "spec" with labels "auth-spec" and "user-spec"
    And nodes of type "task" with label "auth-task"
    When the filter graph.nodeTypes is set to ["spec"]
    And the filter graph.search is set to "auth"
    Then only the node "auth-spec" is displayed

  # -- Empty state --

  Scenario: Empty state when no nodes exist
    Given the graph store contains 0 nodes
    Then the text "No graph nodes available." is displayed
    And no node rows are visible

  Scenario: Empty state after filtering removes all results
    Given the graph store contains 10 nodes none of type "finding"
    When the filter graph.nodeTypes is set to ["finding"]
    Then the text "No graph nodes available." is displayed

  # -- Scrolling --

  Scenario: List is scrollable when nodes exceed viewport
    Given the graph store contains 200 nodes
    Then the node list is vertically scrollable

  # -- Accessibility --

  Scenario: Component has correct ARIA role
    Then the graph node list has role "list"
    And the graph node list has aria-label "Knowledge graph nodes"
