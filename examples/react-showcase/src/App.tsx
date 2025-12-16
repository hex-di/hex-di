/**
 * App component - Root component for the React Showcase Chat Dashboard.
 *
 * Sets up AsyncContainerProvider with the DI container and renders the
 * ChatRoom component. Uses compound components for loading/error states.
 * Includes DevToolsFloating for development.
 *
 * @packageDocumentation
 */

import { DevToolsFloating, createTracingContainer } from "@hex-di/devtools";
import { AsyncContainerProvider } from "./di/hooks.js";
import { appGraph } from "./di/graph.js";
import { ChatRoom } from "./components/ChatRoom.js";

// =============================================================================
// Container Creation
// =============================================================================

/**
 * Create the DI container from the application graph.
 *
 * This is created at module level to ensure a single container instance
 * for the application lifetime. In SSR scenarios, this would be created
 * per-request instead.
 *
 * The container is wrapped with tracing to enable resolution tracking
 * in the DevTools panel.
 */
const container = createTracingContainer(appGraph);
// =============================================================================
// App Component
// =============================================================================

/**
 * Root application component.
 *
 * Features:
 * - AsyncContainerProvider wraps the app and initializes async adapters
 * - Compound Components (Loading, Error, Ready) for state-based rendering
 * - ChatRoom is the main application content
 * - DevToolsFloating provides development tools in bottom-right corner
 *
 * @example
 * ```tsx
 * import { StrictMode } from "react";
 * import { createRoot } from "react-dom/client";
 * import { App } from "./App";
 *
 * createRoot(document.getElementById("root")!).render(
 *   <StrictMode>
 *     <App />
 *   </StrictMode>
 * );
 * ```
 */
export function App(): JSX.Element {
  return (
    <AsyncContainerProvider container={container}>
      {/* Loading state - shown during async adapter initialization */}
      <AsyncContainerProvider.Loading>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto" />
            <p className="mt-4 text-gray-600">Initializing services...</p>
          </div>
        </div>
      </AsyncContainerProvider.Loading>

      {/* Error state - shown if initialization fails */}
      <AsyncContainerProvider.Error>
        {(error) => (
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
            <div className="bg-white border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-lg max-w-md">
              <h2 className="font-bold text-lg mb-2">Initialization Error</h2>
              <p className="text-sm">{error.message}</p>
            </div>
          </div>
        )}
      </AsyncContainerProvider.Error>

      {/* Ready state - shown when container is initialized */}
      <AsyncContainerProvider.Ready>
        {/* Main application layout */}
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
          <div className="container mx-auto px-4">
            {/* App title */}
            <header className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-800">
                HexDI React Showcase
              </h1>
              <p className="mt-2 text-gray-600">
                Real-Time Chat Dashboard demonstrating dependency injection
                patterns
              </p>
            </header>

            {/* Chat room content */}
            <ChatRoom />

            {/* Feature explanation */}
            <footer className="mt-8 text-center text-sm text-gray-500">
              <p>
                This showcase demonstrates singleton, scoped, and request
                lifetimes with reactive updates and DevTools integration.
              </p>
            </footer>
          </div>
        </div>

        {/* DevTools floating panel with tracing enabled */}
      </AsyncContainerProvider.Ready>
      <DevToolsFloating
        graph={appGraph}
        container={container}
        position="bottom-right"
      />
    </AsyncContainerProvider>
  );
}
