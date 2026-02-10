/**
 * AsyncDerivedService implementation.
 *
 * @packageDocumentation
 */

import type {
  DeepReadonly,
  AsyncDerivedService,
  AsyncDerivedSnapshot,
  Unsubscribe,
} from "../types/index.js";
import { AsyncDerivedSelectError } from "../types/index.js";
import { deepFreeze } from "../utils/deep-freeze.js";
import { createSignal, createEffect } from "../reactivity/signals.js";
import type { Signal } from "../reactivity/signals.js";
import type { ReactiveSystemInstance } from "../reactivity/system-factory.js";
import { DisposedStateAccess, AsyncDerivedExhausted } from "../errors/index.js";
import type { StoreInspectorInternal } from "../types/inspection.js";
import type { StoreTracingHook } from "../integration/tracing-bridge.js";
import type { ResultAsync } from "@hex-di/result";
import { tryCatch, safeTry, ok } from "@hex-di/result";

/** Internal tag to distinguish sync select() throws from ResultAsync Err in safeTry. */
interface SelectThrew {
  readonly _selectThrew: true;
  readonly cause: Error;
}

function isSelectThrew(value: unknown): value is SelectThrew {
  return typeof value === "object" && value !== null && "_selectThrew" in value;
}

export interface AsyncDerivedServiceConfig<TResult, E> {
  readonly portName: string;
  readonly containerName: string;
  readonly select: () => ResultAsync<TResult, E>;
  readonly staleTime?: number;
  readonly retryCount?: number;
  readonly retryDelay?: number | ((attempt: number) => number);
  readonly tracingHook?: StoreTracingHook;
  readonly inspector?: StoreInspectorInternal;
  readonly reactiveSystem?: ReactiveSystemInstance;
}

export interface AsyncDerivedServiceInternal<TResult, E> extends AsyncDerivedService<TResult, E> {
  dispose(): void;
  readonly subscriberCount: number;
}

function idleSnapshot<TResult, E>(): AsyncDerivedSnapshot<TResult, E> {
  return Object.freeze({
    status: "idle",
    data: undefined,
    error: undefined,
    isLoading: false,
  }) satisfies AsyncDerivedSnapshot<TResult, E>;
}

function loadingSnapshot<TResult, E>(
  prevData: DeepReadonly<TResult> | undefined
): AsyncDerivedSnapshot<TResult, E> {
  return {
    status: "loading",
    data: prevData,
    error: undefined,
    isLoading: true,
  } satisfies AsyncDerivedSnapshot<TResult, E>;
}

function successSnapshot<TResult, E>(
  data: DeepReadonly<TResult>
): AsyncDerivedSnapshot<TResult, E> {
  return {
    status: "success",
    data,
    error: undefined,
    isLoading: false,
  } satisfies AsyncDerivedSnapshot<TResult, E>;
}

function errorSnapshot<TResult, E>(error: unknown): AsyncDerivedSnapshot<TResult, E>;
function errorSnapshot(error: unknown): {
  status: "error";
  data: undefined;
  error: unknown;
  isLoading: false;
} {
  return { status: "error", data: undefined, error, isLoading: false };
}

export function createAsyncDerivedServiceImpl<TResult, E = never>(
  config: AsyncDerivedServiceConfig<TResult, E>
): AsyncDerivedServiceInternal<TResult, E> {
  const snapshotSignal: Signal<AsyncDerivedSnapshot<TResult, E>> = createSignal(
    idleSnapshot<TResult, E>(),
    config.reactiveSystem
  );
  let disposed = false;
  const activeEffects: Array<{ dispose(): void }> = [];
  let _subscriberCount = 0;
  let _lastFetchTime = 0;

  function checkDisposed(operation: "value" | "subscribe" | "refresh"): void {
    if (disposed) {
      throw DisposedStateAccess({
        portName: config.portName,
        containerName: config.containerName,
        operation,
      });
    }
  }

  async function doFetch(): Promise<void> {
    tryCatch(
      () => {
        config.tracingHook?.onAsyncDerivedFetch?.(config.portName, config.containerName);
      },
      () => undefined
    );

    const current = snapshotSignal.get();
    const prevData = current.status === "success" ? current.data : undefined;
    snapshotSignal.set(loadingSnapshot<TResult, E>(prevData));

    const maxAttempts = (config.retryCount ?? 0) + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (disposed) {
        tryCatch(
          () => {
            config.tracingHook?.onAsyncDerivedFetchEnd?.(true);
          },
          () => undefined
        );
        return;
      }

      // safeTry linearizes the two-step select+resolve flow:
      // 1. tryCatch catches sync throws from select() (wrapped as SelectThrew)
      // 2. yield* on the ResultAsync extracts Ok or early-returns Err (typed as E)
      const attemptResult = await safeTry(async function* () {
        const resultAsync = yield* tryCatch(
          () => config.select(),
          (cause): SelectThrew => ({
            _selectThrew: true,
            cause: cause instanceof Error ? cause : new Error(String(cause)),
          })
        );
        const resolved = await Promise.resolve(resultAsync);
        const data = yield* resolved;
        return ok(data);
      });

      if (attemptResult.isOk()) {
        if (disposed) {
          tryCatch(
            () => {
              config.tracingHook?.onAsyncDerivedFetchEnd?.(true);
            },
            () => undefined
          );
          return;
        }

        _lastFetchTime = Date.now();
        snapshotSignal.set(successSnapshot<TResult, E>(deepFreeze(attemptResult.value)));
        config.inspector?.emit({ type: "state-changed", portName: config.portName });
        tryCatch(
          () => {
            config.tracingHook?.onAsyncDerivedFetchEnd?.(true);
          },
          () => undefined
        );
        return;
      }

      // attemptResult.isErr() — either sync throw (SelectThrew) or ResultAsync Err (E)
      const error = attemptResult.error;
      if (isSelectThrew(error)) {
        lastError = error.cause;
        if (attempt === maxAttempts) {
          tryCatch(
            () => {
              config.tracingHook?.onAsyncDerivedFetchEnd?.(false);
            },
            () => undefined
          );
          throw AsyncDerivedExhausted({
            portName: config.portName,
            attempts: attempt,
            cause: lastError,
          });
        }
      } else {
        lastError = error;
      }

      if (attempt < maxAttempts) {
        const delay =
          typeof config.retryDelay === "function"
            ? config.retryDelay(attempt)
            : (config.retryDelay ?? 0);
        if (delay > 0) {
          await new Promise<void>(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (disposed) {
      tryCatch(
        () => {
          config.tracingHook?.onAsyncDerivedFetchEnd?.(true);
        },
        () => undefined
      );
      return;
    }

    snapshotSignal.set(errorSnapshot<TResult, E>(lastError));
    config.inspector?.emit({
      type: "async-derived-failed",
      error: AsyncDerivedSelectError({
        portName: config.portName,
        attempts: maxAttempts,
        cause: lastError,
      }),
    });
    config.inspector?.emit({ type: "state-changed", portName: config.portName });
    tryCatch(
      () => {
        config.tracingHook?.onAsyncDerivedFetchEnd?.(false);
      },
      () => undefined
    );
  }

  const stableRefresh = (): void => {
    checkDisposed("refresh");
    void doFetch();
  };

  function isStale(): boolean {
    if (config.staleTime === undefined || _lastFetchTime === 0) return false;
    return Date.now() - _lastFetchTime >= config.staleTime;
  }

  return {
    get snapshot(): AsyncDerivedSnapshot<TResult, E> {
      const current = snapshotSignal.get();
      if (_subscriberCount > 0 && isStale() && current.status !== "loading") {
        void doFetch();
      }
      return current;
    },

    get status(): AsyncDerivedSnapshot<TResult, E>["status"] {
      return snapshotSignal.get().status;
    },

    get isLoading(): boolean {
      return snapshotSignal.get().isLoading;
    },

    refresh: stableRefresh,

    subscribe(listener: (snapshot: AsyncDerivedSnapshot<TResult, E>) => void): Unsubscribe {
      checkDisposed("subscribe");
      let prevSnapshot = snapshotSignal.get();
      _subscriberCount++;

      // Auto-refetch stale data when first subscriber is added
      if (isStale() && prevSnapshot.status !== "loading") {
        void doFetch();
      }

      const eff = createEffect(() => {
        const current = snapshotSignal.get();
        if (current !== prevSnapshot) {
          prevSnapshot = current;
          listener(current);
        }
      }, config.reactiveSystem);
      activeEffects.push(eff);
      return () => {
        eff.dispose();
        _subscriberCount--;
        const idx = activeEffects.indexOf(eff);
        if (idx >= 0) activeEffects.splice(idx, 1);
      };
    },

    get isDisposed() {
      return disposed;
    },
    get subscriberCount() {
      return _subscriberCount;
    },

    dispose(): void {
      disposed = true;
      for (const eff of activeEffects) {
        eff.dispose();
      }
      activeEffects.length = 0;
    },
  };
}
