@STR-008-coverage-store
Feature: Coverage Store
  As a view consumer
  I want reliable coverage data management
  So that the coverage file list and metrics reflect the current state

  Background:
    Given the store "coverage-store" is initialized with defaults

  # ── Initial state ─────────────────────────────────────────

  Scenario: Initial state has empty files
    Then the state "files" is an empty array

  # ── Coverage loading ──────────────────────────────────────

  Scenario: Coverage data loaded replaces the file list
    When event "EVT-024-coverage-loaded" is dispatched with:
      | files |
      | [{"fileName":"src/auth.ts","coveragePercent":85,"status":"covered","specFile":"spec/auth.md"},{"fileName":"src/api.ts","coveragePercent":0,"status":"gap","specFile":"spec/api.md"}] |
    Then the state "files" has length 2

  Scenario: Loading coverage replaces previous data
    Given event "EVT-024-coverage-loaded" was dispatched with:
      | files |
      | [{"fileName":"src/old.ts","coveragePercent":50,"status":"implemented-only","specFile":"spec/old.md"}] |
    When event "EVT-024-coverage-loaded" is dispatched with:
      | files |
      | [{"fileName":"src/new.ts","coveragePercent":100,"status":"covered","specFile":"spec/new.md"}] |
    Then the state "files" has length 1
    And the first file has fileName "src/new.ts"

  # ── Single file updates ───────────────────────────────────

  Scenario: Single file coverage updated
    Given event "EVT-024-coverage-loaded" was dispatched with:
      | files |
      | [{"fileName":"src/auth.ts","coveragePercent":60,"status":"implemented-only","specFile":"spec/auth.md"},{"fileName":"src/api.ts","coveragePercent":0,"status":"gap","specFile":"spec/api.md"}] |
    When event "EVT-025-coverage-file-updated" is dispatched with:
      | fileName    | file |
      | src/auth.ts | {"fileName":"src/auth.ts","coveragePercent":92,"status":"covered","specFile":"spec/auth.md"} |
    Then the file "src/auth.ts" has coveragePercent 92
    And the file "src/auth.ts" has status "covered"
    And the file "src/api.ts" has coveragePercent 0

  Scenario: Updating a non-existent file is a no-op
    Given event "EVT-024-coverage-loaded" was dispatched with:
      | files |
      | [{"fileName":"src/auth.ts","coveragePercent":85,"status":"covered","specFile":"spec/auth.md"}] |
    When event "EVT-025-coverage-file-updated" is dispatched with:
      | fileName       | file |
      | src/missing.ts | {"fileName":"src/missing.ts","coveragePercent":50,"status":"implemented-only","specFile":"spec/missing.md"} |
    Then the state "files" has length 1

  # ── Files with optional category ──────────────────────────

  Scenario: Files may include a fileCategory
    When event "EVT-024-coverage-loaded" is dispatched with:
      | files |
      | [{"fileName":"src/auth.ts","coveragePercent":85,"status":"covered","specFile":"spec/auth.md","fileCategory":"service"},{"fileName":"src/button.tsx","coveragePercent":70,"status":"covered","specFile":"spec/ui.md","fileCategory":"component"}] |
    Then the file "src/auth.ts" has fileCategory "service"
    And the file "src/button.tsx" has fileCategory "component"

  Scenario: Files without fileCategory have it undefined
    When event "EVT-024-coverage-loaded" is dispatched with:
      | files |
      | [{"fileName":"src/utils.ts","coveragePercent":100,"status":"covered","specFile":"spec/utils.md"}] |
    Then the file "src/utils.ts" has fileCategory undefined

  # ── Selectors ─────────────────────────────────────────────

  Scenario: overallCoverage returns zero when no files
    Then selector "overallCoverage" returns 0

  Scenario: overallCoverage computes average of coveragePercent
    Given event "EVT-024-coverage-loaded" was dispatched with:
      | files |
      | [{"fileName":"src/a.ts","coveragePercent":80,"status":"covered","specFile":"spec/a.md"},{"fileName":"src/b.ts","coveragePercent":60,"status":"implemented-only","specFile":"spec/b.md"},{"fileName":"src/c.ts","coveragePercent":100,"status":"covered","specFile":"spec/c.md"}] |
    Then selector "overallCoverage" returns 80

  Scenario: gapCount returns zero when no gaps
    Given event "EVT-024-coverage-loaded" was dispatched with:
      | files |
      | [{"fileName":"src/a.ts","coveragePercent":100,"status":"covered","specFile":"spec/a.md"}] |
    Then selector "gapCount" returns 0

  Scenario: gapCount counts files with gap status
    Given event "EVT-024-coverage-loaded" was dispatched with:
      | files |
      | [{"fileName":"src/a.ts","coveragePercent":100,"status":"covered","specFile":"spec/a.md"},{"fileName":"src/b.ts","coveragePercent":0,"status":"gap","specFile":"spec/b.md"},{"fileName":"src/c.ts","coveragePercent":0,"status":"gap","specFile":"spec/c.md"}] |
    Then selector "gapCount" returns 2

  Scenario: filesByStatus partitions files into status buckets
    Given event "EVT-024-coverage-loaded" was dispatched with:
      | files |
      | [{"fileName":"src/a.ts","coveragePercent":100,"status":"covered","specFile":"spec/a.md"},{"fileName":"src/b.ts","coveragePercent":60,"status":"implemented-only","specFile":"spec/b.md"},{"fileName":"src/c.ts","coveragePercent":40,"status":"tested-only","specFile":"spec/c.md"},{"fileName":"src/d.ts","coveragePercent":0,"status":"gap","specFile":"spec/d.md"}] |
    Then selector "filesByStatus" has:
      | bucket          | count |
      | covered         | 1     |
      | implementedOnly | 1     |
      | testedOnly      | 1     |
      | gap             | 1     |

  Scenario: filesByStatus with multiple files in same status
    Given event "EVT-024-coverage-loaded" was dispatched with:
      | files |
      | [{"fileName":"src/a.ts","coveragePercent":90,"status":"covered","specFile":"spec/a.md"},{"fileName":"src/b.ts","coveragePercent":85,"status":"covered","specFile":"spec/b.md"},{"fileName":"src/c.ts","coveragePercent":0,"status":"gap","specFile":"spec/c.md"}] |
    Then selector "filesByStatus" has:
      | bucket  | count |
      | covered | 2     |
      | gap     | 1     |
