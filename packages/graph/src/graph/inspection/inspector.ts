/**
 * Graph Inspector.
 *
 * This module provides the main inspectGraph() function that orchestrates
 * all inspection analysis and produces a comprehensive GraphInspection result.
 *
 * @packageDocumentation
 */

import type {
  GraphInspection,
  GraphSummary,
  InspectOptions,
  InspectableGraph,
  PortInfo,
  DirectionSummary,
  PortDirection,
} from "../types/inspection.js";

import { getPortDirection, getPortMetadata, ASYNC, auditGraph } from "@hex-di/core";
import { createCorrelationIdGenerator } from "./correlation.js";
import {
  computeMaxChainDepth,
  computeOrphanPorts,
  generateDepthWarning,
  isDepthLimitExceeded,
} from "./depth-analysis.js";
import { computeDisposalWarnings, getPortsWithFinalizers } from "./disposal.js";
import { computeTypeComplexityScore, getPerformanceRecommendation } from "./complexity.js";
import { detectUnnecessaryLazyPorts } from "./lazy-analysis.js";
import { generateSuggestions } from "./suggestions.js";
import { detectCycleAtRuntime } from "./runtime-cycle-detection.js";
import { computeInitializationOrder } from "./init-order.js";
import { computeErrorProfile, detectUnhandledErrors } from "./effect-propagation.js";

/**
 * Inspects a built Graph and returns detailed runtime information.
 *
 * This is the companion function to `GraphBuilder.inspect()` for use with
 * already-built graphs. Use this when you need to analyze a graph after
 * calling `build()`.
 *
 * ## Time Complexity
 *
 * | Operation | Complexity | Notes |
 * |-----------|------------|-------|
 * | Port enumeration | O(A) | A = adapter count |
 * | Dependency map construction | O(A * D) | D = avg dependencies per adapter |
 * | Unsatisfied requirements | O(R) | R = total required ports |
 * | Max chain depth (DFS) | O(A + E) | E = total edges |
 * | Orphan port detection | O(P) | P = provided ports |
 * | Disposal warnings | O(A * D) | For each adapter, scan dependencies |
 * | Complexity score | O(E) | Sum of all dependency edges |
 * | Unnecessary lazy detection | O(L * (A + E)) | L = lazy port count |
 * | Initialization order | O(A + E) | Kahn's algorithm |
 * | Capability audit | O(A * S) | S = avg factory source length |
 * | Effect propagation | O(A * (A + E)) | Transitive walk per port |
 * | Suggestions | O(U + O + D) | U = unsatisfied, O = orphans, D = disposal warnings |
 * | **Total** | **O(A * (A + E) + L * (A + E))** | Dominated by effect propagation and lazy analysis |
 *
 * ## Memory Complexity
 *
 * O(A + E) for the dependency map and auxiliary data structures.
 *
 * ## Scale Guidelines
 *
 * | Adapter Count | Expected Time | Notes |
 * |--------------|---------------|-------|
 * | 1-100 | < 1ms | Typical application |
 * | 100-500 | 1-10ms | Large monolith |
 * | 500-1000 | 10-50ms | Very large system, consider splitting |
 * | 1000+ | 50ms+ | Not recommended; split into subgraphs |
 *
 * ## Iteration Order Independence
 *
 * All computed properties are **order-independent** - they produce the same
 * result regardless of adapter registration order:
 *
 * | Property                | Order Independent | Notes                           |
 * |-------------------------|-------------------|----------------------------------|
 * | `adapterCount`          | Yes               | Pure count                       |
 * | `provides`              | No                | Preserves registration order     |
 * | `unsatisfiedRequirements`| Yes              | Alphabetically sorted            |
 * | `dependencyMap`         | Yes               | Map semantics                    |
 * | `overrides`             | Yes               | Alphabetically sorted            |
 * | `maxChainDepth`         | Yes               | Computed via DFS, deterministic  |
 * | `orphanPorts`           | Yes               | Alphabetically sorted            |
 * | `isComplete`            | Yes               | Boolean derived from sets        |
 * | `typeComplexityScore`   | Yes               | Computed from structure          |
 * | `initializationOrder`   | No                | Stable: ties broken by registration order |
 * | `errorProfile`          | Yes               | Tags sorted alphabetically       |
 *
 * Arrays derived from sets (`unsatisfiedRequirements`, `overrides`, `orphanPorts`)
 * are **alphabetically sorted** for deterministic output. Direct equality comparison
 * works without converting to sets.
 *
 * @example Basic usage
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter)
 *   .build();
 *
 * const info = inspectGraph(graph);
 * console.log(info.summary);
 * // "Graph(2 adapters, 0 unsatisfied): Logger (singleton), Database (scoped)"
 * ```
 *
 * @example Checking graph before runtime
 * ```typescript
 * const graph = buildApplicationGraph();
 * const info = inspectGraph(graph);
 *
 * if (info.maxChainDepth > 40) {
 *   console.warn(
 *     `Deep dependency chain (${info.maxChainDepth}). ` +
 *     `Consider using GraphBuilder.withMaxDepth<N>() or splitting into subgraphs.`
 *   );
 * }
 *
 * // Proceed to create runtime container
 * const container = createContainer(graph);
 * ```
 *
 * @param graph - The built graph to inspect (or any graph-like object with adapters and overridePortNames)
 * @param options - Optional configuration for inspection
 * @returns A frozen GraphInspection or GraphSummary object based on options
 *
 * @example Summary mode
 * ```typescript
 * // Get lightweight summary (7 fields)
 * const summary = inspectGraph(graph, { summary: true });
 * console.log(`${summary.adapterCount} adapters, ${summary.asyncAdapterCount} async`);
 * console.log(`Valid: ${summary.isValid}`);
 * ```
 */
// Overload: summary mode returns GraphSummary
export function inspectGraph(
  graph: InspectableGraph,
  options: InspectOptions & { summary: true }
): GraphSummary;
// Overload: default mode returns GraphInspection
export function inspectGraph(graph: InspectableGraph, options?: InspectOptions): GraphInspection;
// Implementation
export function inspectGraph(
  graph: InspectableGraph,
  options: InspectOptions = {}
): GraphInspection | GraphSummary {
  // Summary mode: return lightweight GraphSummary
  if (options.summary) {
    return buildGraphSummary(graph);
  }

  // Full inspection mode
  const provides: string[] = [];
  const allRequires = new Set<string>();
  const providedSet = new Set<string>();
  const dependencyMap: Record<string, string[]> = {};

  // Build ports array with metadata
  const ports: PortInfo[] = [];
  let inboundCount = 0;
  let outboundCount = 0;

  for (const adapter of graph.adapters) {
    const port = adapter.provides;
    const portName = port.__portName;
    const lifetime = adapter.lifetime;

    // Get direction and metadata from the port
    const direction: PortDirection = getPortDirection(port) ?? "outbound";
    const metadata = getPortMetadata(port);

    // Build port info
    ports.push({
      name: portName,
      lifetime,
      direction,
      category: metadata?.category,
      tags: metadata?.tags ?? [],
    });

    // Track direction counts
    if (direction === "inbound") {
      inboundCount++;
    } else {
      outboundCount++;
    }

    // Existing provides logic
    provides.push(`${portName} (${lifetime})`);
    providedSet.add(portName);

    const requires: string[] = [];
    for (const req of adapter.requires) {
      requires.push(req.__portName);
      allRequires.add(req.__portName);
    }
    dependencyMap[portName] = requires;
  }

  const directionSummary: DirectionSummary = {
    inbound: inboundCount,
    outbound: outboundCount,
  };

  const unsatisfiedRequirements = [...allRequires].filter(r => !providedSet.has(r)).sort();
  const overrides = [...graph.overridePortNames].sort();
  const maxChainDepth = computeMaxChainDepth(dependencyMap);
  const orphanPorts = computeOrphanPorts(providedSet, allRequires);

  // Compute new disposal and performance metrics
  const disposalWarnings = computeDisposalWarnings(graph.adapters, dependencyMap);
  const typeComplexityScore = computeTypeComplexityScore(
    graph.adapters.length,
    maxChainDepth,
    dependencyMap
  );
  const performanceRecommendation = getPerformanceRecommendation(typeComplexityScore);
  const portsWithFinalizers = getPortsWithFinalizers(graph.adapters);

  const providedNames = [...providedSet].join(", ");
  const missingPart =
    unsatisfiedRequirements.length > 0 ? `. Missing: ${unsatisfiedRequirements.join(", ")}` : "";

  // Generate depth warning if approaching compile-time limit
  const depthWarning = generateDepthWarning(maxChainDepth);

  // Check if depth limit is exceeded (type-level cycle detection may have false negatives)
  const depthLimitExceeded = isDepthLimitExceeded(maxChainDepth);

  // Detect unnecessary lazy ports (lazy ports that don't break any cycle)
  const unnecessaryLazyPorts = detectUnnecessaryLazyPorts(graph.adapters, dependencyMap);

  // Compute effect propagation analysis (transitive error profiles and warnings)
  const errorProfile = computeErrorProfile(graph.adapters, dependencyMap);
  const effectWarnings = detectUnhandledErrors(graph.adapters, dependencyMap);

  // Generate actionable suggestions
  const suggestions = generateSuggestions(
    unsatisfiedRequirements,
    orphanPorts,
    maxChainDepth,
    dependencyMap,
    disposalWarnings,
    unnecessaryLazyPorts
  );

  // Generate correlation ID for tracing
  // Use provided generator or create an isolated one (no global state)
  const generator = options.generator ?? createCorrelationIdGenerator();
  const correlationId = generator(options.seed);

  // Compute initialization order (stable topological sort with level grouping)
  const initOrder = computeInitializationOrder(graph.adapters);

  // Run capability audit on all adapters
  const capabilities = auditGraph(graph);

  return Object.freeze({
    adapterCount: graph.adapters.length,
    provides,
    unsatisfiedRequirements,
    dependencyMap,
    overrides,
    maxChainDepth,
    depthWarning,
    isComplete: unsatisfiedRequirements.length === 0,
    summary: `Graph(${graph.adapters.length} adapters, ${unsatisfiedRequirements.length} unsatisfied): ${providedNames}${missingPart}`,
    suggestions: Object.freeze(suggestions),
    orphanPorts: Object.freeze(orphanPorts),
    disposalWarnings: Object.freeze(disposalWarnings),
    typeComplexityScore,
    performanceRecommendation,
    portsWithFinalizers: Object.freeze(portsWithFinalizers),
    depthLimitExceeded,
    unnecessaryLazyPorts: Object.freeze(unnecessaryLazyPorts),
    correlationId,
    ports: Object.freeze(ports.map(p => Object.freeze(p))),
    directionSummary: Object.freeze(directionSummary),
    actor: options.actor ? Object.freeze({ ...options.actor }) : undefined,
    initializationOrder: initOrder ?? Object.freeze([]),
    capabilities,
    errorProfile,
    effectWarnings,
  });
}

/**
 * Builds a lightweight GraphSummary for quick health checks.
 *
 * @internal
 */
function buildGraphSummary(graph: InspectableGraph): GraphSummary {
  const provides: string[] = [];
  const allRequires = new Set<string>();
  const providedSet = new Set<string>();
  const dependencyMap: Record<string, string[]> = {};
  let asyncAdapterCount = 0;

  // Extract port names and count async adapters
  for (const adapter of graph.adapters) {
    const portName = adapter.provides.__portName;
    provides.push(portName);
    providedSet.add(portName);

    // Count async adapters
    if (adapter.factoryKind === ASYNC) {
      asyncAdapterCount++;
    }

    // Build dependency map for cycle detection
    const requires: string[] = [];
    for (const req of adapter.requires) {
      requires.push(req.__portName);
      allRequires.add(req.__portName);
    }
    dependencyMap[portName] = requires;
  }

  // Compute missing ports
  const missingPorts = [...allRequires].filter(r => !providedSet.has(r)).sort();
  const isComplete = missingPorts.length === 0;

  // Build errors array
  const errors: string[] = [];

  if (missingPorts.length > 0) {
    errors.push(`Missing adapters for: ${missingPorts.join(", ")}`);
  }

  // Check for cycles (only if depth limit might be exceeded)
  const maxChainDepth = computeMaxChainDepth(dependencyMap);
  if (isDepthLimitExceeded(maxChainDepth)) {
    const cycle = detectCycleAtRuntime(graph.adapters);
    if (cycle) {
      errors.push(`Circular dependency: ${cycle.join(" -> ")}`);
    }
  }

  const isValid = isComplete && errors.length === 0;

  return Object.freeze({
    adapterCount: graph.adapters.length,
    asyncAdapterCount,
    isComplete,
    missingPorts: Object.freeze(missingPorts),
    isValid,
    errors: Object.freeze(errors),
    provides: Object.freeze(provides),
  });
}
