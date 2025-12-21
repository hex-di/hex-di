/**
 * Signals that a code path should be unreachable at runtime.
 * @internal
 */
export function unreachable<T>(message: string): T {
  throw new Error(message);
}
