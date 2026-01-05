/**
 * Shared type definitions for the TaskFlow Project Management Dashboard.
 *
 * This file defines all domain types, route parameters, and state machine events
 * used throughout the TaskFlow application.
 *
 * @packageDocumentation
 */

// =============================================================================
// Domain Types - Core Entities
// =============================================================================

/**
 * Task priority levels.
 */
export type TaskPriority = "high" | "medium" | "low";

/**
 * Task status values.
 */
export type TaskStatus = "todo" | "in-progress" | "done";

/**
 * Represents a task in the project management system.
 */
export interface Task {
  /** Unique identifier for the task */
  readonly id: string;
  /** Task title */
  readonly title: string;
  /** Task description (optional) */
  readonly description: string | null;
  /** Priority level */
  readonly priority: TaskPriority;
  /** Current status */
  readonly status: TaskStatus;
  /** Due date (optional) */
  readonly dueDate: Date | null;
  /** ID of the project this task belongs to */
  readonly projectId: string;
  /** ID of the assigned user (optional) */
  readonly assigneeId: string | null;
  /** Labels/tags associated with this task */
  readonly labels: readonly string[];
  /** Timestamp when the task was created */
  readonly createdAt: Date;
  /** Timestamp when the task was last updated */
  readonly updatedAt: Date;
}

/**
 * Represents a project that contains tasks.
 */
export interface Project {
  /** Unique identifier for the project */
  readonly id: string;
  /** Project name */
  readonly name: string;
  /** Project description (optional) */
  readonly description: string | null;
  /** Project color for visual identification */
  readonly color: string;
  /** ID of the team that owns this project */
  readonly teamId: string;
  /** Whether the project is archived */
  readonly isArchived: boolean;
  /** Timestamp when the project was created */
  readonly createdAt: Date;
}

/**
 * User role in the organization.
 */
export type UserRole = "developer" | "designer" | "manager" | "admin" | "viewer";

/**
 * Represents a user in the system.
 */
export interface User {
  /** Unique identifier for the user */
  readonly id: string;
  /** User's display name */
  readonly displayName: string;
  /** User's email address */
  readonly email: string;
  /** User's role in the organization */
  readonly role: UserRole;
  /** Avatar URL (optional) */
  readonly avatarUrl: string | null;
  /** User's bio (optional) */
  readonly bio: string | null;
  /** Whether this is a new user who hasn't completed onboarding */
  readonly isNewUser: boolean;
  /** Timestamp when the user was created */
  readonly createdAt: Date;
}

/**
 * Represents a team that contains users and projects.
 */
export interface Team {
  /** Unique identifier for the team */
  readonly id: string;
  /** Team name */
  readonly name: string;
  /** Team description (optional) */
  readonly description: string | null;
  /** IDs of users in this team */
  readonly memberIds: readonly string[];
  /** Invite code for joining the team */
  readonly inviteCode: string;
  /** Timestamp when the team was created */
  readonly createdAt: Date;
}

// =============================================================================
// Route Types
// =============================================================================

/**
 * Route path constants for the TaskFlow application.
 */
export const ROUTES = {
  DASHBOARD: "/",
  NEW_TASK: "/tasks/new",
  TASK_DETAIL: "/tasks/:id",
  SETTINGS: "/settings",
  ONBOARDING: "/onboarding",
} as const;

/**
 * Route path type derived from ROUTES constant.
 */
export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * Parameters for the task detail route.
 */
export interface TaskDetailParams {
  readonly id: string;
}

/**
 * Query parameters for the dashboard route.
 */
export interface DashboardQueryParams {
  readonly status?: TaskStatus | "all";
  readonly priority?: TaskPriority | "all";
  readonly projectId?: string;
  readonly page?: string;
  readonly pageSize?: string;
}

// =============================================================================
// State Machine Event Types
// =============================================================================

/**
 * Navigation state machine events.
 */
export type NavigationEvent =
  | { readonly type: "NAVIGATE_TO_DASHBOARD" }
  | { readonly type: "NAVIGATE_TO_TASK"; readonly taskId: string }
  | { readonly type: "NAVIGATE_TO_NEW_TASK" }
  | { readonly type: "NAVIGATE_TO_SETTINGS" }
  | { readonly type: "NAVIGATE_TO_ONBOARDING" }
  | { readonly type: "CREATE_TASK" }
  | { readonly type: "LOGOUT" }
  | {
      readonly type: "URL_CHANGED";
      readonly path: string;
      readonly params: Record<string, string>;
    };

/**
 * Navigation state machine states.
 */
export type NavigationState =
  | "idle"
  | "navigating"
  | "dashboard"
  | "taskDetail"
  | "newTask"
  | "settings"
  | "onboarding";

/**
 * Context for the navigation state machine.
 */
export interface NavigationContext {
  readonly currentRoute: RoutePath;
  readonly previousRoute: RoutePath | null;
  readonly params: Record<string, string>;
  readonly user: User | null;
}

// =============================================================================
// Filter Types
// =============================================================================

/**
 * Filter state for the task list.
 */
export interface TaskFilterState {
  readonly status: TaskStatus | "all";
  readonly priority: TaskPriority | "all";
  readonly projectId: string | "all";
  readonly page: number;
  readonly pageSize: number;
}

/**
 * Default filter values.
 */
export const DEFAULT_FILTERS: TaskFilterState = {
  status: "all",
  priority: "all",
  projectId: "all",
  page: 1,
  pageSize: 10,
};

// =============================================================================
// UI Preference Types
// =============================================================================

/**
 * Theme options for the application.
 */
export type Theme = "light" | "dark" | "system";

/**
 * User interface preferences.
 */
export interface UIPreferences {
  readonly theme: Theme;
  readonly accentColor: string;
  readonly sidebarCollapsed: boolean;
  readonly compactMode: boolean;
}

/**
 * Default UI preferences.
 */
export const DEFAULT_UI_PREFERENCES: UIPreferences = {
  theme: "system",
  accentColor: "#3b82f6", // blue-500
  sidebarCollapsed: false,
  compactMode: false,
};

// =============================================================================
// Task Stats Types
// =============================================================================

/**
 * Aggregated task statistics for the dashboard.
 */
export interface TaskStats {
  readonly todoCount: number;
  readonly inProgressCount: number;
  readonly doneCount: number;
  readonly dueTodayCount: number;
}

// =============================================================================
// Form Data Types
// =============================================================================

/**
 * Data for creating a new task (Step 1: Basic Info).
 */
export interface TaskBasicInfo {
  readonly title: string;
  readonly description: string;
  readonly projectId: string;
  readonly priority: TaskPriority;
}

/**
 * Data for task assignment (Step 2: Assignment).
 */
export interface TaskAssignment {
  readonly assigneeId: string | null;
}

/**
 * Data for task due date and labels (Step 3: Due Date and Labels).
 */
export interface TaskDueDateLabels {
  readonly dueDate: Date | null;
  readonly labels: readonly string[];
}

/**
 * Complete task creation form data.
 */
export interface TaskFormData extends TaskBasicInfo, TaskAssignment, TaskDueDateLabels {}

// =============================================================================
// Onboarding Types
// =============================================================================

/**
 * Data for onboarding step 1: Profile Setup.
 */
export interface OnboardingProfile {
  readonly displayName: string;
  readonly role: UserRole;
  readonly avatarUrl: string | null;
  readonly bio: string | null;
}

/**
 * Mode for team setup in onboarding.
 */
export type TeamSetupMode = "create" | "join";

/**
 * Data for onboarding step 2: Team Setup.
 */
export interface OnboardingTeam {
  readonly mode: TeamSetupMode;
  readonly teamName: string | null;
  readonly teamDescription: string | null;
  readonly inviteCode: string | null;
}

/**
 * Default view options for the dashboard.
 */
export type DefaultView = "board" | "list" | "calendar";

/**
 * Data for onboarding step 3: Preferences.
 */
export interface OnboardingPreferences {
  readonly theme: Theme;
  readonly emailNotifications: boolean;
  readonly pushNotifications: boolean;
  readonly dailyDigest: boolean;
  readonly defaultView: DefaultView;
  readonly compactMode: boolean;
}

/**
 * Complete onboarding form data.
 */
export interface OnboardingFormData {
  readonly profile: OnboardingProfile;
  readonly team: OnboardingTeam;
  readonly preferences: OnboardingPreferences;
}

// =============================================================================
// Modal Types
// =============================================================================

/**
 * Modal animation states.
 */
export type ModalAnimationState = "closed" | "opening" | "open" | "closing";

/**
 * Notification modal variants.
 */
export type NotificationVariant = "success" | "warning" | "error" | "info";

/**
 * Options for confirmation modal.
 */
export interface ConfirmationModalOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly variant: "danger" | "warning" | "info";
  readonly itemPreview?: {
    readonly name: string;
    readonly description?: string;
  };
}

/**
 * Options for notification modal.
 */
export interface NotificationModalOptions {
  readonly title: string;
  readonly message: string;
  readonly variant: NotificationVariant;
  readonly autoDismissMs?: number;
  readonly undoAction?: () => void;
}
