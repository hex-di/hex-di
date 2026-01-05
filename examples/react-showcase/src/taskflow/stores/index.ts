/**
 * TaskFlow Zustand Stores Module
 *
 * This module exports all Zustand stores, their ports, and adapters
 * for integration with HexDI containers.
 *
 * @packageDocumentation
 */

// =============================================================================
// UI Preferences Store
// =============================================================================

export {
  createUIPreferencesStore,
  type UIPreferencesState,
  type UIPreferencesActions,
  type UIPreferencesStore,
  type UIPreferencesStoreInstance,
} from "./ui-preferences-store.js";

// =============================================================================
// Filter Store
// =============================================================================

export {
  createFilterStore,
  type FilterActions,
  type FilterStore,
  type FilterStoreInstance,
} from "./filter-store.js";

// =============================================================================
// User Session Store
// =============================================================================

export {
  createUserSessionStore,
  type AuthStatus,
  type UserSessionState,
  type UserSessionActions,
  type UserSessionStore,
  type UserSessionStoreInstance,
} from "./user-session-store.js";

// =============================================================================
// Ports
// =============================================================================

export { UIPreferencesStorePort, FilterStorePort, UserSessionStorePort } from "./ports.js";

// =============================================================================
// Adapters
// =============================================================================

export {
  UIPreferencesStoreAdapter,
  FilterStoreAdapter,
  UserSessionStoreAdapter,
} from "./adapters.js";
