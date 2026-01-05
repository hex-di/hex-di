/**
 * AppLayout Component
 *
 * Main application layout for the TaskFlow project management dashboard.
 *
 * Features:
 * - Header with search, user menu, and responsive controls
 * - Sidebar slot for navigation
 * - Main content area for route outlet
 * - Optional DevTools panel slot
 * - Responsive breakpoints for different screen sizes
 *
 * @packageDocumentation
 */

import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.js";
import { BottomNavigation } from "./BottomNavigation.js";
import { useResponsive } from "./use-responsive.js";
import type { User } from "../../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the AppLayout component.
 */
export interface AppLayoutProps {
  /** Whether sidebar is collapsed (controlled) */
  readonly sidebarCollapsed: boolean;
  /** Callback to toggle sidebar collapse state */
  readonly onToggleSidebar: () => void;
  /** Current flow state path */
  readonly flowState: string;
  /** Current container name */
  readonly containerName: string;
  /** Current authenticated user */
  readonly user: User | null;
  /** Children to render in main content area (optional, uses Outlet by default) */
  readonly children?: React.ReactNode;
  /** Whether DevTools panel is open */
  readonly devToolsOpen?: boolean;
  /** Callback to toggle DevTools panel */
  readonly onToggleDevTools?: () => void;
  /** DevTools panel content */
  readonly devToolsPanel?: React.ReactNode;
}

// =============================================================================
// Icons
// =============================================================================

function SearchIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function MenuIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

function ChevronDownIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// =============================================================================
// Header Component
// =============================================================================

interface HeaderProps {
  readonly user: User | null;
  readonly onMenuClick?: () => void;
  readonly showMenuButton: boolean;
}

function Header({ user, onMenuClick, showMenuButton }: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName = user?.displayName ?? "Guest";
  const initials = displayName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shadow-sm">
      {/* Left section: Menu button (mobile) and Logo */}
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg md:hidden"
            aria-label="Open menu"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
        )}
        <span className="text-xl font-bold text-gray-800 hidden md:block">TaskFlow</span>
      </div>

      {/* Center section: Search */}
      <div className="flex-1 max-w-xl mx-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="search"
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 border border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
          />
        </div>
      </div>

      {/* Right section: User menu */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-expanded={userMenuOpen}
          aria-haspopup="true"
        >
          {/* Avatar */}
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center w-8 h-8 text-sm font-medium text-white bg-blue-600 rounded-full">
              {initials}
            </div>
          )}

          {/* Name (hidden on mobile) */}
          <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
            {displayName}
          </span>

          <ChevronDownIcon className="hidden md:block w-4 h-4 text-gray-400" />
        </button>

        {/* Dropdown menu */}
        {userMenuOpen && (
          <>
            {/* Backdrop for closing */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setUserMenuOpen(false)}
              aria-hidden="true"
            />

            <div className="absolute right-0 z-50 w-48 mt-2 py-1 bg-white border border-gray-200 rounded-lg shadow-lg">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{displayName}</p>
                {user?.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
              </div>
              <button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100">
                Profile
              </button>
              <button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100">
                Settings
              </button>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50">
                  Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

// =============================================================================
// AppLayout Component
// =============================================================================

/**
 * Main application layout component.
 *
 * Provides the overall structure of the TaskFlow application:
 * - Responsive layout with sidebar, content area, and optional DevTools panel
 * - Header with search and user menu
 * - Adaptive navigation (sidebar on desktop/tablet, bottom nav on mobile)
 *
 * @example
 * ```tsx
 * <AppLayout
 *   sidebarCollapsed={collapsed}
 *   onToggleSidebar={() => setCollapsed(!collapsed)}
 *   flowState="dashboard.idle"
 *   containerName="root"
 *   user={currentUser}
 * >
 *   <Outlet />
 * </AppLayout>
 * ```
 */
export function AppLayout({
  sidebarCollapsed,
  onToggleSidebar,
  flowState,
  containerName,
  user,
  children,
  devToolsOpen = false,
  onToggleDevTools,
  devToolsPanel,
}: AppLayoutProps) {
  const { isMobile, showBottomNav, shouldCollapseSidebar, canShowDevToolsPanel } = useResponsive();

  // Combine prop-controlled collapsed state with responsive behavior
  const effectiveCollapsed = shouldCollapseSidebar || sidebarCollapsed;

  // Mobile sidebar drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleMenuClick = useCallback(() => {
    setMobileDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setMobileDrawerOpen(false);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <Header user={user} onMenuClick={handleMenuClick} showMenuButton={isMobile} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - hidden on mobile, shown on tablet/desktop */}
        {!isMobile && (
          <Sidebar
            collapsed={effectiveCollapsed}
            onToggleCollapse={onToggleSidebar}
            flowState={flowState}
            containerName={containerName}
            devToolsOpen={devToolsOpen}
            onToggleDevTools={onToggleDevTools}
          />
        )}

        {/* Mobile Drawer Sidebar */}
        {isMobile && mobileDrawerOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={handleDrawerClose}
              aria-hidden="true"
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl">
              <Sidebar
                collapsed={false}
                onToggleCollapse={handleDrawerClose}
                flowState={flowState}
                containerName={containerName}
                devToolsOpen={devToolsOpen}
                onToggleDevTools={onToggleDevTools}
              />
            </div>
          </>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${showBottomNav ? "pb-20" : ""}`}>
          {children ?? <Outlet />}
        </main>

        {/* DevTools Panel - only on desktop when open */}
        {canShowDevToolsPanel && devToolsOpen && devToolsPanel && (
          <aside className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
            {devToolsPanel}
          </aside>
        )}
      </div>

      {/* Bottom Navigation - mobile only */}
      {showBottomNav && <BottomNavigation />}
    </div>
  );
}
