/**
 * ClockDiagnosticsPort — clock source attestation and capability reporting.
 *
 * @packageDocumentation
 */
// @ts-nocheck


import { port } from "@hex-di/core";

/** Raw diagnostic information about the current clock adapter. */
export interface ClockDiagnostics {
  readonly adapterName: string;
  readonly monotonicSource: "performance.now" | "Date.now-clamped" | "host-bridge";
  readonly highResSource:
    | "performance.timeOrigin+now"
    | "Date.now"
    | "host-bridge"
    | "host-bridge-wallclock";
  readonly platformResolutionMs: number | undefined;
  readonly cryptoFipsMode: boolean | undefined;
}

/** GxP suitability classification for a clock adapter. */
export type ClockGxPSuitability = "suitable" | "suitable-degraded" | "not-suitable";

/** Fine-grained clock capability information for the current platform. */
export interface ClockCapabilities {
  /** Whether the platform provides performance.now() for monotonic time */
  readonly hasMonotonicTime: boolean;
  /** Whether the platform provides performance.timeOrigin for high-res absolute time */
  readonly hasHighResOrigin: boolean;
  /** Whether the browser context is cross-origin-isolated (undefined on non-browser platforms) */
  readonly crossOriginIsolated: boolean | undefined;
  /** Observed or known timer resolution in milliseconds */
  readonly estimatedResolutionMs: number;
  /** Detected platform identifier */
  readonly platform:
    | "node"
    | "deno"
    | "bun"
    | "browser"
    | "edge-worker"
    | "react-native"
    | "wasm"
    | "unknown";
  /** Whether high-resolution time is degraded (falls back to Date.now()) */
  readonly highResDegraded: boolean;
  /** Whether monotonic time is degraded (uses Date.now() clamped fallback) */
  readonly monotonicDegraded: boolean;
}

/** Service interface for ClockDiagnosticsPort. */
export interface ClockDiagnosticsService {
  readonly getDiagnostics: () => ClockDiagnostics;
  readonly getCapabilities: () => ClockCapabilities;
}

/** Injectable clock diagnostics port for source attestation and capability reporting. */
export const ClockDiagnosticsPort = port<ClockDiagnosticsService>()({
  name: "ClockDiagnostics",
  direction: "outbound",
  description: "Clock source attestation and capability reporting for GxP compliance",
  category: "clock/diagnostics",
  tags: ["diagnostics", "capabilities", "gxp", "observability"],
});
