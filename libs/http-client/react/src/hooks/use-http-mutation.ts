/**
 * useHttpMutation - imperative HTTP mutation hook.
 * @packageDocumentation
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type { HttpRequest, HttpRequestError, HttpClientError, HttpResponse } from "@hex-di/http-client";
import type { Result } from "@hex-di/result";
import { useHttpClient } from "./use-http-client.js";

/**
 * Lifecycle status of a `useHttpMutation` invocation.
 *
 * @see §16 of the hooks spec
 */
export type UseMutationStatus = "idle" | "loading" | "success" | "error";

/**
 * State returned as the second element of the `useHttpMutation` tuple.
 *
 * @typeParam E - The error type. Defaults to `HttpRequestError`.
 *
 * @see §16 of the hooks spec
 */
export interface UseMutationState<E extends HttpClientError = HttpRequestError> {
  /** Current lifecycle status. */
  readonly status: UseMutationStatus;
  /** True while the mutation is in-flight. */
  readonly isLoading: boolean;
  /** The Result from the most recent completed mutation, or undefined if none. */
  readonly result: Result<HttpResponse, E> | undefined;
  /** Shorthand: the success value if status === "success", else undefined. */
  readonly response: HttpResponse | undefined;
  /** Shorthand: the error value if status === "error", else undefined. */
  readonly error: E | undefined;
  /** Reset state back to idle. §17.6 */
  readonly reset: () => void;
}

type MutationStateData<E extends HttpClientError> = Omit<UseMutationState<E>, "reset">;

const IDLE_DATA: MutationStateData<never> = {
  status: "idle",
  isLoading: false,
  result: undefined,
  response: undefined,
  error: undefined,
};

/**
 * Imperative HTTP mutation hook.
 *
 * Returns a `[mutate, state]` tuple. Call `mutate(request)` to execute an HTTP
 * request imperatively (e.g. on form submission). The returned `Promise` resolves
 * to the `Result` of the request.
 *
 * Unlike `useHttpRequest`, mutations are not executed automatically. Concurrent
 * calls to `mutate` are permitted; the in-flight mutation is NOT aborted. State
 * reflects the most recently completed mutation.
 *
 * On unmount, state updates from in-flight mutations are suppressed. §17.8
 *
 * @throws {Error} When called outside an `HttpClientProvider` tree.
 *
 * @see §17 of the hooks spec
 */
export function useHttpMutation<E extends HttpClientError = HttpRequestError>(): [
  mutate: (request: HttpRequest) => Promise<Result<HttpResponse, E>>,
  state: UseMutationState<E>,
] {
  const client = useHttpClient();
  const mountedRef = useRef(true);

  const [data, setData] = useState<MutationStateData<E>>(
    () => (IDLE_DATA as MutationStateData<E>),
  );

  // Track mounted state to suppress post-unmount state updates. §17.8
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback((): void => {
    if (mountedRef.current) {
      setData(IDLE_DATA as MutationStateData<E>);
    }
  }, []);

  const mutate = useCallback(
    async (request: HttpRequest): Promise<Result<HttpResponse, E>> => {
      // Synchronously update to loading state before awaiting. §17.3
      if (mountedRef.current) {
        setData({
          status: "loading",
          isLoading: true,
          result: undefined,
          response: undefined,
          error: undefined,
        });
      }

      // ResultAsync implements PromiseLike — awaiting it resolves to Result<T, E>
      const result = await client.execute(request);

      // Suppress state updates after unmount. §17.8
      if (mountedRef.current) {
        if (result.isOk()) {
          setData({
            status: "success",
            isLoading: false,
            result: result as Result<HttpResponse, E>,
            response: result.value,
            error: undefined,
          });
        } else {
          setData({
            status: "error",
            isLoading: false,
            result: result as unknown as Result<HttpResponse, E>,
            response: undefined,
            error: result.error as unknown as E,
          });
        }
      }

      return result as unknown as Result<HttpResponse, E>;
    },
    [client],
  );

  const state: UseMutationState<E> = {
    ...data,
    reset,
  };

  return [mutate, state];
}
