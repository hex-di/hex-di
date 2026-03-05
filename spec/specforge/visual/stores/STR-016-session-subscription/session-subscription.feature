@STR-016
Feature: Session Subscription Store
  As a view consumer
  I want a monotonic tick counter for ACP session events
  So that downstream stores know when to refresh data

  Background:
    Given the store "session-subscription" is initialized with defaults
    And the initial tick is 0
    And the initial isSubscribed is false
    And the initial lastEventTimestamp is null

  # --- Tick increments ---

  Scenario: First ACP session event increments tick to 1
    When the event "EVT-017" is dispatched with timestamp 1700000001000
    Then the tick is 1
    And the lastEventTimestamp is 1700000001000

  Scenario: Subsequent events increment tick by 1 each
    Given the tick is 5
    When the event "EVT-017" is dispatched with timestamp 1700000006000
    Then the tick is 6

  Scenario: Multiple consecutive ticks
    When the event "EVT-017" is dispatched with timestamp 1700000001000
    And the event "EVT-017" is dispatched with timestamp 1700000002000
    And the event "EVT-017" is dispatched with timestamp 1700000003000
    Then the tick is 3
    And the lastEventTimestamp is 1700000003000

  # --- Monotonic guarantee ---

  Scenario: Tick never decreases
    Given the tick is 10
    When the event "EVT-017" is dispatched with timestamp 1700000011000
    Then the tick is 11
    And the tick is greater than or equal to 10

  Scenario: Tick increments by exactly 1
    Given the tick is 42
    When the event "EVT-017" is dispatched with timestamp 1700000043000
    Then the tick is 43

  # --- Subscription lifecycle ---

  Scenario: Subscribe to session
    When the event "EVT-033" is dispatched
    Then isSubscribed is true

  Scenario: Unsubscribe from session
    Given isSubscribed is true
    When the event "EVT-034" is dispatched
    Then isSubscribed is false

  Scenario: Resubscribe after disconnection
    Given isSubscribed is false
    And the tick is 15
    When the event "EVT-033" is dispatched
    Then isSubscribed is true
    And the tick is still 15

  Scenario: Tick continues incrementing after resubscription
    Given isSubscribed is true
    And the tick is 15
    When the event "EVT-017" is dispatched with timestamp 1700000016000
    Then the tick is 16

  # --- lastEventTimestamp ---

  Scenario: lastEventTimestamp is null before any events
    Then the lastEventTimestamp is null

  Scenario: lastEventTimestamp updates on each tick
    Given the lastEventTimestamp is 1700000001000
    When the event "EVT-017" is dispatched with timestamp 1700000005000
    Then the lastEventTimestamp is 1700000005000

  # --- Selectors ---

  Scenario: currentTick returns the current tick value
    Given the tick is 7
    When the selector "currentTick" is evaluated
    Then the result is 7

  Scenario: isSubscribed selector when subscribed
    Given isSubscribed is true
    When the selector "isSubscribed" is evaluated
    Then the result is true

  Scenario: isSubscribed selector when not subscribed
    Given isSubscribed is false
    When the selector "isSubscribed" is evaluated
    Then the result is false

  Scenario: timeSinceLastEvent when no events received
    Given the lastEventTimestamp is null
    When the selector "timeSinceLastEvent" is evaluated
    Then the result is null

  Scenario: timeSinceLastEvent computes elapsed milliseconds
    Given the lastEventTimestamp is set to 5000 milliseconds ago
    When the selector "timeSinceLastEvent" is evaluated
    Then the result is approximately 5000

  # --- Subscription does not affect tick ---

  Scenario: Subscribing does not increment tick
    Given the tick is 3
    When the event "EVT-033" is dispatched
    Then the tick is 3

  Scenario: Unsubscribing does not decrement tick
    Given the tick is 10
    When the event "EVT-034" is dispatched
    Then the tick is 10
