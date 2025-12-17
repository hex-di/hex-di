/**
 * Mock implementations for testing.
 *
 * @packageDocumentation
 */

export {
  createMockDataSource,
  type MockDataSourceConfig,
  type MockDataSourceActions,
  type PresenterDataSourceContract,
} from "./data-source.mock.js";

export {
  createMockWebSocket,
  type MockWebSocketConfig,
  type MockWebSocketActions,
  type WebSocketService,
  type WebSocketState,
  type WebSocketEventHandlers,
} from "./websocket.mock.js";
