/**
 * useHttpRequest - reactive HTTP query hook.
 * @packageDocumentation
 */

import { useState, useEffect, useRef } from "react";
import type { DependencyList } from "react";
import type { HttpRequest, HttpRequestError, HttpClientError, HttpResponse } from "@hex-di/http-client";
import type { Result } from "@hex-di/result";
import { withSignal } from "@hex-di/http-client";
import { useHttpClient } from "./use-http-client.js";

/**
 * Lifecycle status of a `useHttpRequest` invocation.
 *
 * @see §14 of the hooks spec
 */
export type UseHttpRequestStatus = "idle" | "loading" | "success" | "error";

/**
 * State returned by `useHttpRequest`.
 *
 * @typeParam E - The error type. Defaults to `HttpRequestError`.
 *
 * @see §14 of the hooks spec
 */
export interface UseHttpRequestState<E extends HttpClientError = HttpRequestError> {
  /** Current lifecycle status. */
  readonly status: UseHttpRequestStatus;
  /** True while the request is in-flight. §14.2 */
  readonly isLoading: boolean;
  /** The Result from the most recent completed request, or undefined if none. §14.3 */
  readonly result: Result<HttpResponse, E> | undefined;
  /** Shorthand: the success value if status === "success", else undefined. §14.4 */
  readonly response: HttpResponse | undefined;
  /** Shorthand: the error value if status === "error", else undefined. §14.5 */
  readonly error: E | undefined;
}

/**
 * Options for `useHttpRequest`.
 *
 * @see §15 of the hooks spec
 */
export interface UseHttpRequestOptions {
  /**
   * If false, the request is not executed and the hook stays in "idle" state.
   * Default: true.
   */
  readonly enabled?: boolean;
  /**
   * Dependency list — request re-executes when deps change (like useEffect).
   * Callers are responsible for memoizing the request object.
   * Default: [].
   */
  readonly deps?: DependencyList;
}

const IDLE_STATE: UseHttpRequestState<never> = {
  status: "idle",
  isLoading: false,
  result: undefined,
  response: undefined,
  error: undefined,
};

const LOADING_STATE: Omit<UseHttpRequestState<never>, "status" | "isLoading"> = {
  result: undefined,
  response: undefined,
  error: undefined,
};

/**
 * Reactive HTTP query hook.
 *
 * Executes the provided `HttpRequest` on mount and whenever `deps` changes
 * (when `enabled` is `true`). Aborts any in-flight request when deps change
 * or the component unmounts, preventing stale state updates.
 *
 * The `request` parameter's identity drives re-execution when included in
 * `deps`. Callers are responsible for memoizing the request object.
 *
 * If the request already has an `AbortSignal` set, the hook will NOT
 * override it with its own signal. §18.4
 *
 * @throws {Error} When called outside an `HttpClientProvider` tree.
 *
 * @see §15, §18 of the hooks spec
 */
export function useHttpRequest<E extends HttpClientError = HttpRequestError>(
  request: HttpRequest,
  options?: UseHttpRequestOptions,
): UseHttpRequestState<E> {
  const client = useHttpClient();
  const enabled = options?.enabled ?? true;
  const deps = options?.deps ?? [];

  const [state, setState] = useState<UseHttpRequestState<E>>(
    () => (IDLE_STATE as UseHttpRequestState<E>),
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Abort the previous in-flight request before starting a new one. §15.4, §18.2
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({
      status: "loading",
      isLoading: true,
      ...LOADING_STATE,
    } as UseHttpRequestState<E>);

    // Only attach our signal if the caller has not set one already. §18.4
    const requestWithSignal: HttpRequest =
      request.signal === undefined ? withSignal(controller.signal)(request) : request;

    // Execute and resolve the ResultAsync to a concrete Result<HttpResponse, HttpRequestError>.
    // ResultAsync implements PromiseLike, so `await` resolves it to Result<T, E>.
    const execute = async (): Promise<void> => {
      const result = await client.execute(requestWithSignal);

      // Discard stale results if this execution was aborted. §15.4, §15.5
      if (controller.signal.aborted) {
        return;
      }

      if (result.isOk()) {
        setState({
          status: "success",
          isLoading: false,
          result: result as Result<HttpResponse, E>,
          response: result.value,
          error: undefined,
        });
      } else {
        setState({
          status: "error",
          isLoading: false,
          result: result as unknown as Result<HttpResponse, E>,
          response: undefined,
          error: result.error as unknown as E,
        });
      }
    };

    void execute();

    // Cleanup: abort the in-flight request on unmount or before the next effect run. §15.5
    return () => {
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return state;
}
