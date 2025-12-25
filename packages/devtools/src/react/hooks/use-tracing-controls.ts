/**
 * Hook for tracing control functions (pause, resume, clear, etc.).
 *
 * @packageDocumentation
 */

import { useCallback } from "react";
import { useTracingAPI } from "./use-devtools.js";

/**
 * Result returned by useTracingControls hook.
 */
export interface UseTracingControlsResult {
  /** Pause trace collection */
  readonly pause: () => void;

  /** Resume trace collection */
  readonly resume: () => void;

  /** Clear all collected traces */
  readonly clear: () => void;

  /** Pin a trace (prevent eviction) */
  readonly pin: (id: string) => void;

  /** Unpin a trace */
  readonly unpin: (id: string) => void;

  /** Check if tracing is paused */
  readonly isPaused: () => boolean;

  /** Whether tracing controls are available */
  readonly isAvailable: boolean;
}

/**
 * Get tracing control functions.
 *
 * All functions are safe to call even when tracing is not available -
 * they become no-ops in that case.
 *
 * @returns UseTracingControlsResult with control functions
 *
 * @example
 * ```typescript
 * function TracingToolbar() {
 *   const { pause, resume, clear, isPaused, isAvailable } = useTracingControls();
 *
 *   if (!isAvailable) return null;
 *
 *   return (
 *     <div>
 *       <button onClick={isPaused() ? resume : pause}>
 *         {isPaused() ? "Resume" : "Pause"}
 *       </button>
 *       <button onClick={clear}>Clear</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTracingControls(): UseTracingControlsResult {
  const tracingAPI = useTracingAPI();

  const pause = useCallback((): void => {
    tracingAPI?.pause();
  }, [tracingAPI]);

  const resume = useCallback((): void => {
    tracingAPI?.resume();
  }, [tracingAPI]);

  const clear = useCallback((): void => {
    tracingAPI?.clear();
  }, [tracingAPI]);

  const pin = useCallback(
    (id: string): void => {
      tracingAPI?.pin(id);
    },
    [tracingAPI]
  );

  const unpin = useCallback(
    (id: string): void => {
      tracingAPI?.unpin(id);
    },
    [tracingAPI]
  );

  const isPaused = useCallback((): boolean => {
    return tracingAPI?.isPaused() ?? false;
  }, [tracingAPI]);

  return {
    pause,
    resume,
    clear,
    pin,
    unpin,
    isPaused,
    isAvailable: tracingAPI !== null,
  };
}
