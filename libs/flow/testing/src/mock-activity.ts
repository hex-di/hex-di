/**
 * Mock Activity
 *
 * Creates mock activities with start/stop tracking for testing.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

/** A mock activity that tracks start/stop calls */
export interface MockActivity<TInput, TOutput> {
  /** The activity implementation for use with machine runner */
  readonly activity: {
    readonly execute: (input: TInput, sink: unknown, signal: AbortSignal) => Promise<TOutput>;
  };
  /** Whether the activity has been started */
  readonly started: boolean;
  /** Whether the activity has been stopped (aborted) */
  readonly stopped: boolean;
  /** Number of times the activity was started */
  readonly startCount: number;
  /** The input passed to the last execution */
  readonly lastInput: TInput | undefined;
  /** Reset tracking state */
  reset(): void;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a mock activity with start/stop tracking.
 *
 * @example
 * ```typescript
 * const mock = createMockActivity<{ id: string }, string>({
 *   result: 'done',
 * });
 *
 * // Use in test...
 * expect(mock.started).toBe(true);
 * expect(mock.startCount).toBe(1);
 * ```
 */
export function createMockActivity<TInput = void, TOutput = void>(options?: {
  /** Static result to return */
  readonly result?: TOutput;
  /** Dynamic result based on input */
  readonly resultFn?: (input: TInput) => TOutput | Promise<TOutput>;
  /** Error to throw */
  readonly error?: Error;
  /** Delay before resolving in ms */
  readonly delay?: number;
}): MockActivity<TInput, TOutput> {
  let _started = false;
  let _stopped = false;
  let _startCount = 0;
  let _lastInput: TInput | undefined;

  const activity = {
    execute(input: TInput, _sink: unknown, signal: AbortSignal): Promise<TOutput> {
      _started = true;
      _startCount++;
      _lastInput = input;

      const onAbort = (): void => {
        _stopped = true;
      };
      signal.addEventListener("abort", onAbort, { once: true });

      return new Promise<TOutput>((resolve, reject) => {
        const finish = (): void => {
          signal.removeEventListener("abort", onAbort);

          if (signal.aborted) {
            _stopped = true;
            reject(new Error("Activity aborted"));
            return;
          }

          if (options?.error) {
            reject(options.error);
            return;
          }

          if (options?.resultFn) {
            const r = options.resultFn(input);
            resolve(r as TOutput);
            return;
          }

          resolve(options?.result as TOutput);
        };

        if (options?.delay !== undefined && options.delay > 0) {
          const timer = globalThis.setTimeout(finish, options.delay);
          signal.addEventListener(
            "abort",
            () => {
              globalThis.clearTimeout(timer);
              finish();
            },
            { once: true }
          );
        } else {
          finish();
        }
      });
    },
  };

  return {
    activity,
    get started(): boolean {
      return _started;
    },
    get stopped(): boolean {
      return _stopped;
    },
    get startCount(): number {
      return _startCount;
    },
    get lastInput(): TInput | undefined {
      return _lastInput;
    },
    reset(): void {
      _started = false;
      _stopped = false;
      _startCount = 0;
      _lastInput = undefined;
    },
  };
}
