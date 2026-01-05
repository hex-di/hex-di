/**
 * Modal Components Module
 *
 * Exports all modal-related components and hooks.
 *
 * @packageDocumentation
 */

// =============================================================================
// Base Modal
// =============================================================================

export { Modal } from "./Modal.js";

// =============================================================================
// Specialized Modals
// =============================================================================

export { ConfirmationModal } from "./ConfirmationModal.js";
export { QuickEditModal } from "./QuickEditModal.js";
export { NotificationModal, NotificationIcon } from "./NotificationModal.js";

// =============================================================================
// Provider and Hook
// =============================================================================

export { ModalProvider, useModal } from "./ModalProvider.js";

// =============================================================================
// Types
// =============================================================================

export type {
  // Base types
  ModalAnimationState,
  ModalProps,
  // Confirmation modal types
  ConfirmationVariant,
  ConfirmationItemPreview,
  ConfirmationModalProps,
  // Quick edit modal types
  QuickEditFormData,
  QuickEditModalProps,
  // Notification modal types
  NotificationModalProps,
  // Hook types
  OpenConfirmationOptions,
  ShowNotificationOptions,
  ModalStackEntry,
  ModalContextValue,
} from "./types.js";
