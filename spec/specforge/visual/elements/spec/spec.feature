@ELM-spec
Feature: Spec Elements
  Markdown sections, change indicators, and section headings.

  Background:
    Given the Spec view is rendered
    And spec content is loaded

  # ── ELM-046 Markdown Section ──

  Scenario: Unchanged section renders with transparent border
    Given a section that is not in the changedSections array
    Then the section has a left border of "3px solid transparent"
    And the section background is "transparent"

  Scenario: Changed section renders with accent border and tint
    Given a section that is in the changedSections array
    Then the section has a left border of "3px solid var(--sf-accent)"
    And the section background is "rgba(0, 240, 255, 0.02)"

  Scenario: Section body text uses correct typography
    Then the section body text has font-size 14px
    And the section body text has line-height 1.7
    And the section body text uses "--sf-font-body" font family

  Scenario: Section has consistent left padding
    Given a section in default state
    Then the section has padding-left 16px
    Given a section in changed state
    Then the section has padding-left 16px

  # ── ELM-047 Section Change Indicator ──

  Scenario: Change indicator is invisible for unchanged sections
    Given a section that is not in the changedSections array
    Then the change indicator is transparent

  Scenario: Change indicator shows accent bar for changed sections
    Given a section that is in the changedSections array
    Then the change indicator is a 3px accent bar on the left edge

  Scenario: Change indicator does not cause layout shift
    Given a section transitions from unchanged to changed
    Then no horizontal layout shift occurs
    And the content position remains stable

  # ── ELM-048 Section Heading ──

  Scenario: H1 heading renders at 24px
    Given a section with an h1 heading "Architecture"
    Then the heading is rendered at 24px font-size
    And the heading has margin-top 32px
    And the heading uses "--sf-font-display" font family

  Scenario: H2 heading renders at 20px
    Given a section with an h2 heading "Components"
    Then the heading is rendered at 20px font-size
    And the heading has margin-top 24px

  Scenario: H3 heading renders at 16px
    Given a section with an h3 heading "Sub-component"
    Then the heading is rendered at 16px font-size
    And the heading has margin-top 16px

  Scenario: Heading has consistent weight and spacing
    Then all section headings have font-weight 600
    And all section headings have line-height 1.3
    And all section headings have margin-bottom 8px

  Scenario: Heading text color matches default text
    Then section heading color is "--sf-text"
