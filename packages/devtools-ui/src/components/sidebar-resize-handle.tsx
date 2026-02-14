/**
 * SidebarResizeHandle component for resizing the sidebar.
 *
 * A 4px-wide invisible drag handle on the right edge of the sidebar.
 * Supports mouse and touch interactions.
 *
 * @packageDocumentation
 */

import { useCallback, useRef } from "react";

interface SidebarResizeHandleProps {
  readonly onResize: (deltaX: number) => void;
  readonly onResizeEnd?: () => void;
}

/**
 * SidebarResizeHandle renders an invisible drag handle.
 */
function SidebarResizeHandle({
  onResize,
  onResizeEnd,
}: SidebarResizeHandleProps): React.ReactElement {
  const startXRef = useRef(0);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      startXRef.current = event.clientX;

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        const delta = moveEvent.clientX - startXRef.current;
        startXRef.current = moveEvent.clientX;
        onResize(delta);
      };

      const handleMouseUp = (): void => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        onResizeEnd?.();
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onResize, onResizeEnd]
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      const touch = event.touches[0];
      if (touch === undefined) return;
      startXRef.current = touch.clientX;

      const handleTouchMove = (moveEvent: TouchEvent): void => {
        const currentTouch = moveEvent.touches[0];
        if (currentTouch === undefined) return;
        const delta = currentTouch.clientX - startXRef.current;
        startXRef.current = currentTouch.clientX;
        onResize(delta);
      };

      const handleTouchEnd = (): void => {
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
        onResizeEnd?.();
      };

      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
    },
    [onResize, onResizeEnd]
  );

  return (
    <div
      data-testid="sidebar-resize-handle"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        width: "4px",
        cursor: "ew-resize",
        flexShrink: 0,
        backgroundColor: "transparent",
        zIndex: 10,
      }}
      role="separator"
      aria-orientation="vertical"
    />
  );
}

export { SidebarResizeHandle };
export type { SidebarResizeHandleProps };
