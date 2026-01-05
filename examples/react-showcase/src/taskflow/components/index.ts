/**
 * TaskFlow Components Module
 *
 * Exports all UI components for the TaskFlow application.
 *
 * @packageDocumentation
 */

// =============================================================================
// Layout Components
// =============================================================================

export {
  // Main layout
  AppLayout,
  type AppLayoutProps,
  // Sidebar
  Sidebar,
  type SidebarProps,
  // Navigation items
  NavigationItem,
  SubmenuItem,
  type NavigationItemProps,
  type SubmenuItemProps,
  type NavigationIconType,
  // Mobile navigation
  BottomNavigation,
  // Responsive utilities
  useResponsive,
  BREAKPOINTS,
  MOBILE_QUERY,
  TABLET_QUERY,
  DESKTOP_QUERY,
  type UseResponsiveResult,
  type ScreenSize,
} from "./layout/index.js";

// =============================================================================
// Dashboard Components
// =============================================================================

export {
  // Stats display
  StatsCards,
  // Filter controls
  FilterBar,
  type FilterBarProps,
  // Task cards
  TaskCard,
  TaskCardSkeleton,
  type TaskCardProps,
  // Task list with pagination
  TaskList,
  type TaskListProps,
  // Task list with integrated modals
  TaskListWithModals,
  type TaskListWithModalsProps,
  // Pagination
  Pagination,
  type PaginationProps,
} from "./dashboard/index.js";

// =============================================================================
// Modal Components
// =============================================================================

export {
  // Base modal
  Modal,
  type ModalProps,
  type ModalAnimationState,
  // Confirmation modal
  ConfirmationModal,
  type ConfirmationModalProps,
  type ConfirmationVariant,
  type ConfirmationItemPreview,
  // Quick edit modal
  QuickEditModal,
  type QuickEditModalProps,
  type QuickEditFormData,
  // Notification modal
  NotificationModal,
  NotificationIcon,
  type NotificationModalProps,
  // Provider and hook
  ModalProvider,
  useModal,
  type OpenConfirmationOptions,
  type ShowNotificationOptions,
  type ModalStackEntry,
  type ModalContextValue,
} from "./modals/index.js";

// =============================================================================
// Form Components
// =============================================================================

export {
  // Progress indicator
  TaskFormProgress,
  type TaskFormProgressProps,
  // Field validation wrapper
  FormFieldValidation,
  type FormFieldValidationProps,
  type FieldValidationState,
  type FieldValidationResult,
  type FieldValidationRules,
  // Step components
  Step1BasicInfo,
  type Step1BasicInfoProps,
  Step2Assignment,
  type Step2AssignmentProps,
  Step3DueDateLabels,
  type Step3DueDateLabelsProps,
  // Main form
  TaskCreationForm,
  type TaskCreationFormProps,
  type TaskCreationFormData,
  type FormFlowState,
} from "./forms/index.js";

// =============================================================================
// Onboarding Components
// =============================================================================

export {
  // Wizard progress
  WizardProgress,
  ONBOARDING_STEPS,
  type WizardProgressProps,
  type WizardStepConfig,
  // Step components
  Step1Profile,
  type Step1ProfileProps,
  Step2Team,
  type Step2TeamProps,
  Step3Preferences,
  type Step3PreferencesProps,
  // Completion
  WizardComplete,
  type WizardCompleteProps,
  type QuickStartAction,
  // Main wizard
  OnboardingWizard,
  type OnboardingWizardProps,
  type WizardStep,
  // Hooks
  useOnboardingFormData,
  DEFAULT_PROFILE,
  DEFAULT_TEAM,
  DEFAULT_PREFERENCES,
  type OnboardingFormDataHook,
  useOnboardingGuard,
  useNewUserGuard,
  type OnboardingGuardResult,
} from "./onboarding/index.js";

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
} from "./devtools/index.js";
