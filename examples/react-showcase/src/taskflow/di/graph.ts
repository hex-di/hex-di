/**
 * TaskFlow dependency graph fragment.
 *
 * This graph fragment contains services specific to the TaskFlow feature.
 * It's designed to be lazy-loaded and used as a child of the root graph,
 * inheriting shared infrastructure services (Logger, Config) from the parent.
 *
 * TaskFlow-specific services:
 * - TaskApiService: Mock task API with CRUD operations (singleton)
 * - TaskCacheService: React Query cache coordination (singleton)
 * - FilterStore: Task filtering state (singleton)
 * - UIPreferencesStore: UI preferences like theme, sidebar (singleton)
 * - UserSessionStore: Mock user session state (singleton)
 *
 * @packageDocumentation
 */

import { GraphBuilder, type Graph } from "@hex-di/graph";
import type { QueryClient } from "@tanstack/react-query";
import { TaskApiServiceAdapter, createTaskCacheServiceAdapter } from "../data/adapters.js";
import {
  FilterStoreAdapter,
  UIPreferencesStoreAdapter,
  UserSessionStoreAdapter,
} from "../stores/adapters.js";

// =============================================================================
// TaskFlow Graph Fragment Factory
// =============================================================================

/**
 * Creates the TaskFlow graph fragment.
 *
 * This is a factory function because `createTaskCacheServiceAdapter` requires
 * a QueryClient at creation time. The fragment is designed for lazy loading -
 * it's only created when the user navigates to /taskflow.
 *
 * @param queryClient - The React Query client for cache coordination
 * @returns Graph fragment with TaskFlow services
 *
 * @example Creating a TaskFlow child container
 * ```typescript
 * import { createTaskflowGraphFragment } from "./taskflow/di/graph";
 *
 * // Create lazy container from root
 * const lazyTaskflow = rootContainer.createLazy(async () => {
 *   const queryClient = new QueryClient({ ... });
 *   return createTaskflowGraphFragment(queryClient);
 * });
 * ```
 */
export function createTaskflowGraphFragment(queryClient: QueryClient) {
  return (
    GraphBuilder.create()
      // Data layer
      .provide(TaskApiServiceAdapter) // Singleton - mock API
      .provide(createTaskCacheServiceAdapter(queryClient)) // Singleton - cache coordination
      // Stores
      .provide(FilterStoreAdapter) // Singleton - filter state
      .provide(UIPreferencesStoreAdapter) // Singleton - UI preferences
      .provide(UserSessionStoreAdapter) // Singleton - mock session
      .buildFragment()
  );
}

/**
 * Type representing ports provided by the TaskFlow graph fragment.
 */
export type TaskflowPorts =
  ReturnType<typeof createTaskflowGraphFragment> extends Graph<infer P, infer _A> ? P : never;

/**
 * Type representing async ports in the TaskFlow graph fragment.
 */
export type TaskflowAsyncPorts =
  ReturnType<typeof createTaskflowGraphFragment> extends Graph<infer _P, infer A> ? A : never;
