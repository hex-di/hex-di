/**
 * ModalProvider Component
 *
 * Provides modal context and manages modal stacking with:
 * - Integration with modal-flow state machine
 * - Modal stack management for nested confirmations
 * - Centralized modal rendering
 *
 * @packageDocumentation
 */

import * as React from "react";
import { ConfirmationModal } from "./ConfirmationModal.js";
import { QuickEditModal } from "./QuickEditModal.js";
import { NotificationModal } from "./NotificationModal.js";
import type {
  ModalContextValue,
  ModalStackEntry,
  OpenConfirmationOptions,
  ShowNotificationOptions,
  QuickEditFormData,
} from "./types.js";
import type { Task } from "../../types.js";

// =============================================================================
// Context
// =============================================================================

const ModalContext = React.createContext<ModalContextValue | null>(null);

// =============================================================================
// ID Generator
// =============================================================================

let modalIdCounter = 0;

function generateModalId(): string {
  modalIdCounter += 1;
  return `modal-${modalIdCounter}-${Date.now()}`;
}

// =============================================================================
// ModalProvider Component
// =============================================================================

/**
 * Provides modal context for the application.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <ModalProvider>
 *       <Dashboard />
 *     </ModalProvider>
 *   );
 * }
 * ```
 */
export function ModalProvider({ children }: { readonly children: React.ReactNode }) {
  const [modalStack, setModalStack] = React.useState<readonly ModalStackEntry[]>([]);

  // Quick edit task state (stored separately as it contains the full task)
  const [quickEditTask, setQuickEditTask] = React.useState<Task | null>(null);
  const [quickEditOnSave, setQuickEditOnSave] = React.useState<
    ((data: QuickEditFormData) => void) | null
  >(null);

  // Open confirmation modal
  const openConfirmation = React.useCallback((options: OpenConfirmationOptions) => {
    const entry: ModalStackEntry = {
      id: generateModalId(),
      type: "confirmation",
      props: options,
    };
    setModalStack(stack => [...stack, entry]);
  }, []);

  // Open quick edit modal
  const openQuickEdit = React.useCallback(
    (task: Task, onSave: (data: QuickEditFormData) => void) => {
      const entry: ModalStackEntry = {
        id: generateModalId(),
        type: "quickEdit",
        props: {
          isOpen: true,
          task,
          onSave,
          onCancel: () => {},
          onOpenFullView: () => {},
        },
      };
      setQuickEditTask(task);
      // Store callback in a ref-safe way
      setQuickEditOnSave(() => onSave);
      setModalStack(stack => [...stack, entry]);
    },
    []
  );

  // Show notification modal
  const showNotification = React.useCallback((options: ShowNotificationOptions) => {
    const entry: ModalStackEntry = {
      id: generateModalId(),
      type: "notification",
      props: options,
    };
    setModalStack(stack => [...stack, entry]);
  }, []);

  // Close the currently focused modal (top of stack)
  const closeModal = React.useCallback(() => {
    setModalStack(stack => {
      if (stack.length === 0) return stack;
      const closedEntry = stack[stack.length - 1];

      // Clear quick edit state if closing a quick edit modal
      if (closedEntry?.type === "quickEdit") {
        setQuickEditTask(null);
        setQuickEditOnSave(null);
      }

      return stack.slice(0, -1);
    });
  }, []);

  // Close a specific modal by ID
  const closeModalById = React.useCallback((id: string) => {
    setModalStack(stack => {
      const entry = stack.find(e => e.id === id);
      if (entry?.type === "quickEdit") {
        setQuickEditTask(null);
        setQuickEditOnSave(null);
      }
      return stack.filter(e => e.id !== id);
    });
  }, []);

  // Close all modals
  const closeAllModals = React.useCallback(() => {
    setModalStack([]);
    setQuickEditTask(null);
    setQuickEditOnSave(null);
  }, []);

  // Context value
  const contextValue = React.useMemo<ModalContextValue>(
    () => ({
      openConfirmation,
      openQuickEdit,
      showNotification,
      closeModal,
      closeAllModals,
      modalStack,
    }),
    [openConfirmation, openQuickEdit, showNotification, closeModal, closeAllModals, modalStack]
  );

  // Render modals from stack
  const renderModals = () => {
    return modalStack.map(entry => {
      switch (entry.type) {
        case "confirmation": {
          const props = entry.props as OpenConfirmationOptions;
          return (
            <ConfirmationModal
              key={entry.id}
              isOpen={true}
              title={props.title}
              message={props.message}
              confirmLabel={props.confirmLabel}
              cancelLabel={props.cancelLabel}
              variant={props.variant}
              itemPreview={props.itemPreview}
              onConfirm={() => {
                props.onConfirm();
                closeModalById(entry.id);
              }}
              onCancel={() => {
                props.onCancel();
                closeModalById(entry.id);
              }}
            />
          );
        }

        case "quickEdit": {
          if (!quickEditTask || !quickEditOnSave) return null;
          return (
            <QuickEditModal
              key={entry.id}
              isOpen={true}
              task={quickEditTask}
              onSave={data => {
                quickEditOnSave(data);
                closeModalById(entry.id);
              }}
              onCancel={() => closeModalById(entry.id)}
              onOpenFullView={() => {
                closeModalById(entry.id);
                // Navigation would be handled by the consumer
              }}
            />
          );
        }

        case "notification": {
          const props = entry.props as ShowNotificationOptions;
          return (
            <NotificationModal
              key={entry.id}
              isOpen={true}
              title={props.title}
              message={props.message}
              variant={props.variant}
              autoDismissMs={props.autoDismissMs}
              undoAction={props.undoAction}
              onDismiss={() => closeModalById(entry.id)}
            />
          );
        }

        default:
          return null;
      }
    });
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      {renderModals()}
    </ModalContext.Provider>
  );
}

// =============================================================================
// useModal Hook
// =============================================================================

/**
 * Hook to access modal context.
 *
 * @throws Error if used outside of ModalProvider
 *
 * @example
 * ```tsx
 * function TaskActions({ task }: { task: Task }) {
 *   const { openConfirmation, showNotification } = useModal();
 *   const { mutate: deleteTask } = useDeleteTask();
 *
 *   const handleDelete = () => {
 *     openConfirmation({
 *       title: "Delete Task",
 *       message: "Are you sure you want to delete this task?",
 *       confirmLabel: "Delete",
 *       cancelLabel: "Cancel",
 *       variant: "danger",
 *       itemPreview: { name: task.title },
 *       onConfirm: () => {
 *         deleteTask(task.id, {
 *           onSuccess: () => {
 *             showNotification({
 *               title: "Task Deleted",
 *               message: "The task has been deleted successfully",
 *               variant: "success",
 *               autoDismissMs: 3000,
 *             });
 *           },
 *         });
 *       },
 *       onCancel: () => {},
 *     });
 *   };
 *
 *   return <button onClick={handleDelete}>Delete</button>;
 * }
 * ```
 */
export function useModal(): ModalContextValue {
  const context = React.useContext(ModalContext);
  if (context === null) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}
