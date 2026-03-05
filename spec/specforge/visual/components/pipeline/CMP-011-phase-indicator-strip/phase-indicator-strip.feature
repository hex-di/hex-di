@CMP-011-phase-indicator-strip
Feature: Phase Indicator Strip
  Horizontal pipeline visualization showing all phases with status-aware styling and connectors.

  Background:
    Given the pipeline view is rendered
    And the phase indicator strip is visible

  # -- Overall Progress --

  Scenario: Overall progress text is displayed at top
    Given STR-005 pipeline-store progress is 45
    Then the progress text displays "Pipeline: 45% complete"
    And the progress text has font-size "12px"
    And the progress text has color "--sf-text-muted"
    And the progress text is centered

  Scenario: Overall progress updates dynamically
    Given STR-005 pipeline-store progress changes from 45 to 60
    Then the progress text updates to "Pipeline: 60% complete"

  # -- Phase Node Rendering --

  Scenario: Strip renders one node per phase
    Given the phases array contains 5 phases
    Then the strip displays 5 ELM-044-phase-node elements

  Scenario: Phase nodes are circles with labels below
    Then each phase node has diameter 40px
    And each phase node has border-radius "50%"
    And each phase node has a label 6px below the circle

  Scenario: Phase labels display phase names
    Given a phase has name "Discovery"
    Then the phase node label displays "Discovery"
    And the label has font-size "11px"

  # -- Pending State --

  Scenario: Pending phase has dashed muted border
    Given a phase has status "pending"
    Then the phase node has border "2px dashed var(--sf-text-muted)"
    And the phase node has background "transparent"
    And the phase node icon has color "--sf-text-muted"
    And the phase label has color "--sf-text-muted"

  Scenario: Pending phase has no animation
    Given a phase has status "pending"
    Then the phase node has no animation

  # -- Active State --

  Scenario: Active phase has accent glow
    Given a phase has status "active"
    Then the phase node has border "2px solid var(--sf-accent)"
    And the phase node has background "var(--sf-accent-dim)"
    And the phase node icon has color "--sf-accent"
    And the phase label has color "--sf-accent"
    And the phase node has box-shadow "0 0 12px var(--sf-accent-dim)"

  Scenario: Active phase has glow-pulse animation
    Given a phase has status "active"
    Then the phase node has animation "glow-pulse 2s ease-in-out infinite"

  # -- Completed State --

  Scenario: Completed phase has filled success styling
    Given a phase has status "completed"
    Then the phase node has border "2px solid var(--sf-success)"
    And the phase node has background "var(--sf-success)"
    And the phase node icon has color "--sf-surface"
    And the phase node icon is a checkmark
    And the phase label has color "--sf-success"

  # -- Failed State --

  Scenario: Failed phase has filled error styling
    Given a phase has status "failed"
    Then the phase node has border "2px solid var(--sf-error)"
    And the phase node has background "var(--sf-error)"
    And the phase node icon has color "--sf-surface"
    And the phase node icon is an X mark
    And the phase label has color "--sf-error"

  # -- Connectors --

  Scenario: Connectors rendered between adjacent phases
    Given the phases array contains 5 phases
    Then 4 ELM-045-phase-connector elements are rendered between the nodes

  Scenario: Connector between two completed phases is solid success
    Given phase 0 is "completed" and phase 1 is "completed"
    Then the connector between phase 0 and phase 1 has color "--sf-success"
    And the connector has style "solid"
    And the connector has no animation

  Scenario: Connector from completed to active is solid success
    Given phase 0 is "completed" and phase 1 is "active"
    Then the connector between phase 0 and phase 1 has color "--sf-success"
    And the connector has style "solid"

  Scenario: Connector from active to pending has marching dashes
    Given phase 2 is "active" and phase 3 is "pending"
    Then the connector between phase 2 and phase 3 has color "--sf-accent"
    And the connector has style "dashed"
    And the connector has animation "dash-march 1s linear infinite"

  Scenario: Connector between two pending phases is dashed muted
    Given phase 3 is "pending" and phase 4 is "pending"
    Then the connector between phase 3 and phase 4 has color "--sf-text-muted"
    And the connector has style "dashed"
    And the connector has no animation

  Scenario: Connector from failed phase is solid error
    Given phase 1 is "failed" and phase 2 is "pending"
    Then the connector between phase 1 and phase 2 has color "--sf-error"
    And the connector has style "solid"

  # -- Layout --

  Scenario: Phase row uses space-evenly distribution
    Then the phase row has display "flex"
    And the phase row has justify-content "space-evenly"
    And the phase row has align-items "center"

  Scenario: Connectors fill space between nodes
    Then each connector has flex-grow "1"
    And each connector has height "2px"
    And each connector has margin "0 8px"

  # -- Store Binding --

  Scenario: Component reads from pipeline store
    Given STR-005 pipeline-store phases contains 4 phases
    And STR-005 pipeline-store currentPhase is 1
    And STR-005 pipeline-store progress is 30
    Then 4 phase nodes are rendered
    And the phase at index 1 has "active" styling
    And the progress text displays "Pipeline: 30% complete"

  # -- Accessibility --

  Scenario: Strip has correct ARIA attributes
    Given STR-005 pipeline-store progress is 45
    Then the component has role "navigation"
    And the component has aria-label containing "Pipeline phases"
