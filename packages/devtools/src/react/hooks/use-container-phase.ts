/**
 * Hook for tracking container phase.
 *
 * Note: This hook requires a container discovery mechanism to be configured.
 * In the current simplified architecture, it returns unavailable state.
 *
 * @packageDocumentation
 */

import type { ContainerKind, ContainerPhase } from "@hex-di/plugin";

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
 * Returns null values if no container is selected.
 * Phase is derived from the container's disposed state.
 *
 * Note: This hook requires a container discovery mechanism to be active.
 * In the current simplified architecture, it returns unavailable state
 * as no container discovery is configured by default.
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
 */
export function useContainerPhase(): UseContainerPhaseResult {
  // Container discovery has been removed in the current architecture refactor.
  // This hook returns unavailable state until container discovery is reimplemented.
  return {
    phase: null,
    kind: null,
    isAvailable: false,
  };
}
