/**
 * @hex-di/devtools-core/ports - Essential Port Definitions
 *
 * Provides the essential ports for DevTools:
 * 1. TraceCollectorPort - Trace collection and querying
 * 2. LoggerPort - Platform-agnostic logging
 * 3. WebSocketPort - Platform-agnostic WebSocket
 *
 * @packageDocumentation
 */

// Domain Ports
export {
  TraceCollectorPort,
  type TraceCollector,
  type TraceEntryInput,
} from './trace-collector.port.js';

export {
  LoggerPort,
  type Logger,
  type LogLevel,
} from './logger.port.js';

// Infrastructure Ports
export {
  WebSocketPort,
  type WebSocketService,
  type WebSocketState,
  type WebSocketEventHandlers,
} from './websocket.port.js';
