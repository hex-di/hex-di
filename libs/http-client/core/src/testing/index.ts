/**
 * Testing utilities for @hex-di/http-client.
 *
 * Provides:
 * - `createMockHttpClient` — route-based mock client with glob matching
 * - `createRecordingClient` — wraps any client to record all calls
 * - `mockResponse`, `mockJsonResponse`, `mockStreamResponse` — response factories
 * - `mockRequestError` — error factory
 *
 * @packageDocumentation
 */

export {
  createMockHttpClient,
  type MockRoutes,
  type MockResponseConfig,
  type MockHandler,
} from "./mock-client.js";

export {
  mockResponse,
  mockJsonResponse,
  mockStreamResponse,
  mockRequestError,
} from "./response-factory.js";

export {
  createRecordingClient,
  type RecordedRequest,
  type RecordedResponse,
  type RecordingResult,
} from "./recording-client.js";

export {
  assertOk,
  assertErr,
  assertStatus,
  assertRequestError,
  assertResponseError,
  assertMethod,
  assertUrlContains,
} from "./matchers.js";

export {
  createMockHttpClientAdapter,
  type MockAdapterConfig,
} from "./mock-adapter.js";
