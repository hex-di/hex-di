/**
 * Screen reader announcements for the graph panel.
 *
 * @packageDocumentation
 */

import { useCallback, useRef, useEffect } from "react";

interface UseGraphAnnouncementsResult {
  announce(message: string): void;
  readonly regionRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hook providing screen reader announcements via aria-live region.
 */
function useGraphAnnouncements(): UseGraphAnnouncementsResult {
  const regionRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const announce = useCallback((message: string) => {
    const region = regionRef.current;
    if (region === null) return;

    // Clear previous to ensure screen reader re-announces
    region.textContent = "";
    if (timeoutRef.current !== undefined) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      region.textContent = message;
    }, 50);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== undefined) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { announce, regionRef };
}

export { useGraphAnnouncements };
export type { UseGraphAnnouncementsResult };
