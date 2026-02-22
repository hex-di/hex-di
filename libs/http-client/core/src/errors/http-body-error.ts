/**
 * HttpBodyError - errors during request body construction.
 * @packageDocumentation
 */

export interface HttpBodyError {
  readonly _tag: "HttpBodyError";
  readonly reason: "JsonSerialize" | "Encode";
  readonly message: string;
  readonly cause: unknown;
}

/**
 * Construct a frozen HttpBodyError.
 * Follows populate-freeze-return sequence (ALCOA+, INV-HC-3).
 */
export function httpBodyError(
  reason: HttpBodyError["reason"],
  message: string,
  cause?: unknown,
): HttpBodyError {
  return Object.freeze({
    _tag: "HttpBodyError" as const,
    reason,
    message,
    cause,
  });
}
