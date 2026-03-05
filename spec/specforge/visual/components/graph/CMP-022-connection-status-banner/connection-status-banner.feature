@CMP-022
Feature: Connection Status Banner
  A compact banner showing graph database connection status.

  Background:
    Given the connection status banner component is rendered
    And STR-011 graph-store provides connection status

  # -- Connected state --

  Scenario: Banner shows connected state when graph is connected
    Given the graph store isConnected is true
    Then the banner displays "Connected to graph"
    And the status dot color is "--sf-accent"
    And the banner text color is "--sf-text-muted"
    And the banner background is "rgba(0, 240, 255, 0.06)"

  Scenario: Connected dot is a 6px accent circle
    Given the graph store isConnected is true
    Then the status dot has width 6px and height 6px
    And the status dot has border-radius 50%
    And the status dot background is "--sf-accent"

  # -- Disconnected state --

  Scenario: Banner shows disconnected state when graph is not connected
    Given the graph store isConnected is false
    Then the banner displays "Disconnected — data may be stale"
    And the status dot color is "#FF3B3B"
    And the banner text color is "#FF3B3B"
    And the banner background is "rgba(255, 59, 59, 0.08)"

  Scenario: Disconnected dot is a 6px red circle
    Given the graph store isConnected is false
    Then the status dot background is "#FF3B3B"

  # -- State transitions --

  Scenario: Banner updates when connection drops
    Given the graph store isConnected is true
    When the graph store isConnected changes to false
    Then the banner displays "Disconnected — data may be stale"
    And the status dot color changes to "#FF3B3B"
    And the banner background changes to "rgba(255, 59, 59, 0.08)"

  Scenario: Banner updates when connection restores
    Given the graph store isConnected is false
    When the graph store isConnected changes to true
    Then the banner displays "Connected to graph"
    And the status dot color changes to "--sf-accent"
    And the banner background changes to "rgba(0, 240, 255, 0.06)"

  # -- Layout --

  Scenario: Banner uses inline-flex layout
    Then the banner has display "inline-flex"
    And the banner has align-items "center"
    And the banner has gap 8px

  Scenario: Banner has rounded corners and padding
    Then the banner has border-radius 6px
    And the banner has padding "6px 12px"

  Scenario: Banner text is 13px
    Then the status text has font-size 13px

  # -- Accessibility --

  Scenario: Component has correct ARIA role
    Then the connection status banner has role "status"
    And the connection status banner has aria-label "Graph database connection status"

  Scenario: Status changes are announced politely
    Then the connection status banner has aria-live "polite"

  Scenario: Screen reader announces connection change
    Given the graph store isConnected is true
    When the graph store isConnected changes to false
    Then the aria-live region announces the disconnected status
