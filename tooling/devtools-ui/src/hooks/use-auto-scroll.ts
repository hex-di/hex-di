/**
 * useAutoScroll hook for automatic bottom-scrolling.
 *
 * Auto-scrolls a container element to bottom when new content arrives.
 * Pauses auto-scroll when user scrolls up manually.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface AutoScrollState {
  readonly isAutoScrolling: boolean;
  scrollToBottom(): void;
}

/**
 * Auto-scrolls a container element to the bottom when new content arrives.
 * Pauses auto-scroll when the user manually scrolls up.
 *
 * @param ref - Ref to the scrollable container element
 */
export function useAutoScroll(ref: React.RefObject<HTMLElement | null>): AutoScrollState {
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const isAtBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    const element = ref.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
      setIsAutoScrolling(true);
      isAtBottomRef.current = true;
    }
  }, [ref]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const handleScroll = (): void => {
      const threshold = 20;
      const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
      isAtBottomRef.current = atBottom;
      setIsAutoScrolling(atBottom);
    };

    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  }, [ref]);

  // MutationObserver to detect new content and auto-scroll
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new MutationObserver(() => {
      if (isAtBottomRef.current) {
        element.scrollTop = element.scrollHeight;
      }
    });

    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [ref]);

  return {
    isAutoScrolling,
    scrollToBottom,
  };
}
