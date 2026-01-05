/**
 * Navigation Module for TaskFlow
 *
 * Provides navigation state machine, route guards, router service port,
 * and URL-state synchronization hook.
 *
 * @packageDocumentation
 */

// =============================================================================
// Machine
// =============================================================================

export {
  // Types
  type NavState,
  type NavEventType,
  type NavContext,
  type NavigationMachine,
  // Machine
  navigationMachine,
  // Guards
  isNewUser,
  hasCompletedOnboarding,
  isAuthenticated,
  isNotAuthenticated,
  taskExists,
  // Mapping utilities
  stateToRouteMap,
  routeToStateMap,
  resolvePathToState,
  // Context factories
  createAuthenticatedContext,
  createInitialContext,
} from "./machine.js";

// =============================================================================
// Ports
// =============================================================================

export {
  // Flow service port
  NavigationFlowServicePort,
  type NavigationFlowService,
  // Router service port
  RouterServicePort,
  type RouterService,
  type NavigateOptions,
  // Guard service port
  NavigationGuardServicePort,
  type NavigationGuardService,
  type GuardResult,
} from "./ports.js";

// =============================================================================
// Events
// =============================================================================

export {
  // Event types
  type NavEvent,
  type NavigateToDashboardEvent,
  type NavigateToTaskEvent,
  type NavigateToNewTaskEvent,
  type NavigateToSettingsEvent,
  type NavigateToOnboardingEvent,
  type CreateTaskEvent,
  type LogoutEvent,
  type UrlChangedEvent,
  type NavigationCompleteEvent,
  // Event factories
  navigateToDashboard,
  navigateToTask,
  navigateToNewTask,
  navigateToSettings,
  navigateToOnboarding,
  createTaskEvent,
  logoutEvent,
  urlChanged,
  navigationComplete,
  hasPayload,
} from "./events.js";

// =============================================================================
// Hooks
// =============================================================================

export {
  useRouteStateMachine,
  createNavigationRunner,
  type UseRouteStateMachineOptions,
  type UseRouteStateMachineResult,
} from "./use-route-state-machine.js";
