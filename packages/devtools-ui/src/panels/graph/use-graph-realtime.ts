/**
 * Hook for live update animations.
 *
 * @packageDocumentation
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { ENTER_EXIT_DURATION_MS, TRANSITION_DURATION_MS } from "./constants.js";

interface RealtimeUpdate {
  readonly type: "enter" | "exit" | "update";
  readonly portName: string;
  readonly timestamp: number;
}

interface UseGraphRealtimeResult {
  readonly pendingUpdates: readonly RealtimeUpdate[];
  readonly prefersReducedMotion: boolean;
  recordEnter(portName: string): void;
  recordExit(portName: string): void;
  recordUpdate(portName: string): void;
}

/**
 * Detect prefers-reduced-motion preference.
 */
function checkReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Hook managing live update animations.
 */
function useGraphRealtime(): UseGraphRealtimeResult {
  const [updates, setUpdates] = useState<readonly RealtimeUpdate[]>([]);
  const cleanupRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prefersReducedMotion = checkReducedMotion();

  const addUpdate = useCallback(
    (type: RealtimeUpdate["type"], portName: string) => {
      if (prefersReducedMotion) return;

      const update: RealtimeUpdate = {
        type,
        portName,
        timestamp: Date.now(),
      };
      setUpdates(prev => [...prev, update]);

      // Schedule cleanup
      const duration = type === "update" ? TRANSITION_DURATION_MS : ENTER_EXIT_DURATION_MS;
      cleanupRef.current = setTimeout(() => {
        setUpdates(prev => prev.filter(u => Date.now() - u.timestamp < duration));
      }, duration);
    },
    [prefersReducedMotion]
  );

  useEffect(() => {
    return () => {
      if (cleanupRef.current !== undefined) {
        clearTimeout(cleanupRef.current);
      }
    };
  }, []);

  const recordEnter = useCallback((portName: string) => addUpdate("enter", portName), [addUpdate]);

  const recordExit = useCallback((portName: string) => addUpdate("exit", portName), [addUpdate]);

  const recordUpdate = useCallback(
    (portName: string) => addUpdate("update", portName),
    [addUpdate]
  );

  return {
    pendingUpdates: updates,
    prefersReducedMotion,
    recordEnter,
    recordExit,
    recordUpdate,
  };
}

export { useGraphRealtime, checkReducedMotion };
export type { RealtimeUpdate, UseGraphRealtimeResult };
