/**
 * Server exports for @hex-di/devtools-server.
 *
 * @packageDocumentation
 */

export { DevToolsServer, type DevToolsServerOptions, type ServerEvent, type ServerEventListener } from "./websocket-server.js";
export { ClientRegistry, type RegisteredApp, type AppInfo, type ClientRegistryListener } from "./client-registry.js";
export {
  // Types
  type JsonRpcRequest,
  type JsonRpcSuccessResponse,
  type JsonRpcErrorResponse,
  type JsonRpcNotification,
  type JsonRpcMessage,
  type RegisterAppParams,
  type GetGraphResult,
  type GetTracesResult,
  type GetStatsResult,
  type GetContainerSnapshotResult,
  type TraceControlParams,
  type PinTraceParams,
  type DataUpdateNotification,
  type AppConnectionNotification,
  // Constants
  ErrorCodes,
  Methods,
  // Helpers
  createRequest,
  createSuccessResponse,
  createErrorResponse,
  createNotification,
  isRequest,
  isNotification,
  isResponse,
  isErrorResponse,
} from "./protocol.js";
