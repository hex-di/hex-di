/**
 * Modal Base Component
 *
 * A foundational modal component with:
 * - Overlay with backdrop blur/dim
 * - Animation states: opening, open, closing, closed
 * - Close on escape key
 * - Close on backdrop click (configurable)
 * - Full-screen sheet variant for mobile
 * - Accessible dialog role
 *
 * @packageDocumentation
 */

import * as React from "react";
import { createPortal } from "react-dom";
import type { ModalProps, ModalAnimationState } from "./types.js";
import { useResponsive } from "../layout/use-responsive.js";

// =============================================================================
// Animation Timing Constants
// =============================================================================

const ANIMATION_DURATION_OPEN = 300;
const ANIMATION_DURATION_CLOSE = 200;

// =============================================================================
// Size Variants
// =============================================================================

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full h-full",
} as const;

// =============================================================================
// Icons
// =============================================================================

function CloseIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// =============================================================================
// Modal Component
// =============================================================================

/**
 * Base modal component with animations and keyboard handling.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [isOpen, setIsOpen] = useState(false);
 *
 *   return (
 *     <>
 *       <button onClick={() => setIsOpen(true)}>Open</button>
 *       <Modal
 *         isOpen={isOpen}
 *         onClose={() => setIsOpen(false)}
 *         title="My Modal"
 *       >
 *         <p>Modal content here</p>
 *       </Modal>
 *     </>
 *   );
 * }
 * ```
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  size = "md",
  className = "",
  testId = "modal",
}: ModalProps) {
  const { isMobile } = useResponsive();
  const [animationState, setAnimationState] = React.useState<ModalAnimationState>("closed");
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<Element | null>(null);

  // Track animation state based on isOpen prop
  React.useEffect(() => {
    if (isOpen && animationState === "closed") {
      // Store currently focused element
      previousActiveElement.current = document.activeElement;
      setAnimationState("opening");

      const timer = setTimeout(() => {
        setAnimationState("open");
      }, ANIMATION_DURATION_OPEN);

      return () => clearTimeout(timer);
    } else if (!isOpen && (animationState === "open" || animationState === "opening")) {
      setAnimationState("closing");

      const timer = setTimeout(() => {
        setAnimationState("closed");
        // Restore focus to previously focused element
        if (previousActiveElement.current instanceof HTMLElement) {
          previousActiveElement.current.focus();
        }
      }, ANIMATION_DURATION_CLOSE);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, animationState]);

  // Focus trap and escape key handling
  React.useEffect(() => {
    if (animationState !== "open") return undefined;

    // Focus the modal
    if (modalRef.current) {
      modalRef.current.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        e.preventDefault();
        onClose();
      }

      // Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [animationState, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (animationState !== "closed") {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return undefined;
  }, [animationState]);

  // Handle backdrop click
  const handleBackdropClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose]
  );

  // Don't render if fully closed
  if (animationState === "closed") {
    return null;
  }

  // Calculate animation classes
  const backdropClasses = {
    opening: "opacity-0 animate-fadeIn",
    open: "opacity-100",
    closing: "opacity-100 animate-fadeOut",
    closed: "opacity-0",
  }[animationState];

  const modalClasses = isMobile
    ? {
        opening: "translate-y-full animate-slideUp",
        open: "translate-y-0",
        closing: "translate-y-0 animate-slideDown",
        closed: "translate-y-full",
      }[animationState]
    : {
        opening: "scale-95 opacity-0 animate-scaleIn",
        open: "scale-100 opacity-100",
        closing: "scale-100 opacity-100 animate-scaleOut",
        closed: "scale-95 opacity-0",
      }[animationState];

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        data-testid="modal-backdrop"
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-50
          transition-opacity duration-300
          ${backdropClasses}
        `}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`
          fixed inset-0 z-50 flex items-center justify-center p-4
          ${isMobile ? "items-end p-0" : ""}
        `}
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${testId}-title`}
          tabIndex={-1}
          data-testid={testId}
          className={`
            relative bg-white shadow-xl
            transition-all duration-300
            focus:outline-none
            ${
              isMobile
                ? `w-full rounded-t-2xl ${animationState === "open" ? "" : "transform"}`
                : `rounded-lg w-full ${sizeClasses[size]}`
            }
            ${modalClasses}
            ${className}
          `}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 id={`${testId}-title`} className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
                disabled={animationState === "closing"}
              >
                <CloseIcon />
              </button>
            )}
          </div>

          {/* Content */}
          <div className={`p-4 ${isMobile ? "max-h-[70vh] overflow-y-auto" : ""}`}>{children}</div>
        </div>
      </div>
    </>
  );

  // Render in portal to ensure proper stacking
  return createPortal(modalContent, document.body);
}

// =============================================================================
// CSS Animations (add to your global styles or use Tailwind animation config)
// =============================================================================

/**
 * Add these to your Tailwind config or global CSS:
 *
 * @keyframes fadeIn {
 *   from { opacity: 0; }
 *   to { opacity: 1; }
 * }
 *
 * @keyframes fadeOut {
 *   from { opacity: 1; }
 *   to { opacity: 0; }
 * }
 *
 * @keyframes scaleIn {
 *   from { transform: scale(0.95); opacity: 0; }
 *   to { transform: scale(1); opacity: 1; }
 * }
 *
 * @keyframes scaleOut {
 *   from { transform: scale(1); opacity: 1; }
 *   to { transform: scale(0.95); opacity: 0; }
 * }
 *
 * @keyframes slideUp {
 *   from { transform: translateY(100%); }
 *   to { transform: translateY(0); }
 * }
 *
 * @keyframes slideDown {
 *   from { transform: translateY(0); }
 *   to { transform: translateY(100%); }
 * }
 *
 * .animate-fadeIn { animation: fadeIn 300ms ease-out; }
 * .animate-fadeOut { animation: fadeOut 200ms ease-in; }
 * .animate-scaleIn { animation: scaleIn 300ms ease-out; }
 * .animate-scaleOut { animation: scaleOut 200ms ease-in; }
 * .animate-slideUp { animation: slideUp 300ms ease-out; }
 * .animate-slideDown { animation: slideDown 200ms ease-in; }
 */
