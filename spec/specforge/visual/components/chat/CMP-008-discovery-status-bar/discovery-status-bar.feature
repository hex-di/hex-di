@CMP-008-discovery-status-bar
Feature: Discovery Status Bar
  Shows the discovery conversation phase and provides contextual action buttons.

  Background:
    Given the chat view is rendered
    And the discovery status bar is visible

  # -- Not Started State --

  Scenario: Not-started state shows request brief button
    Given discoveryStatus.briefReady is false
    And discoveryStatus.briefAccepted is false
    Then the ELM-031-discovery-status-indicator displays "Discovery not started"
    And the indicator color is "--sf-text-muted"
    And the ELM-034-request-brief-button is visible
    And the ELM-032-accept-brief-button is not visible
    And the ELM-033-reject-brief-button is not visible

  Scenario: Clicking request brief triggers callback
    Given the discovery status is "not-started"
    When the user clicks the ELM-034-request-brief-button
    Then the onRequestBrief callback is invoked

  # -- In Progress State --

  Scenario: In-progress state shows status only
    Given discovery conversation is in progress
    Then the ELM-031-discovery-status-indicator displays "Discovery in progress..."
    And the indicator color is "--sf-accent"
    And no action buttons are visible

  # -- Brief Ready State --

  Scenario: Brief-ready state shows accept and reject buttons
    Given discoveryStatus.briefReady is true
    And discoveryStatus.briefAccepted is false
    Then the ELM-031-discovery-status-indicator displays "Brief ready for review"
    And the indicator color is "--sf-warning"
    And the ELM-032-accept-brief-button is visible
    And the ELM-033-reject-brief-button is visible
    And the ELM-034-request-brief-button is not visible

  Scenario: Clicking accept brief triggers callback
    Given the discovery status is "brief-ready"
    When the user clicks the ELM-032-accept-brief-button
    Then the onAcceptBrief callback is invoked

  Scenario: Clicking reject brief triggers callback
    Given the discovery status is "brief-ready"
    When the user clicks the ELM-033-reject-brief-button
    Then the onRejectBrief callback is invoked

  # -- Accepted State --

  Scenario: Accepted state shows checkmark and confirmation
    Given discoveryStatus.briefAccepted is true
    Then the ELM-031-discovery-status-indicator displays "Brief Accepted"
    And the indicator color is "--sf-success"
    And a checkmark icon is visible in the indicator
    And no action buttons are visible

  # -- Layout --

  Scenario: Bar has correct layout properties
    Then the bar has display "flex"
    And the bar has flex-direction "row"
    And the bar has align-items "center"
    And the bar has gap "8px"
    And the bar has background "var(--sf-surface-alt)"
    And the bar has border-radius "6px"

  # -- Store Binding --

  Scenario: Component reads discovery status from chat store
    Given STR-004 chat-store discoveryStatus.briefReady is true
    And STR-004 chat-store discoveryStatus.briefAccepted is false
    Then the component renders in the "brief-ready" state

  # -- Accessibility --

  Scenario: Bar has correct ARIA attributes
    Then the component has role "status"
    And the component has aria-label "Discovery phase status"
    And the component has aria-live "polite"
