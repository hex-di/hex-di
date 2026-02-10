/**
 * Test assertion utilities for log entries.
 *
 * @packageDocumentation
 */

import type { LogEntry, LogContext } from "../types/log-entry.js";
import type { LogLevel } from "../types/log-level.js";

/**
 * Matcher for finding log entries in test assertions.
 */
export interface LogEntryMatcher {
  readonly level?: LogLevel;
  readonly message?: string | RegExp;
  readonly annotations?: Record<string, unknown>;
  readonly context?: Partial<LogContext>;
  readonly hasError?: boolean;
}

/**
 * Assert that a log entry matching the given criteria exists.
 *
 * @param entries - Array of log entries to search
 * @param matcher - Criteria to match against
 * @returns The matching log entry
 * @throws Error if no matching entry is found
 */
export function assertLogEntry(
  entries: ReadonlyArray<LogEntry>,
  matcher: LogEntryMatcher
): LogEntry {
  const found = entries.find(entry => matchesEntry(entry, matcher));
  if (!found) {
    const matcherStr = JSON.stringify(matcher, null, 2);
    const entriesStr = entries.map(e => `  ${e.level}: ${e.message}`).join("\n");
    throw new Error(`No log entry matching:\n${matcherStr}\n\nAvailable entries:\n${entriesStr}`);
  }
  return found;
}

/**
 * Check if a log entry matches the given criteria.
 */
function matchesEntry(entry: LogEntry, matcher: LogEntryMatcher): boolean {
  if (matcher.level !== undefined && entry.level !== matcher.level) {
    return false;
  }

  if (matcher.message !== undefined) {
    if (typeof matcher.message === "string") {
      if (entry.message !== matcher.message) return false;
    } else {
      if (!matcher.message.test(entry.message)) return false;
    }
  }

  if (matcher.annotations !== undefined) {
    for (const key in matcher.annotations) {
      if (entry.annotations[key] !== matcher.annotations[key]) {
        return false;
      }
    }
  }

  if (matcher.context !== undefined) {
    for (const key in matcher.context) {
      if (entry.context[key] !== matcher.context[key]) {
        return false;
      }
    }
  }

  if (matcher.hasError !== undefined) {
    const hasError = entry.error !== undefined;
    if (hasError !== matcher.hasError) return false;
  }

  return true;
}
