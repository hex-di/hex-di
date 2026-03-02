/**
 * Dead-Letter Queue
 *
 * Stores failed compensation entries for manual review,
 * retry, and acknowledgment. Part of GxP compliance.
 *
 * @packageDocumentation
 */

import type { DeadLetterEntry } from "../compensation/types.js";

/**
 * In-memory Dead-Letter Queue for failed compensation entries.
 *
 * Provides add, retry, list, and acknowledge operations for
 * managing compensation failures that require manual intervention.
 */
export class DeadLetterQueue {
  private readonly entries: DeadLetterEntry[] = [];

  /** Add a dead-letter entry */
  add(entry: DeadLetterEntry): void {
    this.entries.push(entry);
  }

  /**
   * Retry a dead-letter entry by index.
   * Increments the retry count and returns the updated entry,
   * or undefined if the index is out of bounds.
   */
  retry(index: number): DeadLetterEntry | undefined {
    if (index < 0 || index >= this.entries.length) {
      return undefined;
    }

    const existing = this.entries[index];
    const updated: DeadLetterEntry = Object.freeze({
      executionId: existing.executionId,
      sagaName: existing.sagaName,
      stepName: existing.stepName,
      stepIndex: existing.stepIndex,
      originalError: existing.originalError,
      failedAt: existing.failedAt,
      retryCount: existing.retryCount + 1,
    });
    this.entries[index] = updated;
    return updated;
  }

  /** List all dead-letter entries */
  list(): readonly DeadLetterEntry[] {
    return [...this.entries];
  }

  /**
   * Acknowledge (remove) a dead-letter entry by index.
   * Returns true if the entry was removed, false if index is out of bounds.
   */
  acknowledge(index: number): boolean {
    if (index < 0 || index >= this.entries.length) {
      return false;
    }
    this.entries.splice(index, 1);
    return true;
  }

  /** Get the current count of dead-letter entries */
  get size(): number {
    return this.entries.length;
  }
}
