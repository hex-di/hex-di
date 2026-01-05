/**
 * ConfirmationModal Component
 *
 * A modal for confirming destructive or important actions with:
 * - Icon slot (warning, danger, info)
 * - Title and message
 * - Item preview (task name, project info)
 * - Cancel and Confirm buttons
 * - Danger variant styling
 *
 * Based on wireframe: component-wireframes.md Section 3
 *
 * @packageDocumentation
 */

import * as React from "react";
import { Modal } from "./Modal.js";
import type { ConfirmationModalProps, ConfirmationVariant } from "./types.js";

// =============================================================================
// Variant Styling
// =============================================================================

const variantConfig = {
  danger: {
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    buttonBg: "bg-red-600 hover:bg-red-700",
    buttonText: "text-white",
  },
  warning: {
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
    buttonBg: "bg-yellow-600 hover:bg-yellow-700",
    buttonText: "text-white",
  },
  info: {
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    buttonBg: "bg-blue-600 hover:bg-blue-700",
    buttonText: "text-white",
  },
} as const;

// =============================================================================
// Icons
// =============================================================================

function TrashIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
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

function SpinnerIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// =============================================================================
// Icon Selector
// =============================================================================

function getVariantIcon(variant: ConfirmationVariant) {
  switch (variant) {
    case "danger":
      return TrashIcon;
    case "warning":
      return WarningIcon;
    case "info":
      return InfoIcon;
  }
}

// =============================================================================
// ConfirmationModal Component
// =============================================================================

/**
 * Modal for confirming important actions.
 *
 * @example
 * ```tsx
 * <ConfirmationModal
 *   isOpen={showDeleteConfirm}
 *   title="Delete Task"
 *   message="Are you sure you want to delete this task?"
 *   confirmLabel="Delete"
 *   cancelLabel="Cancel"
 *   variant="danger"
 *   itemPreview={{ name: "Fix login timeout issue", description: "Due: Today" }}
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowDeleteConfirm(false)}
 * />
 * ```
 */
export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant,
  itemPreview,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationModalProps) {
  const config = variantConfig[variant];
  const IconComponent = getVariantIcon(variant);

  const handleConfirm = React.useCallback(() => {
    if (!isLoading) {
      onConfirm();
    }
  }, [isLoading, onConfirm]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
      testId="confirmation-modal"
    >
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto mb-4 flex items-center justify-center">
          <div className={`p-3 rounded-full ${config.iconBg}`}>
            <IconComponent className={`w-8 h-8 ${config.iconColor}`} />
          </div>
        </div>

        {/* Message */}
        <p className="text-gray-600 mb-4">{message}</p>

        {/* Item Preview */}
        {itemPreview && (
          <div
            data-testid="confirmation-item-preview"
            className="bg-gray-50 rounded-lg p-3 mb-4 text-left"
          >
            <p className="font-medium text-gray-900 truncate">{itemPreview.name}</p>
            {itemPreview.description && (
              <p className="text-sm text-gray-500 truncate">{itemPreview.description}</p>
            )}
          </div>
        )}

        {/* Warning Text for Danger */}
        {variant === "danger" && (
          <p className="text-sm text-red-600 mb-4 flex items-center justify-center gap-1">
            <WarningIcon className="w-4 h-4" />
            This action cannot be undone.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            data-testid="confirmation-cancel-btn"
            onClick={onCancel}
            disabled={isLoading}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium
              border border-gray-300 bg-white text-gray-700
              hover:bg-gray-50 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            data-testid="confirmation-confirm-btn"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium
              ${config.buttonBg} ${config.buttonText}
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2
            `}
          >
            {isLoading && <SpinnerIcon className="w-4 h-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
