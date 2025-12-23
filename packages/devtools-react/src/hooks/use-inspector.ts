/**
 * useInspector - Hook for service and scope inspection.
 *
 * Provides access to inspector view model and inspector-related actions.
 *
 * @packageDocumentation
 */

import { useMemo } from "react";
import { useDevToolsContext } from "../context/devtools-context.js";
import type { InspectorViewModel } from "@hex-di/devtools-ui";

/**
 * Inspector hook return type.
 */
export interface UseInspectorResult {
  /**
   * The inspector view model, or null if not available.
   */
  readonly viewModel: InspectorViewModel | null;

  /**
   * Whether container inspection is available.
   */
  readonly hasContainer: boolean;

  /**
   * Selected service port name, or null if none selected.
   */
  readonly selectedServicePortName: string | null;

  /**
   * Selected scope ID, or null if none selected.
   */
  readonly selectedScopeId: string | null;

  /**
   * Current filter text.
   */
  readonly filter: string;

  /**
   * Whether to show dependencies.
   */
  readonly showDependencies: boolean;

  /**
   * Whether to show dependents.
   */
  readonly showDependents: boolean;

  /**
   * Expanded scope IDs.
   */
  readonly expandedScopeIds: readonly string[];

  /**
   * Select a service.
   */
  selectService(portName: string | null): void;

  /**
   * Select a scope.
   */
  selectScope(scopeId: string | null): void;

  /**
   * Toggle scope expansion.
   */
  toggleScopeExpansion(scopeId: string): void;

  /**
   * Set filter text.
   */
  setFilter(filter: string): void;

  /**
   * Clear selection.
   */
  clearSelection(): void;
}

/**
 * Hook to access inspector data and actions.
 *
 * @example
 * ```tsx
 * function InspectorView() {
 *   const { viewModel, selectService, selectedServicePortName } = useInspector();
 *
 *   if (!viewModel) {
 *     return <div>No container available</div>;
 *   }
 *
 *   return (
 *     <div>
 *       {viewModel.services.map(service => (
 *         <div
 *           key={service.portName}
 *           onClick={() => selectService(service.portName)}
 *           className={service.portName === selectedServicePortName ? 'selected' : ''}
 *         >
 *           {service.portName}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useInspector(): UseInspectorResult {
  const context = useDevToolsContext();

  const result = useMemo(
    (): UseInspectorResult => ({
      viewModel: context.viewModels.inspector,
      hasContainer: context.dataSource?.hasContainer() ?? false,
      selectedServicePortName: context.state.inspector.selectedServicePortName,
      selectedScopeId: context.state.inspector.selectedScopeId,
      filter: context.state.inspector.filterText,
      showDependencies: context.state.inspector.showDependencies,
      showDependents: context.state.inspector.showDependents,
      expandedScopeIds: context.state.inspector.expandedScopeIds,
      selectService: context.selectService,
      selectScope: context.selectScope,
      toggleScopeExpansion: context.toggleScopeExpansion,
      setFilter: context.setInspectorFilter,
      clearSelection: () => {
        context.selectService(null);
        context.selectScope(null);
      },
    }),
    [context]
  );

  return result;
}
