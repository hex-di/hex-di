/**
 * FlameGraphViewModel - Immutable view data for flame graph visualization.
 *
 * Contains hierarchical frame data for rendering performance flame graphs
 * from trace data. Supports zoom and selection for drill-down analysis.
 *
 * @packageDocumentation
 */

// =============================================================================
// Flame Frame Types
// =============================================================================

/**
 * A single frame in the flame graph.
 *
 * Each frame represents a trace entry with timing information
 * aggregated for flame graph visualization.
 */
export interface FlameFrame {
  /** Unique identifier for the frame (trace id) */
  readonly id: string;
  /** Display label (port name) */
  readonly label: string;
  /** Depth in the call stack (0 = root) */
  readonly depth: number;
  /** Cumulative time including children (ms) */
  readonly cumulativeTime: number;
  /** Self time excluding children (ms) */
  readonly selfTime: number;
  /** Start position as percentage of total (0-1) */
  readonly startPercent: number;
  /** Width as percentage of total (0-1) */
  readonly widthPercent: number;
  /** Parent frame ID, if any */
  readonly parentId: string | null;
  /** Child frame IDs */
  readonly childIds: readonly string[];
  /** Whether this frame is selected */
  readonly isSelected: boolean;
  /** Whether this frame is in the current zoom range */
  readonly isInView: boolean;
}

// =============================================================================
// Zoom Range
// =============================================================================

/**
 * Zoom range for drill-down into flame graph.
 */
export interface ZoomRange {
  /** Start position (0-1) */
  readonly start: number;
  /** End position (0-1) */
  readonly end: number;
}

// =============================================================================
// Flame Graph View Model
// =============================================================================

/**
 * Complete view model for rendering a flame graph.
 */
export interface FlameGraphViewModel {
  /** All frames in the flame graph */
  readonly frames: readonly FlameFrame[];
  /** Maximum depth of the graph */
  readonly maxDepth: number;
  /** Total duration of all root frames (ms) */
  readonly totalDuration: number;
  /** Currently selected frame ID, if any */
  readonly selectedFrameId: string | null;
  /** Current zoom range */
  readonly zoomRange: ZoomRange;
  /** Whether the flame graph is empty */
  readonly isEmpty: boolean;
  /** Total frame count */
  readonly frameCount: number;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates an empty FlameGraphViewModel.
 */
export function createEmptyFlameGraphViewModel(): FlameGraphViewModel {
  return Object.freeze({
    frames: Object.freeze([]),
    maxDepth: 0,
    totalDuration: 0,
    selectedFrameId: null,
    zoomRange: Object.freeze({ start: 0, end: 1 }),
    isEmpty: true,
    frameCount: 0,
  });
}

// =============================================================================
// Factory Input Types
// =============================================================================

/**
 * Input for creating a FlameGraphViewModel.
 */
export interface FlameGraphViewModelInput {
  /** Frames to include in the flame graph */
  readonly frames: readonly FlameFrame[];
  /** Currently selected frame ID */
  readonly selectedFrameId: string | null;
  /** Current zoom range */
  readonly zoomRange: ZoomRange;
}

/**
 * Creates a FlameGraphViewModel from input data.
 *
 * Calculates depth and total duration from the provided frames.
 *
 * @param input - The input data for creating the view model
 * @returns An immutable FlameGraphViewModel
 */
export function createFlameGraphViewModel(input: FlameGraphViewModelInput): FlameGraphViewModel {
  const { frames, selectedFrameId, zoomRange } = input;

  if (frames.length === 0) {
    return createEmptyFlameGraphViewModel();
  }

  // Calculate max depth (add 1 because depth is 0-indexed)
  const maxDepth = frames.reduce((max, frame) => Math.max(max, frame.depth), 0) + 1;

  // Calculate total duration from root frames
  const rootFrames = frames.filter(f => f.parentId === null);
  const _totalDuration = rootFrames.reduce(
    (max, f) => Math.max(max, f.startPercent * 100 + f.widthPercent * 100),
    0
  );

  // Use cumulative time if available, otherwise calculate from widthPercent
  const actualTotalDuration =
    rootFrames.length > 0 ? rootFrames.reduce((sum, f) => sum + f.cumulativeTime, 0) : 0;

  // Freeze all frames
  const frozenFrames = Object.freeze(
    frames.map(frame =>
      Object.freeze({
        ...frame,
        childIds: Object.freeze([...frame.childIds]),
      })
    )
  );

  return Object.freeze({
    frames: frozenFrames,
    maxDepth,
    totalDuration: actualTotalDuration,
    selectedFrameId,
    zoomRange: Object.freeze({ ...zoomRange }),
    isEmpty: false,
    frameCount: frames.length,
  });
}
