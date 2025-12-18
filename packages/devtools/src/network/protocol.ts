/**
 * Protocol utilities for DevTools network communication.
 *
 * Re-exports and extends the JSON-RPC protocol from @hex-di/devtools-core
 * with additional convenience utilities for serialization and validation.
 *
 * @packageDocumentation
 */

import {
  isValidJsonRpcMessage,
  type JsonRpcMessage,
} from "@hex-di/devtools-core";

// Re-export protocol types and utilities from devtools-core
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
} from "@hex-di/devtools-core";

// =============================================================================
// Protocol Message Serialization
// =============================================================================

/**
 * Serialize a protocol message to JSON string.
 *
 * @param message - The message to serialize
 * @returns JSON string representation
 *
 * @example
 * ```typescript
 * const request = createRequest(1, Methods.GET_GRAPH, { appId: 'my-app' });
 * const json = serializeMessage(request);
 * socket.send(json);
 * ```
 */
export function serializeMessage(message: unknown): string {
  return JSON.stringify(message);
}

/**
 * Deserialize a JSON string to a protocol message.
 *
 * @param data - The JSON string to parse
 * @returns The parsed message or null if invalid
 *
 * @example
 * ```typescript
 * const message = deserializeMessage(data);
 * if (message === null) {
 *   console.error('Invalid message received');
 *   return;
 * }
 * if (isRequest(message)) {
 *   // Handle request
 * }
 * ```
 */
export function deserializeMessage(data: string): unknown | null {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Result of validating and parsing a protocol message.
 */
export type ParseMessageResult =
  | { readonly success: true; readonly message: JsonRpcMessage }
  | { readonly success: false; readonly error: string };

/**
 * Parse and validate a JSON-RPC message from raw data.
 *
 * Combines parsing and validation in one step for convenience.
 *
 * @param data - Raw JSON string to parse
 * @returns Parse result with either the message or an error
 *
 * @example
 * ```typescript
 * const result = parseMessage(data);
 * if (!result.success) {
 *   console.error('Parse error:', result.error);
 *   return;
 * }
 * const message = result.message;
 * ```
 */
export function parseMessage(data: string): ParseMessageResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(data);
  } catch (error) {
    return {
      success: false,
      error: `JSON parse error: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }

  if (!isValidJsonRpcMessage(parsed)) {
    return {
      success: false,
      error: "Invalid JSON-RPC message structure",
    };
  }

  return {
    success: true,
    message: parsed,
  };
}
