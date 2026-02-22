import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { AuditEntry } from "./types.js";
import { ACL010 } from "../errors/codes.js";

/**
 * A write-ahead log entry wrapping an audit entry with commit state.
 */
export interface WalEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly entry: AuditEntry;
  readonly committed: boolean;
}

/**
 * Error type returned by WAL operations.
 */
export interface WalError {
  readonly code: typeof ACL010;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * A write-ahead log for durable audit entry persistence.
 * Uncommitted entries survive logical process restart (via recover()).
 */
export interface WriteAheadLog {
  /** Appends an audit entry to the WAL. Returns the WAL entry id. */
  append(entry: AuditEntry): Result<string, WalError>;
  /** Marks a WAL entry as committed (permanently persisted). */
  commit(id: string): Result<void, WalError>;
  /** Rolls back (removes) an uncommitted WAL entry. */
  rollback(id: string): Result<void, WalError>;
  /** Returns all uncommitted entries (for crash recovery). */
  recover(): readonly WalEntry[];
  /** Returns all entries (committed and uncommitted). */
  entries(): readonly WalEntry[];
}

/**
 * Creates an in-memory write-ahead log.
 * Uncommitted entries are recoverable via recover().
 */
export function createWriteAheadLog(): WriteAheadLog {
  const _entries = new Map<string, WalEntry>();

  return {
    append(entry: AuditEntry): Result<string, WalError> {
      const id = crypto.randomUUID();
      const walEntry: WalEntry = Object.freeze({
        id,
        timestamp: new Date().toISOString(),
        entry,
        committed: false,
      });
      _entries.set(id, walEntry);
      return ok(id);
    },

    commit(id: string): Result<void, WalError> {
      const existing = _entries.get(id);
      if (existing === undefined) {
        return err(Object.freeze({ code: ACL010, message: `WAL entry '${id}' not found` }));
      }
      const committed: WalEntry = Object.freeze({ ...existing, committed: true });
      _entries.set(id, committed);
      return ok(undefined);
    },

    rollback(id: string): Result<void, WalError> {
      const existing = _entries.get(id);
      if (existing === undefined) {
        return err(Object.freeze({ code: ACL010, message: `WAL entry '${id}' not found` }));
      }
      if (existing.committed) {
        return err(Object.freeze({ code: ACL010, message: `WAL entry '${id}' is already committed; cannot rollback` }));
      }
      _entries.delete(id);
      return ok(undefined);
    },

    recover(): readonly WalEntry[] {
      return Object.freeze([..._entries.values()].filter((e) => !e.committed));
    },

    entries(): readonly WalEntry[] {
      return Object.freeze([..._entries.values()]);
    },
  };
}
