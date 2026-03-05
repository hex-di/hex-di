@STR-015
Feature: Keyboard Shortcut Store
  As a view consumer
  I want a central keyboard shortcut registrar
  So that components can register and resolve keyboard bindings

  Background:
    Given the store "keyboard-shortcut-store" is initialized with defaults
    And the initial registeredShortcuts map is empty

  # --- Registration ---

  Scenario: Register a keyboard shortcut
    When the event "REG-001" is dispatched with:
      | id        | key | modifiers | action      | context | description          |
      | global:/  | /   | []        | open-search | global  | Open search overlay  |
    Then the registeredShortcuts map contains key "global:/"
    And the binding at "global:/" has action "open-search"

  Scenario: Register multiple shortcuts
    When the event "REG-001" is dispatched with id "global:/" and action "open-search"
    And the event "REG-001" is dispatched with id "global:Escape" and action "close-overlay"
    Then the registeredShortcuts map contains 2 entries

  Scenario: Register a shortcut with modifiers
    When the event "REG-001" is dispatched with:
      | id          | key | modifiers | action      | context | description            |
      | global:meta+k | k | ["meta"]  | open-search | global  | Open search (Cmd+K)    |
    Then the registeredShortcuts map contains key "global:meta+k"
    And the binding at "global:meta+k" has modifiers ["meta"]

  Scenario: Re-registering the same id overwrites the binding
    Given the binding "global:/" is registered with action "open-search"
    When the event "REG-001" is dispatched with id "global:/" and action "open-command-palette"
    Then the binding at "global:/" has action "open-command-palette"
    And the registeredShortcuts map contains 1 entry

  # --- Unregistration ---

  Scenario: Unregister a keyboard shortcut
    Given the binding "global:/" is registered with action "open-search"
    And the binding "global:Escape" is registered with action "close-overlay"
    When the event "REG-002" is dispatched with id "global:/"
    Then the registeredShortcuts map does not contain key "global:/"
    And the registeredShortcuts map contains 1 entry

  Scenario: Unregister a non-existent shortcut is a no-op
    Given the binding "global:/" is registered with action "open-search"
    When the event "REG-002" is dispatched with id "global:x"
    Then the registeredShortcuts map still contains 1 entry

  # --- Selectors ---

  Scenario: Get shortcuts for a specific context
    Given the following shortcuts are registered:
      | id              | context | action         |
      | global:/        | global  | open-search    |
      | global:Escape   | global  | close-overlay  |
      | search:ArrowDown| search  | select-next    |
      | search:ArrowUp  | search  | select-prev    |
    When the selector "shortcutsForContext" is called with context "global"
    Then the result contains 2 bindings

  Scenario: Get shortcuts for a context with no bindings
    Given the binding "global:/" is registered with action "open-search"
    When the selector "shortcutsForContext" is called with context "chat"
    Then the result is an empty list

  # --- Default bindings ---

  Scenario: App shell registers default bindings on mount
    When the app shell mounts and registers default bindings
    Then the registeredShortcuts map contains key "global:/"
    And the binding at "global:/" has action "open-search"
    And the registeredShortcuts map contains key "global:Escape"
    And the binding at "global:Escape" has action "close-overlay"

  # --- Context scoping ---

  Scenario: Same key in different contexts does not collide
    When the event "REG-001" is dispatched with id "global:Escape" and action "close-overlay"
    And the event "REG-001" is dispatched with id "search:Escape" and action "close-search"
    Then the registeredShortcuts map contains 2 entries
    And the binding at "global:Escape" has action "close-overlay"
    And the binding at "search:Escape" has action "close-search"

  # --- Cleanup on unmount ---

  Scenario: Component unmount triggers unregistration
    Given the binding "search:ArrowDown" is registered with action "select-next"
    And the binding "search:ArrowUp" is registered with action "select-prev"
    When the search overlay unmounts and unregisters its bindings
    Then the registeredShortcuts map does not contain key "search:ArrowDown"
    And the registeredShortcuts map does not contain key "search:ArrowUp"
