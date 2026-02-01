/**
 * TaskFlowWithDevTools - Complete TaskFlow Application with DevTools Integration
 *
 * This is the main entry point for the TaskFlow application that integrates:
 * - Container hierarchy demonstration
 * - All containers registered with DevTools using useRegisterContainer
 * - DevTools panel integration in sidebar
 * - Complete route structure with navigation
 *
 * @packageDocumentation
 */

import * as React from "react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer, type Container } from "@hex-di/runtime";
import { HexDiDevTools } from "@hex-di/devtools/react";

import { TaskFlowProviders } from "./providers.js";
import { routes } from "./routes.js";
import { AppLayout } from "./components/layout/AppLayout.js";
import { ModalProvider } from "./components/modals/ModalProvider.js";
import { FlowStateInspector } from "./components/devtools/FlowStateInspector.js";
import {
  ContainerHierarchy,
  type ContainerHierarchyEntry,
} from "./components/devtools/ContainerHierarchy.js";
import { UIPreferencesStorePort, UserSessionStorePort } from "./stores/ports.js";
import { UIPreferencesStoreAdapter, UserSessionStoreAdapter } from "./stores/adapters.js";

// =============================================================================
// Graph Definitions
// =============================================================================

/**
 * Root graph with common services.
 * Provides: UI Preferences Store, User Session Store
 */
const rootGraph = GraphBuilder.create()
  .provide(UIPreferencesStoreAdapter)
  .provide(UserSessionStoreAdapter)
  .build();

// =============================================================================
// Container Creation (built-in tracing and inspection)
// =============================================================================

/**
 * Create root container with built-in tracing and inspection.
 */
function createRootContainer() {
  return createContainer(rootGraph, { name: "Root Container" });
}

// Type for the initialized root container
type InitializedRootContainer = Container<
  typeof UIPreferencesStorePort | typeof UserSessionStorePort,
  never,
  never,
  "initialized"
>;

// =============================================================================
// Container Context
// =============================================================================

interface ContainerContextValue {
  readonly root: InitializedRootContainer;
}

const ContainerContext = React.createContext<ContainerContextValue | null>(null);

/**
 * Hook to access all containers.
 */
export function useContainers(): ContainerContextValue {
  const context = React.useContext(ContainerContext);
  if (!context) {
    throw new Error("useContainers must be used within TaskFlowWithDevTools");
  }
  return context;
}

// =============================================================================
// DevTools Panel Content
// =============================================================================

interface TaskFlowDevToolsPanelProps {
  readonly flowState: string;
  readonly eventHistory: Array<{
    timestamp: number;
    type: string;
    payload: Record<string, unknown>;
  }>;
}

function TaskFlowDevToolsPanel({ flowState, eventHistory }: TaskFlowDevToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<"flow" | "containers" | "graph">("flow");

  // Build container hierarchy data
  const containerHierarchy: ContainerHierarchyEntry[] = useMemo(
    () => [
      {
        id: "root",
        label: "Root Container",
        kind: "root" as const,
        parentId: null,
        services: ["UIPreferencesStore", "UserSessionStore"],
      },
      {
        id: "dashboard",
        label: "Dashboard Container",
        kind: "child" as const,
        parentId: "root",
        services: ["TaskApiService", "TaskCacheService", "TaskFlowService"],
      },
      {
        id: "task-detail",
        label: "Task Detail Container",
        kind: "child" as const,
        parentId: "root",
        services: ["TaskApiService", "TaskCacheService"],
      },
      {
        id: "settings",
        label: "Settings Container",
        kind: "child" as const,
        parentId: "root",
        services: ["UIPreferencesStore"],
      },
      {
        id: "onboarding",
        label: "Onboarding Container",
        kind: "child" as const,
        parentId: "root",
        services: ["UserSessionStore", "UIPreferencesStore"],
      },
    ],
    []
  );

  // Parse flow state for inspector
  const availableTransitions = useMemo(() => {
    // Map current state to available transitions
    const stateTransitions: Record<string, string[]> = {
      dashboard: ["NAVIGATE_TO_TASK", "NAVIGATE_TO_SETTINGS", "CREATE_TASK", "LOGOUT"],
      newTask: ["CANCEL", "SUBMIT", "BACK"],
      taskDetail: ["BACK", "EDIT", "DELETE", "ARCHIVE"],
      settings: ["BACK", "SAVE", "RESET"],
      onboarding: ["NEXT", "BACK", "SKIP", "COMPLETE"],
    };

    const baseState = flowState.split(".")[0];
    return stateTransitions[baseState] ?? [];
  }, [flowState]);

  const context = useMemo(
    () => ({
      currentRoute: typeof window !== "undefined" ? window.location.pathname : "/",
      previousRoute: null,
      params: {},
    }),
    []
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("flow")}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === "flow"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Flow State
        </button>
        <button
          onClick={() => setActiveTab("containers")}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === "containers"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Containers
        </button>
        <button
          onClick={() => setActiveTab("graph")}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === "graph"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Graph
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "flow" && (
          <FlowStateInspector
            machineName="navigationMachine"
            currentState={flowState}
            context={context}
            availableTransitions={availableTransitions}
            eventHistory={eventHistory}
          />
        )}

        {activeTab === "containers" && (
          <ContainerHierarchy containers={containerHierarchy} selectedId="root" showServices />
        )}

        {activeTab === "graph" && (
          <div className="text-sm text-gray-500 text-center py-8">
            <p>Graph visualization requires HexDiDevTools.</p>
            <p className="text-xs mt-2">Toggle the floating DevTools for full graph view.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Layout with DevTools
// =============================================================================

interface TaskFlowLayoutProps {
  readonly container: InitializedRootContainer;
}

function TaskFlowLayout({ container }: TaskFlowLayoutProps) {
  const location = useLocation();

  // Get UI preferences from root container
  const uiStore = container.resolve(UIPreferencesStorePort);
  const userStore = container.resolve(UserSessionStorePort);

  // Local state for sidebar and DevTools
  const [sidebarCollapsed, setSidebarCollapsed] = useState(uiStore.getState().sidebarCollapsed);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [eventHistory, setEventHistory] = useState<
    Array<{ timestamp: number; type: string; payload: Record<string, unknown> }>
  >([]);

  // Sync with store
  useEffect(() => {
    const unsubscribe = uiStore.subscribe(state => {
      setSidebarCollapsed(state.sidebarCollapsed);
    });
    return unsubscribe;
  }, [uiStore]);

  // Track navigation events
  useEffect(() => {
    setEventHistory(prev => [
      ...prev.slice(-9), // Keep last 10 events
      {
        timestamp: Date.now(),
        type: "NAVIGATE",
        payload: { to: location.pathname },
      },
    ]);
  }, [location.pathname]);

  // Map route to flow state
  const flowState = useMemo(() => {
    const path = location.pathname;
    if (path === "/") return "dashboard.taskList.idle";
    if (path === "/tasks/new") return "newTask.form.step1";
    if (path.startsWith("/tasks/")) return "taskDetail.viewing";
    if (path === "/settings") return "settings.general";
    if (path === "/onboarding") return "onboarding.step1";
    return "unknown";
  }, [location.pathname]);

  // Determine active container name based on route
  const containerName = useMemo(() => {
    const path = location.pathname;
    if (path === "/" || path.startsWith("/tasks")) return "root > dashboard";
    if (path === "/settings") return "root > settings";
    if (path === "/onboarding") return "root > onboarding";
    return "root";
  }, [location.pathname]);

  const handleToggleSidebar = useCallback(() => {
    uiStore.getState().toggleSidebar();
  }, [uiStore]);

  const handleToggleDevTools = useCallback(() => {
    setDevToolsOpen(prev => !prev);
  }, []);

  const user = userStore.getState().user;

  return (
    <AppLayout
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={handleToggleSidebar}
      flowState={flowState}
      containerName={containerName}
      user={user}
      devToolsOpen={devToolsOpen}
      onToggleDevTools={handleToggleDevTools}
      devToolsPanel={<TaskFlowDevToolsPanel flowState={flowState} eventHistory={eventHistory} />}
    >
      <Outlet />
    </AppLayout>
  );
}

// =============================================================================
// TaskFlowWithDevTools Component
// =============================================================================

/**
 * Complete TaskFlow application with DevTools integration.
 *
 * Sets up:
 * - Root container with TracingPlugin and InspectorPlugin
 * - DevTools registration
 * - Layout with sidebar DevTools panel
 * - Floating HexDiDevTools for full inspection
 *
 * @example
 * ```tsx
 * // In main.tsx:
 * import { TaskFlowWithDevTools } from './taskflow/TaskFlowWithDevTools';
 *
 * createRoot(document.getElementById('root')!).render(
 *   <StrictMode>
 *     <TaskFlowWithDevTools />
 *   </StrictMode>
 * );
 * ```
 */
export function TaskFlowWithDevTools() {
  // Create and initialize container
  const [initializedContainer, setInitializedContainer] = useState<InitializedRootContainer | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Create container once
  const rootContainer = useMemo(() => createRootContainer(), []);

  // Initialize container on mount
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const initialized = await rootContainer.initialize();
        if (!cancelled) {
          setInitializedContainer(initialized);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [rootContainer]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Initializing TaskFlow...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-lg max-w-md">
          <h2 className="font-bold text-lg mb-2">Initialization Error</h2>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Container should be initialized at this point
  if (!initializedContainer) {
    return null;
  }

  return (
    <TaskFlowProviders>
      <ContainerContext.Provider value={{ root: initializedContainer }}>
        <ModalProvider>
          {/* Main application layout */}
          <TaskFlowLayout container={initializedContainer} />
        </ModalProvider>

        {/* Floating DevTools - auto-discovers all child containers */}
        <HexDiDevTools container={initializedContainer} position="bottom-right" />
      </ContainerContext.Provider>
    </TaskFlowProviders>
  );
}

/**
 * Routes configuration for TaskFlowWithDevTools.
 * Wraps routes with the main layout.
 */
export const taskFlowWithDevToolsRoutes = [
  {
    element: <TaskFlowWithDevTools />,
    children: routes,
  },
];
