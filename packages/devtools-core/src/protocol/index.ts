/**
 * DevTools JSON-RPC 2.0 Protocol.
 *
 * This module provides the canonical protocol types and helpers for
 * DevTools communication over WebSocket.
 *
 * @packageDocumentation
 */

// Types
export type {
  JsonRpcRequest,
  JsonRpcSuccessResponse,
  JsonRpcError,
  JsonRpcErrorResponse,
  JsonRpcResponse,
  JsonRpcNotification,
  JsonRpcMessage,
  ErrorCode,
  Method,
  // Request/Response types
  RegisterAppParams,
  AppIdParams,
  GetGraphResult,
  GetTracesResult,
  GetStatsResult,
  GetContainerSnapshotResult,
  TraceControlParams,
  PinTraceParams,
  AppInfo,
  ListAppsResult,
  // Notification types
  DataUpdateNotification,
  AppConnectionNotification,
  // Type-safe method mapping
  MethodMap,
  MethodParams,
  MethodResult,
  NotificationMap,
} from "./types.js";

// Constants
export { ErrorCodes, Methods } from "./types.js";

// Helpers
export {
  createRequest,
  createSuccessResponse,
  createErrorResponse,
  createNotification,
  isRequest,
  isNotification,
  isResponse,
  isErrorResponse,
  isSuccessResponse,
  // Safe parsing with validation
  isValidJsonRpcMessage,
  parseJsonRpcMessage,
} from "./helpers.js";
