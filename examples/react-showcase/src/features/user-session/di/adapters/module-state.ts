/**
 * Module-state user session adapter implementation.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/graph";
import { UserSessionPort } from "../ports.js";
import type { UserSession, UserType } from "../../types.js";

// =============================================================================
// User Selection State
// =============================================================================

/**
 * Module-level state tracking the currently selected user.
 * Read by UserSessionAdapter factory when creating scoped sessions.
 */
let currentUserSelection: UserType = "alice";

/**
 * Sets the current user selection.
 *
 * Call this BEFORE scope recreation to ensure the new scope gets the correct user.
 * This function should be called when login buttons are clicked, before the
 * React state change that triggers scope recreation.
 *
 * @param user - The user to set as current ("alice" or "bob")
 *
 * @example
 * ```tsx
 * import { setCurrentUserSelection } from "../features/user-session";
 *
 * function handleLoginAsBob() {
 *   setCurrentUserSelection("bob");  // Set before state change
 *   setCurrentUser("bob");           // Triggers scope recreation
 * }
 * ```
 */
export function setCurrentUserSelection(user: UserType): void {
  currentUserSelection = user;
}

/**
 * Gets the current user selection.
 */
export function getCurrentUserSelection(): UserType {
  return currentUserSelection;
}

// =============================================================================
// Adapter
// =============================================================================

/**
 * Module-state based user session adapter.
 *
 * Variant: "moduleState"
 * Use case: Default user session management
 *
 * Creates a user session for the current scope based on the current
 * user selection. Call `setCurrentUserSelection()` before scope
 * recreation to set which user session should be created.
 *
 * @remarks
 * - Lifetime: scoped - each scope gets its own user session
 * - Dependencies: none
 * - Reads `currentUserSelection` module state at factory time
 */
export const ModuleStateUserSessionAdapter = createAdapter({
  provides: UserSessionPort,
  requires: [],
  lifetime: "scoped",
  factory: (): UserSession => {
    const userData =
      currentUserSelection === "alice"
        ? { id: "alice-001", name: "Alice", avatar: "A" }
        : { id: "bob-002", name: "Bob", avatar: "B" };
    return { user: userData };
  },
});
