/**
 * BottomNavigation Component
 *
 * Mobile bottom navigation bar for the TaskFlow application.
 *
 * Features:
 * - Icon-only navigation bar
 * - Active state indicator
 * - 5-item maximum display
 * - Fixed position at bottom of screen
 *
 * @packageDocumentation
 */

import { NavLink } from "react-router-dom";

// =============================================================================
// Icons
// =============================================================================

function DashboardIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}

function PlusIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function FolderIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

function UsersIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function SettingsIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

// =============================================================================
// Navigation Item Configuration
// =============================================================================

interface BottomNavItem {
  readonly to: string;
  readonly icon: React.ComponentType<{ readonly className?: string }>;
  readonly label: string;
  readonly testId: string;
  readonly end?: boolean;
}

const bottomNavItems: readonly BottomNavItem[] = [
  {
    to: "/taskflow",
    icon: DashboardIcon,
    label: "Dashboard",
    testId: "bottom-nav-dashboard",
    end: true,
  },
  { to: "/taskflow/tasks/new", icon: PlusIcon, label: "New Task", testId: "bottom-nav-new-task" },
  { to: "/taskflow/projects", icon: FolderIcon, label: "Projects", testId: "bottom-nav-projects" },
  { to: "/taskflow/team", icon: UsersIcon, label: "Team", testId: "bottom-nav-team" },
  {
    to: "/taskflow/settings",
    icon: SettingsIcon,
    label: "Settings",
    testId: "bottom-nav-settings",
  },
];

// =============================================================================
// BottomNavigation Component
// =============================================================================

/**
 * Mobile bottom navigation component.
 *
 * Displays a fixed bottom navigation bar with 5 icon-only navigation items.
 * Active state is indicated by color change and a small indicator dot.
 *
 * @example
 * ```tsx
 * // Typically rendered conditionally based on viewport
 * {isMobile && <BottomNavigation />}
 * ```
 */
export function BottomNavigation() {
  return (
    <nav
      data-testid="bottom-navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {bottomNavItems.map(item => {
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={item.testId}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full px-1 transition-colors ${
                  isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                }`
              }
              aria-label={item.label}
            >
              {({ isActive }) => (
                <>
                  <IconComponent className="w-6 h-6" />
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="w-1 h-1 mt-1 bg-blue-600 rounded-full" aria-hidden="true" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Safe area padding for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
}
