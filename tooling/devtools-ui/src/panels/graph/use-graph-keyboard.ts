/**
 * Graph panel keyboard shortcuts hook.
 *
 * @packageDocumentation
 */

import { useMemo } from "react";
import { useKeyboardShortcuts } from "../../hooks/use-keyboard-shortcuts.js";
import type { GraphPanelDispatch } from "./use-graph-panel-state.js";
import type { GraphViewportState, GraphExportFormat } from "./types.js";
import { ZOOM_STEP, PAN_STEP, MIN_ZOOM, MAX_ZOOM } from "./constants.js";

interface UseGraphKeyboardOptions {
  readonly dispatch: GraphPanelDispatch;
  readonly viewport: GraphViewportState;
  readonly enabled?: boolean;
  readonly onExport?: (format: GraphExportFormat) => void;
  readonly onFitView?: () => void;
}

/**
 * Register keyboard shortcuts for the graph panel.
 *
 * Shortcuts:
 * - Escape: Clear selection
 * - f: Toggle filter panel
 * - a: Toggle analysis sidebar
 * - m: Toggle metadata inspector
 * - d: Toggle layout direction
 * - n: Toggle minimap
 * - +/=: Zoom in
 * - -: Zoom out
 * - 0: Reset zoom
 * - ArrowUp: Pan up
 * - ArrowDown: Pan down
 * - ArrowLeft: Pan left
 * - ArrowRight: Pan right
 * - Ctrl+f: Focus search
 * - Ctrl+e: Export DOT
 * - Shift+?: Fit to view
 */
function useGraphKeyboard({
  dispatch,
  viewport,
  enabled = true,
  onExport,
  onFitView,
}: UseGraphKeyboardOptions): void {
  const shortcuts = useMemo(() => {
    const map = new Map<string, () => void>();

    map.set("Escape", () => dispatch.clearSelection());
    map.set("f", () => dispatch.toggleFilterPanel());
    map.set("a", () => dispatch.toggleAnalysis());
    map.set("m", () => dispatch.toggleMetadata());
    map.set("d", () => dispatch.setLayoutDirection(viewport.zoom > 0 ? "LR" : "TB"));
    map.set("n", () => dispatch.toggleMinimap());

    map.set("+", () => {
      const newZoom = Math.min(viewport.zoom + ZOOM_STEP, MAX_ZOOM);
      dispatch.setViewport({ ...viewport, zoom: newZoom });
    });
    map.set("=", () => {
      const newZoom = Math.min(viewport.zoom + ZOOM_STEP, MAX_ZOOM);
      dispatch.setViewport({ ...viewport, zoom: newZoom });
    });
    map.set("-", () => {
      const newZoom = Math.max(viewport.zoom - ZOOM_STEP, MIN_ZOOM);
      dispatch.setViewport({ ...viewport, zoom: newZoom });
    });
    map.set("0", () => {
      dispatch.setViewport({ panX: 0, panY: 0, zoom: 1 });
    });

    map.set("ArrowUp", () => {
      dispatch.setViewport({ ...viewport, panY: viewport.panY + PAN_STEP });
    });
    map.set("ArrowDown", () => {
      dispatch.setViewport({ ...viewport, panY: viewport.panY - PAN_STEP });
    });
    map.set("ArrowLeft", () => {
      dispatch.setViewport({ ...viewport, panX: viewport.panX + PAN_STEP });
    });
    map.set("ArrowRight", () => {
      dispatch.setViewport({ ...viewport, panX: viewport.panX - PAN_STEP });
    });

    if (onExport !== undefined) {
      map.set("Ctrl+e", () => onExport("dot"));
    }

    if (onFitView !== undefined) {
      map.set("Shift+?", () => onFitView());
    }

    return map;
  }, [dispatch, viewport, onExport, onFitView]);

  useKeyboardShortcuts(shortcuts, enabled);
}

export { useGraphKeyboard };
export type { UseGraphKeyboardOptions };
