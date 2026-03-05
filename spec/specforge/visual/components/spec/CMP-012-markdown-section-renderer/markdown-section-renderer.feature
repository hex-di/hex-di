@CMP-012-markdown-section-renderer
Feature: Markdown Section Renderer
  Renders markdown spec content with section-level change highlighting and search support.

  Background:
    Given the spec view is rendered
    And the markdown section renderer is visible

  # -- Section Parsing --

  Scenario: Content is split into sections at H2 headings
    Given the content contains 3 H2 headings
    Then 3 ELM-046-markdown-section elements are rendered

  Scenario: Each section starts with its H2 heading
    Given a section has heading "## API Reference"
    Then the section starts with an ELM-048-section-heading displaying "API Reference"

  Scenario: Section includes all content up to next H2
    Given the content has "## Overview" followed by 5 paragraphs before "## Details"
    Then the "Overview" section contains all 5 paragraphs

  # -- Change Indicators --

  Scenario: Changed section has left accent border
    Given changedSections contains "api-reference"
    Then the "API Reference" section has border-left "3px solid var(--sf-accent)"
    And the section has padding-left "16px"

  Scenario: Unchanged section has no accent border
    Given changedSections does not contain "overview"
    Then the "Overview" section has no left border accent

  Scenario: Multiple changed sections each get indicators
    Given changedSections contains "overview" and "error-handling"
    Then both the "Overview" and "Error Handling" sections have left accent borders

  # -- Show Changes Only --

  Scenario: Show changes only hides unchanged sections
    Given changedSections contains "api-reference"
    And showChangesOnly is true
    Then only the "API Reference" section is visible
    And the "Overview" section is hidden

  Scenario: Show changes only with no changes shows no content
    Given changedSections is empty
    And showChangesOnly is true
    Then no sections are visible

  Scenario: Show changes only disabled shows all sections
    Given changedSections contains "api-reference"
    And showChangesOnly is false
    Then all sections are visible

  # -- Search Highlighting --

  Scenario: Search query highlights matching text
    Given searchQuery is "OAuth2"
    And the content contains the text "supports OAuth2 tokens"
    Then the text "OAuth2" is wrapped in a highlight span
    And the highlight has background "rgba(0, 240, 255, 0.2)"

  Scenario: Search is case-insensitive
    Given searchQuery is "oauth2"
    And the content contains "OAuth2"
    Then "OAuth2" is highlighted

  Scenario: Search highlights in headings
    Given searchQuery is "API"
    And a section heading is "API Reference"
    Then "API" within the heading is highlighted

  Scenario: Search highlights in code blocks
    Given searchQuery is "authenticate"
    And a code block contains "function authenticate"
    Then "authenticate" within the code block is highlighted

  Scenario: Empty search query shows no highlights
    Given searchQuery is ""
    Then no highlight spans are present in the content

  # -- Typography --

  Scenario: H2 headings use display font
    Then H2 elements use font-family "--sf-font-display"
    And H2 elements have font-size "20px"

  Scenario: Body text uses body font
    Then paragraph elements use font-family "--sf-font-body"
    And paragraph elements have font-size "14px"
    And paragraph elements have line-height "1.6"

  Scenario: Code blocks use mono font
    Then code block elements use font-family "--sf-font-mono"
    And code block elements have font-size "13px"
    And code block elements have background "var(--sf-surface-alt)"
    And code block elements have border-radius "4px"

  # -- Store Binding --

  Scenario: Component reads content from spec content store
    Given STR-006 spec-content-store content is "## Hello\nWorld"
    Then the renderer displays a section with heading "Hello" and body "World"

  Scenario: Component reads changed sections from spec content store
    Given STR-006 spec-content-store changedSections is ["overview"]
    Then the "Overview" section has a change indicator

  Scenario: Component reads showChangesOnly from filter store
    Given STR-001 filter-store spec.showChangesOnly is true
    Then the component renders in show-changes-only mode

  Scenario: Component reads search from filter store
    Given STR-001 filter-store spec.search is "error"
    Then "error" occurrences in the content are highlighted

  # -- Accessibility --

  Scenario: Renderer has correct ARIA role
    Then the component has role "article"
    And the component has aria-label "Spec content"
