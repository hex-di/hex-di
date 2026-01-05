/**
 * Provider components for the TaskFlow application.
 *
 * Sets up React Router and React Query providers in a composable structure.
 * These providers wrap the application and provide routing and server state
 * management capabilities to all child components.
 *
 * @packageDocumentation
 */

import { type ReactNode } from "react";
import { BrowserRouter, useRoutes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { createQueryClient } from "./query-client.js";
import { routes } from "./routes.js";

// =============================================================================
// Singleton QueryClient
// =============================================================================

/**
 * Singleton QueryClient instance for the application.
 *
 * Created at module level to ensure a single instance across the app.
 * In SSR scenarios, this should be created per-request instead.
 */
let queryClientInstance: QueryClient | null = null;

/**
 * Gets the singleton QueryClient instance.
 *
 * Creates a new instance if one doesn't exist, otherwise returns the existing one.
 * This ensures consistent cache state across the application.
 *
 * @returns The singleton QueryClient instance
 */
export function getQueryClient(): QueryClient {
  if (queryClientInstance === null) {
    queryClientInstance = createQueryClient();
  }
  return queryClientInstance;
}

/**
 * Resets the QueryClient instance (useful for testing).
 *
 * @internal
 */
export function resetQueryClient(): void {
  queryClientInstance = null;
}

// =============================================================================
// Route Renderer Component
// =============================================================================

/**
 * Renders the application routes using React Router's useRoutes hook.
 *
 * This component must be rendered inside a Router context (e.g., BrowserRouter).
 */
function RouteRenderer() {
  return useRoutes(routes);
}

// =============================================================================
// Provider Props
// =============================================================================

/**
 * Props for the TaskFlowProviders component.
 */
interface TaskFlowProvidersProps {
  /** Child components to wrap with providers */
  readonly children: ReactNode;
  /** Optional custom QueryClient for testing */
  readonly queryClient?: QueryClient;
}

/**
 * Props for the TaskFlowRouterProvider component.
 */
interface TaskFlowRouterProviderProps {
  /** Child components to wrap with router */
  readonly children: ReactNode;
}

/**
 * Props for the TaskFlowQueryProvider component.
 */
interface TaskFlowQueryProviderProps {
  /** Child components to wrap with query provider */
  readonly children: ReactNode;
  /** Optional custom QueryClient for testing */
  readonly queryClient?: QueryClient;
}

// =============================================================================
// Individual Providers
// =============================================================================

/**
 * Router provider for the TaskFlow application.
 *
 * Wraps children in BrowserRouter for client-side routing.
 * This should be at the root level of the provider tree.
 *
 * @param props - Component props
 *
 * @example
 * ```tsx
 * <TaskFlowRouterProvider>
 *   <App />
 * </TaskFlowRouterProvider>
 * ```
 */
export function TaskFlowRouterProvider({ children }: TaskFlowRouterProviderProps) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

/**
 * React Query provider for the TaskFlow application.
 *
 * Wraps children in QueryClientProvider with configured defaults.
 * Can accept a custom QueryClient for testing purposes.
 *
 * @param props - Component props
 *
 * @example
 * ```tsx
 * <TaskFlowQueryProvider>
 *   <App />
 * </TaskFlowQueryProvider>
 *
 * // With custom client for testing
 * <TaskFlowQueryProvider queryClient={testClient}>
 *   <App />
 * </TaskFlowQueryProvider>
 * ```
 */
export function TaskFlowQueryProvider({ children, queryClient }: TaskFlowQueryProviderProps) {
  const client = queryClient ?? getQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// Combined Provider
// =============================================================================

/**
 * Combined providers for the TaskFlow application.
 *
 * Composes BrowserRouter and QueryClientProvider in the correct order.
 * This is the recommended provider component to use at the app root.
 *
 * Provider order (outside to inside):
 * 1. QueryClientProvider - Server state management
 * 2. BrowserRouter - Client-side routing
 *
 * @param props - Component props
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <TaskFlowProviders>
 *       <TaskFlowApp />
 *     </TaskFlowProviders>
 *   );
 * }
 * ```
 */
export function TaskFlowProviders({ children, queryClient }: TaskFlowProvidersProps) {
  return (
    <TaskFlowQueryProvider queryClient={queryClient}>
      <TaskFlowRouterProvider>{children}</TaskFlowRouterProvider>
    </TaskFlowQueryProvider>
  );
}

// =============================================================================
// Full App with Routes
// =============================================================================

/**
 * Props for the TaskFlowApp component.
 */
interface TaskFlowAppProps {
  /** Optional custom QueryClient for testing */
  readonly queryClient?: QueryClient;
}

/**
 * Complete TaskFlow application with providers and route rendering.
 *
 * This component sets up all required providers and renders the route tree.
 * Use this as the main entry point for the TaskFlow dashboard.
 *
 * @param props - Component props
 *
 * @example
 * ```tsx
 * // In main.tsx
 * import { TaskFlowApp } from './taskflow/providers';
 *
 * createRoot(document.getElementById('root')!).render(
 *   <StrictMode>
 *     <TaskFlowApp />
 *   </StrictMode>
 * );
 * ```
 */
export function TaskFlowApp({ queryClient }: TaskFlowAppProps) {
  return (
    <TaskFlowProviders queryClient={queryClient}>
      <RouteRenderer />
    </TaskFlowProviders>
  );
}
