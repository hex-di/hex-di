/**
 * Development profile configuration.
 *
 * @packageDocumentation
 */

import type { AdapterProfile } from "./types.js";

/**
 * Development profile - uses localStorage for persistence,
 * console logging, and module-state user sessions.
 *
 * This is the default profile for local development.
 */
export const developmentProfile: AdapterProfile = {
  name: "development",
  description: "Local development with localStorage persistence",
  variants: {
    logger: "console",
    messageStore: "localStorage",
    userSession: "moduleState",
  },
};
