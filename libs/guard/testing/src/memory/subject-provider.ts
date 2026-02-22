import type { AuthSubject } from "@hex-di/guard";

/**
 * A controllable subject provider for tests.
 * Returns the configured subject on each call.
 */
export interface MemorySubjectProvider {
  /** Returns the current subject. */
  getSubject(): AuthSubject;
  /** Updates the subject returned by future calls. */
  setSubject(subject: AuthSubject): void;
  /** The number of times getSubject() was called. */
  readonly callCount: number;
}

/**
 * Creates an in-memory subject provider for testing.
 *
 * @example
 * ```ts
 * const provider = createMemorySubjectProvider(testSubject);
 * provider.setSubject(adminSubject);
 * ```
 */
export function createMemorySubjectProvider(
  initial: AuthSubject,
): MemorySubjectProvider {
  let _subject = initial;
  let _callCount = 0;

  return {
    get callCount(): number {
      return _callCount;
    },

    getSubject(): AuthSubject {
      _callCount += 1;
      return _subject;
    },

    setSubject(subject: AuthSubject): void {
      _subject = subject;
    },
  };
}
