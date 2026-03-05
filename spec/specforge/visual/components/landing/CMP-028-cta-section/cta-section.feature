@CMP-028-cta-section
Feature: CTA Section
  Bottom call-to-action section with a bold headline and large
  accent button over a subtle gradient background.

  Background:
    Given the landing page is rendered
    And the CTA section is visible

  # -- Layout --

  Scenario: CTA section content is centered and constrained
    Then the CTA section has max-width 600px
    And the CTA section has margin 0 auto
    And the CTA section has padding "80px 24px"
    And the CTA section has text-align center

  Scenario: Content is vertically and horizontally centered
    Then the CTA section uses a column flex layout
    And the CTA section has align-items center
    And the CTA section has justify-content center

  # -- Background --

  Scenario: CTA section has subtle gradient overlay
    Then the CTA section background includes a radial gradient
    And the gradient center uses "rgba(0, 240, 255, 0.04)"
    And the gradient fades to transparent at 70%
    And the base background is "--sf-bg"

  # -- ELM-084 CTA Headline --

  Scenario: CTA headline renders with display font
    Then the CTA headline text is "Ready to Automate Your Specs?"
    And the CTA headline font-family is "--sf-font-display"
    And the CTA headline font-size is 36px
    And the CTA headline font-weight is 700
    And the CTA headline line-height is 1.2
    And the CTA headline color is "--sf-text"

  Scenario: CTA headline has correct spacing
    Then the CTA headline has 32px bottom margin

  Scenario: CTA headline is a level-2 heading
    Then the CTA headline has role "heading" with level 2

  Scenario: Custom headline text is rendered when prop is provided
    Given the CTA section receives headline prop "Ship Specs Today"
    Then the CTA headline text is "Ship Specs Today"

  # -- ELM-085 CTA Button --

  Scenario: CTA button renders with accent styling
    Then the CTA button text is "Start Free"
    And the CTA button background is "--sf-accent"
    And the CTA button color is "--sf-bg"
    And the CTA button border is "none"
    And the CTA button border-radius is 999px

  Scenario: CTA button is large
    Then the CTA button font-size is 18px
    And the CTA button font-weight is 600
    And the CTA button padding is "16px 48px"
    And the CTA button uses font-family "--sf-font-body"

  Scenario: CTA button hover shows glow and scale
    When the user hovers over the CTA button
    Then the CTA button background changes to "--sf-accent-light"
    And the CTA button has box-shadow "0 0 30px rgba(0, 240, 255, 0.3)"
    And the CTA button has transform "scale(1.03)"

  Scenario: CTA button has smooth transition
    Then the CTA button has transition for background, box-shadow, and transform

  Scenario: CTA button focus has visible outline
    When the user focuses the CTA button via keyboard
    Then the CTA button has a 2px outline with 4px offset
    And the outline color is "--sf-accent-light"

  Scenario: CTA button click navigates to get-started
    When the user clicks the CTA button
    Then the "navigate-to-get-started" action is triggered

  Scenario: Custom CTA label is rendered when prop is provided
    Given the CTA section receives ctaLabel prop "Try Now"
    Then the CTA button text is "Try Now"

  # -- Accessibility --

  Scenario: CTA section has region landmark
    Then the CTA section has role "region"
    And the CTA section has aria-label "Call to action"
