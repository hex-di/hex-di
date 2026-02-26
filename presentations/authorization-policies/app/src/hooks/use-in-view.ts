import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollContainer } from "../context/scroll-container-context";

interface UseInViewOptions {
  readonly threshold?: number;
  readonly triggerOnce?: boolean;
}

interface UseInViewResult {
  readonly ref: (node: HTMLElement | null) => void;
  readonly isInView: boolean;
}

export function useInView({
  threshold = 0.15,
  triggerOnce = true,
}: UseInViewOptions = {}): UseInViewResult {
  const root = useScrollContainer();
  const [isInView, setIsInView] = useState(false);
  const nodeRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      cleanup();
      nodeRef.current = node;

      if (!node || !root) return;

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (triggerOnce) {
              cleanup();
            }
          } else if (!triggerOnce) {
            setIsInView(false);
          }
        },
        { root, threshold }
      );

      observerRef.current.observe(node);
    },
    [root, threshold, triggerOnce, cleanup]
  );

  useEffect(() => cleanup, [cleanup]);

  return { ref, isInView };
}
