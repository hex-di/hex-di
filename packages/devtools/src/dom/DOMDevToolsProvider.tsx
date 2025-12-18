/**
 * DOMDevToolsProvider - Provider for DOM-based DevTools.
 *
 * Wraps PrimitivesProvider with DOM primitives and handles
 * data source initialization for browser environments.
 *
 * @packageDocumentation
 */

import React, { type ReactNode, type ReactElement } from "react";
import { PrimitivesProvider } from "../hooks/primitives-context.js";
import { DOMPrimitives } from "./primitives.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Data source interface for DevTools state.
 *
 * This is a minimal interface that can be implemented by various
 * data sources (local, remote, mock, etc.).
 */
export interface DevToolsDataSource<TState = unknown> {
  /** Subscribe to state changes */
  subscribe?: (callback: (state: TState) => void) => () => void;
  /** Get current state */
  getState?: () => TState;
  /** Unsubscribe from state changes */
  unsubscribe?: () => void;
}

/**
 * Props for DOMDevToolsProvider.
 */
export interface DOMDevToolsProviderProps {
  /** React children that will use DevTools primitives */
  readonly children: ReactNode;
  /** Optional data source for DevTools state */
  readonly dataSource?: DevToolsDataSource;
}

// =============================================================================
// DOMDevToolsProvider Component
// =============================================================================

/**
 * Provider component for DOM-based DevTools.
 *
 * This component:
 * 1. Wraps children with PrimitivesProvider using DOMPrimitives
 * 2. Optionally accepts a data source for state management
 * 3. Handles browser-specific initialization
 *
 * @example Basic usage
 * ```tsx
 * import { DOMDevToolsProvider, FloatingDevTools } from '@hex-di/devtools/dom';
 *
 * function App() {
 *   return (
 *     <DOMDevToolsProvider>
 *       <FloatingDevTools viewModel={viewModel} />
 *     </DOMDevToolsProvider>
 *   );
 * }
 * ```
 *
 * @example With data source
 * ```tsx
 * import { DOMDevToolsProvider, FloatingDevTools } from '@hex-di/devtools/dom';
 * import { createLocalDataSource } from '@hex-di/devtools';
 *
 * function App() {
 *   const dataSource = createLocalDataSource(container);
 *
 *   return (
 *     <DOMDevToolsProvider dataSource={dataSource}>
 *       <FloatingDevTools viewModel={viewModel} />
 *     </DOMDevToolsProvider>
 *   );
 * }
 * ```
 */
export function DOMDevToolsProvider({
  children,
  dataSource: _dataSource,
}: DOMDevToolsProviderProps): ReactElement {
  // For now, data source handling is a no-op placeholder
  // Full implementation will be added in Task Group 4.3 (Network Layer)

  return (
    <PrimitivesProvider primitives={DOMPrimitives}>
      {children}
    </PrimitivesProvider>
  );
}
