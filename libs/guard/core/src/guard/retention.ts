import type { AuditEntry } from "./types.js";

/**
 * Policy for data retention enforcement.
 */
export interface RetentionPolicy {
  /** Maximum age of entries in days. Entries older than this are removed. */
  readonly maxAgeDays: number;
  /** Maximum total number of entries to retain. Oldest are removed first. */
  readonly maxEntries?: number;
}

/**
 * Enforces a retention policy against a list of audit entries.
 * Returns the entries that should be retained (not purged).
 *
 * Entries are first filtered by age (maxAgeDays), then by count (maxEntries),
 * retaining the most recent entries when count exceeds the limit.
 */
export function enforceRetention(
  entries: readonly AuditEntry[],
  policy: RetentionPolicy,
): readonly AuditEntry[] {
  const nowMs = Date.now();
  const maxAgeMs = policy.maxAgeDays * 24 * 60 * 60 * 1000;
  const cutoffMs = nowMs - maxAgeMs;

  // Filter by age: retain entries whose timestamp is within the max age
  let retained = entries.filter((entry) => {
    const entryMs = new Date(entry.timestamp).getTime();
    return entryMs >= cutoffMs;
  });

  // Filter by count: retain the most recent maxEntries
  if (policy.maxEntries !== undefined && retained.length > policy.maxEntries) {
    // Sort by timestamp descending (newest first), then take maxEntries, then re-sort ascending
    retained = [...retained]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, policy.maxEntries)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  return Object.freeze(retained);
}

/**
 * Returns the entries that would be purged by the given retention policy.
 */
export function getPurgeableEntries(
  entries: readonly AuditEntry[],
  policy: RetentionPolicy,
): readonly AuditEntry[] {
  const retained = new Set(enforceRetention(entries, policy));
  return Object.freeze(entries.filter((e) => !retained.has(e)));
}
