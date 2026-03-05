@PG-009-graph-explorer
Feature: Graph Explorer Page
  As a user exploring the knowledge graph
  I want to browse nodes and edges with filtering and search
  So that I can understand the relationships between specs, tasks, tests, and findings

  Background:
    Given the application shell is rendered
    And the user navigates to the "#graph" route

  # -- Page Layout -----------------------------------------------------------

  Scenario: Graph explorer page renders in single-column layout
    Then the graph explorer page uses a single-column layout
    And the content area has 24px padding

  Scenario: Page sections render in correct order
    Given a session is active with graph data
    Then the connection status banner (CMP-022) is rendered at the top
    And the filter bar (CMP-004) is rendered below the banner
    And the split view with node list and edge list is rendered below the filter bar

  Scenario: Split view renders two columns side by side
    Given a session is active with graph data
    Then the node list (CMP-020) is on the left
    And the edge list (CMP-021) is on the right
    And the split view uses grid with "1fr 1fr" columns and 16px gap

  # -- No-Session State ------------------------------------------------------

  Scenario: No-session state when no session is selected
    Given the active session store has sessionId null
    Then the page displays "Select a session to explore the knowledge graph."
    And the connection status banner is not visible
    And the filter bar is not visible
    And the split view is not visible

  # -- Disconnected State ----------------------------------------------------

  Scenario: Disconnected state shows warning banner
    Given the active session store has an active session
    And the graph store connectionStatus is "disconnected"
    Then the connection banner shows "Disconnected from graph service. Data may be stale."
    And the banner background is "rgba(255, 59, 59, 0.08)"
    And the banner text color is "#FF3B3B"
    And the banner displays a "Reconnect" button

  Scenario: Disconnected state renders stale data with reduced opacity
    Given the graph store connectionStatus is "disconnected"
    And the graph store contains nodes and edges from previous connection
    Then both node list and edge list are rendered at 40% opacity
    And the lists show the last-known data

  Scenario: Error state shows error banner with retry
    Given the graph store connectionStatus is "error"
    Then the connection banner shows the error message
    And the banner displays a "Retry" button

  Scenario: Clicking Reconnect triggers reconnection
    Given the connection banner shows "Disconnected"
    When the user clicks the "Reconnect" button
    Then a graph service reconnection is attempted
    And the banner transitions to "Connecting..." state

  # -- Connecting State ------------------------------------------------------

  Scenario: Connecting state shows pulsing indicator
    Given the graph store connectionStatus is "connecting"
    Then the connection banner shows "Connecting to graph service..."
    And the banner background is "rgba(255, 202, 40, 0.08)"
    And the banner text color is "#FFCA28"
    And the status dot pulses

  # -- Connected State -------------------------------------------------------

  Scenario: Connected state shows green banner with counts
    Given the graph store connectionStatus is "connected"
    And the graph store contains 12 nodes and 18 edges
    Then the connection banner shows "Connected to graph service"
    And the banner displays "12 nodes | 18 edges"
    And the banner background is "rgba(34, 197, 94, 0.08)"
    And the banner text color is "#22C55E"

  # -- Empty State -----------------------------------------------------------

  Scenario: Empty state when connected but no graph data
    Given the active session store has an active session
    And the graph store connectionStatus is "connected"
    And the graph store contains 0 nodes
    Then the connection banner shows connected with "0 nodes | 0 edges"
    And the filter bar is visible but controls are disabled
    And the page displays "No graph data yet. Run the pipeline to populate."

  # -- Loading State ---------------------------------------------------------

  Scenario: Loading state shows skeleton rows
    Given the active session store has an active session
    And graph data is being fetched
    Then 5 skeleton rows appear in the node list
    And 5 skeleton rows appear in the edge list
    And the connection banner shows "Connecting to graph service..."

  # -- Populated State -------------------------------------------------------

  Scenario: Populated state renders nodes and edges
    Given the graph store contains 12 nodes and 18 edges
    And the graph store connectionStatus is "connected"
    Then 12 rows are rendered in the node list
    And 18 rows are rendered in the edge list

  # -- Node List Rendering ---------------------------------------------------

  Scenario: Node list displays columns for ID, Type, and Label
    Then the node list table displays columns "ID", "Type", "Label"

  Scenario: Node type badge displays abbreviation with correct color
    Given a node has type "spec"
    Then the node row displays a type badge with text "SP"
    And the badge text color is "#4FC3F7"
    And the badge background is "#4FC3F7" at 12% opacity

  Scenario Outline: Node type badges use correct abbreviation and color
    Given a node has type "<type>"
    Then the node type badge text is "<abbr>"
    And the node type badge color is "<color>"

    Examples:
      | type        | abbr | color   |
      | spec        | SP   | #4FC3F7 |
      | requirement | RQ   | #AB47BC |
      | task        | TK   | #66BB6A |
      | test        | TS   | #FFCA28 |
      | finding     | FN   | #FF3B3B |
      | agent       | AG   | #FF7043 |
      | phase       | PH   | #26C6DA |
      | entity      | EN   | #78909C |

  Scenario: Node list shows footer with total and filtered counts
    Given the graph store contains 12 nodes
    And the node type filter is set to ["spec"]
    And 3 nodes match the filter
    Then the node list footer displays "12 nodes (3 filtered)"

  # -- Edge List Rendering ---------------------------------------------------

  Scenario: Edge list displays columns for Source, Relationship, and Target
    Then the edge list table displays columns "Source", "Relationship", "Target"

  Scenario: Edge source and target show node type badge
    Given an edge from node-001 (type "spec") to node-004 (type "requirement")
    Then the source cell shows badge "SP" with color "#4FC3F7" and text "node-001"
    And the target cell shows badge "RQ" with color "#AB47BC" and text "node-004"

  Scenario: Edge list shows footer with total and filtered counts
    Given the graph store contains 18 edges
    And the relationship type filter is set to ["defines"]
    And 5 edges match the filter
    Then the edge list footer displays "18 edges (5 filtered)"

  # -- Filter: Node Types Multi-Select --------------------------------------

  Scenario: Node types multi-select defaults to no selection (show all)
    Then the node types multi-select has no options checked
    And all node types are displayed

  Scenario: Filtering by node type shows only matching nodes
    When the user selects "spec" and "requirement" in the node types multi-select
    Then only nodes with type "spec" or "requirement" are displayed
    And edges not connected to visible nodes are hidden

  # -- Filter: Relationship Types Multi-Select --------------------------------

  Scenario: Relationship types multi-select defaults to no selection (show all)
    Then the relationship types multi-select has no options checked
    And all relationship types are displayed

  Scenario: Filtering by relationship type shows only matching edges
    When the user selects "defines" in the relationship types multi-select
    Then only edges with relationship "defines" are displayed

  # -- Filter: Search Text ---------------------------------------------------

  Scenario: Search filters nodes by label or ID
    When the user types "auth" in the search input
    Then only nodes whose label or ID contains "auth" are displayed
    And edges not connected to visible nodes are hidden

  Scenario: Search is case-insensitive
    When the user types "AUTH" in the search input
    Then nodes with label containing "auth" (any case) are displayed

  # -- Filter: View Mode Presets ---------------------------------------------

  Scenario: Default view mode is full-graph
    Then the "Full Graph" view mode button is active
    And all nodes and edges are displayed

  Scenario: Specs-only preset filters to spec nodes
    When the user clicks the "Specs Only" view mode button
    Then the node types filter is set to ["spec"]
    And only spec nodes are displayed

  Scenario: Tasks-only preset filters to task nodes
    When the user clicks the "Tasks Only" view mode button
    Then the node types filter is set to ["task"]

  Scenario: Findings-only preset filters to finding nodes
    When the user clicks the "Findings Only" view mode button
    Then the node types filter is set to ["finding"]

  Scenario: Manual filter change switches view mode to custom
    Given the view mode is "specs-only"
    When the user manually selects "requirement" in the node types multi-select
    Then the view mode switches to "custom"

  Scenario: Active view mode button uses accent styling
    Given the view mode is "full-graph"
    Then the "Full Graph" button has background "--sf-accent" and text "--sf-bg"
    And all other view mode buttons use default styling

  # -- Cross-List Interaction ------------------------------------------------

  Scenario: Clicking a node highlights connected edges
    When the user clicks a node row for "node-001"
    Then all edges with source or target "node-001" are highlighted in the edge list

  Scenario: Clicking an edge highlights source and target nodes
    When the user clicks an edge row from "node-001" to "node-004"
    Then "node-001" and "node-004" are highlighted in the node list

  # -- Store Bindings --------------------------------------------------------

  Scenario: Page reads graph data from graph store
    Given the graph store (STR-011) contains 12 nodes and 18 edges
    Then 12 node rows and 18 edge rows are rendered

  Scenario: Page reads connection status from graph store
    Given the graph store (STR-011) connectionStatus is "connected"
    Then the connection banner shows "Connected to graph service"

  Scenario: Page reads filter state from filter store
    Given the filter store (STR-001) graph.nodeTypes is set to ["task"]
    Then only task nodes are displayed

  Scenario: Page reads session state from active session store
    Given the active session store (STR-002) has sessionId null
    Then the no-session state is displayed

  # -- Accessibility ---------------------------------------------------------

  Scenario: Node list has correct ARIA role
    Then the node list table has role "table"
    And the node list has aria-label "Graph nodes"

  Scenario: Edge list has correct ARIA role
    Then the edge list table has role "table"
    And the edge list has aria-label "Graph edges"

  Scenario: Connection banner has correct ARIA role
    Then the connection status banner has role "status"
    And the banner has aria-live "polite"

  Scenario: Node type badges have accessible labels
    Given a node has type "spec"
    Then the type badge has aria-label "Type: spec"
