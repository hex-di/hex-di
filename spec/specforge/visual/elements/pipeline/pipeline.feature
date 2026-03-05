@ELM-pipeline
Feature: Pipeline Elements
  Phase nodes and connectors in the horizontal pipeline strip.

  Background:
    Given the pipeline strip is rendered
    And a pipeline with multiple phases exists

  # ── ELM-044 Phase Node ──

  Scenario: Pending phase node renders with dashed border
    Given a phase with status "pending"
    Then the phase node has color "--sf-text-muted"
    And the phase node has a dashed border
    And the phase node background is "transparent"
    And the phase node displays a circle-outline icon

  Scenario: Active phase node renders with accent glow
    Given a phase with status "active"
    Then the phase node has color "--sf-accent"
    And the phase node has background "--sf-accent-dim"
    And the phase node has a solid accent border
    And the phase node has a glow box-shadow
    And the phase node displays a spinner icon

  Scenario: Completed phase node renders with green check
    Given a phase with status "completed"
    Then the phase node has color "#22C55E"
    And the phase node has background "rgba(34, 197, 94, 0.08)"
    And the phase node has a solid green border
    And the phase node displays a check icon

  Scenario: Failed phase node renders with red x-mark
    Given a phase with status "failed"
    Then the phase node has color "#FF3B3B"
    And the phase node has background "rgba(255, 59, 59, 0.08)"
    And the phase node has a solid red border
    And the phase node displays an x-mark icon

  Scenario: Phase node displays name label
    Given a phase named "Discovery"
    Then the phase node displays the label "Discovery" at 11px

  Scenario: Phase node has minimum width
    Then each phase node has min-width 80px

  # ── ELM-045 Phase Connector ──

  Scenario: Connector between pending phases is dashed and muted
    Given the source phase status is "pending"
    Then the connector is displayed as a dashed line
    And the connector color is "rgba(0, 240, 255, 0.15)"

  Scenario: Connector from active phase is animated
    Given the source phase status is "active"
    Then the connector has color "--sf-accent"
    And the connector has a flowing animation

  Scenario: Connector from completed phase is solid green
    Given the source phase status is "completed"
    Then the connector has color "#22C55E"
    And the connector is a solid line without animation

  Scenario: Connector from failed phase is solid red
    Given the source phase status is "failed"
    Then the connector has color "#FF3B3B"
    And the connector is a solid line without animation

  Scenario: Connectors have fixed dimensions
    Then each phase connector has height 2px
    And each phase connector has width 24px

  Scenario: Pipeline renders phases left-to-right with connectors
    Given a pipeline with phases "Discovery", "Build", "Test"
    Then the phases are rendered left-to-right
    And a connector is placed between each adjacent pair of phases
