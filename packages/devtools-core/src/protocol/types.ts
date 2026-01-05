/**
 * JSON-RPC 2.0 Protocol Types for DevTools communication.
 *
 * This module defines the canonical protocol types used for communication
 * between DevTools clients, servers, and relay nodes.
 *
 * @packageDocumentation
 */

import type { ExportedGraph } from "../types.js";
import type { TraceEntry, TraceStats, ContainerSnapshot } from "@hex-di/plugin";

// =============================================================================
// Base JSON-RPC Types
// =============================================================================

/**
 * JSON-RPC 2.0 request message.
 */
export interface JsonRpcRequest<TMethod extends string = string, TParams = unknown> {
  readonly jsonrpc: "2.0";
  readonly id: string | number;
  readonly method: TMethod;
  readonly params?: TParams;
}

/**
 * JSON-RPC 2.0 success response message.
 */
export interface JsonRpcSuccessResponse<TResult = unknown> {
  readonly jsonrpc: "2.0";
  readonly id: string | number;
  readonly result: TResult;
}

/**
 * JSON-RPC 2.0 error object.
 */
export interface JsonRpcError {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

/**
 * JSON-RPC 2.0 error response message.
 */
export interface JsonRpcErrorResponse {
  readonly jsonrpc: "2.0";
  readonly id: string | number | null;
  readonly error: JsonRpcError;
}

/**
 * JSON-RPC 2.0 notification message (no id, no response expected).
 */
export interface JsonRpcNotification<TMethod extends string = string, TParams = unknown> {
  readonly jsonrpc: "2.0";
  readonly method: TMethod;
  readonly params?: TParams;
}

/**
 * JSON-RPC 2.0 response (success or error).
 * Alias for backwards compatibility.
 */
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

/**
 * Any JSON-RPC message type.
 */
export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcSuccessResponse
  | JsonRpcErrorResponse
  | JsonRpcNotification;

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Standard JSON-RPC and custom error codes.
 */
export const ErrorCodes = {
  // Standard JSON-RPC error codes
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Custom DevTools error codes
  APP_NOT_FOUND: -32001,
  NOT_CONNECTED: -32002,
  TIMEOUT: -32003,
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// =============================================================================
// Request/Response Parameter Types
// =============================================================================

/**
 * App registration request parameters.
 */
export interface RegisterAppParams {
  readonly appId: string;
  readonly appName: string;
  readonly appVersion: string;
  readonly hexDIVersion: string;
}

/**
 * Get graph response result.
 */
export interface GetGraphResult {
  readonly graph: ExportedGraph;
}

/**
 * Get traces response result.
 */
export interface GetTracesResult {
  readonly traces: readonly TraceEntry[];
}

/**
 * Get stats response result.
 */
export interface GetStatsResult {
  readonly stats: TraceStats;
}

/**
 * Get container snapshot response result.
 */
export interface GetContainerSnapshotResult {
  readonly snapshot: ContainerSnapshot | null;
}

/**
 * Trace control action parameters.
 */
export interface TraceControlParams {
  readonly action: "pause" | "resume" | "clear";
}

/**
 * Pin/unpin trace parameters.
 */
export interface PinTraceParams {
  readonly traceId: string;
  readonly pin: boolean;
}

// =============================================================================
// Sync Types
// =============================================================================

/**
 * Partial state update for synchronization.
 */
export interface SyncStateParams {
  readonly graph?: {
    readonly selectedNodeId?: string | null;
    readonly highlightedNodeIds?: readonly string[];
    readonly zoom?: number;
    readonly panOffset?: { readonly x: number; readonly y: number };
  };
  readonly timeline?: {
    readonly filterText?: string;
    readonly grouping?: string;
    readonly sortOrder?: string;
    readonly sortDescending?: boolean;
  };
  readonly inspector?: {
    readonly filterText?: string;
    readonly selectedServicePortName?: string | null;
    readonly selectedScopeId?: string | null;
  };
  readonly panel?: {
    readonly activeTabId?: string;
    readonly isOpen?: boolean;
  };
  readonly timestamp: number;
  readonly priority?: "immediate" | "debounced";
}

/**
 * Action to be synchronized across clients.
 */
export interface SyncActionParams {
  readonly action: {
    readonly type: string;
    readonly payload?: unknown;
  };
  readonly source: string;
  readonly timestamp: number;
}

/**
 * Preferences to be synchronized (filters, view settings).
 */
export interface SyncPreferencesParams {
  readonly timeline?: {
    readonly filterText?: string;
    readonly grouping?: string;
    readonly sortOrder?: string;
    readonly showOnlyCacheHits?: boolean;
    readonly showOnlySlow?: boolean;
  };
  readonly inspector?: {
    readonly filterText?: string;
    readonly showDependencies?: boolean;
    readonly showDependents?: boolean;
  };
  readonly timestamp: number;
}

/**
 * Request sync status from server.
 */
export interface GetSyncStatusResult {
  readonly isConnected: boolean;
  readonly clientCount: number;
  readonly lastSyncTimestamp: number;
  readonly connectedClients: readonly {
    readonly id: string;
    readonly role: "browser" | "tui";
    readonly connectedAt: number;
  }[];
}

// =============================================================================
// Notification Types
// =============================================================================

/**
 * Data update notification.
 */
export interface DataUpdateNotification {
  readonly type: "graph" | "traces" | "stats" | "snapshot";
}

/**
 * App connection notification.
 */
export interface AppConnectionNotification {
  readonly appId: string;
  readonly appName: string;
  readonly connected: boolean;
}

// =============================================================================
// Method Names
// =============================================================================

/**
 * DevTools protocol method names.
 */
export const Methods = {
  // App registration
  REGISTER_APP: "devtools.registerApp",
  UNREGISTER_APP: "devtools.unregisterApp",

  // Data requests
  GET_GRAPH: "devtools.getGraph",
  GET_TRACES: "devtools.getTraces",
  GET_STATS: "devtools.getStats",
  GET_CONTAINER_SNAPSHOT: "devtools.getContainerSnapshot",

  // Trace control
  TRACE_CONTROL: "devtools.traceControl",
  PIN_TRACE: "devtools.pinTrace",

  // Sync methods
  SYNC_STATE: "devtools.syncState",
  SYNC_ACTION: "devtools.syncAction",
  SYNC_PREFERENCES: "devtools.syncPreferences",
  GET_SYNC_STATUS: "devtools.getSyncStatus",

  // Notifications
  DATA_UPDATE: "devtools.dataUpdate",
  APP_CONNECTION: "devtools.appConnection",

  // Discovery
  LIST_APPS: "devtools.listApps",
} as const;

export type Method = (typeof Methods)[keyof typeof Methods];

// =============================================================================
// Type-Safe Method Mapping
// =============================================================================

/**
 * App info for list apps response.
 */
export interface AppInfo {
  readonly appId: string;
  readonly appName: string;
  readonly appVersion: string;
  readonly hexDIVersion: string;
  readonly connectedAt: number;
}

/**
 * List apps response result.
 */
export interface ListAppsResult {
  readonly apps: readonly AppInfo[];
}

/**
 * Request parameters for methods requiring an appId.
 */
export interface AppIdParams {
  readonly appId: string;
}

/**
 * Type-safe mapping from method names to their parameter and result types.
 *
 * This enables compile-time validation of method calls:
 *
 * @example Type-safe client usage
 * ```typescript
 * function call<M extends keyof MethodMap>(
 *   method: M,
 *   params: MethodMap[M]['params']
 * ): Promise<MethodMap[M]['result']>;
 *
 * // Type-safe: params and result are inferred
 * const result = await call('devtools.getGraph', { appId: 'app-1' });
 * // result.graph is ExportedGraph
 * ```
 */
export interface MethodMap {
  // App registration
  [Methods.REGISTER_APP]: {
    params: RegisterAppParams;
    result: { readonly success: boolean };
  };
  [Methods.UNREGISTER_APP]: {
    params: AppIdParams;
    result: { readonly success: boolean };
  };

  // Data requests
  [Methods.GET_GRAPH]: {
    params: AppIdParams;
    result: GetGraphResult;
  };
  [Methods.GET_TRACES]: {
    params: AppIdParams;
    result: GetTracesResult;
  };
  [Methods.GET_STATS]: {
    params: AppIdParams;
    result: GetStatsResult;
  };
  [Methods.GET_CONTAINER_SNAPSHOT]: {
    params: AppIdParams;
    result: GetContainerSnapshotResult;
  };

  // Trace control
  [Methods.TRACE_CONTROL]: {
    params: AppIdParams & TraceControlParams;
    result: { readonly success: boolean };
  };
  [Methods.PIN_TRACE]: {
    params: AppIdParams & PinTraceParams;
    result: { readonly success: boolean };
  };

  // Discovery
  [Methods.LIST_APPS]: {
    params: undefined;
    result: ListAppsResult;
  };

  // Sync methods
  [Methods.GET_SYNC_STATUS]: {
    params: undefined;
    result: GetSyncStatusResult;
  };
}

/**
 * Utility type to extract params type for a method.
 */
export type MethodParams<M extends keyof MethodMap> = MethodMap[M]["params"];

/**
 * Utility type to extract result type for a method.
 */
export type MethodResult<M extends keyof MethodMap> = MethodMap[M]["result"];

/**
 * Notification method mapping.
 */
export interface NotificationMap {
  [Methods.DATA_UPDATE]: DataUpdateNotification;
  [Methods.APP_CONNECTION]: AppConnectionNotification;
  [Methods.SYNC_STATE]: SyncStateParams;
  [Methods.SYNC_ACTION]: SyncActionParams;
  [Methods.SYNC_PREFERENCES]: SyncPreferencesParams;
}
