/**
 * Audit sink — buffered write interface for audit entries.
 *
 * Provides a configurable audit sink that buffers entries and flushes them
 * to a target (callback, file, external service, etc.) with retry on failure.
 *
 * @packageDocumentation
 */

import type { AuditEntry } from "./integrity.js";

// =============================================================================
// Types
// =============================================================================

export interface AuditSinkConfig {
  /** Callback invoked with a batch of entries when the buffer flushes. */
  readonly onFlush: (entries: ReadonlyArray<AuditEntry>) => Promise<void>;

  /** Maximum number of entries to buffer before auto-flushing. Default: 100. */
  readonly bufferSize?: number;

  /** Maximum number of flush retries on failure. Default: 3. */
  readonly maxRetries?: number;

  /** Delay between retries in ms. Default: 1000. */
  readonly retryDelayMs?: number;

  /** Called when flush fails after all retries. */
  readonly onFlushError?: (error: unknown, entries: ReadonlyArray<AuditEntry>) => void;
}

export interface AuditSink {
  /** Write an entry to the buffer. Auto-flushes when buffer is full. */
  readonly write: (entry: AuditEntry) => void;

  /** Manually flush all buffered entries. */
  readonly flush: () => Promise<void>;

  /** Get the number of buffered entries. */
  readonly pendingCount: () => number;
}

// =============================================================================
// Implementation
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create an audit sink with buffered writes and retry-on-failure semantics.
 *
 * @example
 * ```typescript
 * const sink = createAuditSink({
 *   onFlush: async (entries) => {
 *     await writeToDatabase(entries);
 *   },
 *   bufferSize: 50,
 * });
 *
 * sink.write(entry);
 * await sink.flush();
 * ```
 */
export function createAuditSink(config: AuditSinkConfig): AuditSink {
  const bufferSize = config.bufferSize ?? 100;
  const maxRetries = config.maxRetries ?? 3;
  const retryDelayMs = config.retryDelayMs ?? 1000;

  const buffer: AuditEntry[] = [];

  async function flushWithRetry(entries: ReadonlyArray<AuditEntry>): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await config.onFlush(entries);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await sleep(retryDelayMs);
        }
      }
    }

    if (config.onFlushError !== undefined) {
      config.onFlushError(lastError, entries);
    }
  }

  async function flush(): Promise<void> {
    if (buffer.length === 0) return;

    const entries = Object.freeze([...buffer]);
    buffer.length = 0;
    await flushWithRetry(entries);
  }

  function write(entry: AuditEntry): void {
    buffer.push(entry);
    if (buffer.length >= bufferSize) {
      void flush();
    }
  }

  function pendingCount(): number {
    return buffer.length;
  }

  return { write, flush, pendingCount };
}
