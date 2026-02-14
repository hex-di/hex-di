/**
 * Structured logging support for graph inspection.
 *
 * These types and functions enable integration with structured logging systems
 * (e.g., JSON loggers, OpenTelemetry, Datadog, Splunk). Each log entry has:
 * - level: The severity level (debug, info, warn, error)
 * - event: A machine-readable event name for filtering/grouping
 * - message: Human-readable description
 * - data: Structured key-value pairs for analysis
 * - correlationId: Links all entries from one inspection together
 *
 * @packageDocumentation
 */

import type { GraphInspection } from "../types/inspection.js";

/**
 * Log severity levels for structured logging.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * A single structured log entry for logging frameworks.
 *
 * This format is designed to be compatible with:
 * - JSON logging (e.g., Bunyan, Pino, Winston JSON transport)
 * - OpenTelemetry semantic conventions
 * - Cloud logging services (GCP, AWS CloudWatch, Azure Monitor)
 *
 * @example With Pino logger
 * ```typescript
 * import pino from 'pino';
 * const logger = pino();
 *
 * const logs = toStructuredLogs(builder.inspect());
 * for (const log of logs) {
 *   logger[log.level](log.data, log.message);
 * }
 * ```
 *
 * @example With Winston JSON transport
 * ```typescript
 * import winston from 'winston';
 * const logger = winston.createLogger({ format: winston.format.json() });
 *
 * const logs = toStructuredLogs(builder.inspect());
 * for (const log of logs) {
 *   logger.log({ level: log.level, message: log.message, ...log.data });
 * }
 * ```
 */
export interface StructuredLogEntry {
  /** Severity level */
  readonly level: LogLevel;
  /** Machine-readable event name for filtering (e.g., "graph.inspection.summary") */
  readonly event: string;
  /** Human-readable message */
  readonly message: string;
  /** Structured key-value data for analysis */
  readonly data: Readonly<Record<string, string | number | boolean | readonly string[]>>;
  /** Correlation ID linking all entries from one inspection */
  readonly correlationId: string;
}

/**
 * Options for structured log generation.
 */
export interface StructuredLogOptions {
  /**
   * Minimum log level to include.
   *
   * - "debug": Include all logs (most verbose)
   * - "info": Include info, warn, error (default)
   * - "warn": Include warn, error only
   * - "error": Include error only (least verbose)
   */
  readonly minLevel?: LogLevel;

  /**
   * Whether to include per-adapter details (debug level).
   *
   * When true, generates a log entry for each adapter with its
   * dependencies and lifetime. Useful for debugging but verbose.
   *
   * @default false
   */
  readonly includeAdapterDetails?: boolean;
}

/**
 * Determines the numeric priority of a log level for filtering.
 *
 * @internal
 */
function logLevelPriority(level: LogLevel): number {
  switch (level) {
    case "debug":
      return 0;
    case "info":
      return 1;
    case "warn":
      return 2;
    case "error":
      return 3;
  }
}

/**
 * Converts a GraphInspection into structured log entries.
 *
 * This function transforms the inspection result into a series of structured
 * log entries suitable for JSON logging, monitoring systems, and log analysis
 * tools. Each entry follows a consistent format with:
 *
 * - **event**: Machine-readable identifier for filtering (e.g., "graph.adapter.registered")
 * - **level**: Severity for routing (debug/info/warn/error)
 * - **data**: Structured fields for analysis/dashboards
 * - **correlationId**: Links all entries from one inspection
 *
 * ## Generated Events
 *
 * | Event                              | Level  | Description                          |
 * |------------------------------------|--------|--------------------------------------|
 * | `graph.inspection.summary`         | info   | Overall graph state summary          |
 * | `graph.inspection.complete`        | info   | Graph is complete and ready to build |
 * | `graph.inspection.incomplete`      | warn   | Graph has unsatisfied requirements   |
 * | `graph.adapter.registered`         | debug  | Per-adapter details (if enabled)     |
 * | `graph.depth.warning`              | warn   | Depth approaching compile-time limit |
 * | `graph.depth.exceeded`             | error  | Depth exceeded, runtime check needed |
 * | `graph.missing.dependency`         | error  | Missing adapter for required port    |
 * | `graph.orphan.port`                | info   | Port provided but never required     |
 * | `graph.disposal.warning`           | warn   | Potential disposal order issue       |
 * | `graph.unnecessary.lazy`           | info   | Lazy port may be unnecessary         |
 * | `graph.performance.recommendation` | info/warn | Type complexity recommendation    |
 *
 * @example Basic usage
 * ```typescript
 * const inspection = builder.inspect();
 * const logs = toStructuredLogs(inspection);
 *
 * // Output to console as JSON
 * for (const log of logs) {
 *   console.log(JSON.stringify(log));
 * }
 * ```
 *
 * @example With filtering
 * ```typescript
 * // Only warnings and errors
 * const logs = toStructuredLogs(inspection, { minLevel: 'warn' });
 *
 * // Include per-adapter details for debugging
 * const debugLogs = toStructuredLogs(inspection, {
 *   minLevel: 'debug',
 *   includeAdapterDetails: true
 * });
 * ```
 *
 * @example Integration with OpenTelemetry
 * ```typescript
 * import { logs } from '@opentelemetry/api-logs';
 *
 * const otelLogger = logs.getLogger('graph-builder');
 * const structuredLogs = toStructuredLogs(inspection);
 *
 * for (const log of structuredLogs) {
 *   otelLogger.emit({
 *     severityText: log.level.toUpperCase(),
 *     body: log.message,
 *     attributes: {
 *       'event.name': log.event,
 *       'correlation.id': log.correlationId,
 *       ...log.data
 *     }
 *   });
 * }
 * ```
 *
 * @param inspection - The graph inspection result
 * @param options - Configuration options for log generation
 * @returns Array of structured log entries, filtered and sorted by severity
 */
export function toStructuredLogs(
  inspection: GraphInspection,
  options: StructuredLogOptions = {}
): readonly StructuredLogEntry[] {
  const minLevel = options.minLevel ?? "info";
  const minPriority = logLevelPriority(minLevel);
  const includeAdapterDetails = options.includeAdapterDetails ?? false;
  const { correlationId } = inspection;

  const entries: StructuredLogEntry[] = [];

  // Helper to add entry if it meets minimum level
  function addEntry(entry: StructuredLogEntry): void {
    if (logLevelPriority(entry.level) >= minPriority) {
      entries.push(entry);
    }
  }

  // Summary entry (always info level)
  const summaryData: Record<string, string | number | boolean | readonly string[]> = {
    adapterCount: inspection.adapterCount,
    unsatisfiedCount: inspection.unsatisfiedRequirements.length,
    maxChainDepth: inspection.maxChainDepth,
    typeComplexityScore: inspection.typeComplexityScore,
    isComplete: inspection.isComplete,
  };
  if (inspection.actor) {
    summaryData.actorType = inspection.actor.type;
    summaryData.actorId = inspection.actor.id;
    if (inspection.actor.name !== undefined) {
      summaryData.actorName = inspection.actor.name;
    }
  }
  addEntry({
    level: "info",
    event: "graph.inspection.summary",
    message: inspection.summary,
    data: summaryData,
    correlationId,
  });

  // Completeness status
  if (inspection.isComplete) {
    addEntry({
      level: "info",
      event: "graph.inspection.complete",
      message: "Graph is complete and ready to build",
      data: {
        adapterCount: inspection.adapterCount,
        providedPorts: inspection.provides.map(p => p.split(" ")[0]),
      },
      correlationId,
    });
  } else {
    addEntry({
      level: "warn",
      event: "graph.inspection.incomplete",
      message: `Graph has ${inspection.unsatisfiedRequirements.length} unsatisfied requirement(s)`,
      data: {
        unsatisfiedRequirements: inspection.unsatisfiedRequirements,
      },
      correlationId,
    });
  }

  // Per-adapter details (debug level, optional)
  if (includeAdapterDetails) {
    for (const provide of inspection.provides) {
      // Parse "PortName (lifetime)" format
      const match = provide.match(/^(.+) \((.+)\)$/);
      if (match) {
        const portName = match[1];
        const lifetime = match[2];
        const deps = inspection.dependencyMap[portName] ?? [];

        addEntry({
          level: "debug",
          event: "graph.adapter.registered",
          message: `Adapter registered: ${portName} (${lifetime})`,
          data: {
            portName,
            lifetime,
            dependencyCount: deps.length,
            dependencies: deps,
            isOverride: inspection.overrides.includes(portName),
            hasFinalizer: inspection.portsWithFinalizers.includes(portName),
          },
          correlationId,
        });
      }
    }
  }

  // Depth warnings/errors
  if (inspection.depthLimitExceeded) {
    addEntry({
      level: "error",
      event: "graph.depth.exceeded",
      message: `Dependency chain depth (${inspection.maxChainDepth}) exceeds compile-time limit. Runtime cycle detection will be performed.`,
      data: {
        maxChainDepth: inspection.maxChainDepth,
        limit: 50,
      },
      correlationId,
    });
  } else if (inspection.depthWarning) {
    addEntry({
      level: "warn",
      event: "graph.depth.warning",
      message: inspection.depthWarning,
      data: {
        maxChainDepth: inspection.maxChainDepth,
        warningThreshold: 40,
        limit: 50,
      },
      correlationId,
    });
  }

  // Missing dependencies (error level)
  for (const missing of inspection.unsatisfiedRequirements) {
    const dependents = Object.entries(inspection.dependencyMap)
      .filter(([, deps]) => deps.includes(missing))
      .map(([name]) => name);

    addEntry({
      level: "error",
      event: "graph.missing.dependency",
      message: `Missing adapter for '${missing}'`,
      data: {
        portName: missing,
        requiredBy: dependents,
      },
      correlationId,
    });
  }

  // Orphan ports (info level - may be intentional entry points)
  for (const orphan of inspection.orphanPorts) {
    addEntry({
      level: "info",
      event: "graph.orphan.port",
      message: `Port '${orphan}' is provided but not required by any other adapter`,
      data: {
        portName: orphan,
      },
      correlationId,
    });
  }

  // Disposal warnings
  for (const warning of inspection.disposalWarnings) {
    // Extract port names from warning message
    const match = warning.match(/^'([^']+)'.+depends on '([^']+)'/);
    const portName = match ? match[1] : "";
    const dependsOn = match ? match[2] : "";

    addEntry({
      level: "warn",
      event: "graph.disposal.warning",
      message: warning,
      data: {
        portName,
        dependsOnPort: dependsOn,
      },
      correlationId,
    });
  }

  // Unnecessary lazy ports
  for (const lazyPort of inspection.unnecessaryLazyPorts) {
    const originalPort = lazyPort.slice(4); // Remove "Lazy" prefix
    addEntry({
      level: "info",
      event: "graph.unnecessary.lazy",
      message: `Lazy port '${lazyPort}' may be unnecessary - no cycle would exist with direct '${originalPort}' dependency`,
      data: {
        lazyPortName: lazyPort,
        originalPortName: originalPort,
      },
      correlationId,
    });
  }

  // Performance recommendation
  if (inspection.performanceRecommendation !== "safe") {
    addEntry({
      level: inspection.performanceRecommendation === "consider-splitting" ? "warn" : "info",
      event: "graph.performance.recommendation",
      message: `Type complexity score: ${inspection.typeComplexityScore}. Recommendation: ${inspection.performanceRecommendation}`,
      data: {
        typeComplexityScore: inspection.typeComplexityScore,
        recommendation: inspection.performanceRecommendation,
      },
      correlationId,
    });
  }

  return entries;
}
