/**
 * Capability Analyzer Types.
 *
 * Type definitions for static analysis of adapter factories for ambient
 * authority patterns. Adapters should receive all external authority through
 * constructor injection (ports), not through global state, environment
 * variables, or module singletons.
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/11-capability-analyzer | BEH-CO-11}
 *
 * @packageDocumentation
 */

// =============================================================================
// AmbientAuthorityKind
// =============================================================================

/**
 * Classification of ambient authority patterns detected in adapter factories.
 *
 * | Kind                | Example Pattern               | Severity |
 * |---------------------|-------------------------------|----------|
 * | `"global-variable"` | `globalThis.config`           | High     |
 * | `"process-env"`     | `process.env.API_URL`         | High     |
 * | `"module-singleton"`| `require("./singleton")`      | Medium   |
 * | `"direct-io"`       | `fs.readFileSync(...)`        | Medium   |
 * | `"date-now"`        | `Date.now()`, `new Date()`    | Low      |
 * | `"math-random"`     | `Math.random()`               | Low      |
 */
export type AmbientAuthorityKind =
  | "global-variable"
  | "process-env"
  | "module-singleton"
  | "direct-io"
  | "date-now"
  | "math-random";

// =============================================================================
// AmbientAuthorityDetection
// =============================================================================

/**
 * A single detection of ambient authority usage in a factory function.
 *
 * Produced by {@link detectAmbientAuthority} when a factory's source code
 * matches a known ambient authority pattern.
 */
export interface AmbientAuthorityDetection {
  /** The classification of the detected pattern. */
  readonly kind: AmbientAuthorityKind;
  /** The specific identifier that was detected (e.g., "process.env", "globalThis"). */
  readonly identifier: string;
  /** Confidence level of the detection. */
  readonly confidence: "high" | "medium" | "low";
  /** Optional source snippet surrounding the detection for context. */
  readonly sourceSnippet?: string;
}

// =============================================================================
// AdapterAuditEntry
// =============================================================================

/**
 * Audit entry for a single adapter in a capability audit report.
 */
export interface AdapterAuditEntry {
  /** The name of the adapter's provided port. */
  readonly adapterName: string;
  /** The port name this adapter provides. */
  readonly portName: string;
  /** All ambient authority detections found in this adapter's factory. */
  readonly detections: ReadonlyArray<AmbientAuthorityDetection>;
  /** True if no ambient authority was detected. */
  readonly isClean: boolean;
}

// =============================================================================
// CapabilityAuditReport
// =============================================================================

/**
 * Structured audit report for all adapters in a dependency graph.
 *
 * Summarizes ambient authority detections per adapter and provides
 * an overall authority hygiene score. Designed for CI/CD integration.
 */
export interface CapabilityAuditReport {
  /** Per-adapter audit entries. */
  readonly entries: ReadonlyArray<AdapterAuditEntry>;
  /** Total number of adapters audited. */
  readonly totalAdapters: number;
  /** Number of adapters with no ambient authority detections. */
  readonly cleanAdapters: number;
  /** Number of adapters with at least one ambient authority detection. */
  readonly violatingAdapters: number;
  /** Number of high-confidence violations across all adapters. */
  readonly highConfidenceViolations: number;
  /** Human-readable summary suitable for terminal output. */
  readonly summary: string;
}
