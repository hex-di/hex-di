/**
 * Effect Testing Utility
 *
 * Tests a single effect descriptor with mock port implementations,
 * without needing a full DI container or runner.
 *
 * @packageDocumentation
 */

import type { EffectAny } from "@hex-di/flow";
import { ResultAsync } from "@hex-di/result";

// =============================================================================
// Types
// =============================================================================

/**
 * Mock port implementations keyed by port name.
 *
 * Each key is a port name (matching the `__portName` on the port object),
 * and the value is a mock implementation of that port's service.
 */
export type EffectMocks = Record<string, Record<string, (...args: unknown[]) => unknown>>;

/**
 * Options for testing an effect.
 */
export interface TestEffectOptions {
  /**
   * Mock port implementations.
   * Used for Invoke effects to resolve the port and call the method.
   */
  readonly mocks?: EffectMocks;
}

/**
 * Result of testing an effect.
 */
export interface TestEffectResult {
  /** Whether the effect executed successfully */
  readonly ok: boolean;
  /** The error if execution failed */
  readonly error: unknown;
  /** For Invoke effects: the return value of the invoked method */
  readonly returnValue: unknown;
  /** For Invoke effects: whether the mock was called */
  readonly called: boolean;
  /** For Invoke effects: the arguments the mock was called with */
  readonly calledWith: readonly unknown[] | undefined;
  /** True when the effect tag was not recognized */
  readonly unhandled?: boolean;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Tests a single effect descriptor with mock implementations.
 *
 * Supports testing:
 * - **Invoke effects**: Resolves the port from mocks and calls the method
 * - **Delay effects**: Returns immediately (no actual delay)
 * - **None effects**: No-op
 * - **Emit effects**: No-op (event is captured in result)
 * - **Sequence effects**: Executes sub-effects in order
 * - **Parallel effects**: Executes sub-effects (sequentially in test)
 *
 * @param effect - The effect descriptor to test
 * @param options - Mock implementations and configuration
 * @returns A promise resolving to the test result
 *
 * @example Testing an Invoke effect
 * ```typescript
 * const effect = Effect.invoke(MyPort, 'fetchData', ['id-123']);
 * const result = await testEffect(effect, {
 *   mocks: {
 *     MyPort: {
 *       fetchData: (id) => ({ id, name: 'Test' }),
 *     },
 *   },
 * });
 * expect(result.ok).toBe(true);
 * expect(result.called).toBe(true);
 * expect(result.returnValue).toEqual({ id: 'id-123', name: 'Test' });
 * ```
 *
 * @example Testing a Delay effect
 * ```typescript
 * const effect = Effect.delay(1000);
 * const result = await testEffect(effect);
 * expect(result.ok).toBe(true);
 * ```
 *
 * @example Testing an effect that fails
 * ```typescript
 * const effect = Effect.invoke(MyPort, 'badMethod', []);
 * const result = await testEffect(effect, {
 *   mocks: {
 *     MyPort: {
 *       badMethod: () => { throw new Error('fail'); },
 *     },
 *   },
 * });
 * expect(result.ok).toBe(false);
 * expect(result.error).toBeInstanceOf(Error);
 * ```
 */
export async function testEffect(
  effect: EffectAny,
  options?: TestEffectOptions
): Promise<TestEffectResult> {
  const mocks = options?.mocks ?? {};

  try {
    return await executeEffect(effect, mocks);
  } catch (error: unknown) {
    return {
      ok: false,
      error,
      returnValue: undefined,
      called: false,
      calledWith: undefined,
    };
  }
}

/**
 * Result-wrapping variant of {@link testEffect}.
 *
 * Returns `Ok(TestEffectResult)` when the effect executes successfully,
 * or `Err(error)` when the effect fails with an unrecoverable error.
 *
 * @param effect - The effect descriptor to test
 * @param options - Mock implementations and configuration
 * @returns A ResultAsync containing the test result or the error
 *
 * @example
 * ```typescript
 * const result = await testEffectSafe(effect, { mocks });
 * if (result.isOk()) {
 *   expect(result.value.called).toBe(true);
 * }
 * ```
 */
export function testEffectSafe(
  effect: EffectAny,
  options?: TestEffectOptions
): ResultAsync<TestEffectResult, unknown> {
  return ResultAsync.fromPromise(testEffect(effect, options), (error: unknown) => error);
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Safely accesses an additional property on an EffectAny value.
 *
 * EffectAny is a structural interface with only `_tag`. After switching on `_tag`,
 * TypeScript cannot narrow to the concrete effect type, so we access additional
 * properties via runtime check.
 *
 * @internal
 */
function getEffectProperty(effect: EffectAny, prop: string): unknown {
  if (typeof effect === "object" && effect !== null && prop in effect) {
    const desc = Object.getOwnPropertyDescriptor(effect, prop);
    return desc !== undefined ? desc.value : undefined;
  }
  return undefined;
}

/**
 * Safely accesses a property on an unknown object value.
 * @internal
 */
function getOwnProp(obj: unknown, prop: string): unknown {
  if (typeof obj === "object" && obj !== null && prop in obj) {
    const desc = Object.getOwnPropertyDescriptor(obj, prop);
    return desc !== undefined ? desc.value : undefined;
  }
  return undefined;
}

/**
 * Type guard that validates whether an unknown value is an EffectAny.
 * @internal
 */
function isEffectAny(value: unknown): value is EffectAny {
  return (
    typeof value === "object" &&
    value !== null &&
    "_tag" in value &&
    typeof Object.getOwnPropertyDescriptor(value, "_tag")?.value === "string"
  );
}

const OK_NO_OP: TestEffectResult = {
  ok: true,
  error: undefined,
  returnValue: undefined,
  called: false,
  calledWith: undefined,
};

/**
 * Executes a single effect against mocks.
 * @internal
 */
async function executeEffect(effect: EffectAny, mocks: EffectMocks): Promise<TestEffectResult> {
  switch (effect._tag) {
    case "Invoke":
      return executeInvoke(effect, mocks);

    case "Delay":
    case "None":
    case "Log":
    case "Choose":
      return OK_NO_OP;

    case "Emit":
      return {
        ok: true,
        error: undefined,
        returnValue: getEffectProperty(effect, "event") ?? undefined,
        called: true,
        calledWith: undefined,
      };

    case "Spawn":
    case "Stop":
      return {
        ok: true,
        error: undefined,
        returnValue: getEffectProperty(effect, "activityId") ?? undefined,
        called: true,
        calledWith: undefined,
      };

    case "Sequence":
    case "Parallel":
      return executeComposite(effect, mocks);

    default:
      return {
        ok: true,
        error: undefined,
        returnValue: undefined,
        called: false,
        calledWith: undefined,
        unhandled: true,
      };
  }
}

/**
 * Executes an Invoke effect against mocks.
 * @internal
 */
async function executeInvoke(effect: EffectAny, mocks: EffectMocks): Promise<TestEffectResult> {
  const port = getEffectProperty(effect, "port");
  const method = getEffectProperty(effect, "method");
  const args = getEffectProperty(effect, "args");

  if (typeof method !== "string") {
    return {
      ok: false,
      error: new Error("Invoke effect missing method property"),
      returnValue: undefined,
      called: false,
      calledWith: undefined,
    };
  }

  const portName = getOwnProp(port, "__portName");
  if (typeof portName !== "string") {
    return {
      ok: false,
      error: new Error("Invoke effect port missing __portName property"),
      returnValue: undefined,
      called: false,
      calledWith: undefined,
    };
  }

  const mockService = mocks[portName];
  if (mockService === undefined) {
    return {
      ok: false,
      error: new Error(`No mock provided for port "${portName}"`),
      returnValue: undefined,
      called: false,
      calledWith: undefined,
    };
  }

  const mockMethod = mockService[method];
  if (typeof mockMethod !== "function") {
    return {
      ok: false,
      error: new Error(`Mock for port "${portName}" has no method "${method}"`),
      returnValue: undefined,
      called: false,
      calledWith: undefined,
    };
  }

  const callArgs = Array.isArray(args) ? args : [];

  try {
    const returnValue = await mockMethod(...callArgs);
    return {
      ok: true,
      error: undefined,
      returnValue,
      called: true,
      calledWith: callArgs,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      error,
      returnValue: undefined,
      called: true,
      calledWith: callArgs,
    };
  }
}

/**
 * Executes sub-effects of a Sequence or Parallel effect.
 * In test mode, both are executed sequentially with short-circuit on error.
 * @internal
 */
async function executeComposite(effect: EffectAny, mocks: EffectMocks): Promise<TestEffectResult> {
  const effects = getEffectProperty(effect, "effects");
  if (!Array.isArray(effects)) {
    return OK_NO_OP;
  }

  for (const sub of effects) {
    if (!isEffectAny(sub)) continue;
    const subResult = await executeEffect(sub, mocks);
    if (!subResult.ok) {
      return subResult;
    }
  }

  return OK_NO_OP;
}
