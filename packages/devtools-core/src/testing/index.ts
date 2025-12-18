/**
 * Internal testing utilities for HexDI DevTools.
 *
 * @internal This module is for internal testing only and is not part of the public API.
 *
 * These utilities provide mock implementations and fixture factories for testing
 * DevTools components, presenters, and integrations.
 *
 * @packageDocumentation
 */

// =============================================================================
// Mocks
// =============================================================================

export {
  // Data Source Mock
  createMockDataSource,
  type MockDataSourceConfig,
  type MockDataSourceActions,
} from "./data-source.mock.js";

export {
  // WebSocket Mock
  createMockWebSocket,
  type MockWebSocketConfig,
  type MockWebSocketActions,
} from "./websocket.mock.js";

// =============================================================================
// Fixtures
// =============================================================================

export {
  // Graph Fixtures
  createNode,
  createEdge,
  createGraph,
  createMinimalGraph,
  createSimpleGraph,
  createComplexGraph,
  createLifetimeGraph,
  createAsyncGraph,
  type CreateNodeOptions,
  type CreateGraphOptions,
} from "./graph.fixtures.js";

export {
  // Trace Fixtures
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
