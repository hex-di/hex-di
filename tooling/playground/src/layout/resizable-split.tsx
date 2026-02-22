/**
 * ResizableSplit component for the playground layout.
 *
 * Provides a draggable splitter between two child panes with
 * keyboard navigation, double-click reset, and optional
 * localStorage persistence.
 *
 * @see spec/playground/05-layout-and-panels.md Section 24
 */

import { useRef, useEffect, useCallback, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the ResizableSplit component. */
export interface ResizableSplitProps {
  /** Direction of the split. */
  readonly direction: "horizontal" | "vertical";
  /** Initial proportion of the first pane (0-1). */
  readonly initialRatio: number;
  /** Minimum pixels for the first pane. */
  readonly minFirst: number;
  /** Minimum pixels for the second pane. */
  readonly minSecond: number;
  /** Optional localStorage key for persistence. */
  readonly persistKey?: string;
  /** Content for the first pane. */
  readonly first: React.ReactNode;
  /** Content for the second pane. */
  readonly second: React.ReactNode;
  /** Width of the splitter bar in pixels. Default: 8. */
  readonly splitterWidth?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a ratio from localStorage, returning undefined on failure. */
function readPersistedRatio(key: string): number | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    const parsed = JSON.parse(raw);
    if (typeof parsed === "number" && parsed >= 0 && parsed <= 1) {
      return parsed;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** Write a ratio to localStorage. */
function writePersistedRatio(key: string, ratio: number): void {
  try {
    localStorage.setItem(key, JSON.stringify(ratio));
  } catch {
    // Storage unavailable -- silently ignore
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ResizableSplit renders two panes separated by a draggable splitter.
 *
 * - Drag the splitter to resize.
 * - Double-click resets to the initial ratio.
 * - Arrow keys (when focused) move 10px; Shift+arrow moves 50px.
 * - Panes are clamped to minFirst/minSecond pixel constraints.
 * - If persistKey is provided, the ratio persists in localStorage.
 */
export function ResizableSplit(props: ResizableSplitProps): React.ReactElement {
  const {
    direction,
    initialRatio,
    minFirst,
    minSecond,
    persistKey,
    first,
    second,
    splitterWidth = 6,
  } = props;

  // Resolve initial ratio from persistence or props
  const [ratio, setRatio] = useState<number>(() => {
    if (persistKey !== undefined) {
      const persisted = readPersistedRatio(persistKey);
      if (persisted !== undefined) return persisted;
    }
    return initialRatio;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Persist ratio changes
  const updateRatio = useCallback(
    (newRatio: number) => {
      setRatio(newRatio);
      if (persistKey !== undefined) {
        writePersistedRatio(persistKey, newRatio);
      }
    },
    [persistKey]
  );

  // Clamp a ratio to respect min constraints given a total size
  const clampRatio = useCallback(
    (rawRatio: number, totalSize: number): number => {
      const availableSize = totalSize - splitterWidth;
      if (availableSize <= 0) return rawRatio;

      const minFirstRatio = minFirst / availableSize;
      const maxFirstRatio = 1 - minSecond / availableSize;

      if (minFirstRatio > maxFirstRatio) return rawRatio;

      return Math.min(Math.max(rawRatio, minFirstRatio), maxFirstRatio);
    },
    [minFirst, minSecond, splitterWidth]
  );

  // Get total size (width for horizontal, height for vertical)
  const getTotalSize = useCallback((): number => {
    const container = containerRef.current;
    if (!container) return 0;
    return direction === "horizontal" ? container.offsetWidth : container.offsetHeight;
  }, [direction]);

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      setIsDragging(true);

      const startPos = direction === "horizontal" ? e.clientX : e.clientY;
      const startRatio = ratio;
      const totalSize = getTotalSize();
      const availableSize = totalSize - splitterWidth;

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        if (!isDraggingRef.current) return;

        const currentPos = direction === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
        const delta = currentPos - startPos;
        const deltaRatio = availableSize > 0 ? delta / availableSize : 0;
        const newRatio = clampRatio(startRatio + deltaRatio, totalSize);
        updateRatio(newRatio);
      };

      const handleMouseUp = (): void => {
        isDraggingRef.current = false;
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [direction, ratio, getTotalSize, splitterWidth, clampRatio, updateRatio]
  );

  // Double-click resets to initial ratio
  const handleDoubleClick = useCallback(() => {
    const totalSize = getTotalSize();
    const clamped = clampRatio(initialRatio, totalSize);
    updateRatio(clamped);
  }, [initialRatio, getTotalSize, clampRatio, updateRatio]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isHorizontal = direction === "horizontal";
      const forwardKey = isHorizontal ? "ArrowRight" : "ArrowDown";
      const backwardKey = isHorizontal ? "ArrowLeft" : "ArrowUp";

      if (e.key !== forwardKey && e.key !== backwardKey) return;

      e.preventDefault();

      const totalSize = getTotalSize();
      const availableSize = totalSize - splitterWidth;
      if (availableSize <= 0) return;

      const stepPx = e.shiftKey ? 50 : 10;
      const stepRatio = stepPx / availableSize;
      const delta = e.key === forwardKey ? stepRatio : -stepRatio;
      const newRatio = clampRatio(ratio + delta, totalSize);
      updateRatio(newRatio);
    },
    [direction, ratio, getTotalSize, splitterWidth, clampRatio, updateRatio]
  );

  // Apply cursor style during drag to prevent flickering
  useEffect(() => {
    if (!isDragging) return undefined;

    const cursorStyle = direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.cursor = cursorStyle;
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, direction]);

  // Compute pane sizes
  const isHorizontal = direction === "horizontal";
  const cursorType = isHorizontal ? "col-resize" : "row-resize";

  // Splitter visual state
  const splitterBg = isDragging
    ? "var(--hex-accent-muted, rgba(99, 102, 241, 0.3))"
    : isHovering
      ? "var(--hex-accent-muted, rgba(99, 102, 241, 0.15))"
      : "var(--hex-bg-tertiary, #ebebf0)";

  return (
    <div
      ref={containerRef}
      data-testid="resizable-split"
      style={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* First pane */}
      <div
        data-testid="resizable-first"
        style={{
          flex: `0 0 calc(${ratio * 100}% - ${splitterWidth / 2}px)`,
          overflow: "hidden",
          minWidth: isHorizontal ? minFirst : undefined,
          minHeight: isHorizontal ? undefined : minFirst,
        }}
      >
        {first}
      </div>

      {/* Splitter */}
      <div
        data-testid="resizable-splitter"
        role="separator"
        aria-orientation={isHorizontal ? "vertical" : "horizontal"}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{
          flex: `0 0 ${splitterWidth}px`,
          cursor: cursorType,
          backgroundColor: splitterBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: isDragging ? "none" : "background-color 0.15s ease",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        {/* Grip indicator (centered line) */}
        <div
          data-testid="splitter-grip"
          style={{
            width: isHorizontal ? 2 : 24,
            height: isHorizontal ? 24 : 2,
            borderRadius: 1,
            backgroundColor: isDragging
              ? "var(--hex-accent, #6366f1)"
              : isHovering
                ? "var(--hex-text-muted, #94a3b8)"
                : "var(--hex-border-strong, #c8c8d4)",
            opacity: isDragging || isHovering ? 1 : 0.6,
            transition: isDragging ? "none" : "opacity 0.15s ease, background-color 0.15s ease",
          }}
        />
      </div>

      {/* Second pane */}
      <div
        data-testid="resizable-second"
        style={{
          flex: 1,
          overflow: "hidden",
          minWidth: isHorizontal ? minSecond : undefined,
          minHeight: isHorizontal ? undefined : minSecond,
        }}
      >
        {second}
      </div>
    </div>
  );
}
