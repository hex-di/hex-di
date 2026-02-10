/**
 * useFlowEvent Hook
 *
 * React hook for subscribing to specific machine event types via FlowCollector.
 * Does not cause re-renders - uses useRef for callback stability.
 *
 * @packageDocumentation
 */

import { useEffect, useRef } from "react";
import { useFlowCollector } from "../context/flow-provider.js";
import type { FlowTransitionEventAny } from "@hex-di/flow";

// =============================================================================
// useFlowEvent Hook
// =============================================================================

/**
 * React hook for subscribing to specific machine event types.
 *
 * Subscribes to the FlowCollector (from FlowProvider context) and filters
 * transition events by the specified event type. The callback fires only
 * when a matching event type is processed by the machine.
 *
 * This hook does NOT cause re-renders. The callback is stored in a ref
 * to avoid re-subscribing when the callback changes.
 *
 * @param eventType - The event type string to listen for
 * @param callback - Function called with the FlowTransitionEvent when a match occurs
 *
 * @remarks
 * - Requires a FlowProvider ancestor with a collector
 * - Does nothing if no FlowProvider is present
 * - Unsubscribes automatically on unmount
 * - Stable callback stored in ref prevents re-subscription
 *
 * @example
 * ```tsx
 * function OrderNotifications() {
 *   useFlowEvent('ORDER_COMPLETED', (transition) => {
 *     showToast(`Order completed! ${transition.nextState}`);
 *   });
 *
 *   useFlowEvent('ORDER_FAILED', (transition) => {
 *     showError(`Order failed: ${transition.prevState} -> ${transition.nextState}`);
 *   });
 *
 *   return null; // This component doesn't render anything
 * }
 * ```
 */
export function useFlowEvent(
  eventType: string,
  callback: (event: FlowTransitionEventAny) => void
): void {
  // Store callback in ref to avoid re-subscribing on callback changes
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // Get the collector from FlowProvider context
  const collector = useFlowCollector();

  useEffect(() => {
    if (!collector) return;

    const unsubscribe = collector.subscribe((transitionEvent: FlowTransitionEventAny) => {
      if (transitionEvent.event.type === eventType) {
        callbackRef.current(transitionEvent);
      }
    });

    return unsubscribe;
  }, [collector, eventType]);
}
