/**
 * Navigation State Machine for TaskFlow
 *
 * Provides type-safe navigation state management that controls React Router
 * transitions. The machine enforces route guards, tracks navigation history,
 * and synchronizes state with URL changes.
 *
 * States:
 * - `idle`: Initial state before any navigation
 * - `navigating`: Transient state during route transition
 * - `dashboard`: Dashboard view (/)
 * - `taskDetail`: Task detail view (/tasks/:id)
 * - `newTask`: Task creation form (/tasks/new)
 * - `settings`: Settings view (/settings)
 * - `onboarding`: Onboarding wizard (/onboarding)
 *
 * @packageDocumentation
 */

import { defineMachine, Effect, type Machine } from "@hex-di/flow";
import { ROUTES, type RoutePath, type User, type NavigationContext } from "../types.js";

// =============================================================================
// Machine Types
// =============================================================================

/**
 * Navigation state machine states.
 */
export type NavState =
  | "idle"
  | "navigating"
  | "dashboard"
  | "taskDetail"
  | "newTask"
  | "settings"
  | "onboarding";

/**
 * Navigation state machine event types.
 */
export type NavEventType =
  | "NAVIGATE_TO_DASHBOARD"
  | "NAVIGATE_TO_TASK"
  | "NAVIGATE_TO_NEW_TASK"
  | "NAVIGATE_TO_SETTINGS"
  | "NAVIGATE_TO_ONBOARDING"
  | "CREATE_TASK"
  | "LOGOUT"
  | "URL_CHANGED"
  | "NAVIGATION_COMPLETE";

/**
 * Context for the navigation state machine.
 */
export interface NavContext extends NavigationContext {
  /** Error message if navigation failed */
  readonly error: string | null;
}

/**
 * Type of the navigation machine.
 */
export type NavigationMachine = Machine<NavState, NavEventType, NavContext>;

// =============================================================================
// Event Payloads
// =============================================================================

interface NavigateToTaskPayload {
  readonly taskId: string;
}

interface UrlChangedPayload {
  readonly path: string;
  readonly params: Record<string, string>;
}

interface NavigationCompletePayload {
  readonly state: NavState;
  readonly route: RoutePath;
  readonly params: Record<string, string>;
}

// =============================================================================
// Initial Context
// =============================================================================

const initialContext: NavContext = {
  currentRoute: ROUTES.DASHBOARD,
  previousRoute: null,
  params: {},
  user: null,
  error: null,
};

// =============================================================================
// Route Guards
// =============================================================================

/**
 * Guard: Check if user is a new user (for onboarding route).
 * New users should be redirected to onboarding.
 */
export function isNewUser(ctx: NavContext): boolean {
  return ctx.user !== null && ctx.user.isNewUser;
}

/**
 * Guard: Check if user has completed onboarding.
 * Returning users should not access onboarding.
 */
export function hasCompletedOnboarding(ctx: NavContext): boolean {
  return ctx.user !== null && !ctx.user.isNewUser;
}

/**
 * Guard: Check if user is authenticated.
 * Protected routes require authentication.
 */
export function isAuthenticated(ctx: NavContext): boolean {
  return ctx.user !== null;
}

/**
 * Guard: Check if user is NOT authenticated.
 * Some routes may require no authentication.
 */
export function isNotAuthenticated(ctx: NavContext): boolean {
  return ctx.user === null;
}

/**
 * Guard: Check if task exists (for task detail route).
 * This is a placeholder - actual implementation would check cache/API.
 */
export function taskExists(
  _ctx: NavContext,
  event: { readonly type: "NAVIGATE_TO_TASK"; readonly payload: NavigateToTaskPayload }
): boolean {
  // For now, accept any taskId that is non-empty
  return event.payload.taskId.length > 0;
}

// =============================================================================
// State-to-Route Mapping
// =============================================================================

/**
 * Maps navigation states to route paths.
 */
export const stateToRouteMap: Record<Exclude<NavState, "idle" | "navigating">, RoutePath> = {
  dashboard: ROUTES.DASHBOARD,
  taskDetail: ROUTES.TASK_DETAIL,
  newTask: ROUTES.NEW_TASK,
  settings: ROUTES.SETTINGS,
  onboarding: ROUTES.ONBOARDING,
};

/**
 * Maps route paths to navigation states.
 */
export const routeToStateMap: Record<RoutePath, Exclude<NavState, "idle" | "navigating">> = {
  [ROUTES.DASHBOARD]: "dashboard",
  [ROUTES.TASK_DETAIL]: "taskDetail",
  [ROUTES.NEW_TASK]: "newTask",
  [ROUTES.SETTINGS]: "settings",
  [ROUTES.ONBOARDING]: "onboarding",
};

/**
 * Resolves a URL path to a navigation state and extracts params.
 */
export function resolvePathToState(
  path: string
): { state: Exclude<NavState, "idle" | "navigating">; params: Record<string, string> } | null {
  // Exact matches first
  if (path === ROUTES.DASHBOARD) {
    return { state: "dashboard", params: {} };
  }
  if (path === ROUTES.NEW_TASK) {
    return { state: "newTask", params: {} };
  }
  if (path === ROUTES.SETTINGS) {
    return { state: "settings", params: {} };
  }
  if (path === ROUTES.ONBOARDING) {
    return { state: "onboarding", params: {} };
  }

  // Pattern match for task detail (/tasks/:id)
  const taskDetailMatch = /^\/tasks\/([^/]+)$/.exec(path);
  if (taskDetailMatch) {
    return { state: "taskDetail", params: { id: taskDetailMatch[1] } };
  }

  return null;
}

// =============================================================================
// Navigation Machine Definition
// =============================================================================

/**
 * Navigation state machine that controls React Router transitions.
 *
 * State flow:
 * ```
 * idle --[any navigation event]--> navigating --[NAVIGATION_COMPLETE]--> target state
 *
 * dashboard <--NAVIGATE_TO_DASHBOARD-- any state
 * taskDetail <--NAVIGATE_TO_TASK-- any state (guarded by taskExists)
 * newTask <--NAVIGATE_TO_NEW_TASK / CREATE_TASK-- any state
 * settings <--NAVIGATE_TO_SETTINGS-- any state (guarded by isAuthenticated)
 * onboarding <--NAVIGATE_TO_ONBOARDING-- any state (guarded by isNewUser)
 *
 * URL_CHANGED: External URL changes trigger state sync
 * LOGOUT: Returns to dashboard and clears user
 * ```
 */
export const navigationMachine: NavigationMachine = defineMachine({
  id: "navigation",
  initial: "idle",
  context: initialContext,
  states: {
    // ==========================================================================
    // Idle State - Initial state before navigation
    // ==========================================================================
    idle: {
      on: {
        NAVIGATE_TO_DASHBOARD: {
          target: "dashboard",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.DASHBOARD,
              params: {},
              error: null,
            }),
          ],
        },
        NAVIGATE_TO_TASK: [
          {
            target: "taskDetail",
            guard: taskExists,
            actions: [
              (
                ctx: NavContext,
                event: {
                  readonly type: "NAVIGATE_TO_TASK";
                  readonly payload: NavigateToTaskPayload;
                }
              ): NavContext => ({
                ...ctx,
                previousRoute: ctx.currentRoute,
                currentRoute: ROUTES.TASK_DETAIL,
                params: { id: event.payload.taskId },
                error: null,
              }),
            ],
          },
          {
            target: "idle",
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                error: "Task not found",
              }),
            ],
          },
        ],
        NAVIGATE_TO_NEW_TASK: {
          target: "newTask",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.NEW_TASK,
              params: {},
              error: null,
            }),
          ],
        },
        CREATE_TASK: {
          target: "newTask",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.NEW_TASK,
              params: {},
              error: null,
            }),
          ],
        },
        NAVIGATE_TO_SETTINGS: [
          {
            target: "settings",
            guard: isAuthenticated,
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                previousRoute: ctx.currentRoute,
                currentRoute: ROUTES.SETTINGS,
                params: {},
                error: null,
              }),
            ],
          },
          {
            target: "idle",
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                error: "Authentication required",
              }),
            ],
          },
        ],
        NAVIGATE_TO_ONBOARDING: [
          {
            target: "onboarding",
            guard: isNewUser,
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                previousRoute: ctx.currentRoute,
                currentRoute: ROUTES.ONBOARDING,
                params: {},
                error: null,
              }),
            ],
          },
          {
            target: "idle",
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                error: "Onboarding already completed or not authenticated",
              }),
            ],
          },
        ],
        URL_CHANGED: {
          target: "navigating",
          actions: [
            (
              ctx: NavContext,
              event: { readonly type: "URL_CHANGED"; readonly payload: UrlChangedPayload }
            ): NavContext => ({
              ...ctx,
              params: event.payload.params,
              error: null,
            }),
          ],
        },
      },
    },

    // ==========================================================================
    // Navigating State - Transient state during navigation
    // ==========================================================================
    navigating: {
      entry: [Effect.delay(0)], // Yield to allow URL update
      on: {
        NAVIGATION_COMPLETE: {
          target: "dashboard", // Will be overridden by action
          actions: [
            (
              ctx: NavContext,
              event: {
                readonly type: "NAVIGATION_COMPLETE";
                readonly payload: NavigationCompletePayload;
              }
            ): NavContext => ({
              ...ctx,
              previousRoute: ctx.currentRoute,
              currentRoute: event.payload.route,
              params: event.payload.params,
              error: null,
            }),
          ],
        },
      },
    },

    // ==========================================================================
    // Dashboard State - Main task list view
    // ==========================================================================
    dashboard: {
      on: {
        NAVIGATE_TO_TASK: [
          {
            target: "taskDetail",
            guard: taskExists,
            actions: [
              (
                ctx: NavContext,
                event: {
                  readonly type: "NAVIGATE_TO_TASK";
                  readonly payload: NavigateToTaskPayload;
                }
              ): NavContext => ({
                ...ctx,
                previousRoute: ctx.currentRoute,
                currentRoute: ROUTES.TASK_DETAIL,
                params: { id: event.payload.taskId },
                error: null,
              }),
            ],
          },
          {
            target: "dashboard",
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                error: "Task not found",
              }),
            ],
          },
        ],
        NAVIGATE_TO_NEW_TASK: {
          target: "newTask",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.NEW_TASK,
              params: {},
              error: null,
            }),
          ],
        },
        CREATE_TASK: {
          target: "newTask",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.NEW_TASK,
              params: {},
              error: null,
            }),
          ],
        },
        NAVIGATE_TO_SETTINGS: [
          {
            target: "settings",
            guard: isAuthenticated,
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                previousRoute: ctx.currentRoute,
                currentRoute: ROUTES.SETTINGS,
                params: {},
                error: null,
              }),
            ],
          },
          {
            target: "dashboard",
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                error: "Authentication required",
              }),
            ],
          },
        ],
        NAVIGATE_TO_ONBOARDING: [
          {
            target: "onboarding",
            guard: isNewUser,
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                previousRoute: ctx.currentRoute,
                currentRoute: ROUTES.ONBOARDING,
                params: {},
                error: null,
              }),
            ],
          },
          {
            target: "dashboard",
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                error: "Onboarding already completed or not authenticated",
              }),
            ],
          },
        ],
        URL_CHANGED: {
          target: "navigating",
          actions: [
            (
              ctx: NavContext,
              event: { readonly type: "URL_CHANGED"; readonly payload: UrlChangedPayload }
            ): NavContext => ({
              ...ctx,
              params: event.payload.params,
              error: null,
            }),
          ],
        },
        LOGOUT: {
          target: "dashboard",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              user: null,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.DASHBOARD,
              params: {},
              error: null,
            }),
          ],
        },
      },
    },

    // ==========================================================================
    // Task Detail State - Single task view
    // ==========================================================================
    taskDetail: {
      on: {
        NAVIGATE_TO_DASHBOARD: {
          target: "dashboard",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.DASHBOARD,
              params: {},
              error: null,
            }),
          ],
        },
        NAVIGATE_TO_TASK: [
          {
            target: "taskDetail",
            guard: taskExists,
            actions: [
              (
                ctx: NavContext,
                event: {
                  readonly type: "NAVIGATE_TO_TASK";
                  readonly payload: NavigateToTaskPayload;
                }
              ): NavContext => ({
                ...ctx,
                previousRoute: ctx.currentRoute,
                currentRoute: ROUTES.TASK_DETAIL,
                params: { id: event.payload.taskId },
                error: null,
              }),
            ],
          },
          {
            target: "taskDetail",
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                error: "Task not found",
              }),
            ],
          },
        ],
        NAVIGATE_TO_NEW_TASK: {
          target: "newTask",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.NEW_TASK,
              params: {},
              error: null,
            }),
          ],
        },
        NAVIGATE_TO_SETTINGS: [
          {
            target: "settings",
            guard: isAuthenticated,
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                previousRoute: ctx.currentRoute,
                currentRoute: ROUTES.SETTINGS,
                params: {},
                error: null,
              }),
            ],
          },
          {
            target: "taskDetail",
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                error: "Authentication required",
              }),
            ],
          },
        ],
        URL_CHANGED: {
          target: "navigating",
          actions: [
            (
              ctx: NavContext,
              event: { readonly type: "URL_CHANGED"; readonly payload: UrlChangedPayload }
            ): NavContext => ({
              ...ctx,
              params: event.payload.params,
              error: null,
            }),
          ],
        },
        LOGOUT: {
          target: "dashboard",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              user: null,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.DASHBOARD,
              params: {},
              error: null,
            }),
          ],
        },
      },
    },

    // ==========================================================================
    // New Task State - Task creation form
    // ==========================================================================
    newTask: {
      on: {
        NAVIGATE_TO_DASHBOARD: {
          target: "dashboard",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.DASHBOARD,
              params: {},
              error: null,
            }),
          ],
        },
        NAVIGATE_TO_TASK: [
          {
            target: "taskDetail",
            guard: taskExists,
            actions: [
              (
                ctx: NavContext,
                event: {
                  readonly type: "NAVIGATE_TO_TASK";
                  readonly payload: NavigateToTaskPayload;
                }
              ): NavContext => ({
                ...ctx,
                previousRoute: ctx.currentRoute,
                currentRoute: ROUTES.TASK_DETAIL,
                params: { id: event.payload.taskId },
                error: null,
              }),
            ],
          },
          {
            target: "newTask",
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                error: "Task not found",
              }),
            ],
          },
        ],
        NAVIGATE_TO_SETTINGS: [
          {
            target: "settings",
            guard: isAuthenticated,
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                previousRoute: ctx.currentRoute,
                currentRoute: ROUTES.SETTINGS,
                params: {},
                error: null,
              }),
            ],
          },
          {
            target: "newTask",
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                error: "Authentication required",
              }),
            ],
          },
        ],
        URL_CHANGED: {
          target: "navigating",
          actions: [
            (
              ctx: NavContext,
              event: { readonly type: "URL_CHANGED"; readonly payload: UrlChangedPayload }
            ): NavContext => ({
              ...ctx,
              params: event.payload.params,
              error: null,
            }),
          ],
        },
        LOGOUT: {
          target: "dashboard",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              user: null,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.DASHBOARD,
              params: {},
              error: null,
            }),
          ],
        },
      },
    },

    // ==========================================================================
    // Settings State - User settings view
    // ==========================================================================
    settings: {
      on: {
        NAVIGATE_TO_DASHBOARD: {
          target: "dashboard",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.DASHBOARD,
              params: {},
              error: null,
            }),
          ],
        },
        NAVIGATE_TO_TASK: [
          {
            target: "taskDetail",
            guard: taskExists,
            actions: [
              (
                ctx: NavContext,
                event: {
                  readonly type: "NAVIGATE_TO_TASK";
                  readonly payload: NavigateToTaskPayload;
                }
              ): NavContext => ({
                ...ctx,
                previousRoute: ctx.currentRoute,
                currentRoute: ROUTES.TASK_DETAIL,
                params: { id: event.payload.taskId },
                error: null,
              }),
            ],
          },
          {
            target: "settings",
            actions: [
              (ctx: NavContext): NavContext => ({
                ...ctx,
                error: "Task not found",
              }),
            ],
          },
        ],
        NAVIGATE_TO_NEW_TASK: {
          target: "newTask",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.NEW_TASK,
              params: {},
              error: null,
            }),
          ],
        },
        URL_CHANGED: {
          target: "navigating",
          actions: [
            (
              ctx: NavContext,
              event: { readonly type: "URL_CHANGED"; readonly payload: UrlChangedPayload }
            ): NavContext => ({
              ...ctx,
              params: event.payload.params,
              error: null,
            }),
          ],
        },
        LOGOUT: {
          target: "dashboard",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              user: null,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.DASHBOARD,
              params: {},
              error: null,
            }),
          ],
        },
      },
    },

    // ==========================================================================
    // Onboarding State - New user wizard
    // ==========================================================================
    onboarding: {
      on: {
        NAVIGATE_TO_DASHBOARD: {
          target: "dashboard",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.DASHBOARD,
              params: {},
              error: null,
            }),
          ],
        },
        URL_CHANGED: {
          target: "navigating",
          actions: [
            (
              ctx: NavContext,
              event: { readonly type: "URL_CHANGED"; readonly payload: UrlChangedPayload }
            ): NavContext => ({
              ...ctx,
              params: event.payload.params,
              error: null,
            }),
          ],
        },
        LOGOUT: {
          target: "dashboard",
          actions: [
            (ctx: NavContext): NavContext => ({
              ...ctx,
              user: null,
              previousRoute: ctx.currentRoute,
              currentRoute: ROUTES.DASHBOARD,
              params: {},
              error: null,
            }),
          ],
        },
      },
    },
  },
});

/**
 * Creates a navigation context with an authenticated user.
 */
export function createAuthenticatedContext(
  user: User,
  currentRoute: RoutePath = ROUTES.DASHBOARD
): NavContext {
  return {
    ...initialContext,
    currentRoute,
    user,
  };
}

/**
 * Creates initial navigation context.
 */
export function createInitialContext(): NavContext {
  return { ...initialContext };
}
