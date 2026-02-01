/**
 * Port Definitions for Navigation Flow
 *
 * Defines service ports for router synchronization and navigation.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/core";
import type { FlowService } from "@hex-di/flow";
import type { NavState, NavEventType, NavContext } from "./machine.js";
import type { RoutePath } from "../types.js";

// =============================================================================
// Navigation Flow Service Port
// =============================================================================

/**
 * Type alias for the Navigation FlowService.
 */
export type NavigationFlowService = FlowService<NavState, NavEventType, NavContext>;

/**
 * Port for the Navigation FlowService.
 *
 * This port provides access to the navigation state machine via the container.
 *
 * @example
 * ```tsx
 * import { useMachine } from '@hex-di/flow-react';
 * import { NavigationFlowServicePort } from './ports';
 *
 * function AppNavigator() {
 *   const { state, context, send } = useMachine(NavigationFlowServicePort);
 *
 *   const handleNavigate = (route: string) => {
 *     send({ type: 'NAVIGATE_TO_DASHBOARD' });
 *   };
 *
 *   return <nav>Current state: {state}</nav>;
 * }
 * ```
 */
export const NavigationFlowServicePort = createPort<NavigationFlowService, "NavigationFlowService">(
  { name: "NavigationFlowService" }
);

// =============================================================================
// Router Service Port
// =============================================================================

/**
 * Options for navigation.
 */
export interface NavigateOptions {
  /** Replace current history entry instead of pushing */
  readonly replace?: boolean;
  /** Query parameters to include */
  readonly queryParams?: Record<string, string>;
}

/**
 * Router service interface for programmatic navigation.
 *
 * This service abstracts React Router's navigation APIs, allowing
 * the navigation state machine to trigger route changes through Effects.
 */
export interface RouterService {
  /**
   * Navigate to a route path.
   *
   * @param path - The route path to navigate to
   * @param options - Navigation options
   */
  navigate(path: RoutePath | string, options?: NavigateOptions): void;

  /**
   * Navigate back in history.
   */
  goBack(): void;

  /**
   * Navigate forward in history.
   */
  goForward(): void;

  /**
   * Get the current pathname.
   */
  getCurrentPath(): string;

  /**
   * Get current route parameters.
   */
  getParams(): Record<string, string>;

  /**
   * Get current query parameters.
   */
  getQueryParams(): Record<string, string>;

  /**
   * Build a URL with path and query parameters.
   *
   * @param path - The route path
   * @param params - Route parameters (for dynamic segments)
   * @param queryParams - Query parameters
   */
  buildUrl(
    path: RoutePath | string,
    params?: Record<string, string>,
    queryParams?: Record<string, string>
  ): string;

  /**
   * Subscribe to location changes.
   *
   * @param callback - Function called when location changes
   * @returns Unsubscribe function
   */
  subscribe(
    callback: (location: {
      pathname: string;
      search: string;
      params: Record<string, string>;
    }) => void
  ): () => void;
}

/**
 * Port for the RouterService.
 *
 * This port provides access to React Router's navigation capabilities
 * through a container-resolvable service.
 *
 * @example
 * ```tsx
 * // In an adapter or effect
 * const router = scope.resolve(RouterServicePort);
 * router.navigate('/tasks/new');
 * ```
 */
export const RouterServicePort = createPort<RouterService, "RouterService">({
  name: "RouterService",
});

// =============================================================================
// Navigation Guard Service Port
// =============================================================================

/**
 * Guard result indicating whether navigation should proceed.
 */
export interface GuardResult {
  /** Whether navigation is allowed */
  readonly allowed: boolean;
  /** Redirect path if navigation is blocked */
  readonly redirectTo?: RoutePath;
  /** Reason for blocking (for error messages) */
  readonly reason?: string;
}

/**
 * Navigation guard service for evaluating route access.
 *
 * This service provides guard evaluation that can be invoked
 * from the navigation state machine via Effect.invoke.
 */
export interface NavigationGuardService {
  /**
   * Check if user can access the onboarding route.
   * Only new users should access onboarding.
   */
  canAccessOnboarding(): GuardResult;

  /**
   * Check if user can access protected routes.
   * Requires authentication.
   */
  canAccessProtectedRoute(): GuardResult;

  /**
   * Check if a task exists.
   *
   * @param taskId - The task ID to check
   */
  canAccessTask(taskId: string): Promise<GuardResult>;

  /**
   * Evaluate all guards for a given route.
   *
   * @param path - The route path to evaluate
   * @param params - Route parameters
   */
  evaluateRoute(path: RoutePath | string, params?: Record<string, string>): Promise<GuardResult>;
}

/**
 * Port for the NavigationGuardService.
 *
 * This port provides access to route guard evaluation.
 */
export const NavigationGuardServicePort = createPort<
  NavigationGuardService,
  "NavigationGuardService"
>({
  name: "NavigationGuardService",
});
