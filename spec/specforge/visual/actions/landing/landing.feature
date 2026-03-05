@ACT-landing
Feature: Landing Actions
  Primary CTA and secondary/footer navigation links on the landing page.

  Background:
    Given the SpecForge landing page is rendered

  # -- ACT-028 Landing CTA --

  Scenario: Clicking the hero primary CTA navigates to getting started
    Given the hero section is visible
    When the user clicks the "Get Started" button (ELM-074)
    Then the action ACT-028-landing-cta is triggered
    And the user is navigated to the signup or getting-started page

  Scenario: Clicking the bottom CTA button navigates to getting started
    Given the bottom CTA section is visible
    When the user clicks the CTA button (ELM-085)
    Then the action ACT-028-landing-cta is triggered
    And the user is navigated to the signup or getting-started page

  Scenario: CTA click fires an analytics event
    When the user clicks the "Get Started" button (ELM-074)
    Then an analytics event "cta_click" is tracked
    And the event properties include source "hero" and variant "primary"

  Scenario: CTA button shows hover state before click
    When the user hovers over the "Get Started" button (ELM-074)
    Then the button background changes to "--sf-accent-light"
    And the button displays a glow shadow "0 0 20px rgba(0, 240, 255, 0.3)"

  # -- ACT-029 Landing Navigate --

  Scenario: Clicking the secondary CTA opens documentation in a new tab
    Given the hero section is visible
    When the user clicks the "View Documentation" button (ELM-075)
    Then the action ACT-029-landing-navigate is triggered
    And an external URL opens in a new browser tab

  Scenario: Clicking a footer link opens the target in a new tab
    Given the footer section is visible
    When the user clicks a footer link (ELM-086) for "GitHub"
    Then the action ACT-029-landing-navigate is triggered
    And the GitHub repository URL opens in a new browser tab

  Scenario: External links have rel="noopener noreferrer"
    Then all external navigation links include rel="noopener noreferrer"
    And all external navigation links include target="_blank"

  Scenario: Secondary CTA button shows hover state
    When the user hovers over the "View Documentation" button (ELM-075)
    Then the button background changes to "rgba(0, 240, 255, 0.08)"
    And the button border changes to "1px solid var(--sf-accent-light)"
