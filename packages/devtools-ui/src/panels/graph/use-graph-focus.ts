/**
 * Focus management for graph panel.
 *
 * @packageDocumentation
 */

import { useCallback, useRef } from "react";

interface UseGraphFocusResult {
  readonly detailPanelRef: React.RefObject<HTMLDivElement | null>;
  readonly filterInputRef: React.RefObject<HTMLInputElement | null>;
  readonly sidebarRef: React.RefObject<HTMLDivElement | null>;
  focusDetailPanel(): void;
  focusFilterInput(): void;
  focusSidebar(): void;
  returnFocus(): void;
}

/**
 * Hook managing focus between graph panel regions.
 */
function useGraphFocus(): UseGraphFocusResult {
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);

  const focusDetailPanel = useCallback(() => {
    saveFocus();
    detailPanelRef.current?.focus();
  }, [saveFocus]);

  const focusFilterInput = useCallback(() => {
    saveFocus();
    filterInputRef.current?.focus();
  }, [saveFocus]);

  const focusSidebar = useCallback(() => {
    saveFocus();
    sidebarRef.current?.focus();
  }, [saveFocus]);

  const returnFocus = useCallback(() => {
    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, []);

  return {
    detailPanelRef,
    filterInputRef,
    sidebarRef,
    focusDetailPanel,
    focusFilterInput,
    focusSidebar,
    returnFocus,
  };
}

export { useGraphFocus };
export type { UseGraphFocusResult };
