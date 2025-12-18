/**
 * TUIDevToolsProvider - TUI-specific primitives provider.
 *
 * This component wraps PrimitivesProvider with TUI primitives,
 * providing a convenient way to set up the TUI rendering context.
 *
 * @packageDocumentation
 */

import React, { type ReactNode } from "react";
import { PrimitivesProvider } from "../hooks/primitives-context.js";
import { TUIPrimitives } from "./primitives.js";

// =============================================================================
// Props Interface
// =============================================================================

/**
 * Props for the TUIDevToolsProvider component.
 */
export interface TUIDevToolsProviderProps {
  /** React children that will have access to TUI primitives */
  readonly children: ReactNode;
}

// =============================================================================
// TUIDevToolsProvider Component
// =============================================================================

/**
 * Provider component that configures TUI primitives for DevTools.
 *
 * This is a convenience wrapper around PrimitivesProvider that automatically
 * uses TUIPrimitives. Use this at the root of your TUI DevTools application.
 *
 * @example
 * ```tsx
 * import { TUIDevToolsProvider, HeadlessDevToolsPanel } from '@hex-di/devtools/tui';
 * import { render } from '@opentui/core';
 *
 * render(
 *   <TUIDevToolsProvider>
 *     <HeadlessDevToolsPanel viewModel={viewModel} />
 *   </TUIDevToolsProvider>
 * );
 * ```
 */
export function TUIDevToolsProvider({
  children,
}: TUIDevToolsProviderProps): React.ReactElement {
  return (
    <PrimitivesProvider primitives={TUIPrimitives}>
      {children}
    </PrimitivesProvider>
  );
}
