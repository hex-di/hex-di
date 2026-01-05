/**
 * Adapter Definitions for TaskFlow Zustand Stores
 *
 * Defines HexDI adapters for the Zustand stores. These adapters:
 * - Create singleton store instances for the container lifetime
 * - Enable stores to be resolved via the DI container
 * - Make stores visible in DevTools for debugging
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/graph";
import { UIPreferencesStorePort, FilterStorePort, UserSessionStorePort } from "./ports.js";
import {
  createUIPreferencesStore,
  type UIPreferencesStoreInstance,
} from "./ui-preferences-store.js";
import { createFilterStore, type FilterStoreInstance } from "./filter-store.js";
import { createUserSessionStore, type UserSessionStoreInstance } from "./user-session-store.js";

// =============================================================================
// UI Preferences Store Adapter
// =============================================================================

/**
 * Adapter for the UI Preferences Zustand store.
 *
 * Creates a singleton store instance that persists for the container lifetime.
 * The store is created via vanilla Zustand (not React-bound) and uses
 * localStorage persistence for sidebar state, theme, and other preferences.
 */
export const UIPreferencesStoreAdapter = createAdapter({
  provides: UIPreferencesStorePort,
  requires: [] as const,
  lifetime: "singleton",
  factory: (): UIPreferencesStoreInstance => createUIPreferencesStore(),
});

// =============================================================================
// Filter Store Adapter
// =============================================================================

/**
 * Adapter for the Filter State Zustand store.
 *
 * Creates a singleton store instance that persists for the container lifetime.
 * Filter state is session-specific and not persisted to localStorage.
 */
export const FilterStoreAdapter = createAdapter({
  provides: FilterStorePort,
  requires: [] as const,
  lifetime: "singleton",
  factory: (): FilterStoreInstance => createFilterStore(),
});

// =============================================================================
// User Session Store Adapter
// =============================================================================

/**
 * Adapter for the User Session Zustand store.
 *
 * Creates a singleton store instance that persists for the container lifetime.
 * Session state is persisted to localStorage for mock authentication.
 */
export const UserSessionStoreAdapter = createAdapter({
  provides: UserSessionStorePort,
  requires: [] as const,
  lifetime: "singleton",
  factory: (): UserSessionStoreInstance => createUserSessionStore(),
});
