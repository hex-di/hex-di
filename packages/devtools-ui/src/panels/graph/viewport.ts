/**
 * Viewport computation utilities for the graph panel.
 *
 * @packageDocumentation
 */

import type { GraphViewportState } from "./types.js";
import { FIT_PADDING } from "./constants.js";

/**
 * Compute an initial viewport that centers the graph in the canvas.
 *
 * If the graph fits at zoom=1, it is centered without scaling.
 * If the graph is too large, it is scaled down to fit with padding.
 * Zoom never exceeds 1.0 for initial display.
 *
 * @param layoutWidth - Total width of the computed graph layout
 * @param layoutHeight - Total height of the computed graph layout
 * @param canvasWidth - Available canvas width in pixels
 * @param canvasHeight - Available canvas height in pixels
 * @returns A viewport state with panX, panY, zoom to center the graph
 */
function computeInitialViewport(
  layoutWidth: number,
  layoutHeight: number,
  canvasWidth: number,
  canvasHeight: number
): GraphViewportState {
  if (layoutWidth === 0 || layoutHeight === 0) {
    return { panX: 0, panY: 0, zoom: 1 };
  }

  const padding = FIT_PADDING;
  const availableWidth = canvasWidth - padding * 2;
  const availableHeight = canvasHeight - padding * 2;

  const scaleX = availableWidth / layoutWidth;
  const scaleY = availableHeight / layoutHeight;
  const zoom = Math.min(scaleX, scaleY, 1);

  const panX = (canvasWidth - layoutWidth * zoom) / 2;
  const panY = (canvasHeight - layoutHeight * zoom) / 2;

  return { panX, panY, zoom };
}

export { computeInitialViewport };
