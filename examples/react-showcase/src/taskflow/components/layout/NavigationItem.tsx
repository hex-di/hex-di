/**
 * NavigationItem Component
 *
 * A navigation link item that displays an icon and label, with support for:
 * - Active state highlighting based on current route
 * - Collapsed mode (icon only) with tooltip on hover
 * - Disabled state
 * - Submenu support for expandable navigation
 *
 * @packageDocumentation
 */

import { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";

// =============================================================================
// Icon Components
// =============================================================================

/**
 * Available icon types for navigation items.
 */
export type NavigationIconType =
  | "dashboard"
  | "plus"
  | "folder"
  | "users"
  | "settings"
  | "devtools"
  | "chevron-down"
  | "chevron-right";

/**
 * Icon component props.
 */
interface IconProps {
  readonly type: NavigationIconType;
  readonly className?: string;
}

/**
 * Simple SVG icon component.
 */
function Icon({ type, className = "w-5 h-5" }: IconProps) {
  const icons: Record<NavigationIconType, React.ReactNode> = {
    dashboard: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    ),
    plus: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    folder: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        />
      </svg>
    ),
    users: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    settings: (
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
    ),
    devtools: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
    ),
    "chevron-down": (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ),
    "chevron-right": (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    ),
  };

  return <>{icons[type]}</>;
}

// =============================================================================
// Tooltip Component
// =============================================================================

interface TooltipProps {
  readonly content: string;
  readonly visible: boolean;
  readonly targetRef: React.RefObject<HTMLElement | null>;
}

/**
 * Tooltip component for displaying labels when sidebar is collapsed.
 */
function Tooltip({ content, visible, targetRef }: TooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (visible && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
      });
    }
  }, [visible, targetRef]);

  if (!visible) {
    return null;
  }

  return (
    <div
      role="tooltip"
      className="fixed z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg transform -translate-y-1/2 whitespace-nowrap"
      style={{ top: position.top, left: position.left }}
    >
      {content}
      <div className="absolute top-1/2 -left-1 w-2 h-2 bg-gray-900 transform -translate-y-1/2 rotate-45" />
    </div>
  );
}

// =============================================================================
// NavigationItem Component
// =============================================================================

/**
 * Props for the NavigationItem component.
 */
export interface NavigationItemProps {
  /** Route path to navigate to */
  readonly to: string;
  /** Icon type to display */
  readonly icon: NavigationIconType;
  /** Label text for the navigation item */
  readonly label: string;
  /** Whether the sidebar is collapsed (icon-only mode) */
  readonly collapsed: boolean;
  /** Whether this item is disabled */
  readonly disabled?: boolean;
  /** Child items for submenu */
  readonly children?: React.ReactNode;
  /** Whether submenu is expanded */
  readonly expanded?: boolean;
  /** Callback when submenu expand state changes */
  readonly onExpandChange?: (expanded: boolean) => void;
  /** Whether to match the route exactly (default: false) */
  readonly end?: boolean;
}

/**
 * Navigation item component for sidebar navigation.
 *
 * Features:
 * - Active state highlighting based on current route
 * - Collapsed mode with tooltip on hover
 * - Disabled state styling
 * - Optional submenu support
 *
 * @example
 * ```tsx
 * <NavigationItem
 *   to="/"
 *   icon="dashboard"
 *   label="Dashboard"
 *   collapsed={false}
 * />
 * ```
 */
export function NavigationItem({
  to,
  icon,
  label,
  collapsed,
  disabled = false,
  children,
  expanded = false,
  onExpandChange,
  end,
}: NavigationItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const itemRef = useRef<HTMLAnchorElement>(null);
  const hasSubmenu = Boolean(children);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }

    if (hasSubmenu && onExpandChange) {
      e.preventDefault();
      onExpandChange(!expanded);
    }
  };

  const handleMouseEnter = () => {
    if (collapsed) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Base classes for the navigation item
  const baseClasses =
    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 group relative";

  // Classes for different states
  const stateClasses = ({ isActive }: { isActive: boolean }) => {
    if (disabled) {
      return "text-gray-400 cursor-not-allowed";
    }
    if (isActive) {
      return "bg-blue-50 text-blue-700 font-medium";
    }
    return "text-gray-700 hover:bg-gray-100";
  };

  return (
    <>
      <NavLink
        ref={itemRef}
        to={to}
        end={end}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={({ isActive }) => `${baseClasses} ${stateClasses({ isActive })}`}
        aria-disabled={disabled}
        aria-expanded={hasSubmenu ? expanded : undefined}
      >
        <Icon type={icon} className="w-5 h-5 flex-shrink-0" />

        <span
          className={`flex-1 transition-opacity duration-200 ${
            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          }`}
        >
          {label}
        </span>

        {hasSubmenu && !collapsed && (
          <Icon
            type={expanded ? "chevron-down" : "chevron-right"}
            className="w-4 h-4 text-gray-400"
          />
        )}
      </NavLink>

      {/* Tooltip for collapsed mode */}
      <Tooltip content={label} visible={showTooltip} targetRef={itemRef} />

      {/* Submenu */}
      {hasSubmenu && expanded && !collapsed && (
        <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">{children}</div>
      )}
    </>
  );
}

/**
 * Submenu item component for nested navigation.
 */
export interface SubmenuItemProps {
  /** Route path to navigate to */
  readonly to: string;
  /** Label text */
  readonly label: string;
}

export function SubmenuItem({ to, label }: SubmenuItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-1.5 text-sm rounded transition-colors duration-150 ${
          isActive
            ? "bg-blue-50 text-blue-700 font-medium"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`
      }
    >
      {label}
    </NavLink>
  );
}
