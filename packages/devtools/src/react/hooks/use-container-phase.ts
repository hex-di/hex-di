/**
 * Hook for tracking container phase.
 *
 * @packageDocumentation
 */

import { useState, useEffect } from "react";
import type { ContainerKind, ContainerPhase } from "@hex-di/devtools-core";
import type { InspectorEvent } from "@hex-di/inspector";
import { useInspector } from "./use-inspector.js";

/**
 * Result of useContainerPhase hook.
 */
export interface UseContainerPhaseResult {
  /** Current container phase, or null if not available */
  readonly phase: ContainerPhase | null;

  /** Container kind (root, child, lazy, scope), or null if not available */
  readonly kind: ContainerKind | null;

  /** Whether the inspector is available */
  readonly isAvailable: boolean;
}

/**
 * Track the current container's phase and kind.
 *
 * Subscribes to phase-changed events and updates automatically.
 * Returns null values if no container is selected.
 *
 * @example Phase indicator
 * ```typescript
 * import { useContainerPhase } from "@hex-di/devtools/react";
 *
 * function PhaseIndicator() {
 *   const { phase, kind, isAvailable } = useContainerPhase();
 *
 *   if (!isAvailable) {
 *     return null;
 *   }
 *
 *   const phaseColors: Record<string, string> = {
 *     uninitialized: "gray",
 *     initialized: "green",
 *     loading: "yellow",
 *     loaded: "green",
 *     active: "green",
 *     disposing: "orange",
 *     disposed: "red",
 *   };
 *
 *   return (
 *     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
 *       <span
 *         style={{
 *           width: 8,
 *           height: 8,
 *           borderRadius: "50%",
 *           backgroundColor: phase ? phaseColors[phase] : "gray",
 *         }}
 *       />
 *       <span>{kind}</span>
 *       <span>({phase})</span>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Conditional rendering based on phase
 * ```typescript
 * function ContainerContent() {
 *   const { phase, kind } = useContainerPhase();
 *
 *   if (phase === "disposing" || phase === "disposed") {
 *     return <div>Container is no longer active</div>;
 *   }
 *
 *   if (kind === "lazy" && phase === "unloaded") {
 *     return <div>Lazy container not yet loaded</div>;
 *   }
 *
 *   if (kind === "root" && phase === "uninitialized") {
 *     return <div>Waiting for async initialization...</div>;
 *   }
 *
 *   return <ContainerDetails />;
 * }
 * ```
 */
export function useContainerPhase(): UseContainerPhaseResult {
  const inspector = useInspector();
  const [phase, setPhase] = useState<ContainerPhase | null>(() => inspector?.getPhase() ?? null);

  useEffect(() => {
    if (inspector === null) {
      setPhase(null);
      return;
    }

    // Initial phase
    setPhase(inspector.getPhase());

    // Subscribe to phase changes
    return inspector.subscribe((event: InspectorEvent) => {
      if (event.type === "phase-changed") {
        setPhase(event.phase);
      }
    });
  }, [inspector]);

  return {
    phase,
    kind: inspector?.getContainerKind() ?? null,
    isAvailable: inspector !== null,
  };
}
