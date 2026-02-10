/**
 * useMutation Hook
 *
 * Provides mutation state management with lifecycle callbacks
 * (onMutate, onSuccess, onError, onSettled).
 *
 * @packageDocumentation
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g =
    (typeof globalThis === "object" && globalThis && globalThis.Math === Math && globalThis) ||
    new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (
    ns.activeMutant === undefined &&
    g.process &&
    g.process.env &&
    g.process.env.__STRYKER_ACTIVE_MUTANT__
  ) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov =
    ns.mutantCoverage ||
    (ns.mutantCoverage = {
      static: {},
      perTest: {},
    });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error("Stryker: Hit count limit reached (" + ns.hitCount + ")");
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
  readonly scope?: {
    readonly id: string;
  };
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
  if (stryMutAct_9fa48("178")) {
    {
    }
  } else {
    stryCov_9fa48("178");
    const client = useQueryClient();
    const optionsRef = useRef(options);
    optionsRef.current = options;
    const [state, setState] = useState<MutationInternalState<TData, TInput, TError, TContext>>(
      stryMutAct_9fa48("179")
        ? {}
        : (stryCov_9fa48("179"),
          {
            status: stryMutAct_9fa48("180") ? "" : (stryCov_9fa48("180"), "idle"),
            data: undefined,
            error: null,
            variables: undefined,
            context: undefined,
            result: undefined,
          })
    );
    const mutateAsync = useCallback(
      (
        input: TInput,
        callbackOptions?: MutateCallbacks<TData, TInput, TError, TContext>
      ): ResultAsync<TData, TError | QueryResolutionError> => {
        if (stryMutAct_9fa48("181")) {
          {
          }
        } else {
          stryCov_9fa48("181");
          const opts = optionsRef.current;
          const safeCall = (fn: () => void): void => {
            if (stryMutAct_9fa48("182")) {
              {
              }
            } else {
              stryCov_9fa48("182");
              fromThrowable(fn, () => undefined);
            }
          };
          const executeMutation = async (): Promise<
            Result<TData, TError | QueryResolutionError>
          > => {
            if (stryMutAct_9fa48("183")) {
              {
              }
            } else {
              stryCov_9fa48("183");
              let mutationContext: TContext | undefined;
              setState(
                stryMutAct_9fa48("184")
                  ? () => undefined
                  : (stryCov_9fa48("184"),
                    prev =>
                      stryMutAct_9fa48("185")
                        ? {}
                        : (stryCov_9fa48("185"),
                          {
                            ...prev,
                            status: stryMutAct_9fa48("186")
                              ? ""
                              : (stryCov_9fa48("186"), "pending"),
                            variables: input,
                            error: null,
                          }))
              );

              // onMutate callback — guarded to maintain never-reject invariant
              if (
                stryMutAct_9fa48("189")
                  ? opts.onMutate
                  : stryMutAct_9fa48("188")
                    ? false
                    : stryMutAct_9fa48("187")
                      ? true
                      : (stryCov_9fa48("187", "188", "189"), opts?.onMutate)
              ) {
                if (stryMutAct_9fa48("190")) {
                  {
                  }
                } else {
                  stryCov_9fa48("190");
                  const onMutateResult = await ResultAsync.fromPromise(
                    Promise.resolve(opts.onMutate(input)),
                    stryMutAct_9fa48("191")
                      ? () => undefined
                      : (stryCov_9fa48("191"), cause => cause)
                  );
                  if (
                    stryMutAct_9fa48("193")
                      ? false
                      : stryMutAct_9fa48("192")
                        ? true
                        : (stryCov_9fa48("192", "193"), onMutateResult.isOk())
                  ) {
                    if (stryMutAct_9fa48("194")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("194");
                      mutationContext = onMutateResult.value;
                    }
                  }
                  // If onMutate throws, we continue without context rather than breaking the promise chain
                }
              }
              const result = await client.mutate(port, input);
              if (
                stryMutAct_9fa48("196")
                  ? false
                  : stryMutAct_9fa48("195")
                    ? true
                    : (stryCov_9fa48("195", "196"), result.isOk())
              ) {
                if (stryMutAct_9fa48("197")) {
                  {
                  }
                } else {
                  stryCov_9fa48("197");
                  const data = result.value;
                  const typedResult: Result<TData, TError | QueryResolutionError> = ok(data);
                  setState(
                    stryMutAct_9fa48("198")
                      ? {}
                      : (stryCov_9fa48("198"),
                        {
                          status: stryMutAct_9fa48("199") ? "" : (stryCov_9fa48("199"), "success"),
                          data,
                          error: null,
                          variables: input,
                          context: mutationContext,
                          result: typedResult,
                        })
                  );
                  safeCall(
                    stryMutAct_9fa48("200")
                      ? () => undefined
                      : (stryCov_9fa48("200"),
                        () =>
                          stryMutAct_9fa48("202")
                            ? opts.onSuccess?.(data, input, mutationContext)
                            : stryMutAct_9fa48("201")
                              ? opts?.onSuccess(data, input, mutationContext)
                              : (stryCov_9fa48("201", "202"),
                                opts?.onSuccess?.(data, input, mutationContext)))
                  );
                  safeCall(
                    stryMutAct_9fa48("203")
                      ? () => undefined
                      : (stryCov_9fa48("203"),
                        () =>
                          stryMutAct_9fa48("205")
                            ? callbackOptions.onSuccess?.(data, input, mutationContext)
                            : stryMutAct_9fa48("204")
                              ? callbackOptions?.onSuccess(data, input, mutationContext)
                              : (stryCov_9fa48("204", "205"),
                                callbackOptions?.onSuccess?.(data, input, mutationContext)))
                  );
                  safeCall(
                    stryMutAct_9fa48("206")
                      ? () => undefined
                      : (stryCov_9fa48("206"),
                        () =>
                          stryMutAct_9fa48("208")
                            ? opts.onSettled?.(data, null, input, mutationContext)
                            : stryMutAct_9fa48("207")
                              ? opts?.onSettled(data, null, input, mutationContext)
                              : (stryCov_9fa48("207", "208"),
                                opts?.onSettled?.(data, null, input, mutationContext)))
                  );
                  safeCall(
                    stryMutAct_9fa48("209")
                      ? () => undefined
                      : (stryCov_9fa48("209"),
                        () =>
                          stryMutAct_9fa48("211")
                            ? callbackOptions.onSettled?.(data, null, input, mutationContext)
                            : stryMutAct_9fa48("210")
                              ? callbackOptions?.onSettled(data, null, input, mutationContext)
                              : (stryCov_9fa48("210", "211"),
                                callbackOptions?.onSettled?.(data, null, input, mutationContext)))
                  );
                  return ok(data);
                }
              } else {
                if (stryMutAct_9fa48("212")) {
                  {
                  }
                } else {
                  stryCov_9fa48("212");
                  const error = result.error;
                  setState(
                    stryMutAct_9fa48("213")
                      ? {}
                      : (stryCov_9fa48("213"),
                        {
                          status: stryMutAct_9fa48("214") ? "" : (stryCov_9fa48("214"), "error"),
                          data: undefined,
                          error,
                          variables: input,
                          context: mutationContext,
                          result: undefined,
                        })
                  );
                  safeCall(
                    stryMutAct_9fa48("215")
                      ? () => undefined
                      : (stryCov_9fa48("215"),
                        () =>
                          stryMutAct_9fa48("217")
                            ? opts.onError?.(error, input, mutationContext)
                            : stryMutAct_9fa48("216")
                              ? opts?.onError(error, input, mutationContext)
                              : (stryCov_9fa48("216", "217"),
                                opts?.onError?.(error, input, mutationContext)))
                  );
                  safeCall(
                    stryMutAct_9fa48("218")
                      ? () => undefined
                      : (stryCov_9fa48("218"),
                        () =>
                          stryMutAct_9fa48("220")
                            ? callbackOptions.onError?.(error, input, mutationContext)
                            : stryMutAct_9fa48("219")
                              ? callbackOptions?.onError(error, input, mutationContext)
                              : (stryCov_9fa48("219", "220"),
                                callbackOptions?.onError?.(error, input, mutationContext)))
                  );
                  safeCall(
                    stryMutAct_9fa48("221")
                      ? () => undefined
                      : (stryCov_9fa48("221"),
                        () =>
                          stryMutAct_9fa48("223")
                            ? opts.onSettled?.(undefined, error, input, mutationContext)
                            : stryMutAct_9fa48("222")
                              ? opts?.onSettled(undefined, error, input, mutationContext)
                              : (stryCov_9fa48("222", "223"),
                                opts?.onSettled?.(undefined, error, input, mutationContext)))
                  );
                  safeCall(
                    stryMutAct_9fa48("224")
                      ? () => undefined
                      : (stryCov_9fa48("224"),
                        () =>
                          stryMutAct_9fa48("226")
                            ? callbackOptions.onSettled?.(undefined, error, input, mutationContext)
                            : stryMutAct_9fa48("225")
                              ? callbackOptions?.onSettled(undefined, error, input, mutationContext)
                              : (stryCov_9fa48("225", "226"),
                                callbackOptions?.onSettled?.(
                                  undefined,
                                  error,
                                  input,
                                  mutationContext
                                )))
                  );
                  return err(error);
                }
              }
            }
          };
          const scopeId = stryMutAct_9fa48("228")
            ? opts.scope?.id
            : stryMutAct_9fa48("227")
              ? opts?.scope.id
              : (stryCov_9fa48("227", "228"), opts?.scope?.id);
          if (
            stryMutAct_9fa48("231")
              ? scopeId === undefined
              : stryMutAct_9fa48("230")
                ? false
                : stryMutAct_9fa48("229")
                  ? true
                  : (stryCov_9fa48("229", "230", "231"), scopeId !== undefined)
          ) {
            if (stryMutAct_9fa48("232")) {
              {
              }
            } else {
              stryCov_9fa48("232");
              const queue = stryMutAct_9fa48("233")
                ? scopeQueues.get(scopeId) && Promise.resolve()
                : (stryCov_9fa48("233"), scopeQueues.get(scopeId) ?? Promise.resolve());
              const next = queue.then(
                stryMutAct_9fa48("234")
                  ? () => undefined
                  : (stryCov_9fa48("234"), () => executeMutation())
              );
              scopeQueues.set(
                scopeId,
                next.then(
                  () => {},
                  () => {}
                )
              );
              return ResultAsync.fromResult(next);
            }
          }
          return ResultAsync.fromResult(executeMutation());
        }
      },
      stryMutAct_9fa48("235") ? [] : (stryCov_9fa48("235"), [client, port])
    );
    const mutate = useCallback(
      (input: TInput, callbackOptions?: MutateCallbacks<TData, TInput, TError, TContext>): void => {
        if (stryMutAct_9fa48("236")) {
          {
          }
        } else {
          stryCov_9fa48("236");
          void mutateAsync(input, callbackOptions);
        }
      },
      stryMutAct_9fa48("237") ? [] : (stryCov_9fa48("237"), [mutateAsync])
    );
    const reset = useCallback(
      (): void => {
        if (stryMutAct_9fa48("238")) {
          {
          }
        } else {
          stryCov_9fa48("238");
          setState(
            stryMutAct_9fa48("239")
              ? {}
              : (stryCov_9fa48("239"),
                {
                  status: stryMutAct_9fa48("240") ? "" : (stryCov_9fa48("240"), "idle"),
                  data: undefined,
                  error: null,
                  variables: undefined,
                  context: undefined,
                  result: undefined,
                })
          );
        }
      },
      stryMutAct_9fa48("241") ? ["Stryker was here"] : (stryCov_9fa48("241"), [])
    );
    return stryMutAct_9fa48("242")
      ? {}
      : (stryCov_9fa48("242"),
        {
          status: state.status,
          isPending: stryMutAct_9fa48("245")
            ? state.status !== "pending"
            : stryMutAct_9fa48("244")
              ? false
              : stryMutAct_9fa48("243")
                ? true
                : (stryCov_9fa48("243", "244", "245"),
                  state.status ===
                    (stryMutAct_9fa48("246") ? "" : (stryCov_9fa48("246"), "pending"))),
          isSuccess: stryMutAct_9fa48("249")
            ? state.status !== "success"
            : stryMutAct_9fa48("248")
              ? false
              : stryMutAct_9fa48("247")
                ? true
                : (stryCov_9fa48("247", "248", "249"),
                  state.status ===
                    (stryMutAct_9fa48("250") ? "" : (stryCov_9fa48("250"), "success"))),
          isError: stryMutAct_9fa48("253")
            ? state.status !== "error"
            : stryMutAct_9fa48("252")
              ? false
              : stryMutAct_9fa48("251")
                ? true
                : (stryCov_9fa48("251", "252", "253"),
                  state.status ===
                    (stryMutAct_9fa48("254") ? "" : (stryCov_9fa48("254"), "error"))),
          isIdle: stryMutAct_9fa48("257")
            ? state.status !== "idle"
            : stryMutAct_9fa48("256")
              ? false
              : stryMutAct_9fa48("255")
                ? true
                : (stryCov_9fa48("255", "256", "257"),
                  state.status === (stryMutAct_9fa48("258") ? "" : (stryCov_9fa48("258"), "idle"))),
          data: state.data,
          error: state.error,
          result: state.result,
          variables: state.variables,
          context: state.context,
          mutate,
          mutateAsync,
          reset,
        });
  }
}
