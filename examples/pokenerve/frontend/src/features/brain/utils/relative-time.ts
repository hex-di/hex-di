/**
 * Formats timestamps as human-readable relative time strings.
 *
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

function formatRelativeTime(timestampMs: number, now?: number): string {
  const currentMs = now ?? Date.now();
  const diffMs = Math.max(0, currentMs - timestampMs);

  if (diffMs < SECOND) {
    return "just now";
  }
  if (diffMs < MINUTE) {
    const seconds = Math.floor(diffMs / SECOND);
    return `${String(seconds)}s ago`;
  }
  if (diffMs < HOUR) {
    const minutes = Math.floor(diffMs / MINUTE);
    return `${String(minutes)}m ago`;
  }
  if (diffMs < DAY) {
    const hours = Math.floor(diffMs / HOUR);
    return `${String(hours)}h ago`;
  }
  const days = Math.floor(diffMs / DAY);
  return `${String(days)}d ago`;
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 */
function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${String(Math.round(ms * 1000))}us`;
  }
  if (ms < 1000) {
    return `${String(Math.round(ms * 100) / 100)}ms`;
  }
  return `${String(Math.round(ms / 10) / 100)}s`;
}

export { formatRelativeTime, formatDuration };
