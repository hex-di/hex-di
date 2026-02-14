/**
 * RealTimeUpdateHandler — Debounced event handling with connection status.
 *
 * Spec: 11-interactions.md (11.14)
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ── Props ───────────────────────────────────────────────────────────────────

interface RealTimeUpdateHandlerProps {
  readonly subscribe: (listener: (event: { readonly type: string }) => void) => () => void;
  readonly onExecutionAdded?: () => void;
  readonly onChainRegistered?: () => void;
  readonly onStatisticsUpdated?: () => void;
  readonly onAggregateUpdated?: () => void;
  readonly onSankeyUpdated?: () => void;
  readonly onReconnected?: () => void;
  readonly statusBarDebounceMs?: number;
  readonly aggregateDebounceMs?: number;
  readonly sankeyDebounceMs?: number;
}

// ── Component ───────────────────────────────────────────────────────────────

function RealTimeUpdateHandler({
  subscribe,
  onExecutionAdded,
  onChainRegistered,
  onStatisticsUpdated,
  onAggregateUpdated,
  onSankeyUpdated,
  onReconnected,
  statusBarDebounceMs = 200,
  aggregateDebounceMs = 500,
  sankeyDebounceMs = 1000,
}: RealTimeUpdateHandlerProps): React.ReactElement {
  const [disconnected, setDisconnected] = useState(false);

  // Detect reduced motion
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Debounce refs
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const aggregateTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sankeyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleEvent = useCallback(
    (event: { readonly type: string }) => {
      switch (event.type) {
        case "execution-added":
          onExecutionAdded?.();
          break;
        case "chain-registered":
          onChainRegistered?.();
          break;
        case "statistics-updated":
          // Debounced status bar
          if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
          statusTimerRef.current = setTimeout(() => {
            onStatisticsUpdated?.();
          }, statusBarDebounceMs);

          // Debounced aggregate
          if (aggregateTimerRef.current) clearTimeout(aggregateTimerRef.current);
          aggregateTimerRef.current = setTimeout(() => {
            onAggregateUpdated?.();
          }, aggregateDebounceMs);

          // Debounced sankey
          if (sankeyTimerRef.current) clearTimeout(sankeyTimerRef.current);
          sankeyTimerRef.current = setTimeout(() => {
            onSankeyUpdated?.();
          }, sankeyDebounceMs);
          break;
        case "connection-lost":
          setDisconnected(true);
          break;
        case "connection-restored":
          setDisconnected(false);
          onReconnected?.();
          break;
      }
    },
    [
      onExecutionAdded,
      onChainRegistered,
      onStatisticsUpdated,
      onAggregateUpdated,
      onSankeyUpdated,
      onReconnected,
      statusBarDebounceMs,
      aggregateDebounceMs,
      sankeyDebounceMs,
    ]
  );

  useEffect(() => {
    const unsubscribe = subscribe(handleEvent);
    return () => {
      unsubscribe();
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      if (aggregateTimerRef.current) clearTimeout(aggregateTimerRef.current);
      if (sankeyTimerRef.current) clearTimeout(sankeyTimerRef.current);
    };
  }, [subscribe, handleEvent]);

  return (
    <div
      data-testid="real-time-handler"
      data-interactive="true"
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      {disconnected && <div data-testid="disconnected-indicator">Disconnected</div>}
    </div>
  );
}

export { RealTimeUpdateHandler };
export type { RealTimeUpdateHandlerProps };
