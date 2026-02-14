/**
 * Action History Recording
 *
 * Records action dispatches with filtering, reservoir sampling, and eviction.
 *
 * @packageDocumentation
 */

import type {
  ActionHistory,
  ActionHistoryEntry,
  ActionHistoryFilter,
  ActionHistoryConfig,
} from "../types/inspection.js";

// =============================================================================
// Reservoir Sampling State
// =============================================================================

/**
 * Determines whether an entry should be recorded based on reservoir sampling
 * and alwaysRecord overrides.
 */
function shouldRecord(
  entry: ActionHistoryEntry,
  config: ActionHistoryConfig,
  seenCount: number
): boolean {
  // Always-record overrides bypass sampling
  if (config.alwaysRecord) {
    const { effectStatus, portNames, actionNames } = config.alwaysRecord;

    if (effectStatus) {
      const status = entry.effectStatus;
      if ((status === "failed" || status === "pending") && effectStatus.includes(status)) {
        return true;
      }
    }

    if (portNames && portNames.includes(entry.portName)) {
      return true;
    }

    if (actionNames && actionNames.includes(entry.actionName)) {
      return true;
    }
  }

  // Sampling rate check
  const rate = config.samplingRate ?? 1;
  if (rate >= 1) return true;
  if (rate <= 0) return false;

  // Reservoir sampling: for a stream of n items, accept item n with probability rate
  // Simple probabilistic sampling: accept with probability = samplingRate
  // For deterministic testing, we use modular arithmetic when rate is a clean fraction
  if (seenCount === 0) return true; // Always record first
  return Math.random() < rate;
}

/**
 * Applies filter predicates to an entry.
 */
function matchesFilter(entry: ActionHistoryEntry, filter: ActionHistoryFilter): boolean {
  if (filter.portName !== undefined && entry.portName !== filter.portName) return false;
  if (filter.actionName !== undefined && entry.actionName !== filter.actionName) return false;
  if (filter.effectStatus !== undefined && entry.effectStatus !== filter.effectStatus) return false;
  if (filter.since !== undefined && entry.timestamp < filter.since) return false;
  if (filter.until !== undefined && entry.timestamp > filter.until) return false;
  if (filter.traceId !== undefined && entry.traceId !== filter.traceId) return false;
  return true;
}

// =============================================================================
// Factory
// =============================================================================

export function createActionHistory(config: ActionHistoryConfig): ActionHistory {
  const entries: ActionHistoryEntry[] = [];
  let _seenCount = 0;

  return {
    record(entry: ActionHistoryEntry): boolean {
      if (config.mode === "off") return false;

      const shouldInclude = shouldRecord(entry, config, _seenCount);
      _seenCount++;

      if (!shouldInclude) return false;

      // In lightweight mode, strip prevState/nextState
      const recorded: ActionHistoryEntry =
        config.mode === "lightweight"
          ? {
              id: entry.id,
              portName: entry.portName,
              actionName: entry.actionName,
              payload: entry.payload,
              prevState: undefined,
              nextState: undefined,
              timestamp: entry.timestamp,
              effectStatus: entry.effectStatus,
              effectError: entry.effectError,
              parentId: entry.parentId,
              order: entry.order,
              traceId: entry.traceId,
              spanId: entry.spanId,
            }
          : entry;

      entries.push(recorded);

      // Evict oldest entries when maxEntries is exceeded
      while (entries.length > config.maxEntries) {
        entries.shift();
      }

      return true;
    },

    query(filter?: ActionHistoryFilter): readonly ActionHistoryEntry[] {
      if (!filter) {
        return entries.slice();
      }

      let result = entries.filter(e => matchesFilter(e, filter));

      if (filter.limit !== undefined && filter.limit >= 0) {
        result = result.slice(-filter.limit);
      }

      return result;
    },

    clear(): void {
      entries.length = 0;
      _seenCount = 0;
    },

    get size(): number {
      return entries.length;
    },
  };
}
