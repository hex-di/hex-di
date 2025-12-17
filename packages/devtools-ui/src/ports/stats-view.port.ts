/**
 * StatsViewPort - Port definition for statistics dashboard.
 *
 * Defines the contract that stats view implementations must fulfill.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/ports";
import type { StatsViewModel } from "../view-models/index.js";

// =============================================================================
// Stats View Contract
// =============================================================================

/**
 * Contract for stats view implementations.
 */
export interface StatsViewContract {
  /**
   * Render the statistics dashboard with the given view model.
   */
  render(viewModel: StatsViewModel): void;

  /**
   * Set handler for metric click (for drill-down).
   */
  onMetricClick(handler: (metricId: string) => void): void;

  /**
   * Set handler for service selection from top services list.
   */
  onServiceSelect(handler: (portName: string) => void): void;

  /**
   * Refresh the stats display.
   */
  refresh(): void;

  /**
   * Clear the stats display.
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
 * Port for stats view implementations.
 */
export const StatsViewPort = createPort<"StatsView", StatsViewContract>("StatsView");

export type StatsView = StatsViewContract;
