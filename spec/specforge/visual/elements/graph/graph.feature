@ELM-graph
Feature: Graph Elements
  Graph node rows, edge rows, connection status dot, and the view mode
  selector on the graph explorer view.

  Background:
    Given the graph explorer view is rendered
    And the graph store contains node and edge data

  # -- ELM-068 Graph Node Row --

  Scenario: Node row displays type badge, label, and ID
    Then each graph node row displays a colored type badge
    And each graph node row displays a label at 13px
    And each graph node row displays an ID in 11px monospace muted text

  Scenario: Node type badge for requirement nodes
    Given a graph node of type "requirement"
    Then the type badge has background "#6366F1"
    And the type badge has text color "#FFFFFF"

  Scenario: Node type badge for task nodes
    Given a graph node of type "task"
    Then the type badge has background "#14B8A6"
    And the type badge has text color "#FFFFFF"

  Scenario: Node type badge for source-file nodes
    Given a graph node of type "source-file"
    Then the type badge has background "#3B82F6"
    And the type badge has text color "#FFFFFF"

  Scenario: Node type badge for test-file nodes
    Given a graph node of type "test-file"
    Then the type badge has background "#10B981"
    And the type badge has text color "#FFFFFF"

  Scenario: Node type badge for finding nodes
    Given a graph node of type "finding"
    Then the type badge has background "#EC4899"
    And the type badge has text color "#FFFFFF"

  Scenario: Node type badge for agent-session nodes
    Given a graph node of type "agent-session"
    Then the type badge has background "#F97316"
    And the type badge has text color "#FFFFFF"

  Scenario: Node type badge for session-chunk nodes
    Given a graph node of type "session-chunk"
    Then the type badge has background "#F59E0B"
    And the type badge has text color "#FFFFFF"

  Scenario: Node type badge for package nodes
    Given a graph node of type "package"
    Then the type badge has background "#8B5CF6"
    And the type badge has text color "#FFFFFF"

  Scenario: Node type badge for decision nodes
    Given a graph node of type "decision"
    Then the type badge has background "#EF4444"
    And the type badge has text color "#FFFFFF"

  Scenario: Node type badge for invariant nodes
    Given a graph node of type "invariant"
    Then the type badge has background "#64748B"
    And the type badge has text color "#FFFFFF"

  Scenario: Node row default state
    When no node row is hovered or selected
    Then each node row has background "transparent"

  Scenario: Node row hover state
    When the user hovers over a graph node row
    Then the row background changes to "rgba(0, 240, 255, 0.05)"

  Scenario: Node row selected state
    When the user clicks a graph node row
    Then the row background changes to "--sf-accent-dim"
    And the row text color changes to "--sf-accent"

  Scenario: Long node labels truncate with ellipsis
    Given a graph node with a label longer than the available width
    Then the label text truncates with an ellipsis

  # -- ELM-069 Graph Edge Row --

  Scenario: Edge row displays source, relationship, and target
    Then each graph edge row displays a source node label
    And each graph edge row displays an arrow symbol
    And each graph edge row displays a relationship label in accent color
    And each graph edge row displays a target node label

  Scenario: Relationship label is uppercase and accent colored
    Then each relationship label has text-transform "uppercase"
    And each relationship label has color "--sf-accent"
    And each relationship label has font-size "10px"

  Scenario: Edge row default state
    When no edge row is hovered
    Then each edge row has background "transparent"

  Scenario: Edge row hover state
    When the user hovers over a graph edge row
    Then the row background changes to "rgba(0, 240, 255, 0.03)"

  # -- ELM-070 Connection Status Dot --

  Scenario: Connection dot is green when connected
    Given the graph database connection is active
    Then the connection status dot has background "--sf-accent"

  Scenario: Connection dot pulses when connected
    Given the graph database connection is active
    Then the connection status dot has a pulse animation at 2s interval

  Scenario: Connection dot is red when disconnected
    Given the graph database connection is inactive
    Then the connection status dot has background "#FF3B3B"

  Scenario: Connection dot does not pulse when disconnected
    Given the graph database connection is inactive
    Then the connection status dot has no animation

  Scenario: Connection dot is 8px circle
    Then the connection status dot has width "8px"
    And the connection status dot has height "8px"
    And the connection status dot has border-radius "50%"

  # -- ELM-071 Graph View Mode Selector --

  Scenario: View mode selector displays current preset
    Given the current graph view mode is "full-graph"
    Then the selector label displays "Full Graph"

  Scenario: View mode selector offers 7 presets
    When the user opens the view mode selector
    Then the dropdown contains "Full Graph"
    And the dropdown contains "By Type"
    And the dropdown contains "By Relationship"
    And the dropdown contains "Requirements Only"
    And the dropdown contains "Traceability Chain"
    And the dropdown contains "Orphans"
    And the dropdown contains "Impact Analysis"

  Scenario: Selecting a preset triggers filter action
    When the user selects "Traceability Chain" from the view mode selector
    Then the action ACT-016-set-filter is triggered with view "graph", key "viewMode", value "traceability-chain"

  Scenario: Selector default state
    When the selector is closed
    Then the selector has color "--sf-text-muted"
    And the selector has background "--sf-surface"
    And the selector has border-color "--sf-border"

  Scenario: Selector hover state
    When the user hovers over the closed selector
    Then the selector color changes to "--sf-text"
    And the selector background changes to "rgba(0, 240, 255, 0.05)"

  Scenario: Selector open state
    When the selector dropdown is open
    Then the selector has color "--sf-accent"
    And the selector has background "--sf-accent-dim"
    And the selector has border-color "--sf-accent"
