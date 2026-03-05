@CMP-007-token-budget-bar
Feature: Token Budget Bar
  Horizontal progress bar showing token budget utilization with color-coded zones.

  Background:
    Given the chat view is rendered
    And the token budget bar is visible

  # -- Rendering --

  Scenario: Bar renders progress track and label
    Then the component contains ELM-029-token-budget-progress
    And the component contains ELM-030-token-budget-label

  Scenario: Progress bar has correct dimensions
    Then the progress bar has height "4px"
    And the progress bar has border-radius "2px"
    And the progress bar track has background "var(--sf-surface-alt)"

  Scenario: Label displays token counts and percentage
    Given used is 12450 and total is 30000 and percent is 42
    Then the label displays "12,450 / 30,000 tokens (42%)"

  # -- Budget Zones --

  Scenario: Safe zone styling for 0-60%
    Given percent is 42
    Then the progress fill color is "var(--sf-accent)"
    And the progress fill has no animation

  Scenario: Warning zone styling for 60-85%
    Given percent is 72
    Then the progress fill color is "#FF8C00"
    And the progress fill has no animation

  Scenario: Critical zone styling for 85-95%
    Given percent is 90
    Then the progress fill color is "#FF3B3B"
    And the progress fill has no animation

  Scenario: Exhausted zone styling for 95-100%
    Given percent is 97
    Then the progress fill color is "#FF3B3B"
    And the progress fill has animation "pulse 1.5s ease-in-out infinite"

  Scenario: Zone boundary at exactly 60%
    Given percent is 60
    Then the progress fill color is "var(--sf-accent)"

  Scenario: Zone boundary at 60.1% enters warning
    Given percent is 61
    Then the progress fill color is "#FF8C00"

  Scenario: Zone boundary at exactly 85%
    Given percent is 85
    Then the progress fill color is "#FF8C00"

  Scenario: Zone boundary at 85.1% enters critical
    Given percent is 86
    Then the progress fill color is "#FF3B3B"

  Scenario: Zone boundary at exactly 95%
    Given percent is 95
    Then the progress fill color is "#FF3B3B"
    And the progress fill has no animation

  Scenario: Zone boundary at 95.1% enters exhausted
    Given percent is 96
    Then the progress fill color is "#FF3B3B"
    And the progress fill has animation "pulse 1.5s ease-in-out infinite"

  # -- Transitions --

  Scenario: Fill width transitions smoothly on update
    Given percent changes from 40 to 50
    Then the progress fill transitions width over 300ms with easing "ease"

  Scenario: Fill color transitions smoothly between zones
    Given percent changes from 59 to 62
    Then the progress fill transitions background-color over 300ms with easing "ease"

  # -- Store Binding --

  Scenario: Component reads from chat store token budget
    Given STR-004 chat-store tokenBudget.used is 5000
    And STR-004 chat-store tokenBudget.total is 20000
    And STR-004 chat-store tokenBudget.percent is 25
    Then the progress fill width is "25%"
    And the label displays "5,000 / 20,000 tokens (25%)"

  # -- Accessibility --

  Scenario: Progress bar has correct ARIA attributes
    Given percent is 42 and used is 12450 and total is 30000
    Then the component has role "progressbar"
    And the component has aria-valuemin "0"
    And the component has aria-valuemax "100"
    And the component has aria-valuenow "42"
