/**
 * useMutation Hook
 *
 * Provides mutation state management with lifecycle callbacks
 * (onMutate, onSuccess, onError, onSettled).
 *
 * @packageDocumentation
 */

import { useRef, useCallback, useState } from "react";
import { ok, err, ResultAsync, fromThrowable } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { MutationPort, MutationState, QueryResolutionError } from "@hex-di/query";
import { useQueryClient } from "../context/query-client-context.js";

// =============================================================================
// UseMutationOptions
// =============================================================================

export interface UseMutationOptions<TData, TInput, TError, TContext> {
  readonly onMutate?: (input: TInput) => Promise<TContext> | TContext;
  readonly onSuccess?: (data: TData, input: TInput, context: TContext | undefined) => void;
  readonly onError?: (
    error: TError | QueryResolutionError,
    input: TInput,
    context: TContext | undefined
  ) => void;
  readonly onSettled?: (
    data: TData | undefined,
    error: (TError | QueryResolutionError) | null,
    input: TInput,
    context: TContext | undefined
  ) => void;
  readonly scope?: { readonly id: string };
}

// =============================================================================
// MutationResult
// =============================================================================

export interface MutationResult<TData, TInput, TError, TContext> extends MutationState<
  TData,
  TError | QueryResolutionError
> {
  readonly variables: TInput | undefined;
  readonly context: TContext | undefined;
  readonly mutate: (
    input: TInput,
    options?: MutateCallbacks<TData, TInput, TError, TContext>
  ) => void;
  readonly mutateAsync: (
    input: TInput,
    options?: MutateCallbacks<TData, TInput, TError, TContext>
  ) => ResultAsync<TData, TError | QueryResolutionError>;
  readonly reset: () => void;
}

export interface MutateCallbacks<TData, TInput, TError, TContext> {
  readonly onSuccess?: (data: TData, input: TInput, context: TContext | undefined) => void;
  readonly onError?: (
    error: TError | QueryResolutionError,
    input: TInput,
    context: TContext | undefined
  ) => void;
  readonly onSettled?: (
    data: TData | undefined,
    error: (TError | QueryResolutionError) | null,
    input: TInput,
    context: TContext | undefined
  ) => void;
}

// =============================================================================
// Scope Queuing
// =============================================================================

/**
 * Module-level map of scope ID to promise chain.
 * Mutations with the same scope ID are queued serially.
 */
const scopeQueues = new Map<string, Promise<unknown>>();

// =============================================================================
// useMutation Hook
// =============================================================================

interface MutationInternalState<TData, TInput, TError, TContext> {
  status: "idle" | "pending" | "success" | "error";
  data: TData | undefined;
  error: (TError | QueryResolutionError) | null;
  variables: TInput | undefined;
  context: TContext | undefined;
  result: Result<TData, TError | QueryResolutionError> | undefined;
}

/**
 * Execute mutations with lifecycle callbacks and state tracking.
 */
export function useMutation<TData, TInput, TError, TContext, TName extends string>(
  port: MutationPort<TName, TData, TInput, TError, TContext>,
  options?: UseMutationOptions<TData, TInput, TError, TContext>
): MutationResult<TData, TInput, TError, TContext> {
  const client = useQueryClient();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [state, setState] = useState<MutationInternalState<TData, TInput, TError, TContext>>({
    status: "idle",
    data: undefined,
    error: null,
    variables: undefined,
    context: undefined,
    result: undefined,
  });

  const mutateAsync = useCallback(
    (
      input: TInput,
      callbackOptions?: MutateCallbacks<TData, TInput, TError, TContext>
    ): ResultAsync<TData, TError | QueryResolutionError> => {
      const opts = optionsRef.current;

      const safeCall = (fn: () => void): void => {
        fromThrowable(fn, () => undefined);
      };

      const executeMutation = async (): Promise<Result<TData, TError | QueryResolutionError>> => {
        let mutationContext: TContext | undefined;

        setState(prev => ({
          ...prev,
          status: "pending",
          variables: input,
          error: null,
        }));

        // onMutate callback — guarded to maintain never-reject invariant
        if (opts?.onMutate) {
          const onMutateResult = await ResultAsync.fromPromise(
            Promise.resolve(opts.onMutate(input)),
            cause => cause
          );
          if (onMutateResult.isOk()) {
            mutationContext = onMutateResult.value;
          }
          // If onMutate throws, we continue without context rather than breaking the promise chain
        }

        const result = await client.mutate(port, input);

        if (result.isOk()) {
          const data = result.value;
          const typedResult: Result<TData, TError | QueryResolutionError> = ok(data);
          setState({
            status: "success",
            data,
            error: null,
            variables: input,
            context: mutationContext,
            result: typedResult,
          });

          safeCall(() => opts?.onSuccess?.(data, input, mutationContext));
          safeCall(() => callbackOptions?.onSuccess?.(data, input, mutationContext));
          safeCall(() => opts?.onSettled?.(data, null, input, mutationContext));
          safeCall(() => callbackOptions?.onSettled?.(data, null, input, mutationContext));

          return ok(data);
        } else {
          const error = result.error;
          setState({
            status: "error",
            data: undefined,
            error,
            variables: input,
            context: mutationContext,
            result: undefined,
          });

          safeCall(() => opts?.onError?.(error, input, mutationContext));
          safeCall(() => callbackOptions?.onError?.(error, input, mutationContext));
          safeCall(() => opts?.onSettled?.(undefined, error, input, mutationContext));
          safeCall(() => callbackOptions?.onSettled?.(undefined, error, input, mutationContext));

          return err(error);
        }
      };

      const scopeId = opts?.scope?.id;
      if (scopeId !== undefined) {
        const queue = scopeQueues.get(scopeId) ?? Promise.resolve();
        const next = queue.then(() => executeMutation());
        scopeQueues.set(
          scopeId,
          next.then(
            () => {},
            () => {}
          )
        );
        return ResultAsync.fromResult(next);
      }

      return ResultAsync.fromResult(executeMutation());
    },
    [client, port]
  );

  const mutate = useCallback(
    (input: TInput, callbackOptions?: MutateCallbacks<TData, TInput, TError, TContext>): void => {
      void mutateAsync(input, callbackOptions);
    },
    [mutateAsync]
  );

  const reset = useCallback((): void => {
    setState({
      status: "idle",
      data: undefined,
      error: null,
      variables: undefined,
      context: undefined,
      result: undefined,
    });
  }, []);

  return {
    status: state.status,
    isPending: state.status === "pending",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    isIdle: state.status === "idle",
    data: state.data,
    error: state.error,
    result: state.result,
    variables: state.variables,
    context: state.context,
    mutate,
    mutateAsync,
    reset,
  };
}
