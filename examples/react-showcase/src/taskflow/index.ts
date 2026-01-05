/**
 * TaskFlow Project Management Dashboard module.
 *
 * This module provides the infrastructure for the TaskFlow dashboard,
 * integrating React Router, React Query, and HexDI patterns.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Domain entities
  Task,
  TaskPriority,
  TaskStatus,
  Project,
  User,
  UserRole,
  Team,
  // Route types
  RoutePath,
  TaskDetailParams,
  DashboardQueryParams,
  // State machine types
  NavigationEvent,
  NavigationState,
  NavigationContext,
  // Filter types
  TaskFilterState,
  // UI types
  Theme,
  UIPreferences,
  // Stats types
  TaskStats,
  // Form types
  TaskBasicInfo,
  TaskAssignment,
  TaskDueDateLabels,
  TaskFormData,
  // Onboarding types
  OnboardingProfile,
  TeamSetupMode,
  OnboardingTeam,
  DefaultView,
  OnboardingPreferences,
  OnboardingFormData,
  // Modal types from domain (used in other type definitions)
  NotificationVariant,
  ConfirmationModalOptions,
  NotificationModalOptions,
} from "./types.js";

export {
  // Route constants
  ROUTES,
  // Default values
  DEFAULT_FILTERS,
  DEFAULT_UI_PREFERENCES,
} from "./types.js";

// =============================================================================
// Routes
// =============================================================================

export { routes, routeToState, stateToRoute } from "./routes.js";

// =============================================================================
// Query Client
// =============================================================================

export { createQueryClient, queryKeys } from "./query-client.js";

// =============================================================================
// Providers
// =============================================================================

export {
  TaskFlowProviders,
  TaskFlowRouterProvider,
  TaskFlowQueryProvider,
  TaskFlowApp,
  getQueryClient,
  resetQueryClient,
} from "./providers.js";

// =============================================================================
// Navigation
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
  // Hooks
  useRouteStateMachine,
  createNavigationRunner,
  type UseRouteStateMachineOptions,
  type UseRouteStateMachineResult,
} from "./navigation/index.js";

// =============================================================================
// Stores (Zustand)
// =============================================================================

export {
  // UI Preferences Store
  createUIPreferencesStore,
  type UIPreferencesState,
  type UIPreferencesActions,
  type UIPreferencesStore,
  type UIPreferencesStoreInstance,
  // Filter Store
  createFilterStore,
  type FilterActions,
  type FilterStore,
  type FilterStoreInstance,
  // User Session Store
  createUserSessionStore,
  type AuthStatus,
  type UserSessionState,
  type UserSessionActions,
  type UserSessionStore,
  type UserSessionStoreInstance,
  // Ports
  UIPreferencesStorePort,
  FilterStorePort,
  UserSessionStorePort,
  // Adapters
  UIPreferencesStoreAdapter,
  FilterStoreAdapter,
  UserSessionStoreAdapter,
} from "./stores/index.js";

// =============================================================================
// Data Layer (React Query Integration)
// =============================================================================

export {
  // Mock data generators
  generateMockDataSet,
  generateUser,
  generateUsers,
  generateTask,
  generateTasks,
  defaultMockData,
  type MockDataSet,
  // Ports
  TaskApiServicePort,
  type TaskApiService,
  type CreateTaskInput,
  type UpdateTaskInput,
  type PaginatedTaskResult,
  TaskCacheServicePort,
  type TaskCacheService,
  TaskFlowServicePort,
  type TaskFlowService,
  type TaskFlowState,
  type TaskFlowEvent,
  type TaskFlowContext,
  // Adapters
  TaskApiServiceAdapter,
  createTaskCacheServiceAdapter,
  TaskFlowServiceAdapter,
  // Machine
  taskFlowMachine,
  // Query hooks
  useTaskList,
  useTask,
  useTaskStats,
  useProjects,
  useUsers,
  type UseTaskListOptions,
  type UseTaskOptions,
  // Mutation hooks
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTaskComplete,
  // Flow-integrated hooks
  useCreateTaskWithFlow,
  useUpdateTaskWithFlow,
  useDeleteTaskWithFlow,
  useToggleTaskCompleteWithFlow,
  useTaskFlowState,
  type FlowAwareMutationResult,
} from "./data/index.js";

// =============================================================================
// Components
// =============================================================================

export {
  // Layout components
  AppLayout,
  type AppLayoutProps,
  Sidebar,
  type SidebarProps,
  NavigationItem,
  SubmenuItem,
  type NavigationItemProps,
  type SubmenuItemProps,
  type NavigationIconType,
  BottomNavigation,
  // Responsive utilities
  useResponsive,
  BREAKPOINTS,
  MOBILE_QUERY,
  TABLET_QUERY,
  DESKTOP_QUERY,
  type UseResponsiveResult,
  type ScreenSize,
  // Dashboard components
  StatsCards,
  FilterBar,
  type FilterBarProps,
  TaskCard,
  TaskCardSkeleton,
  type TaskCardProps,
  TaskList,
  type TaskListProps,
  TaskListWithModals,
  type TaskListWithModalsProps,
  Pagination,
  type PaginationProps,
  // Modal components
  Modal,
  type ModalProps,
  type ModalAnimationState,
  ConfirmationModal,
  type ConfirmationModalProps,
  type ConfirmationVariant,
  type ConfirmationItemPreview,
  QuickEditModal,
  type QuickEditModalProps,
  type QuickEditFormData,
  NotificationModal,
  NotificationIcon,
  type NotificationModalProps,
  ModalProvider,
  useModal,
  type OpenConfirmationOptions,
  type ShowNotificationOptions,
  type ModalStackEntry,
  type ModalContextValue,
  // Form components
  TaskFormProgress,
  type TaskFormProgressProps,
  FormFieldValidation,
  type FormFieldValidationProps,
  type FieldValidationState,
  type FieldValidationResult,
  type FieldValidationRules,
  Step1BasicInfo,
  type Step1BasicInfoProps,
  Step2Assignment,
  type Step2AssignmentProps,
  Step3DueDateLabels,
  type Step3DueDateLabelsProps,
  TaskCreationForm,
  type TaskCreationFormProps,
  type TaskCreationFormData,
  type FormFlowState,
} from "./components/index.js";

// =============================================================================
// Pages
// =============================================================================

export { DashboardPage } from "./pages/index.js";

// =============================================================================
// DevTools Components
// =============================================================================

export {
  // Flow state inspector
  FlowStateInspector,
  type FlowStateInspectorProps,
  type EventHistoryEntry,
  // Container hierarchy
  ContainerHierarchy,
  type ContainerHierarchyProps,
  type ContainerHierarchyEntry,
  type ContainerKind,
} from "./components/index.js";

// =============================================================================
// Complete Application with DevTools
// =============================================================================

export {
  TaskFlowWithDevTools,
  taskFlowWithDevToolsRoutes,
  useContainers,
} from "./TaskFlowWithDevTools.js";
