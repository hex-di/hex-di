/**
 * Network layer exports for @hex-di/devtools.
 *
 * Provides client registry and protocol utilities for DevTools
 * network communication, plus browser/TUI synchronization.
 *
 * @packageDocumentation
 */

// Client Registry
export {
  ClientRegistry,
  type RegisteredApp,
  type AppInfo,
  type ClientRegistryListener,
} from "./client-registry.js";

// Protocol utilities and re-exports
export {
  // Types
  type JsonRpcRequest,
  type JsonRpcSuccessResponse,
  type JsonRpcError,
  type JsonRpcErrorResponse,
  type JsonRpcResponse,
  type JsonRpcNotification,
  type JsonRpcMessage,
  type ErrorCode,
  type Method,
  type MethodMap,
  type MethodParams,
  type MethodResult,
  type ParseMessageResult,
  // Constants
  ErrorCodes,
  Methods,
  // Factory functions
  createRequest,
  createSuccessResponse,
  createErrorResponse,
  createNotification,
  // Type guards
  isRequest,
  isNotification,
  isResponse,
  isErrorResponse,
  isSuccessResponse,
  // Parsing
  isValidJsonRpcMessage,
  parseJsonRpcMessage,
  parseMessage,
  serializeMessage,
  deserializeMessage,
} from "./protocol.js";

// Synchronization Infrastructure
export { StateBroadcaster, type BroadcastFn, type StateBroadcasterConfig } from "./state-broadcaster.js";
export { StateReceiver, type StateReceiverConfig, type ConflictResolution } from "./state-receiver.js";
export { ActionSync, type ActionSyncConfig, type ActionHistoryEntry } from "./action-sync.js";
export {
  ConnectionManager,
  type ConnectionManagerConfig,
  type ConnectionState,
  type ConnectionEvent,
  type ConnectionEventListener,
  type WebSocketFactory,
} from "./connection-manager.js";
