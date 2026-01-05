/**
 * Layout Components Module
 *
 * Exports all layout and navigation components for the TaskFlow application.
 *
 * @packageDocumentation
 */

// =============================================================================
// AppLayout
// =============================================================================

export { AppLayout, type AppLayoutProps } from "./AppLayout.js";

// =============================================================================
// Sidebar
// =============================================================================

export { Sidebar, type SidebarProps } from "./Sidebar.js";

// =============================================================================
// NavigationItem
// =============================================================================

export {
  NavigationItem,
  SubmenuItem,
  type NavigationItemProps,
  type SubmenuItemProps,
  type NavigationIconType,
} from "./NavigationItem.js";

// =============================================================================
// BottomNavigation
// =============================================================================

export { BottomNavigation } from "./BottomNavigation.js";

// =============================================================================
// Responsive Hook
// =============================================================================

export {
  useResponsive,
  BREAKPOINTS,
  MOBILE_QUERY,
  TABLET_QUERY,
  DESKTOP_QUERY,
  type UseResponsiveResult,
  type ScreenSize,
} from "./use-responsive.js";
