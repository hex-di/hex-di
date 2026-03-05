@ELM-landing
Feature: Landing Elements
  Hero headline, subheadline, CTA buttons, feature cards, how-it-works steps,
  CLI demo, pricing tiers, bottom CTA, and footer links on the landing page.

  Background:
    Given the landing page is rendered

  # -- ELM-072 Hero Headline --

  Scenario: Hero headline renders with gradient text
    Then the hero headline uses the display font at 48px
    And the hero headline has font-weight 800
    And the hero headline text has a gradient from accent to "#7C3AED"

  Scenario: Hero headline is center-aligned
    Then the hero headline has text-align "center"
    And the hero headline has max-width "720px"

  # -- ELM-073 Hero Subheadline --

  Scenario: Hero subheadline renders in muted body text
    Then the hero subheadline uses the body font at 20px
    And the hero subheadline has color "--sf-text-muted"
    And the hero subheadline has text-align "center"

  # -- ELM-074 Hero CTA Primary --

  Scenario: Primary CTA renders with accent background
    Then the primary CTA button has background "--sf-accent"
    And the primary CTA button has text color "--sf-bg"
    And the primary CTA button has font-size "16px"

  Scenario: Primary CTA hover lifts and glows
    When the user hovers over the primary CTA button
    Then the button transforms with "translateY(-1px)"
    And the button has a box-shadow with accent glow

  Scenario: Primary CTA click triggers landing action
    When the user clicks the primary CTA button
    Then the action ACT-028-landing-cta is triggered

  # -- ELM-075 Hero CTA Secondary --

  Scenario: Secondary CTA renders with ghost style
    Then the secondary CTA button has background "transparent"
    And the secondary CTA button has border "1px solid var(--sf-accent)"
    And the secondary CTA button has text color "--sf-accent"

  Scenario: Secondary CTA hover shows subtle fill
    When the user hovers over the secondary CTA button
    Then the button background changes to "rgba(0, 240, 255, 0.08)"
    And the button transforms with "translateY(-1px)"

  Scenario: Secondary CTA click triggers navigation action
    When the user clicks the secondary CTA button
    Then the action ACT-029-landing-navigate is triggered

  # -- ELM-076 Feature Card --

  Scenario: Feature card renders icon, title, and description
    Then each feature card contains a feature icon
    And each feature card displays a title at 16px bold
    And each feature card displays a description at 13px muted

  Scenario: Feature card default state
    Then each feature card has background "--sf-surface"
    And each feature card has border-color "--sf-border"

  Scenario: Feature card hover shows glow and lift
    When the user hovers over a feature card
    Then the card border-color changes to "rgba(0, 240, 255, 0.2)"
    And the card has a glow box-shadow
    And the card transforms with "translateY(-2px)"

  # -- ELM-077 Feature Icon --

  Scenario: Feature icon renders at 32px in accent color
    Then each feature icon has font-size "32px"
    And each feature icon has color "--sf-accent"

  # -- ELM-078 How It Works Step --

  Scenario: Step renders number circle, title, and description
    Then each how-it-works step displays a numbered circle
    And the number circle has background "--sf-accent-dim"
    And the number circle has text color "--sf-accent"
    And each step displays a title at 16px bold
    And each step displays a description at 13px muted

  Scenario: Step number circle dimensions
    Then each step number circle has width "36px"
    And each step number circle has height "36px"
    And each step number circle has border-radius "50%"

  # -- ELM-079 Step Connector --

  Scenario: Connector renders as dotted line between steps
    Then each step connector is a dotted line using "--sf-border"
    And each step connector has width "2px"
    And each step connector is aligned to the step circle center

  # -- ELM-080 CLI Demo Line --

  Scenario: Command line renders with typing animation
    Given a CLI demo command line
    Then the line uses the monospace font at 14px
    And the line has color "--sf-text"
    And the line has a typing animation effect

  Scenario: Output line renders in green
    Given a CLI demo output line
    Then the line has color "#22C55E"

  Scenario: Comment line renders in muted color
    Given a CLI demo comment line
    Then the line has color "--sf-text-muted"

  # -- ELM-081 CLI Demo Prompt --

  Scenario: Prompt symbol renders in accent color
    Then the CLI prompt symbol has color "--sf-accent"
    And the CLI prompt uses the monospace font

  # -- ELM-082 Pricing Tier Card --

  Scenario: Pricing tier card renders name, price, and features
    Then each pricing card displays a tier name at 20px bold
    And each pricing card displays a price in 36px display font
    And each pricing card contains a feature list
    And each pricing card contains a CTA button

  Scenario: Popular tier card has accent border
    Given a pricing tier marked as "popular"
    Then the card has border-color "--sf-accent"
    And the card has a glow box-shadow

  Scenario: Default tier card has standard border
    Given a pricing tier that is not marked as "popular"
    Then the card has border-color "--sf-border"
    And the card has no glow box-shadow

  # -- ELM-083 Pricing Feature Item --

  Scenario: Included feature shows green check icon
    Given a pricing feature that is included
    Then the feature item has a check icon in "#22C55E"
    And the feature text has color "--sf-text"

  Scenario: Excluded feature shows muted cross with strikethrough
    Given a pricing feature that is excluded
    Then the feature item has a cross icon in "--sf-text-muted"
    And the feature text has color "--sf-text-muted"
    And the feature text has text-decoration "line-through"

  # -- ELM-084 CTA Headline --

  Scenario: CTA headline renders in display font
    Then the CTA headline uses the display font at 36px
    And the CTA headline has font-weight "700"
    And the CTA headline has text-align "center"
    And the CTA headline has color "--sf-text"

  # -- ELM-085 CTA Button --

  Scenario: Bottom CTA button renders with accent background
    Then the bottom CTA button has background "--sf-accent"
    And the bottom CTA button has text color "--sf-bg"
    And the bottom CTA button has font-size "18px"

  Scenario: Bottom CTA hover lifts and glows
    When the user hovers over the bottom CTA button
    Then the button transforms with "translateY(-1px)"
    And the button has a box-shadow with accent glow

  Scenario: Bottom CTA click triggers landing action
    When the user clicks the bottom CTA button
    Then the action ACT-028-landing-cta is triggered

  # -- ELM-086 Footer Link --

  Scenario: Footer link default state is muted
    Then each footer link has color "--sf-text-muted"
    And each footer link has font-size "13px"
    And each footer link has text-decoration "none"

  Scenario: Footer link hover brightens text
    When the user hovers over a footer link
    Then the link color changes to "--sf-text"

  Scenario: Footer links are grouped in columns
    Then footer links are organized under column headings
