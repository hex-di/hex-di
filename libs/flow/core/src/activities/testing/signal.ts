/**
 * Test Signal
 *
 * Provides a controllable AbortSignal for testing activity cancellation
 * and timeout behavior.
 *
 * @packageDocumentation
 */

// =============================================================================
// Test Signal Type
// =============================================================================

/**
 * An extended AbortSignal with test control methods.
 *
 * Provides methods to programmatically trigger abort or schedule
 * a timeout abort for testing cancellation scenarios.
 *
 * @example
 * ```typescript
 * const signal = createTestSignal();
 *
 * // Test immediate abort
 * signal.abort('User cancelled');
 * expect(signal.aborted).toBe(true);
 * expect(signal.reason).toBe('User cancelled');
 *
 * // Test timeout abort
 * const signal2 = createTestSignal();
 * signal2.timeout(100); // Abort after 100ms
 * await delay(150);
 * expect(signal2.aborted).toBe(true);
 * ```
 */
export interface TestSignal extends AbortSignal {
  /**
   * Immediately aborts the signal.
   *
   * @param reason - Optional reason string for the abort.
   *   Defaults to 'Test abort' if not provided.
   *
   * @remarks
   * After calling abort:
   * - `signal.aborted` will be `true`
   * - `signal.reason` will be the provided reason
   * - Any pending timeouts are cleared
   */
  abort(reason?: string): void;

  /**
   * Schedules an abort after the specified delay.
   *
   * @param ms - Milliseconds to wait before aborting
   *
   * @remarks
   * - The timeout is cleared if `abort()` is called before it fires
   * - The abort reason will be 'Timeout after {ms}ms'
   * - Calling `timeout()` again replaces any pending timeout
   */
  timeout(ms: number): void;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Creates a controllable AbortSignal for testing.
 *
 * Returns an extended AbortSignal with `abort()` and `timeout()` methods
 * for programmatically controlling the signal state in tests.
 *
 * @returns A TestSignal with abort and timeout controls
 *
 * @remarks
 * - The signal starts in the non-aborted state
 * - Calling `abort()` clears any pending timeouts
 * - The internal AbortController is not exposed to prevent accidental misuse
 * - Resources are properly cleaned up when abort is triggered
 *
 * @example Testing activity cancellation
 * ```typescript
 * it('should handle cancellation', async () => {
 *   const signal = createTestSignal();
 *   const sink = createTestEventSink<typeof TaskEvents>();
 *
 *   // Start long-running activity
 *   const promise = activity.execute(input, { deps, sink, signal });
 *
 *   // Cancel after some time
 *   signal.abort('User cancelled');
 *
 *   // Activity should respond to abort
 *   await expect(promise).rejects.toThrow('aborted');
 * });
 * ```
 *
 * @example Testing timeout behavior
 * ```typescript
 * it('should timeout after delay', async () => {
 *   const signal = createTestSignal();
 *   signal.timeout(100);
 *
 *   const startTime = Date.now();
 *
 *   // Wait for activity that checks signal
 *   await new Promise((resolve) => {
 *     signal.addEventListener('abort', resolve);
 *   });
 *
 *   const elapsed = Date.now() - startTime;
 *   expect(elapsed).toBeGreaterThanOrEqual(100);
 *   expect(signal.aborted).toBe(true);
 * });
 * ```
 *
 * @example Resetting signal for multiple test cases
 * ```typescript
 * describe('activity abort scenarios', () => {
 *   let signal: TestSignal;
 *
 *   beforeEach(() => {
 *     signal = createTestSignal();
 *   });
 *
 *   it('test 1', () => {
 *     signal.abort();
 *     expect(signal.aborted).toBe(true);
 *   });
 *
 *   it('test 2', () => {
 *     // Fresh signal, not aborted
 *     expect(signal.aborted).toBe(false);
 *   });
 * });
 * ```
 */
export function createTestSignal(): TestSignal {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  /**
   * Clear any pending timeout.
   */
  function clearPendingTimeout(): void {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  }

  /**
   * Abort the signal immediately with an optional reason.
   */
  function abort(reason?: string): void {
    clearPendingTimeout();
    controller.abort(reason ?? "Test abort");
  }

  /**
   * Schedule an abort after the specified delay.
   */
  function timeout(ms: number): void {
    clearPendingTimeout();
    timeoutId = setTimeout(() => {
      controller.abort(`Timeout after ${ms}ms`);
    }, ms);
  }

  // Create the TestSignal by extending the controller's signal
  // We use Object.defineProperties to add methods while preserving
  // the native AbortSignal prototype chain
  const testSignal = controller.signal as TestSignal;

  Object.defineProperties(testSignal, {
    abort: {
      value: abort,
      writable: false,
      enumerable: false,
      configurable: false,
    },
    timeout: {
      value: timeout,
      writable: false,
      enumerable: false,
      configurable: false,
    },
  });

  // Clean up timeout if signal is aborted externally
  // (e.g., if someone has a reference to the controller)
  testSignal.addEventListener("abort", clearPendingTimeout);

  return testSignal;
}
