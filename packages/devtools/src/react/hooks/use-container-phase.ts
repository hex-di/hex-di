/**
 * Hook for tracking container phase.
 *
 * @packageDocumentation
 */

import { useContext, useMemo } from "react";
import type { ContainerKind, ContainerPhase } from "@hex-di/devtools-core";
import { ContainerRegistryContext } from "../context/container-registry.js";
import { useContainerInspector } from "./use-container-inspector.js";
import { isSome } from "../types/adt.js";

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
 * Derive container phase from snapshot state.
 *
 * @internal
 */
function derivePhase(isDisposed: boolean): ContainerPhase {
  return isDisposed ? "disposed" : "initialized";
}

/**
 * Track the current container's phase and kind.
 *
 * Returns null values if no container is selected.
 * Phase is derived from the container's disposed state.
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
  const registry = useContext(ContainerRegistryContext);
  const inspectorOpt = useContainerInspector();

  return useMemo((): UseContainerPhaseResult => {
    if (!isSome(inspectorOpt)) {
      return {
        phase: null,
        kind: null,
        isAvailable: false,
      };
    }

    const snapshot = inspectorOpt.value.snapshot();
    const kind: ContainerKind | null =
      registry !== null && isSome(registry.selectedEntry)
        ? registry.selectedEntry.value.kind
        : null;

    return {
      phase: derivePhase(snapshot.isDisposed),
      kind,
      isAvailable: true,
    };
  }, [inspectorOpt, registry]);
}
