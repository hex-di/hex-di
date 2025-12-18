/**
 * FlameGraphPresenter - Pure presentation logic for flame graph visualization.
 *
 * Transforms trace hierarchy data into FlameGraphViewModel ready for rendering.
 * Calculates cumulative time (includes children) and self time (excludes children).
 *
 * @packageDocumentation
 */

import type { PresenterDataSourceContract, TraceEntry } from "@hex-di/devtools-core";
import type {
  FlameGraphViewModel,
  FlameFrame,
  ZoomRange,
} from "../view-models/index.js";
import { createEmptyFlameGraphViewModel, createFlameGraphViewModel } from "../view-models/flame-graph.vm.js";

// =============================================================================
// FlameGraphPresenter
// =============================================================================

/**
 * Presenter for flame graph visualization.
 *
 * Transforms trace data from the data source into immutable view models
 * that can be rendered by any flame graph view implementation.
 */
export class FlameGraphPresenter {
  private selectedFrameId: string | null = null;
  private zoomRange: ZoomRange = { start: 0, end: 1 };
  private thresholdMs = 0;

  // Memoization cache
  private cachedFrames: readonly FlameFrame[] | null = null;
  private cacheKey: string | null = null;

  constructor(private readonly dataSource: PresenterDataSourceContract) {}

  /**
   * Get the current flame graph view model.
   */
  getViewModel(): FlameGraphViewModel {
    if (!this.dataSource.hasTracing()) {
      return createEmptyFlameGraphViewModel();
    }

    const traces = this.dataSource.getTraces();
    if (traces.length === 0) {
      return createEmptyFlameGraphViewModel();
    }

    // Check cache validity
    const newCacheKey = this.computeCacheKey(traces);
    if (this.cachedFrames && this.cacheKey === newCacheKey) {
      // Return cached result with current selection/zoom
      return createFlameGraphViewModel({
        frames: this.cachedFrames,
        selectedFrameId: this.selectedFrameId,
        zoomRange: this.zoomRange,
      });
    }

    // Calculate frames from traces
    const frames = this.transformTracesToFrames(traces);

    // Cache the result
    this.cachedFrames = frames;
    this.cacheKey = newCacheKey;

    return createFlameGraphViewModel({
      frames,
      selectedFrameId: this.selectedFrameId,
      zoomRange: this.zoomRange,
    });
  }

  /**
   * Select a frame.
   */
  selectFrame(frameId: string | null): void {
    this.selectedFrameId = frameId;
  }

  /**
   * Set the zoom range for drill-down.
   */
  setZoomRange(range: ZoomRange): void {
    this.zoomRange = {
      start: Math.max(0, Math.min(1, range.start)),
      end: Math.max(0, Math.min(1, range.end)),
    };
    // Invalidate cache when zoom changes
    this.cacheKey = null;
    this.cachedFrames = null;
  }

  /**
   * Set threshold for filtering small frames.
   */
  setThreshold(ms: number): void {
    this.thresholdMs = ms;
    // Invalidate cache
    this.cacheKey = null;
    this.cachedFrames = null;
  }

  /**
   * Compute a cache key based on trace data.
   */
  private computeCacheKey(traces: readonly TraceEntry[]): string {
    // Use trace IDs and count as a simple cache key
    return `${traces.length}:${traces.map(t => t.id).join(",")}:${this.thresholdMs}`;
  }

  /**
   * Transform trace entries to flame graph frames.
   *
   * Builds a hierarchical structure from parent-child relationships
   * and calculates cumulative and self times.
   */
  private transformTracesToFrames(traces: readonly TraceEntry[]): FlameFrame[] {
    const traceMap = new Map(traces.map(t => [t.id, t]));

    // Find root traces (no parent)
    const rootTraces = traces.filter(t => t.parentId === null);

    // Calculate total duration for percentage calculations
    const totalDuration = rootTraces.reduce((sum, t) => sum + t.duration, 0);

    if (totalDuration === 0) {
      return [];
    }

    // Build frames recursively
    const frames: FlameFrame[] = [];
    let currentStartPercent = 0;

    rootTraces.forEach(rootTrace => {
      const width = rootTrace.duration / totalDuration;
      this.buildFrameTree(
        rootTrace,
        traceMap,
        frames,
        0, // depth
        currentStartPercent,
        width,
        totalDuration
      );
      currentStartPercent += width;
    });

    // Filter by threshold and zoom range
    const filteredFrames = frames.filter(frame => {
      // Filter by threshold
      if (this.thresholdMs > 0 && frame.cumulativeTime < this.thresholdMs) {
        return false;
      }

      // Filter by zoom range
      const frameEnd = frame.startPercent + frame.widthPercent;
      const inZoomRange =
        frameEnd > this.zoomRange.start && frame.startPercent < this.zoomRange.end;

      return inZoomRange;
    });

    // Update isInView based on zoom range
    return filteredFrames.map(frame => {
      const frameEnd = frame.startPercent + frame.widthPercent;
      const isInView =
        frameEnd > this.zoomRange.start && frame.startPercent < this.zoomRange.end;

      return Object.freeze({
        ...frame,
        isSelected: frame.id === this.selectedFrameId,
        isInView,
      });
    });
  }

  /**
   * Recursively build frame tree from trace hierarchy.
   */
  private buildFrameTree(
    trace: TraceEntry,
    traceMap: Map<string, TraceEntry>,
    frames: FlameFrame[],
    depth: number,
    startPercent: number,
    widthPercent: number,
    totalDuration: number
  ): void {
    // Calculate self time (excluding children)
    const childDuration = trace.childIds.reduce((sum, childId) => {
      const child = traceMap.get(childId);
      return sum + (child?.duration ?? 0);
    }, 0);
    const selfTime = Math.max(0, trace.duration - childDuration);

    const frame: FlameFrame = Object.freeze({
      id: trace.id,
      label: trace.portName,
      depth,
      cumulativeTime: trace.duration,
      selfTime,
      startPercent,
      widthPercent,
      parentId: trace.parentId,
      childIds: Object.freeze([...trace.childIds]),
      isSelected: trace.id === this.selectedFrameId,
      isInView: true, // Will be updated after filtering
    });

    frames.push(frame);

    // Process children
    let childStartPercent = startPercent;
    trace.childIds.forEach(childId => {
      const childTrace = traceMap.get(childId);
      if (childTrace) {
        const childWidthPercent = (childTrace.duration / totalDuration);
        this.buildFrameTree(
          childTrace,
          traceMap,
          frames,
          depth + 1,
          childStartPercent,
          childWidthPercent,
          totalDuration
        );
        childStartPercent += childWidthPercent;
      }
    });
  }
}
