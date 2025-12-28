/**
 * App component - Root component for the React Showcase Chat Dashboard.
 *
 * Sets up AsyncContainerProvider with the DI container and renders the
 * ChatRoom component. Uses compound components for loading/error states.
 * Includes DevToolsFloating with multi-container support via InspectorPlugin.
 *
 * @packageDocumentation
 */

// DevTools imports - multi-container support with ContainerRegistryProvider
import {
  DevToolsFloating,
  ContainerRegistryProvider,
  useRegisterContainer,
} from "@hex-di/devtools/react";
import { createContainer, pipe, createPluginWrapper, type Container } from "@hex-di/runtime";
import { TracingPlugin } from "@hex-di/tracing";
import { InspectorPlugin } from "@hex-di/inspector";

import { AsyncContainerProvider, ContainerProvider } from "./di/hooks.js";
import { appGraph } from "./di/graph.js";
import type { AppPorts } from "./di/ports.js";
import { createPluginChildContainer } from "./di/child-container.js";
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
 * Create the child container for feature isolation.
 *
 * Child containers now automatically inherit plugins from their parent.
 * This means the pluginContainer will have access to:
 * - TracingPlugin: Tracks resolutions in the child container
 * - InspectorPlugin: Enables inspection of child container state
 *
 * Resolutions in the child container will include inheritance metadata:
 * - containerId: "child-1" (auto-generated)
 * - containerKind: "child"
 * - inheritanceMode: "shared" | "forked" | "isolated"
 */
const pluginContainer = createPluginChildContainer(container);
const pluginContainerForProvider = pluginContainer as unknown as Container<
  AppPorts,
  never,
  never,
  "uninitialized"
>;

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
 * Wrapper component that registers the child container with DevTools.
 *
 * With plugin inheritance, child containers automatically inherit plugins
 * from their parent. This means TracingPlugin and InspectorPlugin both
 * track resolutions in the child container.
 */
function ChildContainerSection({ children }: { readonly children: React.ReactNode }) {
  useRegisterContainer(pluginContainer, {
    id: "child-plugin",
    label: "Plugin Container",
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
 * - ContainerRegistryProvider for multi-container DevTools support
 * - AsyncContainerProvider wraps the app and initializes async adapters
 * - Compound Components (Loading, Error, Ready) for state-based rendering
 * - ChatRoom is the main application content
 * - DevToolsFloating provides development tools with multi-container selection
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
    <ContainerRegistryProvider>
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

              {/* Grid shows root container and child container side-by-side */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Root Container - registers itself with DevTools */}
                <RootContainerSection>
                  <div className="rounded-xl border border-gray-200 bg-white/80 p-4 shadow-lg">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-800">
                        Root Container (persisted)
                      </h2>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        LocalStorage-backed store
                      </span>
                    </div>
                    <p className="mb-4 text-sm text-gray-600">
                      This is the base container defined by the app graph. Messages are persisted
                      via localStorage to showcase singleton behavior.
                    </p>
                    <ChatRoom />
                  </div>
                </RootContainerSection>

                {/* Child Container - inherits plugins from parent */}
                <ChildContainerSection>
                  <ContainerProvider container={pluginContainerForProvider}>
                    <div className="rounded-xl border border-purple-200 bg-white/80 p-4 shadow-lg">
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-800">
                          Child Container (plug-and-play)
                        </h2>
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                          In-memory overrides
                        </span>
                      </div>
                      <p className="mb-4 text-sm text-gray-600">
                        Built from the root via <code>createChild()</code>, this container swaps in
                        an ephemeral MessageStore and a tagged ChatService to demonstrate feature
                        isolation without touching the parent graph.
                      </p>
                      <ChatRoom />
                    </div>
                  </ContainerProvider>
                </ChildContainerSection>
              </div>

              {/* Feature explanation */}
              <footer className="mt-8 text-center text-sm text-gray-500">
                <p>
                  This showcase demonstrates singleton, scoped, request, and child container
                  lifetimes with reactive updates and DevTools integration.
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  DevTools support multi-container inspection with plugin inheritance. Both root and
                  child containers are tracked via InspectorPlugin.
                </p>
              </footer>
            </div>
          </div>
        </AsyncContainerProvider.Ready>

        {/* DevToolsFloating - now with multi-container support via ContainerRegistryProvider */}
        <DevToolsFloating graph={appGraph} container={container} position="bottom-right" />
      </AsyncContainerProvider>
    </ContainerRegistryProvider>
  );
}
