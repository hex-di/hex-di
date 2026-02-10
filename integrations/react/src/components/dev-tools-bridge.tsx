/**
 * DevToolsBridge component for @hex-di/react.
 *
 * Subscribes to inspector events and forwards them via `postMessage`
 * for consumption by browser DevTools extensions.
 *
 * @packageDocumentation
 */

import { useEffect } from "react";
import type { InspectorAPI } from "@hex-di/core";

// =============================================================================
// DevToolsBridge Component
// =============================================================================

/**
 * Props for the DevToolsBridge component.
 */
export interface DevToolsBridgeProps {
  /**
   * The InspectorAPI instance to subscribe to.
   */
  readonly inspector: InspectorAPI;

  /**
   * Whether the bridge is enabled. When false, no events are forwarded.
   *
   * @default true
   */
  readonly enabled?: boolean;
}

/**
 * Invisible component that bridges inspector events to window.postMessage.
 *
 * This component subscribes to the inspector's event stream and forwards
 * each event to `window.postMessage` with `type: "hex-di:inspector-event"`,
 * enabling browser DevTools extensions to observe container state changes.
 *
 * Renders no visual output (returns null).
 *
 * @param props - The bridge props
 *
 * @remarks
 * - SSR safe: guards with `typeof window !== "undefined"`
 * - Cleans up subscription on unmount
 * - Does nothing when `enabled` is false
 *
 * @example Basic usage
 * ```tsx
 * import { DevToolsBridge } from '@hex-di/react';
 *
 * function App() {
 *   return (
 *     <>
 *       <DevToolsBridge inspector={container.inspector} />
 *       <MainApp />
 *     </>
 *   );
 * }
 * ```
 *
 * @example Conditional in development
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <DevToolsBridge
 *         inspector={container.inspector}
 *         enabled={process.env.NODE_ENV === 'development'}
 *       />
 *       <MainApp />
 *     </>
 *   );
 * }
 * ```
 */
export function DevToolsBridge({ inspector, enabled = true }: DevToolsBridgeProps): null {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const unsubscribe = inspector.subscribe(event => {
      window.postMessage({ type: "hex-di:inspector-event", event }, "*");
    });

    return unsubscribe;
  }, [inspector, enabled]);

  return null;
}
