/**
 * App component - Root component for the React Showcase Chat Dashboard.
 *
 * Sets up AsyncContainerProvider with the DI container and renders the
 * ChatRoom component. Uses compound components for loading/error states.
 * Includes HexDiDevTools with multi-container support via InspectorPlugin.
 *
 * @packageDocumentation
 */

// DevTools imports - multi-container support with HexDiDevToolsProvider
import { HexDiDevTools, HexDiDevToolsProvider, useRegisterContainer } from "@hex-di/devtools/react";
import { createContainer, pipe, createPluginWrapper } from "@hex-di/runtime";
import { TracingPlugin } from "@hex-di/tracing";
import { InspectorPlugin } from "@hex-di/inspector";

import { AsyncContainerProvider, ContainerProvider } from "./di/hooks.js";
import { appGraph } from "./di/graph.js";
import {
  createSharedChildContainer,
  createForkedChildContainer,
  createIsolatedChildContainer,
} from "./di/child-container.js";
import { ChatRoom } from "./components/ChatRoom.js";

// =============================================================================
// Container Creation with InspectorPlugin
// =============================================================================

// Plugin wrappers for enhancing containers
const withTracing = createPluginWrapper(TracingPlugin);
const withInspector = createPluginWrapper(InspectorPlugin);

/**
 * Create the root DI container with TracingPlugin and InspectorPlugin.
 *
 * This is created at module level to ensure a single container instance
 * for the application lifetime. In SSR scenarios, this would be created
 * per-request instead.
 *
 * The container includes (via wrapper pattern):
 * - TracingPlugin: Enables resolution tracking in DevTools
 * - InspectorPlugin: Enables real-time container state inspection
 */
const container = pipe(createContainer(appGraph), withTracing, withInspector);

/**
 * Create child containers with different inheritance modes.
 *
 * Child containers automatically inherit plugins from their parent.
 * This means each child will have access to:
 * - TracingPlugin: Tracks resolutions in the child container
 * - InspectorPlugin: Enables inspection of child container state
 *
 * The three inheritance modes demonstrate different behaviors:
 * - shared: Child shares parent's singleton instances (live reference)
 * - forked: Child gets a snapshot copy of parent's instances at creation
 * - isolated: Child creates completely fresh instances, ignoring parent's cache
 */
const sharedChild = createSharedChildContainer(container);
const forkedChild = createForkedChildContainer(container);
const isolatedChild = createIsolatedChildContainer(container);

// =============================================================================
// Container Registration Components
// =============================================================================

/**
 * Wrapper component that registers the root container with DevTools.
 * The root container has InspectorPlugin so it can be fully inspected.
 */
function RootContainerSection({ children }: { readonly children: React.ReactNode }) {
  useRegisterContainer(container, {
    id: "root",
    label: "Root Container",
    kind: "root",
  });

  return <>{children}</>;
}

/**
 * Wrapper component that registers the shared child container with DevTools.
 * Shared mode: Child shares parent's singleton instances (live reference).
 */
function SharedChildSection({ children }: { readonly children: React.ReactNode }) {
  useRegisterContainer(sharedChild, {
    id: "child-shared",
    label: "Shared Child",
    kind: "child",
    parentId: "root",
  });

  return <>{children}</>;
}

/**
 * Wrapper component that registers the forked child container with DevTools.
 * Forked mode: Child gets a snapshot copy of parent's instances at creation.
 */
function ForkedChildSection({ children }: { readonly children: React.ReactNode }) {
  useRegisterContainer(forkedChild, {
    id: "child-forked",
    label: "Forked Child",
    kind: "child",
    parentId: "root",
  });

  return <>{children}</>;
}

/**
 * Wrapper component that registers the isolated child container with DevTools.
 * Isolated mode: Child creates completely fresh instances, ignoring parent's cache.
 */
function IsolatedChildSection({ children }: { readonly children: React.ReactNode }) {
  useRegisterContainer(isolatedChild, {
    id: "child-isolated",
    label: "Isolated Child",
    kind: "child",
    parentId: "root",
  });

  return <>{children}</>;
}

// =============================================================================
// App Component
// =============================================================================

/**
 * Root application component.
 *
 * Features:
 * - HexDiDevToolsProvider for multi-container DevTools support
 * - AsyncContainerProvider wraps the app and initializes async adapters
 * - Compound Components (Loading, Error, Ready) for state-based rendering
 * - ChatRoom is the main application content
 * - HexDiDevTools provides development tools with multi-container selection
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
export function App() {
  return (
    <HexDiDevToolsProvider>
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
          {error => (
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
                <h1 className="text-3xl font-bold text-gray-800">HexDI React Showcase</h1>
                <p className="mt-2 text-gray-600">
                  Real-Time Chat Dashboard demonstrating dependency injection patterns
                </p>
              </header>

              {/* Grid shows root container and 3 child containers with different inheritance modes */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Root Container - registers itself with DevTools */}
                <RootContainerSection>
                  <div className="rounded-xl border border-gray-200 bg-white/80 p-4 shadow-lg h-full">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-800">Root Container</h2>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        LocalStorage-backed
                      </span>
                    </div>
                    <p className="mb-4 text-sm text-gray-600">
                      Base container with persisted messages via localStorage.
                    </p>
                    <ChatRoom scopePrefix="root" />
                  </div>
                </RootContainerSection>

                {/* Shared Child - shares parent's singleton instances */}
                <SharedChildSection>
                  <ContainerProvider container={sharedChild}>
                    <div className="rounded-xl border border-green-200 bg-white/80 p-4 shadow-lg h-full">
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-800">Shared Child</h2>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          shared
                        </span>
                      </div>
                      <p className="mb-4 text-sm text-gray-600">
                        Shares parent&apos;s Logger instance. Changes to Logger are visible to
                        parent.
                      </p>
                      <ChatRoom scopePrefix="shared" />
                    </div>
                  </ContainerProvider>
                </SharedChildSection>

                {/* Forked Child - snapshot copy of parent's instances */}
                <ForkedChildSection>
                  <ContainerProvider container={forkedChild}>
                    <div className="rounded-xl border border-amber-200 bg-white/80 p-4 shadow-lg h-full">
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-800">Forked Child</h2>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          forked
                        </span>
                      </div>
                      <p className="mb-4 text-sm text-gray-600">
                        Gets a snapshot copy of Logger at creation time. Isolated from parent
                        changes.
                      </p>
                      <ChatRoom scopePrefix="forked" />
                    </div>
                  </ContainerProvider>
                </ForkedChildSection>

                {/* Isolated Child - fresh instances, ignores parent's cache */}
                <IsolatedChildSection>
                  <ContainerProvider container={isolatedChild}>
                    <div className="rounded-xl border border-red-200 bg-white/80 p-4 shadow-lg h-full">
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-800">Isolated Child</h2>
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          isolated
                        </span>
                      </div>
                      <p className="mb-4 text-sm text-gray-600">
                        Creates fresh Logger instance, completely independent from parent.
                      </p>
                      <ChatRoom scopePrefix="isolated" />
                    </div>
                  </ContainerProvider>
                </IsolatedChildSection>
              </div>

              {/* Feature explanation */}
              <footer className="mt-8 text-center text-sm text-gray-500">
                <p>
                  This showcase demonstrates all three inheritance modes: <strong>shared</strong>{" "}
                  (live reference), <strong>forked</strong> (snapshot copy), and{" "}
                  <strong>isolated</strong> (fresh instances).
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Use DevTools to inspect each container. The graph view shows inheritance mode
                  badges and distinguishes own vs inherited services with dashed borders.
                </p>
              </footer>
            </div>
          </div>
        </AsyncContainerProvider.Ready>

        {/* HexDiDevTools - now with multi-container support via HexDiDevToolsProvider */}
        <HexDiDevTools graph={appGraph} container={container} position="bottom-right" />
      </AsyncContainerProvider>
    </HexDiDevToolsProvider>
  );
}
