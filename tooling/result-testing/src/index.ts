/**
 * @hex-di/result-testing - Testing utilities for @hex-di/result
 *
 * Provides custom Vitest matchers, assertion helpers, test factories,
 * and GxP test utilities for working with Result, ResultAsync, and Option
 * types in tests.
 *
 * @packageDocumentation
 */

export {
  expectOk,
  expectErr,
  expectOkAsync,
  expectErrAsync,
  expectSome,
  expectNone,
} from "./assertion-helpers.js";

export { setupResultMatchers } from "./matchers.js";

export {
  createResultFixture,
  createOptionFixture,
  mockResultAsync,
} from "./factories.js";

export {
  expectFrozen,
  expectResultBrand,
  expectOptionBrand,
  expectImmutableResult,
  expectNeverRejects,
} from "./gxp.js";
