/**
 * Application shell layout.
 *
 * Provides the shared chrome for PokéNerve: header with logo, navigation
 * tabs for the six feature areas, a Brain View toggle button, the route
 * outlet, and the always-mounted BrainOverlay.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router";
import { useBrainView } from "../context/BrainViewContext.js";
import { BrainOverlay } from "../features/brain/BrainOverlay.js";

// ---------------------------------------------------------------------------
// Navigation link data
// ---------------------------------------------------------------------------

interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly color: string;
}

const navItems: readonly NavItem[] = [
  { to: "/discovery", label: "Discovery", color: "emerald" },
  { to: "/evolution", label: "Evolution Lab", color: "purple" },
  { to: "/type-graph", label: "Type Graph", color: "cyan" },
  { to: "/battle", label: "Battle", color: "red" },
  { to: "/trading", label: "Trading", color: "amber" },
  { to: "/research", label: "Research", color: "blue" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getActiveClass(color: string): string {
  const colorMap: Record<string, string> = {
    emerald: "border-emerald-400 text-emerald-400",
    purple: "border-purple-400 text-purple-400",
    cyan: "border-cyan-400 text-cyan-400",
    red: "border-red-400 text-red-400",
    amber: "border-amber-400 text-amber-400",
    blue: "border-blue-400 text-blue-400",
  };
  return colorMap[color] ?? "border-white text-white";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AppLayout(): ReactNode {
  const { toggleBrainView } = useBrainView();

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-tight text-white">
              Poke<span className="text-yellow-400">Nerve</span>
            </span>
            <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-xs font-medium text-yellow-300">
              hex-di showcase
            </span>
          </div>

          {/* Brain View toggle */}
          <button
            type="button"
            onClick={toggleBrainView}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-pink-500 hover:text-pink-400"
          >
            Brain View
            <span className="ml-2 text-xs text-gray-600">Ctrl+Shift+B</span>
          </button>
        </div>

        {/* Navigation tabs */}
        <nav className="flex gap-1 px-6">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? getActiveClass(item.color)
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Route content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Brain diagnostic overlay (always mounted, conditionally visible) */}
      <BrainOverlay />
    </div>
  );
}

export { AppLayout };
