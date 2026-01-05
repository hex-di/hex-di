/**
 * Navigation Event Definitions
 *
 * Defines strongly-typed event objects for the navigation state machine.
 * These events can be used with the machine runner while maintaining
 * full type safety.
 *
 * @packageDocumentation
 */

import type { RoutePath } from "../types.js";
import type { NavState, NavEventType } from "./machine.js";

// =============================================================================
// Event Types (Discriminated Union)
// =============================================================================

/**
 * Base event type that all navigation events extend.
 */
interface NavEventBase {
  readonly type: NavEventType;
}

/**
 * Navigate to dashboard event.
 */
export interface NavigateToDashboardEvent extends NavEventBase {
  readonly type: "NAVIGATE_TO_DASHBOARD";
}

/**
 * Navigate to task detail event.
 */
export interface NavigateToTaskEvent extends NavEventBase {
  readonly type: "NAVIGATE_TO_TASK";
  readonly payload: {
    readonly taskId: string;
  };
}

/**
 * Navigate to new task event.
 */
export interface NavigateToNewTaskEvent extends NavEventBase {
  readonly type: "NAVIGATE_TO_NEW_TASK";
}

/**
 * Navigate to settings event.
 */
export interface NavigateToSettingsEvent extends NavEventBase {
  readonly type: "NAVIGATE_TO_SETTINGS";
}

/**
 * Navigate to onboarding event.
 */
export interface NavigateToOnboardingEvent extends NavEventBase {
  readonly type: "NAVIGATE_TO_ONBOARDING";
}

/**
 * Create task event (navigates to new task form).
 */
export interface CreateTaskEvent extends NavEventBase {
  readonly type: "CREATE_TASK";
}

/**
 * Logout event.
 */
export interface LogoutEvent extends NavEventBase {
  readonly type: "LOGOUT";
}

/**
 * URL changed event (triggered by browser navigation).
 */
export interface UrlChangedEvent extends NavEventBase {
  readonly type: "URL_CHANGED";
  readonly payload: {
    readonly path: string;
    readonly params: Record<string, string>;
  };
}

/**
 * Navigation complete event (after URL change processing).
 */
export interface NavigationCompleteEvent extends NavEventBase {
  readonly type: "NAVIGATION_COMPLETE";
  readonly payload: {
    readonly state: NavState;
    readonly route: RoutePath;
    readonly params: Record<string, string>;
  };
}

/**
 * Union of all navigation events.
 */
export type NavEvent =
  | NavigateToDashboardEvent
  | NavigateToTaskEvent
  | NavigateToNewTaskEvent
  | NavigateToSettingsEvent
  | NavigateToOnboardingEvent
  | CreateTaskEvent
  | LogoutEvent
  | UrlChangedEvent
  | NavigationCompleteEvent;

// =============================================================================
// Event Factories
// =============================================================================

/**
 * Creates a NAVIGATE_TO_DASHBOARD event.
 */
export function navigateToDashboard(): NavigateToDashboardEvent {
  return { type: "NAVIGATE_TO_DASHBOARD" };
}

/**
 * Creates a NAVIGATE_TO_TASK event.
 */
export function navigateToTask(taskId: string): NavigateToTaskEvent {
  return { type: "NAVIGATE_TO_TASK", payload: { taskId } };
}

/**
 * Creates a NAVIGATE_TO_NEW_TASK event.
 */
export function navigateToNewTask(): NavigateToNewTaskEvent {
  return { type: "NAVIGATE_TO_NEW_TASK" };
}

/**
 * Creates a NAVIGATE_TO_SETTINGS event.
 */
export function navigateToSettings(): NavigateToSettingsEvent {
  return { type: "NAVIGATE_TO_SETTINGS" };
}

/**
 * Creates a NAVIGATE_TO_ONBOARDING event.
 */
export function navigateToOnboarding(): NavigateToOnboardingEvent {
  return { type: "NAVIGATE_TO_ONBOARDING" };
}

/**
 * Creates a CREATE_TASK event.
 */
export function createTaskEvent(): CreateTaskEvent {
  return { type: "CREATE_TASK" };
}

/**
 * Creates a LOGOUT event.
 */
export function logoutEvent(): LogoutEvent {
  return { type: "LOGOUT" };
}

/**
 * Creates a URL_CHANGED event.
 */
export function urlChanged(path: string, params: Record<string, string>): UrlChangedEvent {
  return { type: "URL_CHANGED", payload: { path, params } };
}

/**
 * Creates a NAVIGATION_COMPLETE event.
 */
export function navigationComplete(
  state: NavState,
  route: RoutePath,
  params: Record<string, string>
): NavigationCompleteEvent {
  return { type: "NAVIGATION_COMPLETE", payload: { state, route, params } };
}

// =============================================================================
// Type Guard Utilities
// =============================================================================

/**
 * Type guard for events that have a payload.
 */
export function hasPayload<T extends NavEvent>(
  event: T
): event is T & { readonly payload: unknown } {
  return "payload" in event;
}
