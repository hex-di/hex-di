/**
 * PrimitivesContext - React context for render primitives.
 *
 * This module provides the context infrastructure that enables shared
 * headless components to access platform-specific primitive components
 * (Box, Text, Button, etc.) without knowing which renderer is active.
 *
 * @packageDocumentation
 */

import { createContext, type ReactNode } from "react";
import type { RenderPrimitives, RendererType } from "../ports/render-primitives.port.js";

// =============================================================================
// PrimitivesContext
// =============================================================================

/**
 * React context for render primitives.
 *
 * This context holds the platform-specific primitive components:
 * - DOM: React DOM components with CSS styling
 * - TUI: OpenTUI components with ANSI colors
 *
 * @remarks
 * The context value is null when outside a PrimitivesProvider.
 * The usePrimitives hook checks for null and throws a helpful error.
 *
 * @internal
 */
export const PrimitivesContext = createContext<RenderPrimitives<RendererType> | null>(null);
PrimitivesContext.displayName = "HexDI.PrimitivesContext";

// =============================================================================
// PrimitivesProvider Component
// =============================================================================

/**
 * Props for the PrimitivesProvider component.
 */
export interface PrimitivesProviderProps {
  /**
   * The render primitives to provide to the React tree.
   *
   * This should be either DOMPrimitives from `@hex-di/devtools/dom`
   * or TUIPrimitives from `@hex-di/devtools/tui`.
   */
  readonly primitives: RenderPrimitives<RendererType>;

  /**
   * React children that will have access to the primitives via usePrimitives hook.
   */
  readonly children: ReactNode;
}

/**
 * Provider component that makes render primitives available to React components.
 *
 * PrimitivesProvider establishes the rendering context for shared headless
 * components. All components using usePrimitives() must be descendants of
 * a PrimitivesProvider.
 *
 * @param props - The provider props including primitives and children
 *
 * @remarks
 * - Typically used at the root of DevTools component tree
 * - DOM apps use this with DOMPrimitives
 * - TUI apps use this with TUIPrimitives
 * - Nested providers override parent context (though this is not typical usage)
 *
 * @example DOM usage
 * ```tsx
 * import { PrimitivesProvider } from '@hex-di/devtools';
 * import { DOMPrimitives } from '@hex-di/devtools/dom';
 *
 * function App() {
 *   return (
 *     <PrimitivesProvider primitives={DOMPrimitives}>
 *       <DevToolsPanel />
 *     </PrimitivesProvider>
 *   );
 * }
 * ```
 *
 * @example TUI usage
 * ```tsx
 * import { PrimitivesProvider } from '@hex-di/devtools';
 * import { TUIPrimitives } from '@hex-di/devtools/tui';
 *
 * function TuiApp() {
 *   return (
 *     <PrimitivesProvider primitives={TUIPrimitives}>
 *       <DevToolsPanel />
 *     </PrimitivesProvider>
 *   );
 * }
 * ```
 */
export function PrimitivesProvider({
  primitives,
  children,
}: PrimitivesProviderProps): React.ReactElement {
  return (
    <PrimitivesContext.Provider value={primitives}>
      {children}
    </PrimitivesContext.Provider>
  );
}
