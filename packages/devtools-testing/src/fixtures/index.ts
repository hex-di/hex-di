/**
 * Test fixture factories.
 *
 * @packageDocumentation
 */

// Graph fixtures
export {
  createNode,
  createEdge,
  createGraph,
  createMinimalGraph,
  createSimpleGraph,
  createComplexGraph,
  createLifetimeGraph,
  createAsyncGraph,
  // Aliases
  createComplexTestGraph,
  createTestGraph,
  createEmptyGraph,
  type CreateNodeOptions,
  type CreateGraphOptions,
} from "./graph.fixtures.js";

// Trace fixtures
export {
  createTraceEntry,
  createTraceStats,
  createTestTraces,
  createCacheHitTraces,
  createSlowTraces,
  createStatsFromTraces,
  createRepeatedTraces,
  createTraceHierarchy,
  generateTraceId,
  resetTraceCounter,
  type CreateTraceEntryOptions,
  type CreateTraceStatsOptions,
} from "./trace.fixtures.js";
