/**
 * Logging inspection snapshot types.
 *
 * Defines the shape of logging state snapshots and related statistics
 * used by the LoggerInspector for observability.
 *
 * @packageDocumentation
 */

import type { LogLevel } from "../types/index.js";

/**
 * Complete snapshot of the logging system state.
 */
export interface LoggingSnapshot {
  readonly timestamp: number;
  readonly totalEntries: number;
  readonly entriesByLevel: Readonly<Record<LogLevel, number>>;
  readonly errorRate: number;
  readonly handlers: readonly HandlerInfo[];
  readonly samplingActive: boolean;
  readonly redactionActive: boolean;
  readonly contextDepth: number;
}

/**
 * Metadata about a registered log handler.
 */
export interface HandlerInfo {
  readonly type: string;
  readonly name: string;
  readonly active: boolean;
  readonly entryCount: number;
  readonly formatterType?: string;
  readonly minLevel?: LogLevel;
}

/**
 * Statistics about sampling behavior.
 */
export interface SamplingStatistics {
  readonly active: boolean;
  readonly byLevel: Readonly<
    Record<
      LogLevel,
      {
        readonly received: number;
        readonly accepted: number;
        readonly dropped: number;
      }
    >
  >;
  readonly acceptanceRate: number;
}

/**
 * Statistics about redaction behavior.
 */
export interface RedactionStatistics {
  readonly active: boolean;
  readonly totalRedactions: number;
  readonly fieldFrequency: Readonly<Record<string, number>>;
  readonly patternMatches: number;
}

/**
 * Statistics about context variable usage.
 */
export interface ContextUsageStatistics {
  readonly activeVariables: number;
  readonly fieldFrequency: Readonly<Record<string, number>>;
  readonly maxChildDepth: number;
}

/**
 * Options for time-windowed calculations.
 */
export interface TimeWindowOptions {
  readonly windowMs?: number;
}

/**
 * Options for querying recent log entries.
 */
export interface RecentEntriesOptions {
  readonly limit?: number;
  readonly level?: LogLevel;
  readonly since?: number;
}
