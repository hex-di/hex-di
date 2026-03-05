@STR-007-task-board-store
Feature: Task Board Store
  As a view consumer
  I want reliable task group management
  So that the kanban board and DAG list reflect current task progress

  Background:
    Given the store "task-board-store" is initialized with defaults

  # ── Initial state ─────────────────────────────────────────

  Scenario: Initial state has empty groups
    Then the state "groups" is an empty array

  # ── Loading task groups ───────────────────────────────────

  Scenario: Task groups loaded replaces the list
    When event "EVT-021-task-groups-loaded" is dispatched with:
      | groups |
      | [{"groupId":"g1","name":"Auth Module","status":"pending","taskCount":5,"testCount":3,"requirementIds":["REQ-001","REQ-002"]},{"groupId":"g2","name":"API Layer","status":"in-progress","taskCount":8,"testCount":4,"requirementIds":["REQ-003"]}] |
    Then the state "groups" has length 2

  Scenario: Loading groups replaces previous data
    Given event "EVT-021-task-groups-loaded" was dispatched with:
      | groups |
      | [{"groupId":"g1","name":"Old Group","status":"pending","taskCount":2,"testCount":1,"requirementIds":[]}] |
    When event "EVT-021-task-groups-loaded" is dispatched with:
      | groups |
      | [{"groupId":"g2","name":"New Group","status":"in-progress","taskCount":4,"testCount":2,"requirementIds":["REQ-010"]}] |
    Then the state "groups" has length 1
    And the first group has groupId "g2"

  # ── Status changes ────────────────────────────────────────

  Scenario: Task group status change updates matching group
    Given event "EVT-021-task-groups-loaded" was dispatched with:
      | groups |
      | [{"groupId":"g1","name":"Auth Module","status":"pending","taskCount":5,"testCount":3,"requirementIds":["REQ-001"]},{"groupId":"g2","name":"API Layer","status":"pending","taskCount":8,"testCount":4,"requirementIds":["REQ-003"]}] |
    When event "EVT-022-task-group-status-changed" is dispatched with:
      | groupId | status      |
      | g1      | in-progress |
    Then the group "g1" has status "in-progress"
    And the group "g2" has status "pending"

  Scenario: Task group completes
    Given event "EVT-021-task-groups-loaded" was dispatched with:
      | groups |
      | [{"groupId":"g1","name":"Auth Module","status":"in-progress","taskCount":5,"testCount":3,"requirementIds":["REQ-001"]}] |
    When event "EVT-022-task-group-status-changed" is dispatched with:
      | groupId | status    |
      | g1      | completed |
    Then the group "g1" has status "completed"

  Scenario: Task group becomes blocked
    Given event "EVT-021-task-groups-loaded" was dispatched with:
      | groups |
      | [{"groupId":"g1","name":"Auth Module","status":"in-progress","taskCount":5,"testCount":3,"requirementIds":["REQ-001"]}] |
    When event "EVT-022-task-group-status-changed" is dispatched with:
      | groupId | status  |
      | g1      | blocked |
    Then the group "g1" has status "blocked"

  # ── Group updates ─────────────────────────────────────────

  Scenario: Task group data update replaces the matching group
    Given event "EVT-021-task-groups-loaded" was dispatched with:
      | groups |
      | [{"groupId":"g1","name":"Auth Module","status":"in-progress","taskCount":5,"testCount":3,"requirementIds":["REQ-001"]}] |
    When event "EVT-023-task-group-updated" is dispatched with:
      | group |
      | {"groupId":"g1","name":"Auth Module","status":"in-progress","taskCount":7,"testCount":5,"requirementIds":["REQ-001","REQ-002"]} |
    Then the group "g1" has taskCount 7
    And the group "g1" has testCount 5
    And the group "g1" has requirementIds ["REQ-001","REQ-002"]

  # ── Selectors ─────────────────────────────────────────────

  Scenario: groupsByStatus partitions groups into status buckets
    Given event "EVT-021-task-groups-loaded" was dispatched with:
      | groups |
      | [{"groupId":"g1","name":"Auth","status":"pending","taskCount":3,"testCount":1,"requirementIds":[]},{"groupId":"g2","name":"API","status":"in-progress","taskCount":5,"testCount":2,"requirementIds":[]},{"groupId":"g3","name":"DB","status":"completed","taskCount":4,"testCount":3,"requirementIds":[]},{"groupId":"g4","name":"Cache","status":"blocked","taskCount":2,"testCount":1,"requirementIds":[]}] |
    Then selector "groupsByStatus" has:
      | bucket      | count |
      | pending     | 1     |
      | inProgress  | 1     |
      | completed   | 1     |
      | blocked     | 1     |

  Scenario: totalTasks sums task counts across all groups
    Given event "EVT-021-task-groups-loaded" was dispatched with:
      | groups |
      | [{"groupId":"g1","name":"Auth","status":"pending","taskCount":5,"testCount":3,"requirementIds":[]},{"groupId":"g2","name":"API","status":"pending","taskCount":8,"testCount":4,"requirementIds":[]}] |
    Then selector "totalTasks" returns 13

  Scenario: totalTasks returns zero when no groups
    Then selector "totalTasks" returns 0

  Scenario: completionPercent with no groups returns zero
    Then selector "completionPercent" returns 0

  Scenario: completionPercent computes percentage of completed groups
    Given event "EVT-021-task-groups-loaded" was dispatched with:
      | groups |
      | [{"groupId":"g1","name":"Auth","status":"completed","taskCount":5,"testCount":3,"requirementIds":[]},{"groupId":"g2","name":"API","status":"in-progress","taskCount":8,"testCount":4,"requirementIds":[]},{"groupId":"g3","name":"DB","status":"completed","taskCount":3,"testCount":2,"requirementIds":[]},{"groupId":"g4","name":"Cache","status":"pending","taskCount":2,"testCount":1,"requirementIds":[]}] |
    Then selector "completionPercent" returns 50
