import { expect } from "vitest";

interface HookState {
  isLoading: boolean;
  result: unknown;
}

/**
 * Registers custom Vitest matchers for `@hex-di/result-react` hook testing.
 * Call this in your test setup file.
 *
 * Provides:
 * - `toBeLoading()` — asserts `isLoading === true` on a hook return value
 *
 * @example
 * ```ts
 * // tests/setup.ts
 * import { setupResultReactMatchers } from "@hex-di/result-react/testing";
 * setupResultReactMatchers();
 *
 * // In a test:
 * expect(result.current).toBeLoading();
 * ```
 *
 * @since v0.1.0
 * @see {@link https://github.com/hex-di/result/blob/main/spec/result-react/behaviors/06-testing.md | BEH-R06-001}
 */
export function setupResultReactMatchers(): void {
  expect.extend({
    toBeLoading(received: HookState) {
      const pass =
        received != null &&
        typeof received === "object" &&
        "isLoading" in received &&
        received.isLoading === true;

      return {
        pass,
        message: () =>
          pass
            ? `expected hook state not to be loading, but isLoading is true`
            : `expected hook state to be loading, but isLoading is ${String((received as HookState)?.isLoading)}`,
      };
    },
  });
}

declare module "vitest" {
  interface Assertion<T> {
    toBeLoading(): void;
  }
  interface AsymmetricMatchersContaining {
    toBeLoading(): void;
  }
}
