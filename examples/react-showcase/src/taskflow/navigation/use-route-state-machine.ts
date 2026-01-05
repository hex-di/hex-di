/**
 * Hook for Bidirectional URL-State Synchronization
 *
 * Provides a React hook that synchronizes the navigation state machine
 * with React Router's URL. Handles both directions:
 * - State changes trigger URL updates
 * - URL changes trigger state machine events
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createMachineRunner,
  createBasicExecutor,
  createActivityManager,
  type MachineSnapshot,
} from "@hex-di/flow";
import {
  navigationMachine,
  resolvePathToState,
  stateToRouteMap,
  type NavState,
  type NavContext,
} from "./machine.js";
import {
  navigateToDashboard as createNavigateToDashboardEvent,
  navigateToTask as createNavigateToTaskEvent,
  navigateToNewTask as createNavigateToNewTaskEvent,
  navigateToSettings as createNavigateToSettingsEvent,
  navigateToOnboarding as createNavigateToOnboardingEvent,
  createTaskEvent,
  logoutEvent,
  urlChanged,
  navigationComplete,
} from "./events.js";
import type { NavEventType } from "./machine.js";
import type { RoutePath, User } from "../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for the useRouteStateMachine hook.
 */
export interface UseRouteStateMachineOptions {
  /** Current authenticated user (null if not authenticated) */
  readonly user: User | null;
  /** Initial route to sync with (optional, defaults to current location) */
  readonly initialRoute?: RoutePath;
  /** Callback when navigation state changes */
  readonly onStateChange?: (state: NavState, context: NavContext) => void;
  /** Callback when navigation error occurs */
  readonly onError?: (error: string) => void;
}

/**
 * Return type for the useRouteStateMachine hook.
 */
export interface UseRouteStateMachineResult {
  /** Current navigation state */
  readonly state: NavState;
  /** Current navigation context */
  readonly context: NavContext;
  /** Navigate to dashboard */
  readonly navigateToDashboard: () => void;
  /** Navigate to a specific task */
  readonly navigateToTask: (taskId: string) => void;
  /** Navigate to new task form */
  readonly navigateToNewTask: () => void;
  /** Navigate to settings */
  readonly navigateToSettings: () => void;
  /** Navigate to onboarding */
  readonly navigateToOnboarding: () => void;
  /** Create a new task (navigates to new task form) */
  readonly createTask: () => void;
  /** Log out and return to dashboard */
  readonly logout: () => void;
  /** Check if currently on a specific state */
  readonly isState: (state: NavState) => boolean;
  /** Check if navigation has an error */
  readonly hasError: boolean;
  /** Current error message */
  readonly error: string | null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that provides bidirectional synchronization between
 * navigation state machine and React Router URL.
 *
 * This hook:
 * 1. Creates and manages a navigation state machine runner
 * 2. Listens for URL changes and dispatches URL_CHANGED events
 * 3. Listens for state changes and updates the URL
 * 4. Provides navigation action handlers
 *
 * @param options - Hook configuration options
 * @returns Navigation state and action handlers
 *
 * @example
 * ```tsx
 * function AppLayout() {
 *   const navigation = useRouteStateMachine({
 *     user: currentUser,
 *     onStateChange: (state) => console.log('Navigation:', state),
 *   });
 *
 *   return (
 *     <nav>
 *       <button onClick={navigation.navigateToDashboard}>Dashboard</button>
 *       <button onClick={navigation.navigateToSettings}>Settings</button>
 *       <span>Current: {navigation.state}</span>
 *     </nav>
 *   );
 * }
 * ```
 */
export function useRouteStateMachine(
  options: UseRouteStateMachineOptions
): UseRouteStateMachineResult {
  const { user, onStateChange, onError } = options;

  // React Router hooks
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  // Track if we're in the middle of a programmatic navigation
  const isProgrammaticNavigation = useRef(false);

  // Create a stable machine runner
  const runnerRef = useRef<ReturnType<
    typeof createMachineRunner<NavState, NavEventType, NavContext>
  > | null>(null);

  // Initialize runner on first render
  if (runnerRef.current === null) {
    runnerRef.current = createMachineRunner(navigationMachine, {
      executor: createBasicExecutor(),
      activityManager: createActivityManager(),
    });
  }

  const runner = runnerRef.current;

  // State tracking
  const snapshotRef = useRef<MachineSnapshot<NavState, NavContext>>(runner.snapshot());

  // Force re-render on state changes
  const forceUpdateRef = useRef(0);
  const forceUpdate = useCallback(() => {
    forceUpdateRef.current += 1;
  }, []);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = runner.subscribe(snapshot => {
      snapshotRef.current = snapshot;
      forceUpdate();

      // Call user callback
      if (onStateChange) {
        onStateChange(snapshot.state, snapshot.context);
      }

      // Check for errors
      if (snapshot.context.error && onError) {
        onError(snapshot.context.error);
      }

      // Update URL if this was a programmatic navigation
      if (isProgrammaticNavigation.current) {
        isProgrammaticNavigation.current = false;

        const targetState = snapshot.state;
        if (targetState !== "idle" && targetState !== "navigating") {
          const route = stateToRouteMap[targetState];
          let targetPath: string = route;

          // Handle dynamic route params
          if (targetState === "taskDetail" && snapshot.context.params.id) {
            targetPath = `/tasks/${snapshot.context.params.id}`;
          }

          // Only navigate if path is different
          if (targetPath !== location.pathname) {
            navigate(targetPath);
          }
        }
      }
    });

    return unsubscribe;
  }, [runner, navigate, location.pathname, onStateChange, onError, forceUpdate]);

  // Sync user context when user changes
  useEffect(() => {
    const currentContext = runner.snapshot().context;
    if (currentContext.user !== user) {
      // Update context through a custom action
      // For now, we'll handle this via the machine's context
      // In a real implementation, you might have an UPDATE_USER event
    }
  }, [user, runner]);

  // Handle URL changes from browser navigation (back/forward)
  useEffect(() => {
    // Skip if this was a programmatic navigation
    if (isProgrammaticNavigation.current) {
      return;
    }

    const resolved = resolvePathToState(location.pathname);
    if (resolved) {
      const currentState = runner.snapshot().state;
      const currentRoute = runner.snapshot().context.currentRoute;

      // Only dispatch if state/route actually changed
      if (
        currentState !== resolved.state ||
        currentRoute !== getRouteForState(resolved.state, resolved.params)
      ) {
        // Filter out undefined values from params
        const mergedParams: Record<string, string> = {};
        for (const [key, value] of Object.entries({ ...params, ...resolved.params })) {
          if (value !== undefined) {
            mergedParams[key] = value;
          }
        }
        runner.send(urlChanged(location.pathname, mergedParams));

        // After URL_CHANGED, we need to complete the navigation
        // This is simplified - in practice you'd want more sophisticated handling
        setTimeout(() => {
          runner.send(
            navigationComplete(
              resolved.state,
              getRouteForState(resolved.state, resolved.params),
              resolved.params
            )
          );
        }, 0);
      }
    }
  }, [location.pathname, params, runner]);

  // Navigation action handlers
  const navigateToDashboard = useCallback(() => {
    isProgrammaticNavigation.current = true;
    runner.send(createNavigateToDashboardEvent());
  }, [runner]);

  const navigateToTask = useCallback(
    (taskId: string) => {
      isProgrammaticNavigation.current = true;
      runner.send(createNavigateToTaskEvent(taskId));
    },
    [runner]
  );

  const navigateToNewTask = useCallback(() => {
    isProgrammaticNavigation.current = true;
    runner.send(createNavigateToNewTaskEvent());
  }, [runner]);

  const navigateToSettings = useCallback(() => {
    isProgrammaticNavigation.current = true;
    runner.send(createNavigateToSettingsEvent());
  }, [runner]);

  const navigateToOnboarding = useCallback(() => {
    isProgrammaticNavigation.current = true;
    runner.send(createNavigateToOnboardingEvent());
  }, [runner]);

  const createTask = useCallback(() => {
    isProgrammaticNavigation.current = true;
    runner.send(createTaskEvent());
  }, [runner]);

  const logout = useCallback(() => {
    isProgrammaticNavigation.current = true;
    runner.send(logoutEvent());
  }, [runner]);

  const isState = useCallback((state: NavState) => snapshotRef.current.state === state, []);

  // Return memoized result
  return useMemo(
    () => ({
      state: snapshotRef.current.state,
      context: snapshotRef.current.context,
      navigateToDashboard,
      navigateToTask,
      navigateToNewTask,
      navigateToSettings,
      navigateToOnboarding,
      createTask,
      logout,
      isState,
      hasError: snapshotRef.current.context.error !== null,
      error: snapshotRef.current.context.error,
    }),
    [
      // Using forceUpdateRef.current as dependency to trigger re-render
      // eslint-disable-next-line react-hooks/exhaustive-deps
      forceUpdateRef.current,
      navigateToDashboard,
      navigateToTask,
      navigateToNewTask,
      navigateToSettings,
      navigateToOnboarding,
      createTask,
      logout,
      isState,
    ]
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the route path for a given state and params.
 */
function getRouteForState(
  state: Exclude<NavState, "idle" | "navigating">,
  params: Record<string, string>
): RoutePath {
  if (state === "taskDetail" && params.id) {
    // Return the pattern, actual URL is built separately
    return "/tasks/:id";
  }
  return stateToRouteMap[state];
}

/**
 * Standalone function to create a navigation state machine runner.
 * Useful for testing or non-React contexts.
 */
export function createNavigationRunner(_initialUser?: User | null) {
  const runner = createMachineRunner(navigationMachine, {
    executor: createBasicExecutor(),
    activityManager: createActivityManager(),
  });

  // If user provided, we could initialize context here
  // For now, the machine handles this through guards

  return runner;
}
