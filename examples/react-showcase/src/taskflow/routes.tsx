/**
 * Route configuration for the TaskFlow application.
 *
 * Defines all routes and their components using React Router v7+.
 * Routes are integrated with the navigation state machine for type-safe transitions.
 *
 * Note: Routes use relative paths to work correctly when nested under /taskflow/*
 * in the main React Showcase app.
 *
 * @packageDocumentation
 */

import * as React from "react";
import { type RouteObject, useNavigate } from "react-router-dom";
import { DashboardPage } from "./pages/index.js";
import { TaskCreationForm } from "./components/forms/index.js";
import { useModal } from "./components/modals/index.js";
import { OnboardingWizard, useOnboardingGuard } from "./components/onboarding/index.js";
import {
  createUserSessionStore,
  type UserSessionStoreInstance,
} from "./stores/user-session-store.js";
import {
  createUIPreferencesStore,
  type UIPreferencesStoreInstance,
} from "./stores/ui-preferences-store.js";

// =============================================================================
// Relative Route Paths (for nested routing under /taskflow/*)
// =============================================================================

/**
 * Relative route paths for TaskFlow.
 * These work correctly when TaskFlow is mounted at /taskflow/* in the main app.
 */
const RELATIVE_ROUTES = {
  /** Dashboard (index route) */
  DASHBOARD: "/taskflow",
  /** Create new task */
  NEW_TASK: "/taskflow/tasks/new",
  /** Task detail with id parameter */
  TASK_DETAIL: "/taskflow/tasks/:id",
  /** Settings page */
  SETTINGS: "/taskflow/settings",
  /** Onboarding flow */
  ONBOARDING: "/taskflow/onboarding",
} as const;

// =============================================================================
// New Task Page Component
// =============================================================================

/**
 * Page component for creating new tasks.
 * Uses TaskCreationForm with navigation and notification integration.
 */
function NewTaskPage() {
  const navigate = useNavigate();
  const { showNotification } = useModal();

  const handleSuccess = React.useCallback(
    (task: { id: string; title: string }) => {
      showNotification({
        title: "Task Created",
        message: `"${task.title}" has been created successfully`,
        variant: "success",
        autoDismissMs: 5000,
      });
      navigate(RELATIVE_ROUTES.DASHBOARD);
    },
    [navigate, showNotification]
  );

  const handleCancel = React.useCallback(() => {
    navigate(RELATIVE_ROUTES.DASHBOARD);
  }, [navigate]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <TaskCreationForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}

/**
 * Placeholder component for Task Detail route.
 * Will be replaced with full implementation in Task Group 6.
 */
function TaskDetailPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800">Task Details</h1>
      <p className="mt-2 text-gray-600">Task details will be displayed here.</p>
    </div>
  );
}

/**
 * Placeholder component for Settings route.
 * Will be replaced with full implementation in later tasks.
 */
function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
      <p className="mt-2 text-gray-600">User settings will be displayed here.</p>
    </div>
  );
}

// =============================================================================
// Onboarding Page Component
// =============================================================================

/**
 * Shared store instances for the onboarding page.
 * In a real app, these would come from a provider or DI container.
 */
let userSessionStore: UserSessionStoreInstance | null = null;
let uiPreferencesStore: UIPreferencesStoreInstance | null = null;

function getStores() {
  if (!userSessionStore) {
    userSessionStore = createUserSessionStore();
  }
  if (!uiPreferencesStore) {
    uiPreferencesStore = createUIPreferencesStore();
  }
  return { userSessionStore, uiPreferencesStore };
}

/**
 * Onboarding page with route guard integration.
 * Redirects returning users to dashboard, allows new users through.
 */
function OnboardingPage() {
  const navigate = useNavigate();
  const stores = getStores();
  const { shouldRedirect, redirectPath, isLoading } = useOnboardingGuard(stores.userSessionStore);

  React.useEffect(() => {
    if (shouldRedirect && !isLoading) {
      navigate(redirectPath, { replace: true });
    }
  }, [shouldRedirect, redirectPath, isLoading, navigate]);

  // Show loading state while guard is checking
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Redirect is pending
  if (shouldRedirect) {
    return null;
  }

  // Show onboarding wizard
  return (
    <OnboardingWizard
      userSessionStore={stores.userSessionStore}
      uiPreferencesStore={stores.uiPreferencesStore}
      onComplete={() => navigate(RELATIVE_ROUTES.DASHBOARD, { replace: true })}
    />
  );
}

// =============================================================================
// Route Configuration
// =============================================================================

/**
 * Application route configuration.
 *
 * Routes use relative paths to work correctly when nested under /taskflow/*
 * in the main React Showcase app. Each route maps to a navigation state
 * machine state.
 */
export const routes: RouteObject[] = [
  {
    // Index route for /taskflow
    index: true,
    element: <DashboardPage />,
  },
  {
    // /taskflow/tasks/new
    path: "tasks/new",
    element: <NewTaskPage />,
  },
  {
    // /taskflow/tasks/:id
    path: "tasks/:id",
    element: <TaskDetailPage />,
  },
  {
    // /taskflow/settings
    path: "settings",
    element: <SettingsPage />,
  },
  {
    // /taskflow/onboarding
    path: "onboarding",
    element: <OnboardingPage />,
  },
];

/**
 * Route metadata for navigation state machine integration.
 *
 * Maps route paths to their corresponding navigation states.
 */
export const routeToState: Record<string, string> = {
  [RELATIVE_ROUTES.DASHBOARD]: "dashboard",
  [RELATIVE_ROUTES.NEW_TASK]: "newTask",
  [RELATIVE_ROUTES.TASK_DETAIL]: "taskDetail",
  [RELATIVE_ROUTES.SETTINGS]: "settings",
  [RELATIVE_ROUTES.ONBOARDING]: "onboarding",
};

/**
 * State to route path mapping.
 *
 * Maps navigation states to their corresponding route paths.
 */
export const stateToRoute: Record<string, string> = {
  dashboard: RELATIVE_ROUTES.DASHBOARD,
  newTask: RELATIVE_ROUTES.NEW_TASK,
  taskDetail: RELATIVE_ROUTES.TASK_DETAIL,
  settings: RELATIVE_ROUTES.SETTINGS,
  onboarding: RELATIVE_ROUTES.ONBOARDING,
};
