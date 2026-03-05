@STR-013
Feature: Service Context Store
  As a view consumer
  I want reliable service initialization state
  So that views only render when all services are ready

  Background:
    Given the store "service-context-store" is initialized with defaults
    And the initial initialized flag is false
    And the initial error is null

  # --- Successful initialization ---

  Scenario: Services initialize successfully
    When the event "INIT-001" is dispatched
    Then the initialized flag is true
    And the error remains null

  Scenario: isReady is true after successful initialization
    Given the initialized flag is true
    And the error is null
    When the selector "isReady" is evaluated
    Then the result is true

  Scenario: hasError is false after successful initialization
    Given the initialized flag is true
    And the error is null
    When the selector "hasError" is evaluated
    Then the result is false

  # --- Failed initialization ---

  Scenario: Services fail to initialize
    When the event "INIT-002" is dispatched with payload:
      | _tag             | message                        | service    |
      | ServiceInitError | Failed to connect to Neo4j     | GraphStore |
    Then the error is not null
    And the error _tag is "ServiceInitError"
    And the error message is "Failed to connect to Neo4j"
    And the error service is "GraphStore"

  Scenario: isReady is false when initialization failed
    Given the error is set to a ServiceInitError
    When the selector "isReady" is evaluated
    Then the result is false

  Scenario: hasError is true when initialization failed
    Given the error is set to a ServiceInitError
    When the selector "hasError" is evaluated
    Then the result is true

  # --- Pre-initialization selectors ---

  Scenario: isReady is false before initialization
    When the selector "isReady" is evaluated
    Then the result is false

  Scenario: hasError is false before initialization
    When the selector "hasError" is evaluated
    Then the result is false

  # --- Write-once guarantee ---

  Scenario: Store does not accept further mutations after initialization
    Given the initialized flag is true
    Then no user-facing events can modify the store state

  Scenario: Store does not subscribe to the event bus
    Then the store has no EVT-prefixed event subscriptions
