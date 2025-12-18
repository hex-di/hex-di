/**
 * DevTools WebSocket Protocol - JSON-RPC 2.0 based protocol.
 *
 * Re-exports canonical protocol types from @hex-di/devtools-core.
 *
 * @packageDocumentation
 */

// =============================================================================
// Re-export Protocol Types from devtools-core
// =============================================================================

export type {
  // Base types
  JsonRpcRequest,
  JsonRpcSuccessResponse,
  JsonRpcErrorResponse,
  JsonRpcResponse,
  JsonRpcNotification,
  JsonRpcMessage,
  // Request/Response types
  RegisterAppParams,
  GetGraphResult,
  GetTracesResult,
  GetStatsResult,
  GetContainerSnapshotResult,
  TraceControlParams,
  PinTraceParams,
  // Notification types
  DataUpdateNotification,
  AppConnectionNotification,
} from "@hex-di/devtools-core";

export {
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
  // Safe parsing with validation
  isValidJsonRpcMessage,
  parseJsonRpcMessage,
} from "@hex-di/devtools-core";
