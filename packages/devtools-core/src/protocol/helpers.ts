/**
 * JSON-RPC 2.0 Helper Functions for DevTools protocol.
 *
 * Provides factory functions for creating protocol messages and
 * type guards for message validation.
 *
 * @packageDocumentation
 */

import type {
  JsonRpcRequest,
  JsonRpcSuccessResponse,
  JsonRpcErrorResponse,
  JsonRpcNotification,
  JsonRpcMessage,
} from "./types.js";

// =============================================================================
// Message Factory Functions
// =============================================================================

/**
 * Create a JSON-RPC request message.
 *
 * @param id - Unique request identifier
 * @param method - Method name to invoke
 * @param params - Optional method parameters
 * @returns JSON-RPC 2.0 request object
 *
 * @example
 * ```typescript
 * const request = createRequest(1, 'devtools.getGraph', { appId: 'my-app' });
 * ```
 */
export function createRequest<TMethod extends string, TParams>(
  id: string | number,
  method: TMethod,
  params?: TParams
): JsonRpcRequest<TMethod, TParams> {
  return {
    jsonrpc: "2.0",
    id,
    method,
    ...(params !== undefined ? { params } : {}),
  };
}

/**
 * Create a JSON-RPC success response message.
 *
 * @param id - Request identifier being responded to
 * @param result - The result data
 * @returns JSON-RPC 2.0 success response object
 *
 * @example
 * ```typescript
 * const response = createSuccessResponse(1, { graph: exportedGraph });
 * ```
 */
export function createSuccessResponse<TResult>(
  id: string | number,
  result: TResult
): JsonRpcSuccessResponse<TResult> {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

/**
 * Create a JSON-RPC error response message.
 *
 * @param id - Request identifier being responded to (null for parse errors)
 * @param code - Error code (see ErrorCodes)
 * @param message - Human-readable error message
 * @param data - Optional additional error data
 * @returns JSON-RPC 2.0 error response object
 *
 * @example
 * ```typescript
 * const error = createErrorResponse(1, ErrorCodes.APP_NOT_FOUND, 'App not found');
 * ```
 */
export function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcErrorResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data !== undefined ? { data } : {}),
    },
  };
}

/**
 * Create a JSON-RPC notification message (fire-and-forget).
 *
 * @param method - Method name for the notification
 * @param params - Optional notification parameters
 * @returns JSON-RPC 2.0 notification object
 *
 * @example
 * ```typescript
 * const notification = createNotification('devtools.dataUpdate', { type: 'graph' });
 * ```
 */
export function createNotification<TMethod extends string, TParams>(
  method: TMethod,
  params?: TParams
): JsonRpcNotification<TMethod, TParams> {
  return {
    jsonrpc: "2.0",
    method,
    ...(params !== undefined ? { params } : {}),
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a message is a JSON-RPC request.
 *
 * @param msg - The message to check
 * @returns True if the message is a request (has method and id)
 */
export function isRequest(msg: JsonRpcMessage): msg is JsonRpcRequest {
  return "method" in msg && "id" in msg;
}

/**
 * Check if a message is a JSON-RPC notification.
 *
 * @param msg - The message to check
 * @returns True if the message is a notification (has method but no id)
 */
export function isNotification(msg: JsonRpcMessage): msg is JsonRpcNotification {
  return "method" in msg && !("id" in msg);
}

/**
 * Check if a message is a JSON-RPC response (success or error).
 *
 * @param msg - The message to check
 * @returns True if the message is a response (no method, has id)
 */
export function isResponse(
  msg: JsonRpcMessage
): msg is JsonRpcSuccessResponse | JsonRpcErrorResponse {
  return !("method" in msg) && "id" in msg;
}

/**
 * Check if a response is an error response.
 *
 * @param msg - The response message to check
 * @returns True if the response contains an error
 */
export function isErrorResponse(
  msg: JsonRpcSuccessResponse | JsonRpcErrorResponse
): msg is JsonRpcErrorResponse {
  return "error" in msg;
}

/**
 * Check if a response is a success response.
 *
 * @param msg - The response message to check
 * @returns True if the response contains a result
 */
export function isSuccessResponse<T>(
  msg: JsonRpcSuccessResponse<T> | JsonRpcErrorResponse
): msg is JsonRpcSuccessResponse<T> {
  return "result" in msg;
}

// =============================================================================
// Safe Parsing with Validation
// =============================================================================

/**
 * Check if a value is a valid JSON-RPC 2.0 message.
 *
 * Validates the structure without making assumptions about the specific
 * message type. This is the first-level validation for incoming messages.
 *
 * @param value - The parsed JSON value to validate
 * @returns True if the value has a valid JSON-RPC 2.0 structure
 */
export function isValidJsonRpcMessage(value: unknown): value is JsonRpcMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Must have jsonrpc: "2.0"
  if (obj["jsonrpc"] !== "2.0") {
    return false;
  }

  // Response: has id (or null) and either result or error
  if ("result" in obj || "error" in obj) {
    // id must be string, number, or null
    if (!("id" in obj)) {
      return false;
    }
    const id = obj["id"];
    if (typeof id !== "string" && typeof id !== "number" && id !== null) {
      return false;
    }
    return true;
  }

  // Request or Notification: has method
  if ("method" in obj) {
    if (typeof obj["method"] !== "string") {
      return false;
    }
    // Request has id, Notification does not
    if ("id" in obj) {
      const id = obj["id"];
      if (typeof id !== "string" && typeof id !== "number") {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Safely parse a JSON string as a JSON-RPC message.
 *
 * Combines JSON parsing with structural validation. Returns null for
 * invalid JSON or non-conforming message structures.
 *
 * @param data - The raw JSON string to parse
 * @returns The parsed message if valid, null otherwise
 *
 * @example
 * ```typescript
 * const message = parseJsonRpcMessage(rawData);
 * if (message === null) {
 *   // Invalid JSON or not a valid JSON-RPC message
 *   return;
 * }
 * if (isRequest(message)) {
 *   // Handle request
 * }
 * ```
 */
export function parseJsonRpcMessage(data: string): JsonRpcMessage | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (isValidJsonRpcMessage(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
