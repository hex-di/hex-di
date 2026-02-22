@rebac @REQ-GUARD-015
Feature: Relationship-based access control

  Background:
    Given a guard system is initialized

  Scenario: User with owner relationship is granted access
    Given a user "alice" with permission "doc:read"
    And a relationship "owner" exists between "alice" and resource "doc-1"
    When they check relationship "owner" to resource "doc-1"
    Then relationship access should be granted

  Scenario: User without relationship is denied access
    Given a user "bob" with no permissions
    And a relationship "owner" exists between "alice" and resource "doc-1"
    When they check relationship "owner" to resource "doc-1"
    Then relationship access should be denied

  Scenario: User with viewer relationship is granted viewer access
    Given a user "carol" with permission "doc:read"
    And a relationship "viewer" exists between "carol" and resource "doc-2"
    When they check relationship "viewer" to resource "doc-2"
    Then relationship access should be granted

  Scenario: User checking wrong relationship is denied
    Given a user "dave" with permission "doc:read"
    And a relationship "viewer" exists between "dave" and resource "doc-3"
    When they check relationship "owner" to resource "doc-3"
    Then relationship access should be denied
