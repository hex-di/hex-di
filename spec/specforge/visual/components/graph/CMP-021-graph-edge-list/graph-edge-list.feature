@CMP-021
Feature: Graph Edge List
  A filterable table of knowledge graph edges showing source, relationship, and target.

  Background:
    Given the graph edge list component is rendered
    And STR-011 graph-store has edge data loaded
    And STR-001 filter-store has graph filters at default values

  # -- Rendering --

  Scenario: Table displays all edges when no filter is active
    Given the graph store contains 20 edges
    And no relationship type filter is active
    Then 20 edge rows are rendered

  Scenario: Edge count header displays total
    Given the graph store has edgeCount 87
    Then the edge count header displays "87"

  Scenario: Each edge row displays source, relationship, and target
    Given an edge from "auth-module-spec" to "REQ-014-token-validation" with relationship "defines"
    Then the row displays source "auth-module-spec"
    And the row displays relationship "defines" with arrow prefix
    And the row displays target "REQ-014-token-validation"

  Scenario: Table has 3 column headers
    Then the table headers are "Source", "Relationship", "Target"

  # -- Relationship types --

  Scenario: All 7 relationship types are supported
    Then the component supports relationships: defines, implements, tests, covers, uses, produces, consumes

  Scenario: Relationship label is styled with accent color
    Given an edge with relationship "implements"
    Then the relationship text color is "--sf-accent"

  Scenario: Relationship label includes arrow prefix
    Given an edge with relationship "tests"
    Then the relationship cell displays "--> tests"

  # -- Row layout --

  Scenario: Rows are separated by subtle borders
    Then each edge row has a bottom border "1px solid rgba(0, 240, 255, 0.06)"

  Scenario: Row highlights on hover
    When the user hovers over an edge row
    Then the row background changes to "rgba(0, 240, 255, 0.03)"

  Scenario: Relationship column is center-aligned
    Then the "Relationship" column is center-aligned

  # -- Filtering by relationship type --

  Scenario: Filter by single relationship type
    Given edges with relationships "defines", "implements", "tests", and "produces"
    When the filter graph.relationshipTypes is set to ["defines"]
    Then only edges with relationship "defines" are displayed

  Scenario: Filter by multiple relationship types
    When the filter graph.relationshipTypes is set to ["defines", "implements"]
    Then only edges with relationship "defines" or "implements" are displayed

  Scenario: Empty relationship type filter shows all edges
    When the filter graph.relationshipTypes is empty
    Then all edge rows are displayed

  # -- Empty state --

  Scenario: Empty state when no edges exist
    Given the graph store contains 0 edges
    Then the text "No graph edges available." is displayed
    And no edge rows are visible

  Scenario: Empty state after filtering removes all results
    Given the graph store contains 10 edges none with relationship "consumes"
    When the filter graph.relationshipTypes is set to ["consumes"]
    Then the text "No graph edges available." is displayed

  # -- Scrolling --

  Scenario: Table is scrollable when edges exceed viewport
    Given the graph store contains 300 edges
    Then the edge list is vertically scrollable

  # -- Reactivity --

  Scenario: Table updates when store data changes
    Given the graph store contains 5 edges
    When the STR-011 edges are replaced with 12 entries
    Then 12 edge rows are rendered

  # -- Accessibility --

  Scenario: Component has correct ARIA role
    Then the graph edge list has role "table"
    And the graph edge list has aria-label "Knowledge graph edges"
