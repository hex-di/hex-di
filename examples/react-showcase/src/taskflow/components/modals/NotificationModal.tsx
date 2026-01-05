/**
 * NotificationModal Component
 *
 * A modal for displaying notifications with:
 * - Success, Warning, Error variants
 * - Auto-dismiss timer (configurable)
 * - Undo action support
 *
 * Based on wireframe: component-wireframes.md Section 3
 *
 * @packageDocumentation
 */

import * as React from "react";
import { Modal } from "./Modal.js";
import type { NotificationModalProps } from "./types.js";
import type { NotificationVariant } from "../../types.js";

// =============================================================================
// Variant Styling
// =============================================================================

const variantConfig = {
  success: {
    iconBg: "bg-green-100",
    iconColor: "text-green-500",
    borderColor: "border-green-200",
  },
  warning: {
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-500",
    borderColor: "border-yellow-200",
  },
  error: {
    iconBg: "bg-red-100",
    iconColor: "text-red-500",
    borderColor: "border-red-200",
  },
  info: {
    iconBg: "bg-blue-100",
    iconColor: "text-blue-500",
    borderColor: "border-blue-200",
  },
} as const;

// =============================================================================
// Icons
// =============================================================================

function SuccessIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function WarningIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function ErrorIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function InfoIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function UndoIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
      />
    </svg>
  );
}

// =============================================================================
// Icon Selector
// =============================================================================

function getVariantIcon(variant: NotificationVariant) {
  switch (variant) {
    case "success":
      return SuccessIcon;
    case "warning":
      return WarningIcon;
    case "error":
      return ErrorIcon;
    case "info":
      return InfoIcon;
  }
}

// =============================================================================
// NotificationModal Component
// =============================================================================

/**
 * Modal for displaying notifications with auto-dismiss support.
 *
 * @example
 * ```tsx
 * <NotificationModal
 *   isOpen={showNotification}
 *   title="Task Completed"
 *   message="Your task has been marked as complete"
 *   variant="success"
 *   autoDismissMs={5000}
 *   onDismiss={() => setShowNotification(false)}
 *   undoAction={handleUndo}
 * />
 * ```
 */
export function NotificationModal({
  isOpen,
  title,
  message,
  variant,
  onDismiss,
  autoDismissMs,
  undoAction,
}: NotificationModalProps) {
  const config = variantConfig[variant];
  const IconComponent = getVariantIcon(variant);

  // Auto-dismiss timer
  React.useEffect(() => {
    if (!isOpen || !autoDismissMs || autoDismissMs <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [isOpen, autoDismissMs, onDismiss]);

  // Handle undo action
  const handleUndo = React.useCallback(() => {
    if (undoAction) {
      undoAction();
      onDismiss();
    }
  }, [undoAction, onDismiss]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onDismiss}
      title=""
      size="sm"
      closeOnBackdropClick={true}
      closeOnEscape={true}
      showCloseButton={true}
      testId="notification-modal"
    >
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto mb-4 flex items-center justify-center">
          <div
            data-testid="notification-icon"
            className={`p-3 rounded-full ${config.iconBg} ${config.iconColor}`}
          >
            <IconComponent className="w-8 h-8" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

        {/* Message */}
        <p className="text-gray-600 mb-4">{message}</p>

        {/* Undo Action */}
        {undoAction && (
          <div className={`bg-gray-50 rounded-lg p-3 mb-4 border ${config.borderColor}`}>
            <button
              type="button"
              data-testid="notification-undo-btn"
              onClick={handleUndo}
              className="flex items-center justify-center gap-2 w-full text-sm text-gray-700 hover:text-gray-900"
            >
              <UndoIcon className="w-4 h-4" />
              Undo this action
            </button>
          </div>
        )}

        {/* Dismiss Button */}
        <button
          type="button"
          data-testid="notification-dismiss-btn"
          onClick={onDismiss}
          className={`
            px-4 py-2 rounded-lg font-medium
            border border-gray-300 bg-white text-gray-700
            hover:bg-gray-50 transition-colors
          `}
        >
          Dismiss
        </button>

        {/* Auto-dismiss indicator */}
        {autoDismissMs && autoDismissMs > 0 && (
          <p className="text-xs text-gray-400 mt-3">
            Auto-dismissing in {Math.round(autoDismissMs / 1000)} seconds
          </p>
        )}
      </div>
    </Modal>
  );
}

// =============================================================================
// Re-export icon for use in tests
// =============================================================================

/**
 * Notification icon component wrapped to add testId.
 */
export function NotificationIcon({
  variant,
  className = "w-8 h-8",
}: {
  readonly variant: NotificationVariant;
  readonly className?: string;
}) {
  const config = variantConfig[variant];
  const IconComponent = getVariantIcon(variant);

  return (
    <div data-testid="notification-icon" className={config.iconColor}>
      <IconComponent className={className} />
    </div>
  );
}
