/**
 * @hex-di/flow-react - React Integration for @hex-di/flow
 *
 * Provides type-safe React hooks for @hex-di/flow state machines with
 * useSyncExternalStore for concurrent mode compatibility, automatic
 * subscription management, and seamless HexDI container integration.
 *
 * ## Key Features
 *
 * - **useMachine Hook**: Resolve FlowService from container, subscribe to state
 *   changes, and get typed send function with automatic cleanup.
 *
 * - **useSelector Hook**: Derive values from state/context with memoization
 *   and configurable equality checking.
 *
 * - **useSend Hook**: Get a stable send function reference for passing to
 *   child components without causing re-renders.
 *
 * - **Concurrent Mode Safe**: Uses React 18's useSyncExternalStore for proper
 *   tearing prevention in concurrent rendering.
 *
 * - **Scope Lifecycle**: React doesn't own machine lifecycle - scopes do.
 *   Unmounting only unsubscribes from the runner.
 *
 * ## Quick Start
 *
 * @example Using useMachine hook
 * ```typescript
 * import { useMachine } from '@hex-di/flow-react';
 * import { ModalFlowPort } from './ports';
 *
 * function Modal() {
 *   const { state, context, send, activities } = useMachine(ModalFlowPort);
 *
 *   if (state === 'closed') {
 *     return <button onClick={() => send({ type: 'OPEN' })}>Open Modal</button>;
 *   }
 *
 *   return (
 *     <div className="modal">
 *       <button onClick={() => send({ type: 'CLOSE' })}>Close</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Using useSelector hook
 * ```typescript
 * import { useSelector } from '@hex-di/flow-react';
 * import { FormFlowPort } from './ports';
 *
 * function FormStatus() {
 *   const isSubmitting = useSelector(
 *     FormFlowPort,
 *     (state) => state === 'submitting'
 *   );
 *
 *   return <div>{isSubmitting ? 'Submitting...' : 'Ready'}</div>;
 * }
 * ```
 *
 * @example Using useSend hook
 * ```typescript
 * import { useSend } from '@hex-di/flow-react';
 * import { ModalFlowPort } from './ports';
 *
 * // This component won't re-render on state changes
 * function CloseButton() {
 *   const send = useSend(ModalFlowPort);
 *   return <button onClick={() => send({ type: 'CLOSE' })}>Close</button>;
 * }
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Package Version
// =============================================================================

/**
 * Package version string.
 */
export const VERSION = "0.1.0";

// =============================================================================
// Hooks Module
// =============================================================================

export {
  // Main hooks
  useMachine,
  useSelector,
  useSend,

  // Utility exports
  shallowEqual,

  // Type exports
  type UseMachineResult,
  type EqualityFn,
} from "./hooks/index.js";

// =============================================================================
// Context Module
// =============================================================================

export {
  // Provider component
  FlowProvider,

  // Hook for accessing collector
  useFlowCollector,

  // Type exports
  type FlowProviderProps,
} from "./context/index.js";

// =============================================================================
// Re-exports from @hex-di/flow
// =============================================================================

/**
 * Re-export types from @hex-di/flow for consumer convenience.
 *
 * These types are commonly used alongside React hook types.
 */
export type {
  FlowService,
  FlowServiceAny,
  MachineSnapshot,
  ActivityInstance,
  ActivityStatus,
  FlowCollector,
  FlowTransitionEventAny,
} from "@hex-di/flow";

// =============================================================================
// Re-exports from @hex-di/react
// =============================================================================

/**
 * Re-export the Port type and InferService utility for consumer convenience.
 *
 * These are needed to define ports that work with the hooks.
 */
export type { Port, InferService } from "@hex-di/react";
