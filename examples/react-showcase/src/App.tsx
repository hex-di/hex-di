/**
 * App component - Root component for the React Showcase.
 *
 * Architecture:
 * - Unified root container with TracingPlugin and InspectorPlugin
 * - Chat Dashboard as child container (loads immediately)
 * - TaskFlow as lazy container (loads on navigation)
 * - Single HexDiDevTools panel for all containers
 *
 * Container Hierarchy:
 * ```
 * AppRootContainer (Logger, Config)
 * ├── ChatContainer (MessageStore, UserSession, ChatService, NotificationService)
 * │   ├── SharedChild (inherits parent singletons)
 * │   ├── ForkedChild (snapshot copy of parent singletons)
 * │   └── IsolatedChild (fresh instances)
 * └── TaskFlowContainer [LAZY] (TaskApi, TaskCache, FilterStore, etc.)
 * ```
 *
 * @example Usage
 * ```tsx
 * import { HexDiDevTools } from '@hex-di/devtools/react';
 * <HexDiDevTools container={rootContainer} />
 * ```
 *
 * The graph is automatically extracted from the container via InspectorPlugin.
 *
 * @packageDocumentation
 */

import { BrowserRouter, Routes, Route, NavLink, useRoutes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// DevTools imports
import { HexDiDevTools } from "@hex-di/devtools/react";
import { createContainer } from "@hex-di/runtime";

// React package imports for providers
import {
  HexDiAsyncContainerProvider,
  HexDiLazyContainerProvider,
  HexDiContainerProvider,
} from "@hex-di/react";

// DI graphs
import { rootGraph } from "./di/root-graph.js";
import { chatGraphFragment } from "./di/chat-graph.js";
import { createTaskflowGraphFragment } from "./taskflow/di/graph.js";

// Child container graph for Chat Dashboard inheritance demo
import { PluginChildGraph } from "./di/child-container.js";

// TaskFlow imports
import { routes as taskflowRoutes } from "./taskflow/routes.js";
import { ModalProvider } from "./taskflow/components/modals/index.js";

// Chat components
import { ChatRoom } from "./components/ChatRoom.js";

// =============================================================================
// Root Container (with built-in tracing and inspection)
// =============================================================================

/**
 * Root container with shared infrastructure (Logger, Config).
 * All feature containers are children of this root.
 *
 * Note: Tracing and inspection are now built-in features - no plugins needed.
 * Access via container.tracer and container.inspector properties.
 */
const rootContainer = createContainer(rootGraph, { name: "App Root" });

// =============================================================================
// Chat Container (child of root)
// =============================================================================

/**
 * Chat Dashboard container - child of root.
 * Adds chat-specific services (MessageStore, UserSession, ChatService, NotificationService).
 */
const chatContainer = rootContainer.createChild(chatGraphFragment, { name: "Chat Dashboard" });

/**
 * Create grandchild containers for inheritance demo.
 * These demonstrate shared/forked/isolated inheritance modes.
 */
const sharedChild = chatContainer.createChild(PluginChildGraph, { name: "Shared Child" });
const forkedChild = chatContainer.createChild(PluginChildGraph, {
  name: "Forked Child",
  inheritanceModes: { Logger: "forked" },
});
const isolatedChild = chatContainer.createChild(PluginChildGraph, {
  name: "Isolated Child",
  inheritanceModes: { Logger: "isolated" },
});

// =============================================================================
// QueryClient for TaskFlow
// =============================================================================

/**
 * QueryClient for TaskFlow's React Query integration.
 * Created at module level to persist across route changes.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// =============================================================================
// TaskFlow Lazy Container
// =============================================================================

/**
 * TaskFlow container - lazy loaded child of root.
 * Only loads when navigating to /taskflow.
 */
const lazyTaskflowContainer = rootContainer.createLazyChild(
  async () => {
    // Graph fragment is created here with access to queryClient
    return createTaskflowGraphFragment(queryClient);
  },
  { name: "TaskFlow" }
);

// =============================================================================
// NOTE: Manual container registration is no longer needed!
// HexDiDevTools now automatically discovers all child containers via
// InspectorPlugin's getChildContainers() method.
// =============================================================================

// =============================================================================
// Navigation Component
// =============================================================================

/**
 * Navigation bar for switching between demos.
 */
function AppNavigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-800">HexDI</span>
          <span className="text-sm text-gray-500">React Showcase</span>
        </div>
        <div className="flex gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-blue-500 text-white" : "text-gray-600 hover:bg-gray-100"
              }`
            }
          >
            Chat Dashboard
          </NavLink>
          <NavLink
            to="/taskflow"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-blue-500 text-white" : "text-gray-600 hover:bg-gray-100"
              }`
            }
          >
            TaskFlow
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

// =============================================================================
// Global Loading Component
// =============================================================================

function GlobalLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-4 text-gray-600">Initializing services...</p>
      </div>
    </div>
  );
}

function GlobalErrorDisplay({ error }: { readonly error: Error }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
      <div className="bg-white border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-lg max-w-md">
        <h2 className="font-bold text-lg mb-2">Initialization Error</h2>
        <p className="text-sm">{error.message}</p>
      </div>
    </div>
  );
}

// =============================================================================
// Chat Dashboard Demo
// =============================================================================

/**
 * Chat Dashboard demo component.
 * Demonstrates DI container inheritance patterns (shared, forked, isolated).
 *
 * NOTE: No manual registration needed! HexDiDevTools auto-discovers all
 * child containers via InspectorPlugin's getChildContainers() method.
 */
function ChatDashboardDemo() {
  return (
    <HexDiContainerProvider container={chatContainer}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 pt-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800">Chat Dashboard Demo</h1>
            <p className="mt-2 text-gray-600">
              Real-Time Chat demonstrating dependency injection inheritance patterns
            </p>
          </header>

          {/* Grid: Chat container and 3 grandchild containers */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Chat Root Container */}
            <div className="rounded-xl border border-gray-200 bg-white/80 p-4 shadow-lg h-full">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Chat Container</h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  LocalStorage-backed
                </span>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Base container with persisted messages via localStorage.
              </p>
              <ChatRoom scopePrefix="chat" />
            </div>

            {/* Shared Child */}
            <HexDiContainerProvider container={sharedChild}>
              <div className="rounded-xl border border-green-200 bg-white/80 p-4 shadow-lg h-full">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">Shared Child</h2>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    shared
                  </span>
                </div>
                <p className="mb-4 text-sm text-gray-600">
                  Shares parent&apos;s Logger instance. Changes are visible to parent.
                </p>
                <ChatRoom scopePrefix="shared" />
              </div>
            </HexDiContainerProvider>

            {/* Forked Child */}
            <HexDiContainerProvider container={forkedChild}>
              <div className="rounded-xl border border-amber-200 bg-white/80 p-4 shadow-lg h-full">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">Forked Child</h2>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    forked
                  </span>
                </div>
                <p className="mb-4 text-sm text-gray-600">
                  Gets a snapshot copy of Logger at creation time. Isolated from parent.
                </p>
                <ChatRoom scopePrefix="forked" />
              </div>
            </HexDiContainerProvider>

            {/* Isolated Child */}
            <HexDiContainerProvider container={isolatedChild}>
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
            </HexDiContainerProvider>
          </div>

          {/* Footer */}
          <footer className="mt-8 text-center text-sm text-gray-500">
            <p>
              This showcase demonstrates all three inheritance modes: <strong>shared</strong> (live
              reference), <strong>forked</strong> (snapshot copy), and <strong>isolated</strong>{" "}
              (fresh instances).
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Use DevTools to inspect each container. The graph view shows inheritance mode badges
              and distinguishes own vs inherited services with dashed borders.
            </p>
          </footer>
        </div>
      </div>
    </HexDiContainerProvider>
  );
}

// =============================================================================
// TaskFlow Demo
// =============================================================================

/**
 * TaskFlow demo component with lazy loading.
 * Graph only loads when navigating to /taskflow.
 *
 * NOTE: No manual registration needed! HexDiDevTools auto-discovers
 * lazy containers via InspectorPlugin's getChildContainers() method.
 */
function TaskFlowDemo() {
  const element = useRoutes(taskflowRoutes);

  return (
    <HexDiLazyContainerProvider lazyContainer={lazyTaskflowContainer}>
      {/* Loading state */}
      <HexDiLazyContainerProvider.Loading>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 pt-14">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto" />
            <p className="mt-4 text-gray-600">Loading TaskFlow...</p>
          </div>
        </div>
      </HexDiLazyContainerProvider.Loading>

      {/* Error state */}
      <HexDiLazyContainerProvider.Error>
        {error => (
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-100 pt-14">
            <div className="bg-white border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-lg max-w-md">
              <h2 className="font-bold text-lg mb-2">Failed to Load TaskFlow</h2>
              <p className="text-sm">{error.message}</p>
            </div>
          </div>
        )}
      </HexDiLazyContainerProvider.Error>

      {/* Ready state - no registration needed */}
      <HexDiLazyContainerProvider.Ready>
        <QueryClientProvider client={queryClient}>
          <ModalProvider>
            <div className="pt-14">{element}</div>
          </ModalProvider>
        </QueryClientProvider>
      </HexDiLazyContainerProvider.Ready>
    </HexDiLazyContainerProvider>
  );
}

// =============================================================================
// App Component
// =============================================================================

/**
 * Root application component.
 *
 * Features:
 * - Unified root container with TracingPlugin and InspectorPlugin
 * - HexDiDevTools auto-discovers all child containers via InspectorPlugin
 * - Single HexDiDevTools panel visible on all routes
 * - AsyncContainerProvider for root initialization
 * - Chat Dashboard (/) and TaskFlow (/taskflow/*) demos
 *
 * Just pass the root container to HexDiDevTools and it discovers all children.
 * The graph is automatically extracted from the container via InspectorPlugin.
 */
export function App() {
  return (
    <BrowserRouter>
      <HexDiAsyncContainerProvider container={rootContainer}>
        {/* Loading state for root container async initialization */}
        <HexDiAsyncContainerProvider.Loading>
          <GlobalLoadingSpinner />
        </HexDiAsyncContainerProvider.Loading>

        {/* Error state */}
        <HexDiAsyncContainerProvider.Error>
          {error => <GlobalErrorDisplay error={error} />}
        </HexDiAsyncContainerProvider.Error>

        {/* Ready state - root container initialized */}
        <HexDiAsyncContainerProvider.Ready>
          <AppNavigation />
          <Routes>
            <Route path="/" element={<ChatDashboardDemo />} />
            <Route path="/taskflow/*" element={<TaskFlowDemo />} />
          </Routes>
        </HexDiAsyncContainerProvider.Ready>
      </HexDiAsyncContainerProvider>

      {/* Single DevTools panel - auto-discovers all child containers */}
      <HexDiDevTools container={rootContainer} position="bottom-right" />
    </BrowserRouter>
  );
}
