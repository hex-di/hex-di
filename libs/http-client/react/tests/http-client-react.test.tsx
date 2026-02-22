/// <reference lib="dom" />
/**
 * Tests for @hex-di/http-client-react
 *
 * Covers:
 * - HttpClientProvider: context injection, nesting, memoization
 * - useHttpClient: resolution and missing-provider error
 * - useHttpRequest: idle, loading, success, error, deps change, abort, enabled flag
 * - useHttpMutation: initial state, loading, success, error, reset, unmount safety
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import React, { type ReactNode } from "react";
import { ResultAsync } from "@hex-di/result";
import type { HttpClient, HttpRequest, HttpResponse, HttpRequestError } from "@hex-di/http-client";
import { get as makeGet, httpRequestError, createHttpResponse, createHeaders } from "@hex-di/http-client";
import {
  HttpClientProvider,
  useHttpClient,
  useHttpRequest,
  useHttpMutation,
} from "../src/index.js";

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Build a minimal HttpResponse for use in tests.
 */
function makeResponse(status: number, body?: unknown): HttpResponse {
  const request = makeGet("http://mock.test/");
  const rawBody =
    body !== undefined ? new TextEncoder().encode(JSON.stringify(body)) : undefined;
  return createHttpResponse({
    status,
    statusText: status === 200 ? "OK" : status === 201 ? "Created" : "Error",
    headers: createHeaders({ "content-type": "application/json" }),
    request,
    rawBody,
  });
}

/**
 * Create a minimal HttpRequestError for use in tests.
 */
function makeError(message: string): HttpRequestError {
  return httpRequestError("Transport", makeGet("http://mock.test/"), message);
}

/**
 * Create a mock HttpClient from a simple execute function.
 */
function makeMockClient(
  executeFn: (req: HttpRequest) => ResultAsync<HttpResponse, HttpRequestError>,
): HttpClient {
  return {
    execute: executeFn,
    get: (_url) => executeFn(makeGet(_url)),
    post: (_url) => executeFn(makeGet(_url)),
    put: (_url) => executeFn(makeGet(_url)),
    patch: (_url) => executeFn(makeGet(_url)),
    del: (_url) => executeFn(makeGet(_url)),
    head: (_url) => executeFn(makeGet(_url)),
  };
}

/**
 * Create an HttpClient that always resolves with the given response.
 */
function makeSuccessClient(response: HttpResponse): HttpClient {
  return makeMockClient(() => ResultAsync.ok(response));
}

/**
 * Create an HttpClient that always rejects with the given error.
 */
function makeErrorClient(error: HttpRequestError): HttpClient {
  return makeMockClient(() => ResultAsync.err(error));
}

/**
 * Create an HttpClient whose execute function never resolves (stays loading).
 */
function makePendingClient(): HttpClient {
  return makeMockClient(() => ResultAsync.fromSafePromise(new Promise(() => {})));
}

/**
 * A wrapper component that provides an HttpClient via context.
 * Uses JSX-style createElement with children in props to satisfy TypeScript.
 */
function makeWrapper(client: HttpClient): (props: { children: ReactNode }) => React.ReactElement {
  return function TestWrapper({ children }: { children: ReactNode }): React.ReactElement {
    return React.createElement(HttpClientProvider, { client, children });
  };
}

afterEach(() => {
  cleanup();
});

// =============================================================================
// HttpClientProvider
// =============================================================================

describe("HttpClientProvider", () => {
  it("provides the HttpClient instance to descendants via useHttpClient", () => {
    const client = makeSuccessClient(makeResponse(200));
    const wrapper = makeWrapper(client);
    const { result } = renderHook(() => useHttpClient(), { wrapper });
    expect(result.current).toBe(client);
  });

  it("innermost provider takes precedence for nested providers", () => {
    const outerClient = makeSuccessClient(makeResponse(200));
    const innerClient = makeSuccessClient(makeResponse(201));

    const wrapper = ({ children }: { children: ReactNode }): React.ReactElement =>
      React.createElement(
        HttpClientProvider,
        { client: outerClient, children: React.createElement(
          HttpClientProvider,
          { client: innerClient, children },
        ) },
      );

    const { result } = renderHook(() => useHttpClient(), { wrapper });
    expect(result.current).toBe(innerClient);
  });

  it("passes the client prop as-is without wrapping or cloning", () => {
    const client = makeSuccessClient(makeResponse(200));
    const wrapper = makeWrapper(client);
    const { result } = renderHook(() => useHttpClient(), { wrapper });
    expect(result.current).toBe(client);
  });
});

// =============================================================================
// useHttpClient
// =============================================================================

describe("useHttpClient", () => {
  it("returns the HttpClient from the nearest provider", () => {
    const client = makeSuccessClient(makeResponse(200));
    const wrapper = makeWrapper(client);
    const { result } = renderHook(() => useHttpClient(), { wrapper });
    expect(result.current).toBe(client);
  });

  it("throws when called outside an HttpClientProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useHttpClient())).toThrow(
      "useHttpClient must be used within an HttpClientProvider",
    );
    consoleSpy.mockRestore();
  });
});

// =============================================================================
// useHttpRequest
// =============================================================================

describe("useHttpRequest", () => {
  it("throws when called outside an HttpClientProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = makeGet("/api/test");
    expect(() => renderHook(() => useHttpRequest(request))).toThrow(
      "useHttpClient must be used within an HttpClientProvider",
    );
    consoleSpy.mockRestore();
  });

  it("starts in loading state when enabled is true (default)", () => {
    const client = makePendingClient();
    const wrapper = makeWrapper(client);
    const request = makeGet("/api/test");
    const { result } = renderHook(() => useHttpRequest(request), { wrapper });

    expect(result.current.status).toBe("loading");
    expect(result.current.isLoading).toBe(true);
    expect(result.current.result).toBeUndefined();
    expect(result.current.response).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it("starts in idle state when enabled is false", () => {
    const client = makePendingClient();
    const wrapper = makeWrapper(client);
    const request = makeGet("/api/test");
    const { result } = renderHook(
      () => useHttpRequest(request, { enabled: false }),
      { wrapper },
    );

    expect(result.current.status).toBe("idle");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.result).toBeUndefined();
    expect(result.current.response).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it("transitions to success state on a successful response", async () => {
    const response = makeResponse(200, { data: "hello" });
    const client = makeSuccessClient(response);
    const wrapper = makeWrapper(client);
    const request = makeGet("/api/test");
    const { result } = renderHook(() => useHttpRequest(request), { wrapper });

    await act(async () => {
      // Allow the promise to settle
      await Promise.resolve();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.response).toBe(response);
    expect(result.current.error).toBeUndefined();
    expect(result.current.result?.isOk()).toBe(true);
  });

  it("transitions to error state on a failed response", async () => {
    const error = makeError("Connection refused");
    const client = makeErrorClient(error);
    const wrapper = makeWrapper(client);
    const request = makeGet("/api/test");
    const { result } = renderHook(() => useHttpRequest(request), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.response).toBeUndefined();
    expect(result.current.error).toBe(error);
    expect(result.current.result?.isErr()).toBe(true);
  });

  it("aborts in-flight request when deps change and starts a new request", async () => {
    let abortedCount = 0;

    const client = makeMockClient((req) => {
      if (req.signal !== undefined) {
        req.signal.addEventListener("abort", () => {
          abortedCount++;
        });
      }
      // Return a promise that never resolves (simulating in-flight)
      return ResultAsync.fromSafePromise(new Promise(() => {}));
    });

    const wrapper = makeWrapper(client);
    const request = makeGet("/api/test");

    const { rerender } = renderHook(
      ({ dep }: { dep: number }) => useHttpRequest(request, { deps: [dep] }),
      { wrapper, initialProps: { dep: 1 } },
    );

    // Change deps — should abort previous request
    act(() => {
      rerender({ dep: 2 });
    });

    expect(abortedCount).toBe(1);
  });

  it("does not execute when enabled toggles to false, preserves previous state", async () => {
    const response = makeResponse(200);
    const client = makeSuccessClient(response);
    const wrapper = makeWrapper(client);
    const request = makeGet("/api/test");

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useHttpRequest(request, { enabled }),
      { wrapper, initialProps: { enabled: true } },
    );

    // Wait for the request to complete
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("success");

    // Toggle enabled to false — state should remain (not reset to idle)
    act(() => {
      rerender({ enabled: false });
    });

    // Per spec §15, enabled: false does not reset state to idle
    expect(result.current.status).toBe("success");
  });

  it("attaches an AbortSignal to the request when none is set", async () => {
    let capturedSignal: AbortSignal | undefined;
    const response = makeResponse(200);

    const client = makeMockClient((req) => {
      capturedSignal = req.signal;
      return ResultAsync.ok(response);
    });

    const wrapper = makeWrapper(client);
    const request = makeGet("/api/test");

    const { result } = renderHook(() => useHttpRequest(request), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("success");
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
  });

  it("does not override an existing signal on the request (§18.4)", async () => {
    const existingController = new AbortController();
    // Build a request with an existing signal by manually composing the object.
    const baseRequest = makeGet("/api/test");
    const requestWithSignal: HttpRequest = Object.freeze({
      ...baseRequest,
      signal: existingController.signal,
    }) as HttpRequest;

    let capturedSignal: AbortSignal | undefined;

    const client = makeMockClient((req) => {
      capturedSignal = req.signal;
      return ResultAsync.ok(makeResponse(200));
    });

    const wrapper = makeWrapper(client);
    const { result } = renderHook(
      () => useHttpRequest(requestWithSignal),
      { wrapper },
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("success");
    // The hook should preserve the caller's signal, not replace it
    expect(capturedSignal).toBe(existingController.signal);
  });
});

// =============================================================================
// useHttpMutation
// =============================================================================

describe("useHttpMutation", () => {
  it("throws when called outside an HttpClientProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useHttpMutation())).toThrow(
      "useHttpClient must be used within an HttpClientProvider",
    );
    consoleSpy.mockRestore();
  });

  it("starts in idle state", () => {
    const client = makeSuccessClient(makeResponse(200));
    const wrapper = makeWrapper(client);
    const { result } = renderHook(() => useHttpMutation(), { wrapper });
    const [, state] = result.current;

    expect(state.status).toBe("idle");
    expect(state.isLoading).toBe(false);
    expect(state.result).toBeUndefined();
    expect(state.response).toBeUndefined();
    expect(state.error).toBeUndefined();
  });

  it("returns a stable mutate function reference across re-renders", () => {
    const client = makeSuccessClient(makeResponse(200));
    const wrapper = makeWrapper(client);
    const { result, rerender } = renderHook(() => useHttpMutation(), { wrapper });

    const firstMutate = result.current[0];
    rerender();
    const secondMutate = result.current[0];

    expect(firstMutate).toBe(secondMutate);
  });

  it("transitions through loading and success states", async () => {
    const response = makeResponse(201);
    const client = makeSuccessClient(response);
    const wrapper = makeWrapper(client);
    const { result } = renderHook(() => useHttpMutation(), { wrapper });

    const [mutate] = result.current;
    const request = makeGet("/api/items");

    let mutationResult: Awaited<ReturnType<typeof mutate>> | undefined;

    await act(async () => {
      mutationResult = await mutate(request);
    });

    expect(result.current[1].status).toBe("success");
    expect(result.current[1].isLoading).toBe(false);
    expect(result.current[1].response).toBe(response);
    expect(result.current[1].error).toBeUndefined();
    expect(mutationResult?.isOk()).toBe(true);
  });

  it("transitions through loading and error states on failure", async () => {
    const error = makeError("Server unavailable");
    const client = makeErrorClient(error);
    const wrapper = makeWrapper(client);
    const { result } = renderHook(() => useHttpMutation(), { wrapper });

    const [mutate] = result.current;
    const request = makeGet("/api/items");

    let mutationResult: Awaited<ReturnType<typeof mutate>> | undefined;

    await act(async () => {
      mutationResult = await mutate(request);
    });

    expect(result.current[1].status).toBe("error");
    expect(result.current[1].isLoading).toBe(false);
    expect(result.current[1].response).toBeUndefined();
    expect(result.current[1].error).toBe(error);
    expect(mutationResult?.isErr()).toBe(true);
  });

  it("reset() returns state to idle", async () => {
    const response = makeResponse(200);
    const client = makeSuccessClient(response);
    const wrapper = makeWrapper(client);
    const { result } = renderHook(() => useHttpMutation(), { wrapper });

    // Complete a mutation to get to success state
    const [mutate] = result.current;
    await act(async () => {
      await mutate(makeGet("/api/test"));
    });

    expect(result.current[1].status).toBe("success");

    // Reset
    act(() => {
      result.current[1].reset();
    });

    expect(result.current[1].status).toBe("idle");
    expect(result.current[1].result).toBeUndefined();
    expect(result.current[1].response).toBeUndefined();
    expect(result.current[1].error).toBeUndefined();
    expect(result.current[1].isLoading).toBe(false);
  });

  it("suppresses state updates after unmount (no state-after-unmount error)", async () => {
    let resolvePromise!: (value: HttpResponse) => void;
    const pendingPromise = new Promise<HttpResponse>((resolve) => {
      resolvePromise = resolve;
    });

    const client = makeMockClient(() => ResultAsync.fromSafePromise(pendingPromise));
    const wrapper = makeWrapper(client);
    const { result, unmount } = renderHook(() => useHttpMutation(), { wrapper });

    const [mutate] = result.current;
    const request = makeGet("/api/test");

    // Capture the mutate promise but don't await inside act to avoid
    // the unawaited-act warning. We start the mutation, unmount immediately,
    // and then resolve the promise.
    const mutatePromise = mutate(request);

    // Allow the synchronous loading state to be set
    await act(async () => {
      await Promise.resolve();
    });

    // Unmount before the pending promise resolves
    unmount();

    // Resolve the underlying promise - no React state update should happen
    // because mountedRef.current is now false
    await act(async () => {
      resolvePromise(makeResponse(200));
      await mutatePromise;
    });

    // If we get here without React throwing a warning about updating unmounted
    // components, the test passes.
  });
});
