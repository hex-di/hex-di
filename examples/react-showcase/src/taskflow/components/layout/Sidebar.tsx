/**
 * Sidebar Component
 *
 * Collapsible sidebar navigation for the TaskFlow application.
 *
 * Features:
 * - Expanded state with icon + label
 * - Collapsed state with icon only
 * - Tooltip on hover in collapsed mode
 * - Flow state indicator in footer
 * - Container name display
 * - DevTools toggle button
 *
 * @packageDocumentation
 */

import { useState } from "react";
import { NavigationItem, SubmenuItem, type NavigationIconType } from "./NavigationItem.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the Sidebar component.
 */
export interface SidebarProps {
  /** Whether the sidebar is collapsed */
  readonly collapsed: boolean;
  /** Callback to toggle collapsed state */
  readonly onToggleCollapse: () => void;
  /** Current flow state path (e.g., "dashboard.taskList.idle") */
  readonly flowState: string;
  /** Current container name (e.g., "root > dashboard") */
  readonly containerName: string;
  /** Whether DevTools panel is open */
  readonly devToolsOpen?: boolean;
  /** Callback to toggle DevTools panel */
  readonly onToggleDevTools?: () => void;
}

// =============================================================================
// Navigation Configuration
// =============================================================================

interface NavItem {
  readonly to: string;
  readonly icon: NavigationIconType;
  readonly label: string;
  readonly hasSubmenu?: boolean;
  readonly submenuItems?: ReadonlyArray<{ readonly to: string; readonly label: string }>;
  readonly end?: boolean;
}

const navigationItems: readonly NavItem[] = [
  { to: "/taskflow", icon: "dashboard", label: "Dashboard", end: true },
  { to: "/taskflow/tasks/new", icon: "plus", label: "New Task" },
  {
    to: "/taskflow/projects",
    icon: "folder",
    label: "Projects",
    hasSubmenu: true,
    submenuItems: [
      { to: "/taskflow/projects/frontend", label: "Frontend" },
      { to: "/taskflow/projects/backend", label: "Backend" },
      { to: "/taskflow/projects/new", label: "+ New Project" },
    ],
  },
  { to: "/taskflow/team", icon: "users", label: "Team" },
  { to: "/taskflow/settings", icon: "settings", label: "Settings" },
];

// =============================================================================
// Icons
// =============================================================================

function ChevronLeftIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CodeBracketIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
      />
    </svg>
  );
}

// =============================================================================
// Sidebar Component
// =============================================================================

/**
 * Sidebar navigation component.
 *
 * Features:
 * - Collapsible design with smooth transitions
 * - Navigation items with icons and labels
 * - Submenu support for Projects section
 * - Flow state and container display in footer
 * - DevTools toggle integration
 *
 * @example
 * ```tsx
 * <Sidebar
 *   collapsed={false}
 *   onToggleCollapse={() => setSidebarCollapsed(!collapsed)}
 *   flowState="dashboard.idle"
 *   containerName="root"
 *   devToolsOpen={false}
 *   onToggleDevTools={() => setDevToolsOpen(!devToolsOpen)}
 * />
 * ```
 */
export function Sidebar({
  collapsed,
  onToggleCollapse,
  flowState,
  containerName,
  devToolsOpen = false,
  onToggleDevTools,
}: SidebarProps) {
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const handleMenuExpand = (itemLabel: string) => (expanded: boolean) => {
    setExpandedMenus(prev => ({
      ...prev,
      [itemLabel]: expanded,
    }));
  };

  return (
    <aside
      data-testid="sidebar"
      className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-gray-100">
        {!collapsed && (
          <span className="text-lg font-semibold text-gray-800 truncate">TaskFlow</span>
        )}
        <button
          onClick={onToggleCollapse}
          className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${
            collapsed ? "mx-auto" : ""
          }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRightIcon className="w-4 h-4" />
          ) : (
            <ChevronLeftIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map(item => (
          <NavigationItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
            expanded={expandedMenus[item.label] || false}
            onExpandChange={item.hasSubmenu ? handleMenuExpand(item.label) : undefined}
            end={item.end}
          >
            {item.hasSubmenu &&
              item.submenuItems?.map(subItem => (
                <SubmenuItem key={subItem.to} to={subItem.to} label={subItem.label} />
              ))}
          </NavigationItem>
        ))}
      </nav>

      {/* Divider */}
      <div className="px-3">
        <div className="border-t border-gray-200" />
      </div>

      {/* DevTools Section */}
      <div className="px-2 py-3">
        <button
          onClick={onToggleDevTools}
          className={`w-full flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg transition-colors hover:bg-gray-100 ${
            devToolsOpen ? "bg-blue-50 text-blue-700" : ""
          }`}
          aria-label={devToolsOpen ? "Close DevTools" : "Open DevTools"}
        >
          <CodeBracketIcon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <span className="flex-1 text-left">
              {devToolsOpen ? "Close DevTools" : "Open DevTools"}
            </span>
          )}
        </button>
      </div>

      {/* Footer with Flow State and Container */}
      <div
        className={`px-3 py-3 border-t border-gray-200 bg-gray-50 ${
          collapsed ? "text-center" : ""
        }`}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-2 h-2 rounded-full bg-green-500"
              title={`Flow: ${flowState}\nContainer: ${containerName}`}
            />
          </div>
        ) : (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-gray-500 truncate">Flow:</span>
              <span className="text-gray-700 font-mono truncate flex-1">{flowState}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-gray-500 truncate">Container:</span>
              <span className="text-gray-700 font-mono truncate flex-1">{containerName}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
