/**
 * Modal Component Types
 *
 * Type definitions for the modal system including:
 * - Base modal props
 * - Confirmation modal options
 * - Quick edit modal options
 * - Notification modal options
 * - Modal state machine types
 *
 * @packageDocumentation
 */

import type { Task, TaskStatus, TaskPriority, NotificationVariant } from "../../types.js";

// =============================================================================
// Animation State Types
// =============================================================================

/**
 * Modal animation states matching the modal-flow state machine.
 */
export type ModalAnimationState = "closed" | "opening" | "open" | "closing";

// =============================================================================
// Base Modal Types
// =============================================================================

/**
 * Base props for the Modal component.
 */
export interface ModalProps {
  /** Whether the modal is open */
  readonly isOpen: boolean;
  /** Callback when modal requests to close */
  readonly onClose: () => void;
  /** Modal title */
  readonly title: string;
  /** Modal content */
  readonly children: React.ReactNode;
  /** Whether to close on backdrop click (default: true) */
  readonly closeOnBackdropClick?: boolean;
  /** Whether to close on escape key (default: true) */
  readonly closeOnEscape?: boolean;
  /** Whether to show close button in header (default: true) */
  readonly showCloseButton?: boolean;
  /** Optional size variant */
  readonly size?: "sm" | "md" | "lg" | "xl" | "full";
  /** Optional custom class name for the modal content */
  readonly className?: string;
  /** Test ID for the modal */
  readonly testId?: string;
}

// =============================================================================
// Confirmation Modal Types
// =============================================================================

/**
 * Variant types for confirmation modal styling.
 */
export type ConfirmationVariant = "danger" | "warning" | "info";

/**
 * Item preview displayed in confirmation modal.
 */
export interface ConfirmationItemPreview {
  /** Name/title of the item */
  readonly name: string;
  /** Optional description */
  readonly description?: string;
}

/**
 * Props for the ConfirmationModal component.
 */
export interface ConfirmationModalProps {
  /** Whether the modal is open */
  readonly isOpen: boolean;
  /** Modal title */
  readonly title: string;
  /** Confirmation message */
  readonly message: string;
  /** Label for confirm button */
  readonly confirmLabel: string;
  /** Label for cancel button */
  readonly cancelLabel: string;
  /** Visual variant (affects button and icon styling) */
  readonly variant: ConfirmationVariant;
  /** Optional item preview to show */
  readonly itemPreview?: ConfirmationItemPreview;
  /** Callback when user confirms */
  readonly onConfirm: () => void;
  /** Callback when user cancels */
  readonly onCancel: () => void;
  /** Whether confirm action is loading */
  readonly isLoading?: boolean;
}

// =============================================================================
// Quick Edit Modal Types
// =============================================================================

/**
 * Data for quick edit form updates.
 */
export interface QuickEditFormData {
  readonly id: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly assigneeId: string | null;
}

/**
 * Props for the QuickEditModal component.
 */
export interface QuickEditModalProps {
  /** Whether the modal is open */
  readonly isOpen: boolean;
  /** Task being edited */
  readonly task: Task;
  /** Callback when form is saved */
  readonly onSave: (data: QuickEditFormData) => void;
  /** Callback when modal is cancelled */
  readonly onCancel: () => void;
  /** Callback when "Open Full View" is clicked */
  readonly onOpenFullView: () => void;
  /** Whether save action is loading */
  readonly isLoading?: boolean;
}

// =============================================================================
// Notification Modal Types
// =============================================================================

/**
 * Props for the NotificationModal component.
 */
export interface NotificationModalProps {
  /** Whether the modal is open */
  readonly isOpen: boolean;
  /** Notification title */
  readonly title: string;
  /** Notification message */
  readonly message: string;
  /** Visual variant */
  readonly variant: NotificationVariant;
  /** Callback when notification is dismissed */
  readonly onDismiss: () => void;
  /** Auto-dismiss duration in milliseconds (0 or undefined for no auto-dismiss) */
  readonly autoDismissMs?: number;
  /** Optional undo action callback */
  readonly undoAction?: () => void;
}

// =============================================================================
// Modal Hook Types
// =============================================================================

/**
 * Options for opening a confirmation modal.
 */
export interface OpenConfirmationOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly variant: ConfirmationVariant;
  readonly itemPreview?: ConfirmationItemPreview;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * Options for showing a notification modal.
 */
export interface ShowNotificationOptions {
  readonly title: string;
  readonly message: string;
  readonly variant: NotificationVariant;
  readonly autoDismissMs?: number;
  readonly undoAction?: () => void;
}

/**
 * Modal stack entry for tracking open modals.
 */
export interface ModalStackEntry {
  readonly id: string;
  readonly type: "confirmation" | "quickEdit" | "notification";
  readonly props: OpenConfirmationOptions | ShowNotificationOptions | QuickEditModalProps;
}

/**
 * Modal context value provided by ModalProvider.
 */
export interface ModalContextValue {
  /** Open a confirmation modal */
  readonly openConfirmation: (options: OpenConfirmationOptions) => void;
  /** Open a quick edit modal for a task */
  readonly openQuickEdit: (task: Task, onSave: (data: QuickEditFormData) => void) => void;
  /** Show a notification modal */
  readonly showNotification: (options: ShowNotificationOptions) => void;
  /** Close the currently focused modal */
  readonly closeModal: () => void;
  /** Close all modals */
  readonly closeAllModals: () => void;
  /** Current modal stack */
  readonly modalStack: readonly ModalStackEntry[];
}
