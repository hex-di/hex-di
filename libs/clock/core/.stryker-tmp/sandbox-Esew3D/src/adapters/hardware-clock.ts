/**
 * HardwareClockAdapter interface — for air-gapped GxP environments.
 *
 * Interface-only file (per spec §4.3 — no concrete implementation in v0.1.0).
 * Concrete implementations (GPS-PPS, PTP, RTC) are platform-specific and out of scope.
 *
 * @packageDocumentation
 */
// @ts-nocheck


import type { ClockService } from "../ports/clock.js";
import type { ClockDiagnosticsService } from "../ports/diagnostics.js";

/** Status of a hardware clock source. */
export interface HardwareClockStatus {
  readonly locked: boolean;
  readonly estimatedAccuracyMs: number | undefined;
  readonly sourceType: "gps" | "ptp" | "rtc" | "atomic" | "custom";
  readonly lastSyncCheckAt: number | undefined;
}

/** Options for HardwareClockAdapter implementations. */
export interface HardwareClockAdapterOptions {
  readonly adapterName: string;
  readonly gxp?: boolean;
}

/**
 * Interface for hardware clock adapters (GPS-PPS, PTP, RTC, atomic).
 *
 * Implementors MUST satisfy all HC-1 through HC-7 behavioral contracts
 * documented in spec/libs/clock/04-platform-adapters.md §4.3.
 */
export interface HardwareClockAdapter extends ClockService, ClockDiagnosticsService {
  readonly getHardwareStatus: () => HardwareClockStatus;
}