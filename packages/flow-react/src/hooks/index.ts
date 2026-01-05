/**
 * React Hooks for @hex-di/flow-react
 *
 * This module exports all React hooks for consuming FlowService state machines:
 * - useMachine: Full state machine access with state, context, send, activities
 * - useSelector: Derive values from state/context with memoization
 * - useSend: Stable send function reference for passing to children
 *
 * @packageDocumentation
 */

// =============================================================================
// Hook Exports
// =============================================================================

export { useMachine, type UseMachineResult } from "./use-machine.js";
export { useSelector, type EqualityFn } from "./use-selector.js";
export { useSend } from "./use-send.js";

// =============================================================================
// Utility Exports
// =============================================================================

export { shallowEqual } from "./shallow-equal.js";
