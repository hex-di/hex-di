/**
 * useResizeObserver hook for tracking element dimensions.
 *
 * Uses the ResizeObserver API to report width and height changes.
 *
 * @packageDocumentation
 */

import { useEffect, useState } from "react";

interface Dimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * Tracks element dimensions via ResizeObserver.
 *
 * @param ref - Ref to the element to observe
 * @returns Current width and height of the element
 */
export function useResizeObserver(ref: React.RefObject<HTMLElement | null>): Dimensions {
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return dimensions;
}
