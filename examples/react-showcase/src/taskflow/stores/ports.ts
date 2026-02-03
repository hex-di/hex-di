/**
 * Port Definitions for TaskFlow Zustand Stores
 *
 * Defines HexDI ports for accessing Zustand stores through the
 * dependency injection container. These ports enable:
 * - Type-safe store access via container resolution
 * - DevTools visibility for store state inspection
 * - Integration with Flow machines via Effect.invoke
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { UIPreferencesStoreInstance } from "./ui-preferences-store.js";
import type { FilterStoreInstance } from "./filter-store.js";
import type { UserSessionStoreInstance } from "./user-session-store.js";

// =============================================================================
// UI Preferences Store Port
// =============================================================================

/**
 * Port for accessing the UI Preferences Zustand store.
 *
 * This port provides the store instance which can be used in:
 * - React components (via useStore hook pattern)
 * - Flow machine effects (via Effect.invoke)
 *
 * @example
 * ```typescript
 * // In React (via resolved instance):
 * const store = usePort(UIPreferencesStorePort);
 * const theme = useStore(store, (s) => s.theme);
 * store.getState().setTheme('dark');
 * ```
 */
export const UIPreferencesStorePort = port<UIPreferencesStoreInstance>()({
  name: "UIPreferencesStore",
});

// =============================================================================
// Filter Store Port
// =============================================================================

/**
 * Port for accessing the Filter State Zustand store.
 *
 * This port provides the store instance for managing task list filters.
 *
 * @example
 * ```typescript
 * // In React (via resolved instance):
 * const store = usePort(FilterStorePort);
 * const status = useStore(store, (s) => s.status);
 * store.getState().setStatus('todo');
 * ```
 */
export const FilterStorePort = port<FilterStoreInstance>()({
  name: "FilterStore",
});

// =============================================================================
// User Session Store Port
// =============================================================================

/**
 * Port for accessing the User Session Zustand store.
 *
 * This port provides the store instance for managing user authentication
 * and session state.
 *
 * @example
 * ```typescript
 * // In React (via resolved instance):
 * const store = usePort(UserSessionStorePort);
 * const isAuthenticated = useStore(store, (s) => s.isAuthenticated);
 * const user = useStore(store, (s) => s.user);
 *
 * // In Flow machine guards:
 * // Check if user is authenticated before allowing navigation
 * ```
 */
export const UserSessionStorePort = port<UserSessionStoreInstance>()({
  name: "UserSessionStore",
});
