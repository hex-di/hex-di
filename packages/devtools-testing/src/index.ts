/**
 * @hex-di/devtools-testing - Testing utilities for HexDI DevTools.
 *
 * This package provides mock implementations and fixture factories for testing
 * DevTools components, presenters, and integrations. It has no runtime dependencies
 * beyond devtools-core types.
 *
 * ## Key Features
 *
 * - **Mock Data Source**: Full implementation of PresenterDataSourceContract
 *   with test control methods for setting data and triggering updates.
 *
 * - **Mock WebSocket**: Complete WebSocket service mock with methods to
 *   simulate connection, messages, errors, and disconnection.
 *
 * - **Graph Fixtures**: Factory functions for creating test graphs, nodes,
 *   and edges with sensible defaults.
 *
 * - **Trace Fixtures**: Factory functions for creating trace entries and
 *   statistics for testing timeline and performance features.
 *
 * ## Quick Start
 *
 * @example Mock Data Source
 * ```typescript
 * import { createMockDataSource, createSimpleGraph } from "@hex-di/devtools-testing";
 *
 * const mockDataSource = createMockDataSource({
 *   graph: createSimpleGraph(),
 * });
 *
 * // Use in tests
 * const graph = mockDataSource.getGraph();
 *
 * // Update data and trigger subscribers
 * mockDataSource._setTraces([...newTraces]);
 * ```
 *
 * @example Mock WebSocket
 * ```typescript
 * import { createMockWebSocket } from "@hex-di/devtools-testing";
 *
 * const mockWs = createMockWebSocket({ autoOpen: true });
 *
 * await mockWs.connect("ws://localhost:8080", handlers);
 *
 * mockWs.send('{"type":"ping"}');
 * mockWs.simulateMessage('{"type":"pong"}');
 *
 * expect(mockWs.getSentMessages()).toContain('{"type":"ping"}');
 * ```
 *
 * @example Graph Fixtures
 * ```typescript
 * import { createNode, createEdge, createGraph } from "@hex-di/devtools-testing";
 *
 * const graph = createGraph({
 *   nodes: [
 *     createNode({ id: "Logger" }),
 *     createNode({ id: "UserService", lifetime: "scoped" }),
 *   ],
 *   edges: [createEdge("UserService", "Logger")],
 * });
 * ```
 *
 * @example Trace Fixtures
 * ```typescript
 * import { createTestTraces, createStatsFromTraces } from "@hex-di/devtools-testing";
 *
 * const traces = createTestTraces();
 * const stats = createStatsFromTraces(traces);
 *
 * expect(traces).toHaveLength(3);
 * expect(stats.totalResolutions).toBe(3);
 * ```
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
  type PresenterDataSourceContract,
  // WebSocket Mock
  createMockWebSocket,
  type MockWebSocketConfig,
  type MockWebSocketActions,
  type WebSocketService,
  type WebSocketState,
  type WebSocketEventHandlers,
} from "./mocks/index.js";

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
  // Aliases
  createComplexTestGraph,
  createTestGraph,
  createEmptyGraph,
  type CreateNodeOptions,
  type CreateGraphOptions,
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
} from "./fixtures/index.js";
