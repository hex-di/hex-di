/**
 * @hex-di/result-testing - Testing utilities for @hex-di/result
 *
 * Provides custom Vitest matchers and assertion helpers for working
 * with Result and ResultAsync types in tests.
 *
 * @packageDocumentation
 */

export {
  expectOk,
  expectErr,
  expectOkAsync,
  expectErrAsync,
  setupResultMatchers,
} from "./matchers.js";
