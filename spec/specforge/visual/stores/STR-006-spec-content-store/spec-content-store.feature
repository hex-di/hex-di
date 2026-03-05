@STR-006-spec-content-store
Feature: Spec Content Store
  As a view consumer
  I want reliable spec content management
  So that the markdown renderer shows current content with change highlights

  Background:
    Given the store "spec-content-store" is initialized with defaults

  # ── Initial state ─────────────────────────────────────────

  Scenario: Initial state has empty content and no changes
    Then the state "content" equals ""
    And the state "changedSections" is an empty array

  # ── Content loading ───────────────────────────────────────

  Scenario: Loading spec content replaces content and clears changes
    When event "EVT-014-spec-content-loaded" is dispatched with:
      | content                                          |
      | ## Overview\nThis is the spec.\n## Error Handling |
    Then the state "content" contains "## Overview"
    And the state "content" contains "## Error Handling"
    And the state "changedSections" is an empty array

  Scenario: Loading new content clears previously tracked changes
    Given event "EVT-014-spec-content-loaded" was dispatched with:
      | content          |
      | ## Old Content   |
    And event "EVT-015-spec-section-changed" was dispatched with:
      | sectionId   |
      | old-content |
    When event "EVT-014-spec-content-loaded" is dispatched with:
      | content          |
      | ## New Content   |
    Then the state "changedSections" is an empty array
    And the state "content" contains "## New Content"

  # ── Section change tracking ───────────────────────────────

  Scenario: Section change appends to changedSections
    Given event "EVT-014-spec-content-loaded" was dispatched with:
      | content                                          |
      | ## Overview\nContent here.\n## API Design        |
    When event "EVT-015-spec-section-changed" is dispatched with:
      | sectionId  |
      | api-design |
    Then the state "changedSections" contains "api-design"
    And the state "changedSections" has length 1

  Scenario: Multiple section changes accumulate
    Given event "EVT-014-spec-content-loaded" was dispatched with:
      | content                                                     |
      | ## Overview\nText.\n## API Design\nText.\n## Error Handling |
    And event "EVT-015-spec-section-changed" was dispatched with:
      | sectionId  |
      | overview   |
    When event "EVT-015-spec-section-changed" is dispatched with:
      | sectionId      |
      | error-handling |
    Then the state "changedSections" has length 2
    And the state "changedSections" contains "overview"
    And the state "changedSections" contains "error-handling"

  # ── Content updates (streaming) ───────────────────────────

  Scenario: Content update replaces content without affecting changedSections
    Given event "EVT-014-spec-content-loaded" was dispatched with:
      | content            |
      | ## Overview\nDraft |
    And event "EVT-015-spec-section-changed" was dispatched with:
      | sectionId |
      | overview  |
    When event "EVT-016-spec-content-updated" is dispatched with:
      | content              |
      | ## Overview\nRevised |
    Then the state "content" contains "Revised"
    And the state "changedSections" has length 1
    And the state "changedSections" contains "overview"

  # ── Change acknowledgment ─────────────────────────────────

  Scenario: Acknowledging changes clears the changed sections list
    Given event "EVT-014-spec-content-loaded" was dispatched with:
      | content                                          |
      | ## Overview\nText.\n## API Design\nText.         |
    And event "EVT-015-spec-section-changed" was dispatched with:
      | sectionId |
      | overview  |
    And event "EVT-015-spec-section-changed" was dispatched with:
      | sectionId  |
      | api-design |
    When event "EVT-017-spec-changes-acknowledged" is dispatched
    Then the state "changedSections" is an empty array

  Scenario: Content is preserved after acknowledging changes
    Given event "EVT-014-spec-content-loaded" was dispatched with:
      | content              |
      | ## Overview\nKeep me |
    And event "EVT-015-spec-section-changed" was dispatched with:
      | sectionId |
      | overview  |
    When event "EVT-017-spec-changes-acknowledged" is dispatched
    Then the state "content" contains "Keep me"

  # ── Selectors ─────────────────────────────────────────────

  Scenario: sectionCount returns zero for empty content
    Then selector "sectionCount" returns 0

  Scenario: sectionCount counts H2 headings
    Given event "EVT-014-spec-content-loaded" was dispatched with:
      | content                                                     |
      | ## Overview\nText.\n## API Design\nText.\n## Error Handling |
    Then selector "sectionCount" returns 3

  Scenario: hasChanges returns false when no changes
    Then selector "hasChanges" returns false

  Scenario: hasChanges returns true when changes exist
    Given event "EVT-014-spec-content-loaded" was dispatched with:
      | content          |
      | ## Overview\nHi  |
    And event "EVT-015-spec-section-changed" was dispatched with:
      | sectionId |
      | overview  |
    Then selector "hasChanges" returns true

  Scenario: hasChanges returns false after acknowledgment
    Given event "EVT-014-spec-content-loaded" was dispatched with:
      | content          |
      | ## Overview\nHi  |
    And event "EVT-015-spec-section-changed" was dispatched with:
      | sectionId |
      | overview  |
    And event "EVT-017-spec-changes-acknowledged" was dispatched
    Then selector "hasChanges" returns false
