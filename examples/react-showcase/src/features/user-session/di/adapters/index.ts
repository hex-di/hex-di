/**
 * User session feature adapter exports.
 *
 * @packageDocumentation
 */

import { ModuleStateUserSessionAdapter as _ModuleStateUserSessionAdapter } from "./module-state.js";

export {
  setCurrentUserSelection,
  getCurrentUserSelection,
} from "./module-state.js";

/**
 * Module-state based user session adapter.
 */
export const ModuleStateUserSessionAdapter = _ModuleStateUserSessionAdapter;

/**
 * User session adapter registry mapping variant names to implementations.
 */
export const userSessionAdapters = {
  moduleState: _ModuleStateUserSessionAdapter,
} as const;

/**
 * Gets the user session adapter based on current configuration.
 * Currently only one variant available.
 */
export function getUserSessionAdapter() {
  return _ModuleStateUserSessionAdapter;
}
