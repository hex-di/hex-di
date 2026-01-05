/**
 * GraphControls component for zoom and pan controls.
 *
 * Provides buttons for zooming in/out, fitting to view, and resetting zoom.
 * Uses CSS variables for theming consistency.
 *
 * @packageDocumentation
 */

import React, { type ReactElement, useCallback, useState } from "react";
import type { GraphControlsProps } from "./types.js";
import {
  DEFAULT_CONTROLS_CONTAINER_STYLES,
  DEFAULT_BUTTON_STYLES,
  DEFAULT_BUTTON_HOVER_STYLES,
  DEFAULT_SEPARATOR_STYLES,
  DEFAULT_ZOOM_LABEL_STYLES,
} from "./styles.js";

// =============================================================================
// Component
// =============================================================================

/**
 * Renders zoom and pan controls for the graph.
 *
 * Provides buttons for:
 * - Zoom in (+)
 * - Zoom out (-)
 * - Fit to view
 * - Reset to 100%
 * - Current zoom level display
 */
export function GraphControls({
  zoom,
  minZoom,
  maxZoom,
  onZoomIn,
  onZoomOut,
  onFitView,
  onResetZoom,
  containerStyle,
  buttonStyle,
}: GraphControlsProps): ReactElement {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const getButtonStyle = useCallback(
    (buttonId: string) => ({
      ...DEFAULT_BUTTON_STYLES,
      ...buttonStyle,
      ...(hoveredButton === buttonId ? DEFAULT_BUTTON_HOVER_STYLES : {}),
    }),
    [hoveredButton, buttonStyle]
  );

  const zoomPercent = Math.round(zoom * 100);
  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;

  return (
    <div style={{ ...DEFAULT_CONTROLS_CONTAINER_STYLES, ...containerStyle }}>
      {/* Zoom out button */}
      <button
        type="button"
        style={{
          ...getButtonStyle("zoom-out"),
          opacity: canZoomOut ? 1 : 0.5,
          cursor: canZoomOut ? "pointer" : "not-allowed",
        }}
        onClick={onZoomOut}
        onMouseEnter={() => setHoveredButton("zoom-out")}
        onMouseLeave={() => setHoveredButton(null)}
        disabled={!canZoomOut}
        title="Zoom out"
        aria-label="Zoom out"
      >
        -
      </button>

      {/* Zoom level display */}
      <span style={DEFAULT_ZOOM_LABEL_STYLES}>{zoomPercent}%</span>

      {/* Zoom in button */}
      <button
        type="button"
        style={{
          ...getButtonStyle("zoom-in"),
          opacity: canZoomIn ? 1 : 0.5,
          cursor: canZoomIn ? "pointer" : "not-allowed",
        }}
        onClick={onZoomIn}
        onMouseEnter={() => setHoveredButton("zoom-in")}
        onMouseLeave={() => setHoveredButton(null)}
        disabled={!canZoomIn}
        title="Zoom in"
        aria-label="Zoom in"
      >
        +
      </button>

      {/* Separator */}
      <div style={DEFAULT_SEPARATOR_STYLES} />

      {/* Fit view button */}
      <button
        type="button"
        style={getButtonStyle("fit")}
        onClick={onFitView}
        onMouseEnter={() => setHoveredButton("fit")}
        onMouseLeave={() => setHoveredButton(null)}
        title="Fit to view"
        aria-label="Fit graph to view"
      >
        Fit
      </button>

      {/* Reset zoom button */}
      <button
        type="button"
        style={getButtonStyle("reset")}
        onClick={onResetZoom}
        onMouseEnter={() => setHoveredButton("reset")}
        onMouseLeave={() => setHoveredButton(null)}
        title="Reset to 100%"
        aria-label="Reset zoom to 100%"
      >
        1:1
      </button>
    </div>
  );
}
