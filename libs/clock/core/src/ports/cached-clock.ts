/**
 * CachedClockPort — high-throughput cached time values.
 *
 * Deliberately NOT structurally compatible with ClockPort to prevent
 * accidental substitution in audit trail creation (ALCOA+ Contemporaneous).
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { MonotonicTimestamp, WallClockTimestamp } from "../branded.js";

/**
 * Service interface for CachedClockPort.
 *
 * Method names intentionally differ from ClockService (recentMonotonicNow vs monotonicNow)
 * to prevent structural type compatibility with ClockPort (CLK-CAC-001).
 */
export interface CachedClockService {
  readonly recentMonotonicNow: () => MonotonicTimestamp;
  readonly recentWallClockNow: () => WallClockTimestamp;
}

/** Lifecycle management interface for the background cache updater. */
export interface CachedClockLifecycle {
  readonly start: () => void;
  readonly stop: () => void;
  readonly isRunning: () => boolean;
}

/** Full cached clock adapter combining service and lifecycle interfaces. */
export type CachedClockAdapter = CachedClockService & CachedClockLifecycle;

/** Injectable high-throughput cached clock port. */
export const CachedClockPort = port<CachedClockService>()({
  name: "CachedClock",
  direction: "outbound",
  description: "High-throughput cached clock port — trades freshness for throughput",
  category: "clock/cached-clock",
  tags: ["clock", "cache", "performance"],
});
