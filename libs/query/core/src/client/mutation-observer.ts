/**
 * MutationObserver - Subscribes to a single mutation and tracks state changes.
 *
 * Mirrors the QueryObserver pattern for mutations, providing a subscribe/getState
 * interface for reactive UI bindings.
 *
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import { fromThrowable } from "@hex-di/result";
import type { MutationPort } from "../ports/mutation-port.js";
import type { MutationState } from "../types/state.js";
import type { QueryResolutionError } from "../types/errors.js";
import type { MutateOptions } from "../types/options.js";
import { ok, err } from "@hex-di/result";

// =============================================================================
// Forward-reference interface to avoid circular imports
// =============================================================================

interface MutationClientLike {
  mutate<TData, TInput, TError, TContext, TName extends string>(
    port: MutationPort<TName, TData, TInput, TError, TContext>,
    input: TInput,
    options?: MutateOptions<TData, TInput, TError, TContext>
  ): ResultAsync<TData, TError | QueryResolutionError>;
}

// =============================================================================
// Mutation Observer Options
// =============================================================================

export interface MutationObserverOptions<TData, TInput, TError, TContext> {
  readonly onMutate?: (input: TInput) => TContext | Promise<TContext>;
  readonly onSuccess?: (data: TData, input: TInput, context: TContext | undefined) => void;
  readonly onError?: (
    error: TError | QueryResolutionError,
    input: TInput,
    context: TContext | undefined
  ) => void;
  readonly onSettled?: (
    data: TData | undefined,
    error: (TError | QueryResolutionError) | undefined,
    input: TInput,
    context: TContext | undefined
  ) => void;
}

// =============================================================================
// Mutation Observer Interface
// =============================================================================

export interface MutationObserver<TData, TInput, TError> {
  subscribe(
    listener: (state: MutationState<TData, TError | QueryResolutionError>) => void
  ): () => void;
  getState(): MutationState<TData, TError | QueryResolutionError>;
  mutate(input: TInput): void;
  mutateAsync(input: TInput): ResultAsync<TData, TError | QueryResolutionError>;
  reset(): void;
  destroy(): void;
  readonly isDestroyed: boolean;
}

// =============================================================================
// State Derivation
// =============================================================================

function idleState<TData, TError>(): MutationState<TData, TError> {
  return {
    status: "idle",
    isPending: false,
    isSuccess: false,
    isError: false,
    isIdle: true,
    result: undefined,
    data: undefined,
    error: null,
  };
}

function pendingState<TData, TError>(): MutationState<TData, TError> {
  return {
    status: "pending",
    isPending: true,
    isSuccess: false,
    isError: false,
    isIdle: false,
    result: undefined,
    data: undefined,
    error: null,
  };
}

function successState<TData, TError>(data: TData): MutationState<TData, TError> {
  return {
    status: "success",
    isPending: false,
    isSuccess: true,
    isError: false,
    isIdle: false,
    result: ok(data),
    data,
    error: null,
  };
}

function errorState<TData, TError>(error: TError): MutationState<TData, TError> {
  return {
    status: "error",
    isPending: false,
    isSuccess: false,
    isError: true,
    isIdle: false,
    result: err(error),
    data: undefined,
    error,
  };
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Safely invoke a user-provided callback, swallowing any thrown exceptions.
 */
function safeCall(fn: () => void): void {
  fromThrowable(fn, () => undefined);
}

export function createMutationObserver<TData, TInput, TError, TContext, TName extends string>(
  client: MutationClientLike,
  port: MutationPort<TName, TData, TInput, TError, TContext>,
  options?: MutationObserverOptions<TData, TInput, TError, TContext>
): MutationObserver<TData, TInput, TError> {
  const listeners = new Set<(state: MutationState<TData, TError | QueryResolutionError>) => void>();
  let currentState: MutationState<TData, TError | QueryResolutionError> = idleState();
  let destroyed = false;

  function setState(next: MutationState<TData, TError | QueryResolutionError>): void {
    currentState = next;
    if (destroyed) return;
    for (const listener of listeners) {
      listener(currentState);
    }
  }

  const observer: MutationObserver<TData, TInput, TError> = {
    subscribe(
      listener: (state: MutationState<TData, TError | QueryResolutionError>) => void
    ): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getState(): MutationState<TData, TError | QueryResolutionError> {
      return currentState;
    },

    mutateAsync(input: TInput): ResultAsync<TData, TError | QueryResolutionError> {
      setState(pendingState());

      const mutateOptions: MutateOptions<TData, TInput, TError, TContext> = {
        onMutate: options?.onMutate,
      };

      return client
        .mutate(port, input, mutateOptions)
        .map(data => {
          setState(successState(data));
          safeCall(() => options?.onSuccess?.(data, input, undefined));
          safeCall(() => options?.onSettled?.(data, undefined, input, undefined));
          return data;
        })
        .mapErr(error => {
          setState(errorState(error));
          safeCall(() => options?.onError?.(error, input, undefined));
          safeCall(() => options?.onSettled?.(undefined, error, input, undefined));
          return error;
        });
    },

    mutate(input: TInput): void {
      void observer.mutateAsync(input);
    },

    reset(): void {
      setState(idleState());
    },

    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      listeners.clear();
    },

    get isDestroyed(): boolean {
      return destroyed;
    },
  };

  return observer;
}
