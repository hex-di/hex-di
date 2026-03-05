@CMP-023-hero-section
Feature: Hero Section
  Full-viewport hero with headline, subheadline, CTA buttons, and
  animated hexagon grid background on the SpecForge landing page.

  Background:
    Given the landing page is rendered
    And the hero section is visible in the viewport

  # -- Layout --

  Scenario: Hero section occupies full viewport height
    Then the hero section has min-height 100vh
    And the hero section has padding-top approximately 20vh

  Scenario: Hero content is horizontally centered
    Then the hero content container has max-width 800px
    And the hero content container has text-align center
    And the hero content container has margin 0 auto

  # -- ELM-072 Hero Headline --

  Scenario: Headline renders with gradient text
    Then the headline text is "AI-Powered Specification Authoring"
    And the headline font-family is "--sf-font-display"
    And the headline font-size is 48px
    And the headline font-weight is 700
    And the headline has a gradient fill from "--sf-accent" to "--sf-accent-light"

  Scenario: Headline uses background-clip for gradient effect
    Then the headline has background-clip set to "text"
    And the headline has -webkit-text-fill-color set to "transparent"

  Scenario: Custom headline text is rendered when prop is provided
    Given the hero section receives headline prop "Build Specs Faster"
    Then the headline text is "Build Specs Faster"

  # -- ELM-073 Hero Subheadline --

  Scenario: Subheadline renders with muted styling
    Then the subheadline text is "Multi-agent collaboration for production-grade software specs"
    And the subheadline font-family is "--sf-font-body"
    And the subheadline font-size is 20px
    And the subheadline color is "--sf-text-muted"

  Scenario: Subheadline is constrained in width
    Then the subheadline has max-width 600px

  Scenario: Custom subheadline text is rendered when prop is provided
    Given the hero section receives subheadline prop "Your custom tagline here"
    Then the subheadline text is "Your custom tagline here"

  # -- ELM-074 Hero CTA Primary --

  Scenario: Primary CTA renders with accent background
    Then the primary CTA button text is "Get Started"
    And the primary CTA button background is "--sf-accent"
    And the primary CTA button color is "--sf-bg"
    And the primary CTA button border-radius is 999px

  Scenario: Primary CTA hover shows glow effect
    When the user hovers over the primary CTA button
    Then the primary CTA button background changes to "--sf-accent-light"
    And the primary CTA button has box-shadow "0 0 20px rgba(0, 240, 255, 0.3)"

  Scenario: Primary CTA click navigates to get-started
    When the user clicks the primary CTA button
    Then the "navigate-to-get-started" action is triggered

  Scenario: Primary CTA is keyboard accessible
    When the user focuses the primary CTA button via keyboard
    Then the primary CTA button has a 2px outline with 2px offset

  # -- ELM-075 Hero CTA Secondary --

  Scenario: Secondary CTA renders as ghost button
    Then the secondary CTA button text is "View Documentation"
    And the secondary CTA button background is "transparent"
    And the secondary CTA button color is "--sf-accent"
    And the secondary CTA button border is "1px solid --sf-accent"
    And the secondary CTA button border-radius is 999px

  Scenario: Secondary CTA hover fills background subtly
    When the user hovers over the secondary CTA button
    Then the secondary CTA button background changes to "rgba(0, 240, 255, 0.08)"
    And the secondary CTA button color changes to "--sf-accent-light"
    And the secondary CTA button border changes to "1px solid --sf-accent-light"

  Scenario: Secondary CTA click navigates to documentation
    When the user clicks the secondary CTA button
    Then the "navigate-to-documentation" action is triggered

  # -- Background Animation --

  Scenario: Animated hexagon grid is rendered behind content
    Then the hero section contains a hexagon grid background layer
    And the hexagon grid has z-index below the text content
    And the hexagons use "--sf-accent" at 6% opacity

  Scenario: Hexagon animation respects reduced-motion preference
    Given the user has enabled "prefers-reduced-motion: reduce"
    Then the hexagon grid animation is paused

  # -- Spacing --

  Scenario: Vertical spacing between elements is correct
    Then the headline has 16px bottom margin
    And the subheadline has 40px bottom margin
    And the primary CTA has 16px right margin from the secondary CTA

  # -- Accessibility --

  Scenario: Hero section has banner landmark role
    Then the hero section has role "banner"
    And the headline has role "heading" with level 1
