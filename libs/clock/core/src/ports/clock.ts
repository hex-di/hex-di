/**
 * ClockPort — injectable clock providing monotonic, wall-clock, and high-resolution time.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { MonotonicTimestamp, WallClockTimestamp, HighResTimestamp } from "../branded.js";

/** Service interface for ClockPort. */
export interface ClockService {
  readonly monotonicNow: () => MonotonicTimestamp;
  readonly wallClockNow: () => WallClockTimestamp;
  readonly highResNow: () => HighResTimestamp;
}

/** Injectable clock port providing monotonic, wall-clock, and high-resolution time. */
export const ClockPort = port<ClockService>()({
  name: "Clock",
  direction: "outbound",
  description: "Injectable clock port providing monotonic, wall-clock, and high-resolution time",
  category: "clock/clock",
  tags: ["clock", "timing", "monotonic", "gxp"],
});
