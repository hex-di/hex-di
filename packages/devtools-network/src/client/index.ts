/**
 * DevTools Client - WebSocket client for DevTools communication
 *
 * @packageDocumentation
 */

export {
  DevToolsClient,
  type ClientOptions,
  type ClientEvent,
  type ClientEventListener,
} from './client.js';

export {
  WebSocketPort,
  type WebSocketService,
} from './ports/index.js';

export {
  BrowserWebSocketAdapter,
  WsAdapter,
} from './adapters/index.js';
