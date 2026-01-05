/**
 * useResponsive Hook
 *
 * Custom hook for responsive layout management in the TaskFlow application.
 *
 * Breakpoints:
 * - Desktop (1200px+): Full sidebar + DevTools panel
 * - Tablet (768-1199px): Collapsed sidebar icons
 * - Mobile (<768px): Bottom navigation bar
 *
 * @packageDocumentation
 */

import { useState, useEffect, useCallback } from "react";

// =============================================================================
// Breakpoint Constants
// =============================================================================

/**
 * Breakpoint values in pixels.
 */
export const BREAKPOINTS = {
  /** Mobile breakpoint (below this is mobile) */
  MOBILE: 768,
  /** Desktop breakpoint (above this is desktop) */
  DESKTOP: 1200,
} as const;

/**
 * Screen size categories.
 */
export type ScreenSize = "mobile" | "tablet" | "desktop";

// =============================================================================
// Types
// =============================================================================

/**
 * Return type for the useResponsive hook.
 */
export interface UseResponsiveResult {
  /** Current screen size category */
  readonly screenSize: ScreenSize;
  /** Whether viewport is mobile (<768px) */
  readonly isMobile: boolean;
  /** Whether viewport is tablet (768-1199px) */
  readonly isTablet: boolean;
  /** Whether viewport is desktop (>=1200px) */
  readonly isDesktop: boolean;
  /** Whether sidebar should be collapsed based on viewport */
  readonly shouldCollapseSidebar: boolean;
  /** Whether to show bottom navigation */
  readonly showBottomNav: boolean;
  /** Whether to show DevTools panel */
  readonly canShowDevToolsPanel: boolean;
  /** Current viewport width in pixels */
  readonly viewportWidth: number;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Determines the screen size category based on viewport width.
 */
function getScreenSize(width: number): ScreenSize {
  if (width < BREAKPOINTS.MOBILE) {
    return "mobile";
  }
  if (width < BREAKPOINTS.DESKTOP) {
    return "tablet";
  }
  return "desktop";
}

/**
 * Hook for responsive layout management.
 *
 * Provides information about the current viewport size and
 * derived values for layout decisions.
 *
 * @example
 * ```tsx
 * function AppLayout() {
 *   const {
 *     isMobile,
 *     shouldCollapseSidebar,
 *     showBottomNav,
 *   } = useResponsive();
 *
 *   return (
 *     <div>
 *       {!isMobile && <Sidebar collapsed={shouldCollapseSidebar} />}
 *       <main>Content</main>
 *       {showBottomNav && <BottomNavigation />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useResponsive(): UseResponsiveResult {
  const [viewportWidth, setViewportWidth] = useState<number>(() => {
    // SSR-safe initialization
    if (typeof window !== "undefined") {
      return window.innerWidth;
    }
    // Default to desktop for SSR
    return BREAKPOINTS.DESKTOP;
  });

  const handleResize = useCallback(() => {
    setViewportWidth(window.innerWidth);
  }, []);

  useEffect(() => {
    // Set initial value
    setViewportWidth(window.innerWidth);

    // Add event listener with debounce for performance
    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener("resize", debouncedResize);

    return () => {
      window.removeEventListener("resize", debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [handleResize]);

  // Derive all values from viewport width
  const screenSize = getScreenSize(viewportWidth);
  const isMobile = screenSize === "mobile";
  const isTablet = screenSize === "tablet";
  const isDesktop = screenSize === "desktop";

  return {
    screenSize,
    isMobile,
    isTablet,
    isDesktop,
    // Collapse sidebar on tablet, hide on mobile
    shouldCollapseSidebar: isTablet,
    // Show bottom nav only on mobile
    showBottomNav: isMobile,
    // Show DevTools panel only on desktop
    canShowDevToolsPanel: isDesktop,
    viewportWidth,
  };
}

// =============================================================================
// Media Query Utilities
// =============================================================================

/**
 * Media query string for mobile viewport.
 */
export const MOBILE_QUERY = `(max-width: ${BREAKPOINTS.MOBILE - 1}px)`;

/**
 * Media query string for tablet viewport.
 */
export const TABLET_QUERY = `(min-width: ${BREAKPOINTS.MOBILE}px) and (max-width: ${BREAKPOINTS.DESKTOP - 1}px)`;

/**
 * Media query string for desktop viewport.
 */
export const DESKTOP_QUERY = `(min-width: ${BREAKPOINTS.DESKTOP}px)`;
