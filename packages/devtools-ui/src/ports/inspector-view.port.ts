/**
 * InspectorViewPort - Port definition for service and scope inspection.
 *
 * Defines the contract that inspector view implementations must fulfill.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/ports";
import type { InspectorViewModel } from "../view-models/index.js";

// =============================================================================
// Inspector View Contract
// =============================================================================

/**
 * Contract for inspector view implementations.
 */
export interface InspectorViewContract {
  /**
   * Render the inspector with the given view model.
   */
  render(viewModel: InspectorViewModel): void;

  /**
   * Set handler for service selection.
   */
  onServiceSelect(handler: (portName: string) => void): void;

  /**
   * Set handler for scope selection.
   */
  onScopeSelect(handler: (scopeId: string) => void): void;

  /**
   * Set handler for dependency click (navigate to that service).
   */
  onDependencyClick(handler: (portName: string) => void): void;

  /**
   * Set handler for filter text change.
   */
  onFilterChange(handler: (text: string) => void): void;

  /**
   * Set handler for scope tree expand/collapse.
   */
  onScopeToggle(handler: (scopeId: string) => void): void;

  /**
   * Clear the inspector display.
   */
  clear(): void;

  /**
   * Dispose resources.
   */
  dispose(): void;
}

// =============================================================================
// Port Definition
// =============================================================================

/**
 * Port for inspector view implementations.
 */
export const InspectorViewPort = createPort<"InspectorView", InspectorViewContract>("InspectorView");

export type InspectorView = InspectorViewContract;
