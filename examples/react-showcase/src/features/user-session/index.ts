/**
 * User session feature public API.
 *
 * @packageDocumentation
 */

// Types
export type { User, UserSession, UserType } from "./types.js";

// Ports
export { UserSessionPort, type UserSessionPorts } from "./di/ports.js";

// Adapters
export {
  ModuleStateUserSessionAdapter,
  setCurrentUserSelection,
  getCurrentUserSelection,
  getUserSessionAdapter,
  userSessionAdapters,
} from "./di/adapters/index.js";

// Feature bundle
export { userSessionFeature } from "./di/bundle.js";
