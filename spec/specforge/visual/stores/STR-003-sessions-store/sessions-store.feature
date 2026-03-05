@STR-003-sessions-store
Feature: Sessions Store
  As a view consumer
  I want reliable session list management
  So that the session table displays an accurate and filterable list

  Background:
    Given the store "sessions-store" is initialized with defaults

  # ── Loading sessions ──────────────────────────────────────

  Scenario: Initial state has empty sessions and not loading
    Then the state "sessions" is an empty array
    And the state "isLoading" equals false

  Scenario: Sessions loaded replaces the list and clears loading
    Given the state "isLoading" equals true
    When event "EVT-006-sessions-loaded" is dispatched with:
      | sessions                                                                                                |
      | [{"sessionId":"s1","packageName":"@app/core","specPath":"spec.md","status":"active","createdAt":"2026-02-01T10:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-02-01T12:00:00Z"}] |
    Then the state "sessions" has length 1
    And the state "isLoading" equals false

  Scenario: Sessions loaded replaces previous data entirely
    Given event "EVT-006-sessions-loaded" was dispatched with:
      | sessions                                                                                                |
      | [{"sessionId":"s1","packageName":"@app/core","specPath":"spec.md","status":"active","createdAt":"2026-02-01T10:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-02-01T12:00:00Z"}] |
    When event "EVT-006-sessions-loaded" is dispatched with:
      | sessions                                                                                                |
      | [{"sessionId":"s2","packageName":"@app/ui","specPath":"ui-spec.md","status":"completed","createdAt":"2026-02-02T10:00:00Z","pipelineMode":"spec","lastActivityAt":"2026-02-02T14:00:00Z"}] |
    Then the state "sessions" has length 1
    And the first session has sessionId "s2"

  # ── Session creation ──────────────────────────────────────

  Scenario: New session is appended to the list
    Given event "EVT-006-sessions-loaded" was dispatched with:
      | sessions                                                                                                |
      | [{"sessionId":"s1","packageName":"@app/core","specPath":"spec.md","status":"active","createdAt":"2026-02-01T10:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-02-01T12:00:00Z"}] |
    When event "EVT-003-session-created" is dispatched with:
      | session                                                                                                 |
      | {"sessionId":"s3","packageName":"@app/new","specPath":"new-spec.md","status":"active","createdAt":"2026-02-03T10:00:00Z","pipelineMode":"implementation","lastActivityAt":"2026-02-03T10:00:00Z"} |
    Then the state "sessions" has length 2

  # ── Session deletion ──────────────────────────────────────

  Scenario: Delete a session by sessionId
    Given event "EVT-006-sessions-loaded" was dispatched with:
      | sessions                                                                                                |
      | [{"sessionId":"s1","packageName":"@app/core","specPath":"spec.md","status":"completed","createdAt":"2026-02-01T10:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-02-01T12:00:00Z"},{"sessionId":"s2","packageName":"@app/ui","specPath":"ui.md","status":"active","createdAt":"2026-02-02T10:00:00Z","pipelineMode":"spec","lastActivityAt":"2026-02-02T14:00:00Z"}] |
    When event "EVT-007-session-deleted" is dispatched with:
      | sessionId |
      | s1        |
    Then the state "sessions" has length 1
    And the first session has sessionId "s2"

  Scenario: Delete a non-existent session is a no-op
    Given event "EVT-006-sessions-loaded" was dispatched with:
      | sessions                                                                                                |
      | [{"sessionId":"s1","packageName":"@app/core","specPath":"spec.md","status":"active","createdAt":"2026-02-01T10:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-02-01T12:00:00Z"}] |
    When event "EVT-007-session-deleted" is dispatched with:
      | sessionId    |
      | non-existent |
    Then the state "sessions" has length 1

  # ── Selectors ─────────────────────────────────────────────

  Scenario: sortedSessions returns sessions ordered by lastActivityAt descending
    Given event "EVT-006-sessions-loaded" was dispatched with:
      | sessions                                                                                                |
      | [{"sessionId":"old","packageName":"@app/a","specPath":"a.md","status":"completed","createdAt":"2026-01-01T10:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-01-01T10:00:00Z"},{"sessionId":"new","packageName":"@app/b","specPath":"b.md","status":"active","createdAt":"2026-02-01T10:00:00Z","pipelineMode":"spec","lastActivityAt":"2026-02-15T10:00:00Z"}] |
    Then selector "sortedSessions" returns sessions in order:
      | sessionId |
      | new       |
      | old       |

  Scenario: filteredSessions applies home view status filter
    Given event "EVT-006-sessions-loaded" was dispatched with:
      | sessions                                                                                                |
      | [{"sessionId":"s1","packageName":"@app/a","specPath":"a.md","status":"completed","createdAt":"2026-01-01T10:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-01-15T10:00:00Z"},{"sessionId":"s2","packageName":"@app/b","specPath":"b.md","status":"active","createdAt":"2026-02-01T10:00:00Z","pipelineMode":"spec","lastActivityAt":"2026-02-15T10:00:00Z"}] |
    And the filter store "home.status" is set to "active"
    Then selector "filteredSessions" returns sessions:
      | sessionId |
      | s2        |

  Scenario: filteredSessions applies home view search filter
    Given event "EVT-006-sessions-loaded" was dispatched with:
      | sessions                                                                                                |
      | [{"sessionId":"s1","packageName":"@app/core","specPath":"core.md","status":"active","createdAt":"2026-01-01T10:00:00Z","pipelineMode":"discovery","lastActivityAt":"2026-01-15T10:00:00Z"},{"sessionId":"s2","packageName":"@app/ui","specPath":"ui.md","status":"active","createdAt":"2026-02-01T10:00:00Z","pipelineMode":"spec","lastActivityAt":"2026-02-15T10:00:00Z"}] |
    And the filter store "home.search" is set to "core"
    Then selector "filteredSessions" returns sessions:
      | sessionId |
      | s1        |
