/**
 * React Hooks for @hex-di/flow-react
 *
 * This module exports all React hooks for consuming FlowService state machines:
 * - useMachine: Full state machine access with state, context, send, activities
 * - useFlow: Primary hook with snapshot, send, matches, can, status
 * - useSelector: Derive values from state/context with memoization
 * - useMachineSelector: Derive values from full MachineSnapshot
 * - useSend: Stable send function reference for passing to children
 * - useFlowEvent: Subscribe to specific event types without re-renders
 * - useActivity: Track activity status and instances
 * - useFlowPort: Internal helper for resolving FlowService from container
 *
 * @packageDocumentation
 */

// =============================================================================
// Hook Exports
// =============================================================================

export { useMachine, type UseMachineResult } from "./use-machine.js";
export { useFlow, type UseFlowResult, type FlowStatus } from "./use-flow.js";
export { useSelector, type EqualityFn } from "./use-selector.js";
export { useMachineSelector } from "./use-machine-selector.js";
export { useSend } from "./use-send.js";
export { useFlowEvent } from "./use-flow-event.js";
export { useActivity, type UseActivityResult } from "./use-activity.js";
export { useFlowPort } from "./use-flow-port.js";
export { useFlowState } from "./use-flow-state.js";
export { useFlowHealth, type UseFlowHealthOptions } from "./use-flow-health.js";
export { useFlowTimeline, type UseFlowTimelineOptions } from "./use-flow-timeline.js";

// =============================================================================
// Utility Exports
// =============================================================================

export { shallowEqual } from "./shallow-equal.js";
