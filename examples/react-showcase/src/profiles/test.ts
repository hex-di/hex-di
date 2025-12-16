/**
 * Test profile configuration.
 *
 * @packageDocumentation
 */

import type { AdapterProfile } from "./types.js";

/**
 * Test profile - uses in-memory stores and silent logging.
 * Designed for fast, isolated unit tests.
 *
 * Use by setting VITE_DI_PROFILE=test
 */
export const testProfile: AdapterProfile = {
  name: "test",
  description: "In-memory, silent, isolated testing",
  variants: {
    logger: "silent",
    messageStore: "memory",
    userSession: "moduleState",
  },
};
